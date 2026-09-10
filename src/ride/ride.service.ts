import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RideEntity } from './entities/ride.entity.js';
import { Repository } from 'typeorm';
import { CreateRideDto } from './dto/create-ride.dto.js';
import { RideMapper } from '../utils/mappers/ride.mapper.js';
import { ResponseRideDto } from './dto/response-ride.dto.js';
import { TransportRideTypeEntity } from '../transport-ride-type/entities/transport-ride-type.entity.js';

@Injectable()
export class RideService {
    constructor(
        @InjectRepository(RideEntity)
        private readonly rideRepository: Repository<RideEntity>,
        @InjectRepository(TransportRideTypeEntity)
        private readonly transportTypeRepository: Repository<TransportRideTypeEntity>
    ) { }

    async createRide(dto: CreateRideDto): Promise<RideEntity> {
        const { transport_type_id, ...rideData } = dto;

        const transportType = await this.transportTypeRepository.findOne({ where: { id: transport_type_id } });

        if (!transportType) throw new NotFoundException('Tipo de transporte não encontrado');

        const newRide = this.rideRepository.create({
            ...rideData,
            transportType: { id: transport_type_id },
        });

        return await this.rideRepository.save(newRide);
    }

    async getRideById(id: number): Promise<ResponseRideDto | null> {
        const ride = await this.rideRepository.findOne({
            where: { id },
            relations: { transportType: true },
        })

        if (!ride) throw new NotFoundException('Corrida não encontrada');

        return RideMapper.toResponse(ride);
    }

    async getRides(query?: string): Promise<RideEntity[]> {
        return this.rideRepository.find({
            where: query ? { transportType: { id: Number(query) } } : undefined,
            relations: { transportType: true },
        });
    }
}
