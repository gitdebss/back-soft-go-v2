import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { AppModule } from '../app.module.js';
import { TransformInterceptor } from '../utils/interceptor/interceptor.js';

function decodeJwtPayload(token: string): { sub: number; name: string; email: string; iat: number; exp: number } {
    const payloadSegment = token.split('.')[1];
    const json = Buffer.from(payloadSegment, 'base64url').toString('utf8');
    return JSON.parse(json);
}

describe('AuthController (e2e)', () => {
    let app: INestApplication;
    // SPEC_DEVIATION: reads/writes the `users` table via raw SQL on the DataSource
    // instead of an injected Repository<UserEntity>.
    // Reason: app.module.ts registers TypeOrmModule twice (forRoot + forRootAsync,
    // pre-existing redundancy documented in design.md's Risks table, out of scope
    // for this feature). In the test module, `getRepositoryToken(UserEntity)`
    // resolves against a connection whose entity metadata doesn't match the
    // TS-imported UserEntity class, throwing EntityMetadataNotFoundError. Raw
    // DataSource.query() needs no entity metadata and works against either
    // duplicate 'default' connection, since both point at the same physical DB.
    let dataSource: DataSource;
    let jwtService: JwtService;

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        app.useGlobalPipes(new ValidationPipe());
        app.useGlobalInterceptors(new TransformInterceptor());
        await app.init();

        dataSource = moduleFixture.get(DataSource);
        jwtService = moduleFixture.get(JwtService);
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(async () => {
        await dataSource.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
    });

    describe('POST /auth/signup', () => {
        it('creates the account and returns the public profile without the password hash (AUTH-01)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Débora',
                email: 'debora@example.com',
                password: 'senha1234',
            });

            expect(response.status).toBe(201);
            expect(response.body.data).toEqual({
                id: expect.any(Number),
                name: 'Débora',
                email: 'debora@example.com',
                phone: null,
            });
            expect(response.body.data.passwordHash).toBeUndefined();

            const rows = await dataSource.query('SELECT password_hash FROM users WHERE email = $1', [
                'debora@example.com',
            ]);
            expect(rows[0].password_hash).not.toBe('senha1234');
            expect(rows[0].password_hash).toMatch(/^\$2[aby]\$/);
        });

        it('rejects a duplicate email with 409 and the exact message "e-mail já cadastrado" (AUTH-02)', async () => {
            await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Débora',
                email: 'duplicada@example.com',
                password: 'senha1234',
            });

            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Outra Débora',
                email: 'duplicada@example.com',
                password: 'outrasenha',
            });

            expect(response.status).toBe(409);
            expect(response.body.message).toBe('E-mail já cadastrado');
        });

        it('accepts only one of two simultaneous signups with the same email, rejecting the other as duplicate (AUTH-06)', async () => {
            const payload = { name: 'Concorrente', email: 'concorrente@example.com', password: 'senha1234' };

            const [first, second] = await Promise.all([
                request(app.getHttpServer()).post('/auth/signup').send(payload),
                request(app.getHttpServer()).post('/auth/signup').send(payload),
            ]);

            const statuses = [first.status, second.status].sort();
            expect(statuses).toEqual([201, 409]);

            const rows = await dataSource.query('SELECT id FROM users WHERE email = $1', [
                'concorrente@example.com',
            ]);
            expect(rows).toHaveLength(1);
        });

        it('accepts a signup carrying a masked Brazilian mobile number (JOIN-12)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Com Telefone',
                email: 'comtelefone@example.com',
                password: 'senha1234',
                phone: '(51) 99999-9999',
            });

            expect(response.status).toBe(201);
            expect(response.body.data.phone).toBe('51999999999');

            const rows = await dataSource.query('SELECT phone FROM users WHERE email = $1', [
                'comtelefone@example.com',
            ]);
            expect(rows[0].phone).toBe('51999999999');
        });

        it('accepts a signup carrying the phone as digits only (JOIN-12)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Digitos',
                email: 'digitos@example.com',
                password: 'senha1234',
                phone: '51999999999',
            });

            expect(response.status).toBe(201);
        });

        it('creates the account when no phone is sent, because phone is optional (JOIN-11)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Sem Telefone',
                email: 'semtelefone@example.com',
                password: 'senha1234',
            });

            expect(response.status).toBe(201);
            expect(response.body.data.phone).toBeNull();

            const rows = await dataSource.query('SELECT phone FROM users WHERE email = $1', [
                'semtelefone@example.com',
            ]);
            expect(rows[0].phone).toBeNull();
        });

        it('rejects a malformed phone with 400 (JOIN-12)', async () => {
            const tooShort = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Curto',
                email: 'telefonecurto@example.com',
                password: 'senha1234',
                phone: '123',
            });

            const notANumber = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Letras',
                email: 'telefoneletras@example.com',
                password: 'senha1234',
                phone: 'abc',
            });

            // A spec especifica celular: (DD) 9NNNN-NNNN. Um número que não
            // começa com 9 após o DDD é fixo, não celular.
            const notAMobile = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Fixo',
                email: 'telefonefixo@example.com',
                password: 'senha1234',
                phone: '(51) 88888-8888',
            });

            expect(tooShort.status).toBe(400);
            expect(notANumber.status).toBe(400);
            expect(notAMobile.status).toBe(400);
        });

        it('rejects a password shorter than 8 characters with 400 (AUTH-03)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Débora',
                email: 'senhacurta@example.com',
                password: 'short1',
            });

            expect(response.status).toBe(400);
        });

        it('rejects an invalid email format with 400 (AUTH-05)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Débora',
                email: 'not-an-email',
                password: 'senha1234',
            });

            expect(response.status).toBe(400);
        });

        it('rejects a missing required field (empty name) with 400 (AUTH-05)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: '',
                email: 'semnome@example.com',
                password: 'senha1234',
            });

            expect(response.status).toBe(400);
        });

        it('rejects a name longer than 100 characters with 400 (edge case)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'a'.repeat(101),
                email: 'nomegrande@example.com',
                password: 'senha1234',
            });

            expect(response.status).toBe(400);
        });

        it('rejects a whitespace-only password with 400, as a required field (edge case)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Débora',
                email: 'senhaespacos@example.com',
                password: '        ',
            });

            expect(response.status).toBe(400);
        });

        it('rejects a whitespace-only name with 400, as a required field (edge case)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: '   ',
                email: 'nomeespacos@example.com',
                password: 'senha1234',
            });

            expect(response.status).toBe(400);
        });

        it('accepts a name and password with real content surrounded by whitespace (edge case)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/signup').send({
                name: '  Débora  ',
                email: 'espacosvalidos@example.com',
                password: '  senha1234  ',
            });

            expect(response.status).toBe(201);
        });
    });

    describe('POST /auth/login', () => {
        beforeEach(async () => {
            await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Login User',
                email: 'login@example.com',
                password: 'senha1234',
            });
        });

        it('authenticates with correct credentials and returns a JWT with sub/name/email claims expiring in 7 days (AUTH-07, AUTH-11)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/login').send({
                email: 'login@example.com',
                password: 'senha1234',
            });

            expect(response.status).toBe(200);
            expect(typeof response.body.data.accessToken).toBe('string');

            const payload = decodeJwtPayload(response.body.data.accessToken);
            expect(payload.name).toBe('Login User');
            expect(payload.email).toBe('login@example.com');
            expect(payload.exp - payload.iat).toBe(7 * 24 * 60 * 60);
        });

        it('rejects a wrong password with 401 and the generic message (AUTH-08)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/login').send({
                email: 'login@example.com',
                password: 'senha-errada',
            });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('E-mail ou senha inválidos');
        });

        it('rejects an unknown email with 401 and the exact same generic message as a wrong password (AUTH-08)', async () => {
            const response = await request(app.getHttpServer()).post('/auth/login').send({
                email: 'nao-existe@example.com',
                password: 'senha1234',
            });

            expect(response.status).toBe(401);
            expect(response.body.message).toBe('E-mail ou senha inválidos');
        });

        it('logs in with the exact same padded password used at signup, proving the password is never silently trimmed before hashing (regression)', async () => {
            const paddedPassword = '  MyPass123  ';

            const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Espacos Login',
                email: 'espacoslogin@example.com',
                password: paddedPassword,
            });
            expect(signupResponse.status).toBe(201);

            const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
                email: 'espacoslogin@example.com',
                password: paddedPassword,
            });

            expect(loginResponse.status).toBe(200);
            expect(typeof loginResponse.body.data.accessToken).toBe('string');
        });
    });

    describe('GET /auth/me', () => {
        it('returns the authenticated profile with a valid bearer token (AUTH-17)', async () => {
            await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Perfil User',
                email: 'perfil@example.com',
                password: 'senha1234',
            });
            const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
                email: 'perfil@example.com',
                password: 'senha1234',
            });
            const token = loginResponse.body.data.accessToken;

            const response = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${token}`);

            expect(response.status).toBe(200);
            expect(response.body.data).toEqual({
                id: expect.any(Number),
                name: 'Perfil User',
                email: 'perfil@example.com',
                phone: null,
            });
        });

        it('returns the stored phone digits in the profile (JOIN-13)', async () => {
            await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Perfil Com Telefone',
                email: 'perfilfone@example.com',
                password: 'senha1234',
                phone: '(51) 98888-7777',
            });
            const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
                email: 'perfilfone@example.com',
                password: 'senha1234',
            });

            const response = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${loginResponse.body.data.accessToken}`);

            expect(response.status).toBe(200);
            expect(response.body.data.phone).toBe('51988887777');
        });

        it('responds 401 without a bearer token (AUTH-18)', async () => {
            const response = await request(app.getHttpServer()).get('/auth/me');

            expect(response.status).toBe(401);
        });

        it('responds 401 with an expired bearer token for a user that still exists (AUTH-12, AUTH-18)', async () => {
            const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
                name: 'Expirada User',
                email: 'expirada@example.com',
                password: 'senha1234',
            });
            const userId = signupResponse.body.data.id;

            // Signed for a real, still-existing user id so a 401 here can only come
            // from the expiration check, not from "user not found" (JwtStrategy.validate).
            const expiredToken = jwtService.sign(
                { sub: userId, name: 'Expirada User', email: 'expirada@example.com' },
                { expiresIn: '-10s' },
            );

            const response = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', `Bearer ${expiredToken}`);

            expect(response.status).toBe(401);
        });

        it('responds 401 with a malformed bearer token (AUTH-12, AUTH-18)', async () => {
            const response = await request(app.getHttpServer())
                .get('/auth/me')
                .set('Authorization', 'Bearer not.a.valid.jwt');

            expect(response.status).toBe(401);
        });
    });
});
