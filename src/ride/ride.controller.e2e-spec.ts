import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AppModule } from '../app.module.js';
import { TransformInterceptor } from '../utils/interceptor/interceptor.js';

// Mesma abordagem de SQL cru do auth e2e: a dupla registração do TypeOrmModule
// impede resolver Repository<T> pelo token no módulo de teste.
describe('RideController / UserRideController (e2e)', () => {
    let app: INestApplication;
    let dataSource: DataSource;

    async function signUpAndLogin(
        email: string,
        phone?: string,
    ): Promise<{ token: string; id: number }> {
        const signUpResponse = await request(app.getHttpServer())
            .post('/auth/signup')
            .send({ name: `Dona ${email}`, email, password: 'senha1234', ...(phone ? { phone } : {}) });

        const loginResponse = await request(app.getHttpServer())
            .post('/auth/login')
            .send({ email, password: 'senha1234' });

        return { token: loginResponse.body.data.accessToken, id: signUpResponse.body.data.id };
    }

    function validRide() {
        return {
            date: '2026-12-01',
            hour: '08:00',
            city: 'São Leopoldo',
            transportTypeId: 1,
            totalSpots: 3,
        };
    }

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        app.useGlobalInterceptors(new TransformInterceptor());
        await app.init();

        dataSource = moduleFixture.get(DataSource);
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    });

    describe('POST /rides', () => {
        it('responds 401 without a bearer token and persists nothing (JOIN-17)', async () => {
            const response = await request(app.getHttpServer()).post('/rides').send(validRide());

            expect(response.status).toBe(401);

            const rows = await dataSource.query('SELECT id FROM ride');
            expect(rows).toHaveLength(0);
        });

        it('attributes the ride to the authenticated account (JOIN-15)', async () => {
            const owner = await signUpAndLogin('dona@example.com', '(51) 99999-9999');

            const response = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            expect(response.status).toBe(201);

            const rows = await dataSource.query('SELECT user_id FROM ride');
            expect(rows).toHaveLength(1);
            expect(rows[0].user_id).toBe(owner.id);
        });

        it('ignores name and phone sent in the body, using the account instead (JOIN-16)', async () => {
            const owner = await signUpAndLogin('semnome@example.com');

            const response = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send({ ...validRide(), name: 'Outra Pessoa', phone: '51988887777' });

            // O ValidationPipe global não usa whitelist, então campos extras são
            // ignorados em vez de recusados. O que importa é que não influenciam
            // o resultado: a resposta traz o nome da conta, não o do corpo.
            expect(response.status).toBe(201);
            expect(response.body.data.name).toBe('Dona semnome@example.com');
        });

        it('stores every new ride as active (CANCEL-01)', async () => {
            const owner = await signUpAndLogin('ativa@example.com');

            const response = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            expect(response.status).toBe(201);

            const rows = await dataSource.query('SELECT status FROM ride');
            expect(rows[0].status).toBe('active');
        });

        it('keeps rides written without a status visible and active (CANCEL-23)', async () => {
            // Uma carona gravada sem informar `status` é o que a migration
            // encontra no banco: o default é o que a mantém no mural.
            const owner = await signUpAndLogin('antiga@example.com');

            await dataSource.query(
                `INSERT INTO ride (date, hour, city, total_spots, transport_type_id, user_id)
                 VALUES ('2026-12-01', '08:00', 'São Leopoldo', 3, 1, $1)`,
                [owner.id],
            );

            const response = await request(app.getHttpServer()).get('/rides');

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);

            const rows = await dataSource.query('SELECT status FROM ride');
            expect(rows[0].status).toBe('active');
        });
    });

    describe('GET /rides', () => {
        it('exposes the owner name and phone taken from the account (JOIN-19)', async () => {
            const owner = await signUpAndLogin('comfone@example.com', '(51) 97777-6666');
            await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer()).get('/rides');

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toBe('Dona comfone@example.com');
            expect(response.body.data[0].phone).toBe('51977776666');
        });

        it('returns phone as null when the owner has no phone (JOIN-20)', async () => {
            const owner = await signUpAndLogin('semfone@example.com');
            await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer()).get('/rides');

            expect(response.body.data[0].phone).toBeNull();
        });

        it('never leaks a passenger phone in the public listing (JOIN-14)', async () => {
            const owner = await signUpAndLogin('dona18@example.com', '(51) 91111-0000');
            const passenger = await signUpAndLogin('sigilo@example.com', '(51) 92222-1111');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            const anonymous = await request(app.getHttpServer()).get('/rides');
            const asStranger = await request(app.getHttpServer())
                .get('/rides')
                .set('Authorization', `Bearer ${passenger.token}`);

            // O telefone da dona é público (JOIN-19); o da passageira não.
            expect(JSON.stringify(anonymous.body)).toContain('51911110000');
            expect(JSON.stringify(anonymous.body)).not.toContain('51922221111');
            expect(JSON.stringify(asStranger.body)).not.toContain('51922221111');
        });

        it('stays public, listing rides without a token (JOIN-19)', async () => {
            const response = await request(app.getHttpServer()).get('/rides');

            expect(response.status).toBe(200);
        });

        it('reports isOwner and alreadyJoined as false when the request carries no token (JOIN-07, JOIN-08)', async () => {
            const owner = await signUpAndLogin('dona11@example.com');
            await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer()).get('/rides');

            expect(response.body.data[0].isOwner).toBe(false);
            expect(response.body.data[0].alreadyJoined).toBe(false);
        });

        it('reports isOwner true for the owner of the ride (JOIN-08)', async () => {
            const owner = await signUpAndLogin('dona12@example.com');
            await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer())
                .get('/rides')
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.body.data[0].isOwner).toBe(true);
            expect(response.body.data[0].alreadyJoined).toBe(false);
        });

        it('reports alreadyJoined true for a passenger who confirmed, and false for a third party (JOIN-07)', async () => {
            const owner = await signUpAndLogin('dona13@example.com');
            const passenger = await signUpAndLogin('foi@example.com');
            const stranger = await signUpAndLogin('naofoi@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            const asPassenger = await request(app.getHttpServer())
                .get('/rides')
                .set('Authorization', `Bearer ${passenger.token}`);
            const asStranger = await request(app.getHttpServer())
                .get('/rides')
                .set('Authorization', `Bearer ${stranger.token}`);

            expect(asPassenger.body.data[0].alreadyJoined).toBe(true);
            expect(asPassenger.body.data[0].isOwner).toBe(false);
            expect(asStranger.body.data[0].alreadyJoined).toBe(false);
        });
    });

    describe('POST /user-ride/:idRide', () => {
        it('responds 401 without a bearer token and persists nothing (JOIN-04)', async () => {
            const owner = await signUpAndLogin('dona2@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .send({ name: 'Invasora', phone: '51999999999' });

            expect(response.status).toBe(401);

            const rows = await dataSource.query('SELECT id FROM ride_user');
            expect(rows).toHaveLength(0);
        });

        it('takes the passenger from the token and ignores any body sent (JOIN-02)', async () => {
            const owner = await signUpAndLogin('dona3@example.com');
            const passenger = await signUpAndLogin('passageira@example.com', '(51) 96666-5555');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`)
                .send({ name: 'Nome Falso', phone: '11111111111' });

            expect(response.status).toBe(201);
            expect(response.body.data).toEqual({
                id: expect.any(Number),
                name: 'Dona passageira@example.com',
                phone: '51966665555',
            });

            const rows = await dataSource.query('SELECT user_id FROM ride_user');
            expect(rows).toHaveLength(1);
            expect(rows[0].user_id).toBe(passenger.id);
        });

        it('rejects a second confirmation with 409 and keeps a single row (JOIN-05)', async () => {
            const owner = await signUpAndLogin('dona6@example.com');
            const passenger = await signUpAndLogin('repetida@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            const second = await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            expect(second.status).toBe(409);
            expect(second.body.message).toBe('Você já confirmou presença nesta carona');

            const rows = await dataSource.query('SELECT id FROM ride_user');
            expect(rows).toHaveLength(1);
        });

        it('keeps exactly one row when two confirmations race, rejecting the other as duplicate (JOIN-30)', async () => {
            const owner = await signUpAndLogin('dona7@example.com');
            const passenger = await signUpAndLogin('concorrente@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const [first, second] = await Promise.all([
                request(app.getHttpServer())
                    .post(`/user-ride/${ride.body.data.id}`)
                    .set('Authorization', `Bearer ${passenger.token}`),
                request(app.getHttpServer())
                    .post(`/user-ride/${ride.body.data.id}`)
                    .set('Authorization', `Bearer ${passenger.token}`),
            ]);

            expect([first.status, second.status].sort()).toEqual([201, 409]);

            const rows = await dataSource.query('SELECT id FROM ride_user');
            expect(rows).toHaveLength(1);
        });

        // Prova determinística da constraint, sem depender de duas requisições
        // realmente se cruzarem: insere direto no banco, contornando o service.
        it('is rejected by the database itself with 23505 on a duplicate insert (JOIN-06)', async () => {
            const owner = await signUpAndLogin('dona17@example.com');
            const passenger = await signUpAndLogin('constraint@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const insert = 'INSERT INTO ride_user (id_ride, user_id) VALUES ($1, $2)';
            await dataSource.query(insert, [ride.body.data.id, passenger.id]);

            await expect(
                dataSource.query(insert, [ride.body.data.id, passenger.id]),
            ).rejects.toMatchObject({ code: '23505' });

            const rows = await dataSource.query('SELECT id FROM ride_user');
            expect(rows).toHaveLength(1);
        });

        it('rejects the owner confirming presence on her own ride with 409 (JOIN-08)', async () => {
            const owner = await signUpAndLogin('dona8@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(409);
            expect(response.body.message).toBe('Você não pode confirmar presença na própria carona');
        });

        it('rejects a confirmation with 409 once the ride is full (JOIN-29)', async () => {
            const owner = await signUpAndLogin('dona9@example.com');
            const first = await signUpAndLogin('primeira@example.com');
            const second = await signUpAndLogin('segunda@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send({ ...validRide(), totalSpots: 1 });

            await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${first.token}`);

            const response = await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${second.token}`);

            expect(response.status).toBe(409);
            expect(response.body.message).toBe('Esta carona não tem mais vagas');
        });

        it('makes occupiedSpots reflect the new confirmation (JOIN-09)', async () => {
            const owner = await signUpAndLogin('dona10@example.com');
            const passenger = await signUpAndLogin('conta@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            const response = await request(app.getHttpServer()).get('/rides');

            expect(response.body.data[0].occupiedSpots).toBe(1);
            expect(response.body.data[0].availableSpots).toBe(2);
        });

        it('responds 404 when the ride does not exist (JOIN-28)', async () => {
            const passenger = await signUpAndLogin('semcorrida@example.com');

            const response = await request(app.getHttpServer())
                .post('/user-ride/999999')
                .set('Authorization', `Bearer ${passenger.token}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Corrida não encontrada');
        });
    });

    describe('GET /user-ride', () => {
        it('responds 401 on the per-ride route without a bearer token (JOIN-24)', async () => {
            const owner = await signUpAndLogin('dona4@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer()).get(`/user-ride/${ride.body.data.id}`);

            expect(response.status).toBe(401);
        });

        it('returns the passengers with their account name and phone to the owner (JOIN-21, JOIN-22)', async () => {
            const owner = await signUpAndLogin('dona14@example.com');
            const passenger = await signUpAndLogin('lista@example.com', '(51) 94444-3333');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            const response = await request(app.getHttpServer())
                .get(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([
                { id: expect.any(Number), name: 'Dona lista@example.com', phone: '51944443333' },
            ]);
        });

        it('responds 403 and no passenger data to an authenticated non-owner (JOIN-23)', async () => {
            const owner = await signUpAndLogin('dona15@example.com');
            const passenger = await signUpAndLogin('bisbilhoteira@example.com', '(51) 93333-2222');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            await request(app.getHttpServer())
                .post(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            const response = await request(app.getHttpServer())
                .get(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            expect(response.status).toBe(403);
            expect(JSON.stringify(response.body)).not.toContain('51933332222');
        });

        it('returns an empty list when nobody confirmed presence yet (JOIN-25)', async () => {
            const owner = await signUpAndLogin('dona16@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            const response = await request(app.getHttpServer())
                .get(`/user-ride/${ride.body.data.id}`)
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual([]);
        });

        it('no longer exposes the global passenger list route (JOIN-24)', async () => {
            const owner = await signUpAndLogin('dona5@example.com');

            const response = await request(app.getHttpServer())
                .get('/user-ride')
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(404);
        });
    });
});
