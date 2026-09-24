import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RideEntity, RideStatus } from './entities/ride.entity.js';
import { In, Not, Repository } from 'typeorm';
import { CreateRideDto } from './dto/create-ride.dto.js';
import { RideMapper } from '../utils/mappers/ride.mapper.js';
import { ResponseRideDto } from './dto/response-ride.dto.js';
import { TransportRideTypeEntity } from '../transport-ride-type/entities/transport-ride-type.entity.js';
import { UserRideEntity } from '../user-ride/entities/user-ride.entity.js';

@Injectable()
export class RideService {
    constructor(
        @InjectRepository(RideEntity)
        private readonly rideRepository: Repository<RideEntity>,
        @InjectRepository(UserRideEntity)
        private readonly userRideRepository: Repository<UserRideEntity>,
        @InjectRepository(TransportRideTypeEntity)
        private readonly transportTypeRepository: Repository<TransportRideTypeEntity>
    ) { }

    async createRide(dto: CreateRideDto, userId: number): Promise<ResponseRideDto> {
        const { transportTypeId, ...rideData } = dto;

        const transportType = await this.transportTypeRepository.findOne({ where: { id: transportTypeId } });

        if (!transportType) throw new NotFoundException('Tipo de transporte não encontrado');

        const newRide = this.rideRepository.create({
            ...rideData,
            transportType: { id: transportTypeId },
            userId,
        });

        const saved = await this.rideRepository.save(newRide);

        return RideMapper.toResponse(await this.findRideOrFail(saved.id), 0);
    }

    async getRideById(id: number, currentUserId?: number): Promise<ResponseRideDto> {
        const ride = await this.findRideOrFail(id);

        const occupiedSpots = await this.userRideRepository.count({
            where: {
                idRide: ride.id,
            },
        })

        const joinedRideIds = await this.findJoinedRideIds([ride.id], currentUserId);

        return RideMapper.toResponse(ride, occupiedSpots, {
            isOwner: currentUserId !== undefined && ride.userId === currentUserId,
            alreadyJoined: joinedRideIds.has(ride.id),
        });
    }

    async getRides(transportType?: string, date?: string, currentUserId?: number): Promise<ResponseRideDto[]> {
        const transportTypes = transportType
            ? transportType.split(",").map(Number)
            : undefined

        const dateQuery = date
            ?? undefined

        const rides = await this.rideRepository.find({
            where: {
                // Uma carona `deleted` é um cancelamento que ninguém precisa
                // ver: não havia passageiras para avisar.
                status: Not(RideStatus.DELETED),

                ...(transportTypes && {
                    transportType: {
                        id: In(transportTypes),
                    },
                }),

                ...(dateQuery && {
                    date: dateQuery,
                }),
            },
            relations: { transportType: true, user: true },
        })

        const rideIds = rides.map((ride) => ride.id);
        const occupiedByRide = await this.countOccupiedSpots(rideIds);
        const joinedRideIds = await this.findJoinedRideIds(rideIds, currentUserId);

        return rides.map((ride) => RideMapper.toResponse(ride, occupiedByRide.get(ride.id) ?? 0, {
            isOwner: currentUserId !== undefined && ride.userId === currentUserId,
            alreadyJoined: joinedRideIds.has(ride.id),
        }));
    }

    // Uma consulta para toda a listagem, não uma por carona. Sem usuária
    // autenticada não há o que consultar: o mural é público.
    private async findJoinedRideIds(rideIds: number[], currentUserId?: number): Promise<Set<number>> {
        if (currentUserId === undefined || rideIds.length === 0) return new Set();

        const rows = await this.userRideRepository.find({
            where: { userId: currentUserId, idRide: In(rideIds) },
            select: { idRide: true },
        });

        return new Set(rows.map((row) => row.idRide));
    }

    // Uma consulta agregada para todas as caronas da listagem, em vez de um
    // count por carona dentro do map (era um N+1).
    private async countOccupiedSpots(rideIds: number[]): Promise<Map<number, number>> {
        if (rideIds.length === 0) return new Map();

        const rows = await this.userRideRepository
            .createQueryBuilder('userRide')
            .select('userRide.id_ride', 'idRide')
            .addSelect('COUNT(*)', 'total')
            .where('userRide.id_ride IN (:...rideIds)', { rideIds })
            .groupBy('userRide.id_ride')
            .getRawMany<{ idRide: number; total: string }>();

        return new Map(rows.map((row) => [Number(row.idRide), Number(row.total)]));
    }

    private async findRideOrFail(id: number): Promise<RideEntity> {
        const ride = await this.rideRepository.findOne({
            where: { id, status: Not(RideStatus.DELETED) },
            relations: { transportType: true, user: true },
        });

        if (!ride) throw new NotFoundException('Corrida não encontrada');

        return ride;
    }
}
