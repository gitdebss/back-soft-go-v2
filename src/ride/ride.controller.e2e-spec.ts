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

        it('stays public, listing rides without a token (JOIN-19)', async () => {
            const response = await request(app.getHttpServer()).get('/rides');

            expect(response.status).toBe(200);
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

        it('no longer exposes the global passenger list route (JOIN-24)', async () => {
            const owner = await signUpAndLogin('dona5@example.com');

            const response = await request(app.getHttpServer())
                .get('/user-ride')
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(404);
        });
    });
});
