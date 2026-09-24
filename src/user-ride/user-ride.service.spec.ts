import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UserRideService } from './user-ride.service.js';
import { UserRideEntity } from './entities/user-ride.entity.js';
import { RideEntity } from '../ride/entities/ride.entity.js';

describe('UserRideService', () => {
    let service: UserRideService;
    let userRideRepository: {
        findOne: ReturnType<typeof vi.fn>;
        find: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        save: ReturnType<typeof vi.fn>;
    };
    let rideRepository: {
        findOne: ReturnType<typeof vi.fn>;
    };

    const OWNER_ID = 1;
    const PASSENGER_ID = 2;

    const ride = { id: 10, userId: OWNER_ID, totalSpots: 3 } as RideEntity;

    const savedPresence = {
        id: 99,
        idRide: 10,
        userId: PASSENGER_ID,
        user: { id: PASSENGER_ID, name: 'Passageira', phone: '51999999999' },
    } as UserRideEntity;

    beforeEach(async () => {
        vi.clearAllMocks();

        userRideRepository = {
            findOne: vi.fn(),
            find: vi.fn(),
            count: vi.fn(),
            create: vi.fn((data) => data),
            save: vi.fn(),
        };
        rideRepository = { findOne: vi.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UserRideService,
                { provide: getRepositoryToken(UserRideEntity), useValue: userRideRepository },
                { provide: getRepositoryToken(RideEntity), useValue: rideRepository },
            ],
        }).compile();

        service = module.get(UserRideService);
    });

    describe('createUserRide', () => {
        it('persists the presence with the ride id and the authenticated user id (JOIN-02)', async () => {
            rideRepository.findOne.mockResolvedValue(ride);
            userRideRepository.findOne
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(savedPresence);
            userRideRepository.count.mockResolvedValue(0);
            userRideRepository.save.mockResolvedValue(savedPresence);

            const result = await service.createUserRide(10, PASSENGER_ID);

            expect(userRideRepository.save).toHaveBeenCalledWith({ idRide: 10, userId: PASSENGER_ID });
            expect(result).toEqual({ id: 99, name: 'Passageira', phone: '51999999999' });
        });

        it('rejects with 404 and the exact message when the ride does not exist (JOIN-28)', async () => {
            rideRepository.findOne.mockResolvedValue(null);

            const promise = service.createUserRide(404, PASSENGER_ID);

            await expect(promise).rejects.toBeInstanceOf(NotFoundException);
            await expect(promise).rejects.toThrow('Corrida não encontrada');
            expect(userRideRepository.save).not.toHaveBeenCalled();
        });

        it('rejects the owner confirming presence on her own ride (JOIN-08)', async () => {
            rideRepository.findOne.mockResolvedValue(ride);

            const promise = service.createUserRide(10, OWNER_ID);

            await expect(promise).rejects.toBeInstanceOf(ConflictException);
            await expect(promise).rejects.toThrow('Você não pode confirmar presença na própria carona');
            expect(userRideRepository.save).not.toHaveBeenCalled();
        });

        it('rejects a second confirmation from the same user with the exact message (JOIN-05)', async () => {
            rideRepository.findOne.mockResolvedValue(ride);
            userRideRepository.findOne.mockResolvedValue(savedPresence);

            const promise = service.createUserRide(10, PASSENGER_ID);

            await expect(promise).rejects.toBeInstanceOf(ConflictException);
            await expect(promise).rejects.toThrow('Você já confirmou presença nesta carona');
            expect(userRideRepository.save).not.toHaveBeenCalled();
        });

        it('rejects a confirmation when the ride has no seats left (JOIN-29)', async () => {
            rideRepository.findOne.mockResolvedValue(ride);
            userRideRepository.findOne.mockResolvedValue(null);
            userRideRepository.count.mockResolvedValue(3);

            const promise = service.createUserRide(10, PASSENGER_ID);

            await expect(promise).rejects.toBeInstanceOf(ConflictException);
            await expect(promise).rejects.toThrow('Esta carona não tem mais vagas');
            expect(userRideRepository.save).not.toHaveBeenCalled();
        });

        it('translates a unique-violation (23505) from a concurrent insert into the duplicate 409 (JOIN-30)', async () => {
            rideRepository.findOne.mockResolvedValue(ride);
            userRideRepository.findOne.mockResolvedValue(null);
            userRideRepository.count.mockResolvedValue(0);
            userRideRepository.save.mockRejectedValue({ code: '23505', message: 'duplicate key' });

            const promise = service.createUserRide(10, PASSENGER_ID);

            await expect(promise).rejects.toBeInstanceOf(ConflictException);
            await expect(promise).rejects.toThrow('Você já confirmou presença nesta carona');
        });

        it('rethrows an unexpected persistence error instead of masking it as a conflict', async () => {
            rideRepository.findOne.mockResolvedValue(ride);
            userRideRepository.findOne.mockResolvedValue(null);
            userRideRepository.count.mockResolvedValue(0);
            userRideRepository.save.mockRejectedValue({ code: '08006', message: 'connection failure' });

            const promise = service.createUserRide(10, PASSENGER_ID);

            await expect(promise).rejects.not.toBeInstanceOf(ConflictException);
        });
    });

    describe('getUserRidesByRideId', () => {
        it('returns each passenger name and phone taken from their account (JOIN-21, JOIN-22)', async () => {
            rideRepository.findOne.mockResolvedValue(ride);
            userRideRepository.find.mockResolvedValue([
                savedPresence,
                { id: 100, idRide: 10, userId: 3, user: { id: 3, name: 'Sem Fone', phone: null } },
            ]);

            const result = await service.getUserRidesByRideId(10, OWNER_ID);

            expect(result).toEqual([
                { id: 99, name: 'Passageira', phone: '51999999999' },
                { id: 100, name: 'Sem Fone', phone: null },
            ]);
        });

        it('returns an empty list when nobody confirmed presence (JOIN-25)', async () => {
            rideRepository.findOne.mockResolvedValue(ride);
            userRideRepository.find.mockResolvedValue([]);

            const result = await service.getUserRidesByRideId(10, OWNER_ID);

            expect(result).toEqual([]);
        });

        it('forbids a requester who is not the ride owner and returns no passenger data (JOIN-23)', async () => {
            rideRepository.findOne.mockResolvedValue(ride);

            const promise = service.getUserRidesByRideId(10, PASSENGER_ID);

            await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
            expect(userRideRepository.find).not.toHaveBeenCalled();
        });

        it('rejects with 404 when the ride does not exist (JOIN-28)', async () => {
            rideRepository.findOne.mockResolvedValue(null);

            const promise = service.getUserRidesByRideId(404, OWNER_ID);

            await expect(promise).rejects.toBeInstanceOf(NotFoundException);
            await expect(promise).rejects.toThrow('Corrida não encontrada');
        });
    });
});
