import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from './auth.service.js';
import { UserService } from '../user/user.service.js';
import { JwtService } from '@nestjs/jwt';
import { UserEntity } from '../user/entities/user.entity.js';

vi.mock('bcrypt', () => ({
    hash: vi.fn(),
    compare: vi.fn(),
}));

import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
    let service: AuthService;
    let userService: {
        create: ReturnType<typeof vi.fn>;
        findByEmail: ReturnType<typeof vi.fn>;
        findById: ReturnType<typeof vi.fn>;
    };
    let jwtService: {
        sign: ReturnType<typeof vi.fn>;
    };

    const existingUser: UserEntity = {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
    } as UserEntity;

    beforeEach(async () => {
        vi.clearAllMocks();

        userService = {
            create: vi.fn(),
            findByEmail: vi.fn(),
            findById: vi.fn(),
        };
        jwtService = {
            sign: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                { provide: UserService, useValue: userService },
                { provide: JwtService, useValue: jwtService },
            ],
        }).compile();

        service = module.get(AuthService);
    });

    describe('signUp', () => {
        it('rejects with the duplicate-email message when the email is already registered (pre-check)', async () => {
            userService.findByEmail.mockResolvedValue(existingUser);

            const promise = service.signUp({
                name: 'Ana',
                email: 'ana@example.com',
                password: 'senha1234',
            });

            await expect(promise).rejects.toBeInstanceOf(ConflictException);
            await expect(promise).rejects.toThrow('E-mail já cadastrado');
            expect(userService.create).not.toHaveBeenCalled();
        });

        it('hashes the password with bcrypt and persists the hash, never the plaintext', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedvalue');
            const created = { ...existingUser, passwordHash: '$2b$10$hashedvalue' };
            userService.create.mockResolvedValue(created);

            const result = await service.signUp({
                name: 'Ana',
                email: 'ana@example.com',
                password: 'senha1234',
            });

            expect(bcrypt.hash).toHaveBeenCalledWith('senha1234', 10);
            expect(userService.create).toHaveBeenCalledWith({
                name: 'Ana',
                email: 'ana@example.com',
                passwordHash: '$2b$10$hashedvalue',
            });
            expect(result).toEqual(created);
            expect(result.passwordHash).not.toBe('senha1234');
        });

        it('strips the mask and persists the phone as digits only (JOIN-10)', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedvalue');
            userService.create.mockResolvedValue(existingUser);

            await service.signUp({
                name: 'Ana',
                email: 'ana@example.com',
                password: 'senha1234',
                phone: '(51) 99999-9999',
            });

            expect(userService.create).toHaveBeenCalledWith({
                name: 'Ana',
                email: 'ana@example.com',
                passwordHash: '$2b$10$hashedvalue',
                phone: '51999999999',
            });
        });

        it('keeps a digits-only phone untouched (JOIN-10)', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedvalue');
            userService.create.mockResolvedValue(existingUser);

            await service.signUp({
                name: 'Ana',
                email: 'ana@example.com',
                password: 'senha1234',
                phone: '51999999999',
            });

            expect(userService.create.mock.calls[0][0].phone).toBe('51999999999');
        });

        it('persists undefined - not an empty string - when no phone is sent (JOIN-11)', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedvalue');
            userService.create.mockResolvedValue(existingUser);

            await service.signUp({
                name: 'Ana',
                email: 'ana@example.com',
                password: 'senha1234',
            });

            expect(userService.create.mock.calls[0][0].phone).toBeUndefined();
        });

        it('translates a DB unique-violation error (code 23505) into the same ConflictException as the pre-check', async () => {
            userService.findByEmail.mockResolvedValue(null);
            (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue('$2b$10$hashedvalue');
            userService.create.mockRejectedValue({ code: '23505', message: 'duplicate key' });

            const promise = service.signUp({
                name: 'Ana',
                email: 'ana@example.com',
                password: 'senha1234',
            });

            await expect(promise).rejects.toBeInstanceOf(ConflictException);
            await expect(promise).rejects.toThrow('E-mail já cadastrado');
        });
    });

    describe('validateUser', () => {
        it('throws the generic invalid-credentials message when the email does not exist', async () => {
            userService.findByEmail.mockResolvedValue(null);

            const promise = service.validateUser('missing@example.com', 'senha1234');

            await expect(promise).rejects.toBeInstanceOf(UnauthorizedException);
            await expect(promise).rejects.toThrow('E-mail ou senha inválidos');
        });

        it('throws the exact same generic message for a wrong password as for an unknown email', async () => {
            userService.findByEmail.mockResolvedValue(null);
            const notFoundPromise = service.validateUser('missing@example.com', 'senha1234');
            let notFoundMessage = '';
            await notFoundPromise.catch((error: Error) => {
                notFoundMessage = error.message;
            });

            userService.findByEmail.mockResolvedValue(existingUser);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
            const wrongPasswordPromise = service.validateUser('ana@example.com', 'wrong-password');

            await expect(wrongPasswordPromise).rejects.toBeInstanceOf(UnauthorizedException);
            await expect(wrongPasswordPromise).rejects.toThrow(notFoundMessage);
            expect(notFoundMessage).toBe('E-mail ou senha inválidos');
        });

        it('returns the user entity when email and password are correct', async () => {
            userService.findByEmail.mockResolvedValue(existingUser);
            (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);

            const result = await service.validateUser('ana@example.com', 'senha1234');

            expect(bcrypt.compare).toHaveBeenCalledWith('senha1234', existingUser.passwordHash);
            expect(result).toEqual(existingUser);
        });
    });

    describe('login', () => {
        it('signs a JWT whose payload contains sub, name and email from the user entity', () => {
            jwtService.sign.mockReturnValue('signed.jwt.token');

            const result = service.login(existingUser);

            expect(jwtService.sign).toHaveBeenCalledWith({
                sub: existingUser.id,
                name: existingUser.name,
                email: existingUser.email,
            });
            expect(result).toEqual({ accessToken: 'signed.jwt.token' });
        });
    });
});
