import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RideEntity } from './entities/ride.entity.js';
import { In, Repository } from 'typeorm';
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

    async createRide(dto: CreateRideDto): Promise<ResponseRideDto> {
        const { transportTypeId, ...rideData } = dto;

        const transportType = await this.transportTypeRepository.findOne({ where: { id: transportTypeId } });

        if (!transportType) throw new NotFoundException('Tipo de transporte não encontrado');

        const newRide = this.rideRepository.create({
            ...rideData,
            transportType: { id: transportTypeId },
        });

        return RideMapper.toResponse(await this.rideRepository.save(newRide), 0);
    }

    async getRideById(id: number): Promise<ResponseRideDto | null> {
        const ride = await this.rideRepository.findOne({
            where: { id },
            relations: { transportType: true },
        })

        if (!ride) throw new NotFoundException('Corrida não encontrada');

        const occupiedSpots = await this.userRideRepository.count({
            where: {
                idRide: ride.id,
            },
        })

        return RideMapper.toResponse(ride, occupiedSpots ?? 0);
    }

    async getRides(transportType?: string, date?: string): Promise<ResponseRideDto[]> {
        const transportTypes = transportType
            ? transportType.split(",").map(Number)
            : undefined

        const dateQuery = date
            ?? undefined

        const rides = await this.rideRepository.find({
            where: {
                ...(transportTypes && {
                    transportType: {
                        id: In(transportTypes),
                    },
                }),

                ...(dateQuery && {
                    date: dateQuery,
                }),
            },
            relations: { transportType: true },
        })

        const responseRides = await Promise.all(
            rides.map(async (ride) => {
                const occupiedSpots = await this.userRideRepository.count({
                    where: {
                        idRide: ride.id,
                    },
                });

                return RideMapper.toResponse(ride, occupiedSpots);
            }),
        );

        return responseRides;
    }
}
