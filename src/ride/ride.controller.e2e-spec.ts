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

        it('leaves rides whose date already passed out of the board (PAST-01)', async () => {
            const owner = await signUpAndLogin('datas@example.com');

            // Datas relativas ao dia em que o teste roda: uma data fixa passaria
            // a mentir assim que o calendário andasse.
            await dataSource.query(
                `INSERT INTO ride (date, hour, city, total_spots, transport_type_id, user_id)
                 VALUES (CURRENT_DATE - 1, '08:00', 'Ontem', 3, 1, $1),
                        (CURRENT_DATE,     '08:00', 'Hoje',  3, 1, $1),
                        (CURRENT_DATE + 1, '08:00', 'Amanhã', 3, 1, $1)`,
                [owner.id],
            );

            const response = await request(app.getHttpServer()).get('/rides');

            const cities = response.body.data.map((ride: { city: string }) => ride.city);

            expect(cities).toHaveLength(2);
            expect(cities).toContain('Hoje');
            expect(cities).toContain('Amanhã');
            expect(cities).not.toContain('Ontem');
        });

        it('keeps a ride happening today, whatever the hour on it (PAST-02)', async () => {
            const owner = await signUpAndLogin('hojecedo@example.com');

            await dataSource.query(
                `INSERT INTO ride (date, hour, city, total_spots, transport_type_id, user_id)
                 VALUES (CURRENT_DATE, '00:01', 'Madrugada', 3, 1, $1)`,
                [owner.id],
            );

            const response = await request(app.getHttpServer()).get('/rides');

            expect(response.body.data).toHaveLength(1);
        });

        it('returns nothing when the date filter points at a day gone by (PAST-03)', async () => {
            const owner = await signUpAndLogin('filtropassado@example.com');

            await dataSource.query(
                `INSERT INTO ride (date, hour, city, total_spots, transport_type_id, user_id)
                 VALUES (CURRENT_DATE - 5, '08:00', 'Semana passada', 3, 1, $1)`,
                [owner.id],
            );

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 5);
            const isoPastDate = pastDate.toLocaleDateString('en-CA');

            const response = await request(app.getHttpServer())
                .get('/rides')
                .query({ date: isoPastDate });

            expect(response.status).toBe(200);
            expect(response.body.data).toHaveLength(0);
        });

        it('still honours a date filter pointing at a day ahead (PAST-04)', async () => {
            const owner = await signUpAndLogin('filtrofuturo@example.com');

            await dataSource.query(
                `INSERT INTO ride (date, hour, city, total_spots, transport_type_id, user_id)
                 VALUES (CURRENT_DATE + 3, '08:00', 'Daqui a pouco', 3, 1, $1),
                        (CURRENT_DATE + 9, '08:00', 'Mais tarde', 3, 1, $1)`,
                [owner.id],
            );

            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 3);
            const isoFutureDate = futureDate.toLocaleDateString('en-CA');

            const response = await request(app.getHttpServer())
                .get('/rides')
                .query({ date: isoFutureDate });

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].city).toBe('Daqui a pouco');
        });

        it('hides a deleted ride from the listing and from the detail route (CANCEL-14)', async () => {
            const owner = await signUpAndLogin('apagada@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            await dataSource.query(`UPDATE ride SET status = 'deleted' WHERE id = $1`, [
                ride.body.data.id,
            ]);

            const listing = await request(app.getHttpServer()).get('/rides');
            const detail = await request(app.getHttpServer()).get(`/rides/${ride.body.data.id}`);

            expect(listing.body.data).toHaveLength(0);
            expect(detail.status).toBe(404);
        });

        it('keeps a canceled ride in the listing, filters included (CANCEL-15)', async () => {
            const owner = await signUpAndLogin('cancelada@example.com');
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            await dataSource.query(`UPDATE ride SET status = 'canceled' WHERE id = $1`, [
                ride.body.data.id,
            ]);

            const listing = await request(app.getHttpServer()).get('/rides');
            const filtered = await request(app.getHttpServer())
                .get('/rides')
                .query({ transportType: '1', date: '2026-12-01' });

            expect(listing.body.data).toHaveLength(1);
            expect(listing.body.data[0].status).toBe('canceled');
            expect(filtered.body.data).toHaveLength(1);
        });
    });

    describe('DELETE /rides/:id', () => {
        async function publishRide(email: string) {
            const owner = await signUpAndLogin(email);
            const ride = await request(app.getHttpServer())
                .post('/rides')
                .set('Authorization', `Bearer ${owner.token}`)
                .send(validRide());

            return { owner, rideId: ride.body.data.id as number };
        }

        // Espera o Postgres registrar alguma sessão travada em lock. É o sinal
        // de que o cancelamento chegou até a linha da carona, em vez de um
        // sleep torcendo para ter dado tempo.
        async function waitForBlockedQuery(runner: { query: (sql: string) => Promise<unknown> }) {
            for (let attempt = 0; attempt < 60; attempt++) {
                const rows = (await runner.query(
                    `SELECT count(*)::int AS total FROM pg_stat_activity
                     WHERE datname = current_database()
                       AND wait_event_type = 'Lock'
                       AND state = 'active'`,
                )) as { total: number }[];

                if (rows[0].total > 0) return true;

                await new Promise((resolve) => setTimeout(resolve, 50));
            }

            // Sem sinal de bloqueio o teste segue mesmo assim: a asserção do
            // desfecho é o que vale, e travar aqui deixaria a transação aberta
            // segurando a linha para os testes seguintes.
            return false;
        }

        async function readStatus(rideId: number): Promise<string> {
            const rows = await dataSource.query('SELECT status FROM ride WHERE id = $1', [rideId]);

            return rows[0].status;
        }

        it('responds 401 without a bearer token and leaves the ride untouched (CANCEL-08)', async () => {
            const { rideId } = await publishRide('semtoken@example.com');

            const response = await request(app.getHttpServer()).delete(`/rides/${rideId}`);

            expect(response.status).toBe(401);
            expect(await readStatus(rideId)).toBe('active');
        });

        // O ponto da feature: não basta esconder o botão no frontend.
        it('responds 403 to an account that does not own the ride (CANCEL-09)', async () => {
            const { rideId } = await publishRide('dona-a@example.com');
            const stranger = await signUpAndLogin('intrusa@example.com');

            const response = await request(app.getHttpServer())
                .delete(`/rides/${rideId}`)
                .set('Authorization', `Bearer ${stranger.token}`);

            expect(response.status).toBe(403);
            expect(response.body.message).toBe('Apenas a dona da carona pode cancelá-la');
            expect(await readStatus(rideId)).toBe('active');
        });

        it('takes a ride nobody joined off the board (CANCEL-05)', async () => {
            const { owner, rideId } = await publishRide('sozinha@example.com');

            const response = await request(app.getHttpServer())
                .delete(`/rides/${rideId}`)
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual({ id: rideId, status: 'deleted' });

            const listing = await request(app.getHttpServer()).get('/rides');
            expect(listing.body.data).toHaveLength(0);
        });

        it('keeps a ride with passengers listed, canceled, with their rows intact (CANCEL-06)', async () => {
            const { owner, rideId } = await publishRide('comgente@example.com');
            const passenger = await signUpAndLogin('passageira@example.com');

            await request(app.getHttpServer())
                .post(`/user-ride/${rideId}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            const response = await request(app.getHttpServer())
                .delete(`/rides/${rideId}`)
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual({ id: rideId, status: 'canceled' });

            const listing = await request(app.getHttpServer()).get('/rides');
            expect(listing.body.data).toHaveLength(1);
            expect(listing.body.data[0].status).toBe('canceled');

            const passengers = await dataSource.query(
                'SELECT user_id FROM ride_user WHERE id_ride = $1',
                [rideId],
            );
            expect(passengers).toHaveLength(1);
            expect(passengers[0].user_id).toBe(passenger.id);
        });

        it('responds 409 when the ride was already canceled (CANCEL-11)', async () => {
            const { owner, rideId } = await publishRide('duasvezes@example.com');
            const passenger = await signUpAndLogin('passageira2@example.com');

            await request(app.getHttpServer())
                .post(`/user-ride/${rideId}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            await request(app.getHttpServer())
                .delete(`/rides/${rideId}`)
                .set('Authorization', `Bearer ${owner.token}`);

            const response = await request(app.getHttpServer())
                .delete(`/rides/${rideId}`)
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(409);
            expect(response.body.message).toBe('Esta carona já foi cancelada');
        });

        it('refuses a presence on a canceled ride (CANCEL-22)', async () => {
            const { owner, rideId } = await publishRide('fechada@example.com');
            const passenger = await signUpAndLogin('passageira3@example.com');
            const latecomer = await signUpAndLogin('atrasada@example.com');

            await request(app.getHttpServer())
                .post(`/user-ride/${rideId}`)
                .set('Authorization', `Bearer ${passenger.token}`);

            await request(app.getHttpServer())
                .delete(`/rides/${rideId}`)
                .set('Authorization', `Bearer ${owner.token}`);

            const response = await request(app.getHttpServer())
                .post(`/user-ride/${rideId}`)
                .set('Authorization', `Bearer ${latecomer.token}`);

            expect(response.status).toBe(409);
            expect(response.body.message).toBe('Esta carona foi cancelada');

            const rows = await dataSource.query(
                'SELECT user_id FROM ride_user WHERE id_ride = $1',
                [rideId],
            );
            expect(rows).toHaveLength(1);
        });

        // O estado proibido é uma carona `deleted` com passageira vinculada:
        // ela ficaria presa a uma carona que nenhuma tela mostra.
        it('never removes a ride that ended up with a passenger, under a concurrent join (CANCEL-07)', async () => {
            const { owner, rideId } = await publishRide('disputada@example.com');
            const passenger = await signUpAndLogin('simultanea@example.com');

            await Promise.allSettled([
                request(app.getHttpServer())
                    .delete(`/rides/${rideId}`)
                    .set('Authorization', `Bearer ${owner.token}`),
                request(app.getHttpServer())
                    .post(`/user-ride/${rideId}`)
                    .set('Authorization', `Bearer ${passenger.token}`),
            ]);

            const status = await readStatus(rideId);
            const rows = await dataSource.query('SELECT id FROM ride_user WHERE id_ride = $1', [
                rideId,
            ]);

            // Só há dois desfechos válidos: a presença entrou antes e o
            // cancelamento a enxergou, ou o cancelamento entrou antes e a
            // presença foi recusada.
            if (status === 'deleted') {
                expect(rows).toHaveLength(0);
            } else {
                expect(status).toBe('canceled');
                expect(rows).toHaveLength(1);
            }
        });

        // O teste acima aceita os dois desfechos válidos, então não distingue um
        // cancelamento que toma o lock de um que não toma. Este força a ordem:
        // a presença é gravada enquanto o cancelamento está bloqueado.
        it('waits for a presence that is mid-commit and counts it (CANCEL-07)', async () => {
            const { owner, rideId } = await publishRide('serializada@example.com');
            const passenger = await signUpAndLogin('emtransacao@example.com');

            const runner = dataSource.createQueryRunner();
            await runner.connect();
            await runner.startTransaction();

            try {
                // Segura o lock da linha da carona: o cancelamento para aqui.
                await runner.query('SELECT id FROM ride WHERE id = $1 FOR UPDATE', [rideId]);

                const cancelPromise = request(app.getHttpServer())
                    .delete(`/rides/${rideId}`)
                    .set('Authorization', `Bearer ${owner.token}`)
                    .then((response) => response);

                // Inserir antes de o cancelamento bloquear tornaria o teste
                // inconclusivo: ele veria a presença de qualquer jeito.
                await waitForBlockedQuery(runner);

                await runner.query(
                    'INSERT INTO ride_user (id_ride, user_id) VALUES ($1, $2)',
                    [rideId, passenger.id],
                );
                await runner.commitTransaction();

                const response = await cancelPromise;

                // Sem o lock, o cancelamento teria contado zero passageiras
                // antes deste commit e removido a carona com ela dentro.
                expect(response.status).toBe(200);
                expect(response.body.data.status).toBe('canceled');
            } finally {
                await runner.release();
            }
        });

        // A direção que produz o estado proibido: a presença estava a caminho
        // quando a carona saiu do mural.
        it('refuses a presence that was in flight when the ride was called off (CANCEL-07)', async () => {
            const { rideId } = await publishRide('emvoo@example.com');
            const passenger = await signUpAndLogin('naoentra@example.com');

            const runner = dataSource.createQueryRunner();
            await runner.connect();
            await runner.startTransaction();

            try {
                await runner.query('SELECT id FROM ride WHERE id = $1 FOR UPDATE', [rideId]);

                const joinPromise = request(app.getHttpServer())
                    .post(`/user-ride/${rideId}`)
                    .set('Authorization', `Bearer ${passenger.token}`)
                    .then((response) => response);

                await waitForBlockedQuery(runner);

                await runner.query(`UPDATE ride SET status = 'deleted' WHERE id = $1`, [rideId]);
                await runner.commitTransaction();

                const response = await joinPromise;

                // Sem o lock, a confirmação teria lido a carona ainda ativa e
                // gravado a presença em uma carona que ninguém mais enxerga.
                expect(response.status).toBe(404);

                const rows = await dataSource.query(
                    'SELECT id FROM ride_user WHERE id_ride = $1',
                    [rideId],
                );
                expect(rows).toHaveLength(0);
            } finally {
                await runner.release();
            }
        });

        it('responds 404 when the ride was already removed (CANCEL-10)', async () => {
            const { owner, rideId } = await publishRide('jafoi@example.com');

            await request(app.getHttpServer())
                .delete(`/rides/${rideId}`)
                .set('Authorization', `Bearer ${owner.token}`);

            const response = await request(app.getHttpServer())
                .delete(`/rides/${rideId}`)
                .set('Authorization', `Bearer ${owner.token}`);

            expect(response.status).toBe(404);
            expect(response.body.message).toBe('Corrida não encontrada');
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
