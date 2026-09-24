import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RideService } from './ride.service.js';
import { RideEntity, RideStatus } from './entities/ride.entity.js';
import { UserRideEntity } from '../user-ride/entities/user-ride.entity.js';
import { TransportRideTypeEntity } from '../transport-ride-type/entities/transport-ride-type.entity.js';

const OWNER_ID = 1;
const PASSENGER_ID = 2;

function buildRide(overrides: Partial<RideEntity> = {}): RideEntity {
    return {
        id: 10,
        date: '2026-12-01',
        hour: '08:00',
        city: 'São Leopoldo',
        totalSpots: 3,
        userId: OWNER_ID,
        status: RideStatus.ACTIVE,
        user: { id: OWNER_ID, name: 'Dona da Carona', phone: '51999999999' },
        transportType: { id: 1, name: 'Carro' },
        ...overrides,
    } as RideEntity;
}

describe('RideService', () => {
    let service: RideService;
    let rideRepository: {
        find: ReturnType<typeof vi.fn>;
        findOne: ReturnType<typeof vi.fn>;
        create: ReturnType<typeof vi.fn>;
        save: ReturnType<typeof vi.fn>;
        manager: { transaction: ReturnType<typeof vi.fn> };
    };
    // O cancelamento roda dentro de uma transação; este é o manager que ela
    // entrega ao callback.
    let transactionManager: {
        findOne: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        update: ReturnType<typeof vi.fn>;
        delete: ReturnType<typeof vi.fn>;
        remove: ReturnType<typeof vi.fn>;
    };
    let userRideRepository: {
        count: ReturnType<typeof vi.fn>;
        find: ReturnType<typeof vi.fn>;
        createQueryBuilder: ReturnType<typeof vi.fn>;
    };
    let transportTypeRepository: {
        findOne: ReturnType<typeof vi.fn>;
    };
    let getRawMany: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();

        getRawMany = vi.fn().mockResolvedValue([]);
        const queryBuilder = {
            select: vi.fn().mockReturnThis(),
            addSelect: vi.fn().mockReturnThis(),
            where: vi.fn().mockReturnThis(),
            groupBy: vi.fn().mockReturnThis(),
            getRawMany,
        };

        transactionManager = {
            findOne: vi.fn(),
            count: vi.fn().mockResolvedValue(0),
            update: vi.fn(),
            delete: vi.fn(),
            remove: vi.fn(),
        };

        rideRepository = {
            find: vi.fn().mockResolvedValue([]),
            findOne: vi.fn(),
            create: vi.fn((data) => data),
            save: vi.fn(),
            manager: {
                transaction: vi.fn((callback: (manager: typeof transactionManager) => unknown) =>
                    callback(transactionManager),
                ),
            },
        };
        userRideRepository = {
            count: vi.fn().mockResolvedValue(0),
            find: vi.fn().mockResolvedValue([]),
            createQueryBuilder: vi.fn(() => queryBuilder),
        };
        transportTypeRepository = { findOne: vi.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                RideService,
                { provide: getRepositoryToken(RideEntity), useValue: rideRepository },
                { provide: getRepositoryToken(UserRideEntity), useValue: userRideRepository },
                { provide: getRepositoryToken(TransportRideTypeEntity), useValue: transportTypeRepository },
            ],
        }).compile();

        service = module.get(RideService);
    });

    describe('createRide', () => {
        const dto = {
            date: '2026-12-01',
            hour: '08:00',
            city: 'São Leopoldo',
            transportTypeId: 1,
            totalSpots: 3,
        };

        it('attributes the ride to the authenticated user id (JOIN-15)', async () => {
            transportTypeRepository.findOne.mockResolvedValue({ id: 1, name: 'Carro' });
            rideRepository.save.mockResolvedValue({ id: 10 });
            rideRepository.findOne.mockResolvedValue(buildRide());

            await service.createRide(dto, OWNER_ID);

            expect(rideRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId: OWNER_ID, city: 'São Leopoldo' }),
            );
            expect(rideRepository.save).toHaveBeenCalled();
        });

        it('rejects with 404 when the transport type does not exist', async () => {
            transportTypeRepository.findOne.mockResolvedValue(null);

            const promise = service.createRide(dto, OWNER_ID);

            await expect(promise).rejects.toBeInstanceOf(NotFoundException);
            await expect(promise).rejects.toThrow('Tipo de transporte não encontrado');
            expect(rideRepository.save).not.toHaveBeenCalled();
        });

        it('returns the new ride with no occupied seats yet', async () => {
            transportTypeRepository.findOne.mockResolvedValue({ id: 1, name: 'Carro' });
            rideRepository.save.mockResolvedValue({ id: 10 });
            rideRepository.findOne.mockResolvedValue(buildRide());

            const result = await service.createRide(dto, OWNER_ID);

            expect(result.occupiedSpots).toBe(0);
            expect(result.availableSpots).toBe(3);
        });
    });

    describe('getRides', () => {
        it('takes the displayed name and phone from the ride owner account (JOIN-19)', async () => {
            rideRepository.find.mockResolvedValue([buildRide()]);

            const [ride] = await service.getRides();

            expect(ride.name).toBe('Dona da Carona');
            expect(ride.phone).toBe('51999999999');
        });

        it('returns phone as null when the owner has none (JOIN-20)', async () => {
            rideRepository.find.mockResolvedValue([
                buildRide({ user: { id: OWNER_ID, name: 'Sem Fone' } as RideEntity['user'] }),
            ]);

            const [ride] = await service.getRides();

            expect(ride.phone).toBeNull();
        });

        it('reports isOwner true only for the account that published the ride (JOIN-08)', async () => {
            rideRepository.find.mockResolvedValue([buildRide()]);

            const [asOwner] = await service.getRides(undefined, undefined, OWNER_ID);
            const [asOther] = await service.getRides(undefined, undefined, PASSENGER_ID);

            expect(asOwner.isOwner).toBe(true);
            expect(asOther.isOwner).toBe(false);
        });

        it('reports alreadyJoined true only for a ride the account confirmed (JOIN-07)', async () => {
            rideRepository.find.mockResolvedValue([buildRide({ id: 10 }), buildRide({ id: 11 })]);
            userRideRepository.find.mockResolvedValue([{ idRide: 11 }]);

            const rides = await service.getRides(undefined, undefined, PASSENGER_ID);

            expect(rides.find((ride) => ride.id === 11)?.alreadyJoined).toBe(true);
            expect(rides.find((ride) => ride.id === 10)?.alreadyJoined).toBe(false);
        });

        it('reports both flags false for an anonymous request, without querying presences (JOIN-07, JOIN-08)', async () => {
            rideRepository.find.mockResolvedValue([buildRide()]);

            const [ride] = await service.getRides();

            expect(ride.isOwner).toBe(false);
            expect(ride.alreadyJoined).toBe(false);
            expect(userRideRepository.find).not.toHaveBeenCalled();
        });

        it('derives occupied and available seats from the aggregated counts (JOIN-09)', async () => {
            rideRepository.find.mockResolvedValue([buildRide({ id: 10 }), buildRide({ id: 11 })]);
            getRawMany.mockResolvedValue([{ idRide: 10, total: '2' }]);

            const rides = await service.getRides();

            const first = rides.find((ride) => ride.id === 10);
            const second = rides.find((ride) => ride.id === 11);

            expect(first?.occupiedSpots).toBe(2);
            expect(first?.availableSpots).toBe(1);
            expect(second?.occupiedSpots).toBe(0);
            expect(second?.availableSpots).toBe(3);
        });

        // Guarda contra a volta do N+1: o count por carona dentro do map foi
        // trocado por uma agregação única para toda a listagem.
        it('resolves seats and presences with one query each, regardless of how many rides are listed', async () => {
            rideRepository.find.mockResolvedValue([
                buildRide({ id: 10 }),
                buildRide({ id: 11 }),
                buildRide({ id: 12 }),
            ]);

            await service.getRides(undefined, undefined, PASSENGER_ID);

            expect(userRideRepository.createQueryBuilder).toHaveBeenCalledTimes(1);
            expect(userRideRepository.find).toHaveBeenCalledTimes(1);
            expect(userRideRepository.count).not.toHaveBeenCalled();
        });

        it('carries the ride status through to the response (CANCEL-13)', async () => {
            rideRepository.find.mockResolvedValue([
                buildRide({ id: 10 }),
                buildRide({ id: 11, status: RideStatus.CANCELED }),
            ]);

            const rides = await service.getRides();

            expect(rides.find((ride) => ride.id === 10)?.status).toBe(RideStatus.ACTIVE);
            expect(rides.find((ride) => ride.id === 11)?.status).toBe(RideStatus.CANCELED);
        });

        it('answers an empty board for a date already gone, without querying (PAST-03)', async () => {
            const rides = await service.getRides(undefined, '2020-01-01');

            expect(rides).toEqual([]);
            expect(rideRepository.find).not.toHaveBeenCalled();
        });

        it('queries nothing about presences when no ride matches the filters', async () => {
            rideRepository.find.mockResolvedValue([]);

            const rides = await service.getRides('99');

            expect(rides).toEqual([]);
            expect(userRideRepository.createQueryBuilder).not.toHaveBeenCalled();
        });
    });

    describe('getRideById', () => {
        it('rejects with 404 when the ride does not exist (JOIN-28)', async () => {
            rideRepository.findOne.mockResolvedValue(null);

            const promise = service.getRideById(404);

            await expect(promise).rejects.toBeInstanceOf(NotFoundException);
            await expect(promise).rejects.toThrow('Corrida não encontrada');
        });

        it('carries the ride status through to the response (CANCEL-13)', async () => {
            rideRepository.findOne.mockResolvedValue(buildRide({ status: RideStatus.CANCELED }));

            const ride = await service.getRideById(10);

            expect(ride.status).toBe(RideStatus.CANCELED);
        });

        it('carries the same viewer flags as the listing (JOIN-07, JOIN-08)', async () => {
            rideRepository.findOne.mockResolvedValue(buildRide());
            userRideRepository.count.mockResolvedValue(1);
            userRideRepository.find.mockResolvedValue([{ idRide: 10 }]);

            const ride = await service.getRideById(10, PASSENGER_ID);

            expect(ride.isOwner).toBe(false);
            expect(ride.alreadyJoined).toBe(true);
            expect(ride.occupiedSpots).toBe(1);
        });
    });

    describe('cancelRide', () => {
        it('removes a ride nobody joined, taking it off the board (CANCEL-05)', async () => {
            transactionManager.findOne.mockResolvedValue(buildRide());
            transactionManager.count.mockResolvedValue(0);

            const result = await service.cancelRide(10, OWNER_ID);

            expect(result).toEqual({ id: 10, status: RideStatus.DELETED });
            expect(transactionManager.update).toHaveBeenCalledWith(RideEntity, 10, {
                status: RideStatus.DELETED,
            });
        });

        it('cancels a ride with passengers and leaves their rows untouched (CANCEL-06)', async () => {
            transactionManager.findOne.mockResolvedValue(buildRide());
            transactionManager.count.mockResolvedValue(2);

            const result = await service.cancelRide(10, OWNER_ID);

            expect(result).toEqual({ id: 10, status: RideStatus.CANCELED });
            expect(transactionManager.update).toHaveBeenCalledWith(RideEntity, 10, {
                status: RideStatus.CANCELED,
            });
            // O vínculo das passageiras é o que mantém a dona com canal para
            // avisar cada uma: cancelar não o desfaz.
            expect(transactionManager.delete).not.toHaveBeenCalled();
            expect(transactionManager.remove).not.toHaveBeenCalled();
        });

        it('refuses an account that does not own the ride (CANCEL-09)', async () => {
            transactionManager.findOne.mockResolvedValue(buildRide());

            const promise = service.cancelRide(10, PASSENGER_ID);

            await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
            await expect(promise).rejects.toThrow('Apenas a dona da carona pode cancelá-la');
            expect(transactionManager.update).not.toHaveBeenCalled();
        });

        it('rejects with 404 when the ride does not exist (CANCEL-10)', async () => {
            transactionManager.findOne.mockResolvedValue(null);

            const promise = service.cancelRide(404, OWNER_ID);

            await expect(promise).rejects.toBeInstanceOf(NotFoundException);
            await expect(promise).rejects.toThrow('Corrida não encontrada');
            expect(transactionManager.update).not.toHaveBeenCalled();
        });

        it('rejects with 404 when the ride was already removed (CANCEL-10)', async () => {
            transactionManager.findOne.mockResolvedValue(buildRide({ status: RideStatus.DELETED }));

            const promise = service.cancelRide(10, OWNER_ID);

            await expect(promise).rejects.toBeInstanceOf(NotFoundException);
            expect(transactionManager.update).not.toHaveBeenCalled();
        });

        it('rejects with 409 when the ride is already canceled (CANCEL-11)', async () => {
            transactionManager.findOne.mockResolvedValue(buildRide({ status: RideStatus.CANCELED }));

            const promise = service.cancelRide(10, OWNER_ID);

            await expect(promise).rejects.toBeInstanceOf(ConflictException);
            await expect(promise).rejects.toThrow('Esta carona já foi cancelada');
            expect(transactionManager.update).not.toHaveBeenCalled();
        });

        // A ordem protege quem não é dona de aprender o que existe e em que
        // estado está.
        it('answers 404, not 403, for a ride that is not there (CANCEL-09, CANCEL-10)', async () => {
            transactionManager.findOne.mockResolvedValue(null);

            await expect(service.cancelRide(404, PASSENGER_ID)).rejects.toBeInstanceOf(
                NotFoundException,
            );
        });

        it('answers 403, not 409, when a stranger targets a canceled ride (CANCEL-09)', async () => {
            transactionManager.findOne.mockResolvedValue(buildRide({ status: RideStatus.CANCELED }));

            await expect(service.cancelRide(10, PASSENGER_ID)).rejects.toBeInstanceOf(
                ForbiddenException,
            );
        });
    });
});
