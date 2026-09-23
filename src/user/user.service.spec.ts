import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserService } from './user.service.js';
import { UserEntity } from './entities/user.entity.js';

describe('UserService', () => {
    let service: UserService;
    let repository: {
        create: ReturnType<typeof vi.fn>;
        save: ReturnType<typeof vi.fn>;
        findOne: ReturnType<typeof vi.fn>;
    };

    beforeEach(async () => {
        repository = {
            create: vi.fn(),
            save: vi.fn(),
            findOne: vi.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserService,
                { provide: getRepositoryToken(UserEntity), useValue: repository },
            ],
        }).compile();

        service = module.get(UserService);
    });

    describe('create', () => {
        it('persists a new user built from the given data and returns the saved entity', async () => {
            const data = { name: 'Ana', email: 'ana@example.com', passwordHash: 'hashed-value' };
            const createdEntity = { id: 1, ...data, createdAt: new Date() } as UserEntity;

            repository.create.mockReturnValue(createdEntity);
            repository.save.mockResolvedValue(createdEntity);

            const result = await service.create(data);

            expect(repository.create).toHaveBeenCalledWith(data);
            expect(repository.save).toHaveBeenCalledWith(createdEntity);
            expect(result).toEqual(createdEntity);
        });
    });

    describe('findByEmail', () => {
        it('returns the user when the email exists', async () => {
            const user = {
                id: 1,
                name: 'Ana',
                email: 'ana@example.com',
                passwordHash: 'hash',
                createdAt: new Date(),
            } as UserEntity;
            repository.findOne.mockResolvedValue(user);

            const result = await service.findByEmail('ana@example.com');

            expect(repository.findOne).toHaveBeenCalledWith({ where: { email: 'ana@example.com' } });
            expect(result).toEqual(user);
        });

        it('returns null when the email does not exist', async () => {
            repository.findOne.mockResolvedValue(null);

            const result = await service.findByEmail('missing@example.com');

            expect(repository.findOne).toHaveBeenCalledWith({ where: { email: 'missing@example.com' } });
            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('returns the user when the id exists', async () => {
            const user = {
                id: 1,
                name: 'Ana',
                email: 'ana@example.com',
                passwordHash: 'hash',
                createdAt: new Date(),
            } as UserEntity;
            repository.findOne.mockResolvedValue(user);

            const result = await service.findById(1);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
            expect(result).toEqual(user);
        });

        it('returns null when the id does not exist', async () => {
            repository.findOne.mockResolvedValue(null);

            const result = await service.findById(999);

            expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 999 } });
            expect(result).toBeNull();
        });
    });
});
