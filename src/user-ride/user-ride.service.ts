import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRideEntity } from './entities/user-ride.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RideEntity, RideStatus } from '../ride/entities/ride.entity.js';
import { UserRideMapper } from '../utils/mappers/user-ride.mapper.js';
import { ResponseUserRide } from './dto/response-user-ride.dtp.js';

const ALREADY_JOINED_MESSAGE = 'Você já confirmou presença nesta carona';
const OWN_RIDE_MESSAGE = 'Você não pode confirmar presença na própria carona';
const RIDE_FULL_MESSAGE = 'Esta carona não tem mais vagas';
const RIDE_NOT_FOUND_MESSAGE = 'Corrida não encontrada';
const RIDE_CANCELED_MESSAGE = 'Esta carona foi cancelada';
const NOT_THE_OWNER_MESSAGE = 'Apenas a dona da carona pode ver as passageiras';
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class UserRideService {
    constructor(
        @InjectRepository(UserRideEntity)
        private readonly userRideRepository: Repository<UserRideEntity>,
        @InjectRepository(RideEntity)
        private readonly rideRepository: Repository<RideEntity>
    ) { }

    // A passageira é sempre a usuária autenticada: nada de identidade vem do
    // corpo da requisição (AD-001).
    async createUserRide(idRide: number, userId: number): Promise<ResponseUserRide> {
        const saved = await this.userRideRepository.manager.transaction(async (manager) => {
            // Mesmo lock que `cancelRide` toma na linha da carona: os dois
            // caminhos serializam ali, então a presença nunca entra em uma
            // carona que acabou de ser cancelada, nem escapa da contagem que
            // decide o desfecho do cancelamento.
            const ride = await manager.findOne(RideEntity, {
                where: { id: idRide },
                lock: { mode: 'pessimistic_write' },
            });

            if (!ride || ride.status === RideStatus.DELETED) {
                throw new NotFoundException(RIDE_NOT_FOUND_MESSAGE);
            }

            if (ride.status === RideStatus.CANCELED) {
                throw new ConflictException(RIDE_CANCELED_MESSAGE);
            }

            if (ride.userId === userId) {
                throw new ConflictException(OWN_RIDE_MESSAGE);
            }

            const existing = await manager.findOne(UserRideEntity, { where: { idRide, userId } });

            if (existing) {
                throw new ConflictException(ALREADY_JOINED_MESSAGE);
            }

            const occupiedSpots = await manager.count(UserRideEntity, { where: { idRide } });

            if (occupiedSpots >= ride.totalSpots) {
                throw new ConflictException(RIDE_FULL_MESSAGE);
            }

            const newUserRide = manager.create(UserRideEntity, { idRide, userId });

            try {
                return await manager.save(newUserRide);
            } catch (error) {
                // A checagem acima tem janela de corrida; a UNIQUE no banco é a
                // garantia real. Duas requisições simultâneas chegam aqui e uma
                // delas vira 409 em vez de 500.
                if (this.isUniqueViolation(error)) {
                    throw new ConflictException(ALREADY_JOINED_MESSAGE);
                }

                throw error;
            }
        });

        return UserRideMapper.toResponse(await this.findUserRideOrFail(saved.id));
    }

    async getUserRidesByRideId(idRide: number, requesterId: number): Promise<ResponseUserRide[]> {
        const ride = await this.findRideOrFail(idRide);

        if (ride.userId !== requesterId) {
            throw new ForbiddenException(NOT_THE_OWNER_MESSAGE);
        }

        const passengers = await this.userRideRepository.find({
            where: { idRide: ride.id },
            relations: { user: true },
        })

        return passengers.map((passenger) => UserRideMapper.toResponse(passenger));
    }

    // Uma carona `deleted` não existe para nenhuma leitura. Uma `canceled`
    // existe: é por ela que a dona chega às passageiras que precisa avisar.
    private async findRideOrFail(id: number): Promise<RideEntity> {
        const ride = await this.rideRepository.findOne({ where: { id } });

        if (!ride || ride.status === RideStatus.DELETED) {
            throw new NotFoundException(RIDE_NOT_FOUND_MESSAGE);
        }

        return ride;
    }

    private async findUserRideOrFail(id: number): Promise<UserRideEntity> {
        const userRide = await this.userRideRepository.findOne({
            where: { id },
            relations: { user: true },
        });

        if (!userRide) throw new NotFoundException('Presença não encontrada');

        return userRide;
    }

    private isUniqueViolation(error: unknown): boolean {
        return (
            typeof error === 'object' &&
            error !== null &&
            (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION_CODE
        );
    }
}
