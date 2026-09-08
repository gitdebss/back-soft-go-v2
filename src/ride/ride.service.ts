import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { RideEntity } from './entities/ride.entity.js';
import { Repository } from 'typeorm';
import { RideCreateDto } from './dto/ride-create.dto.js';

@Injectable()
export class RideService {
    constructor(
        @InjectRepository(RideEntity)
        private readonly rideRepository: Repository<RideEntity>
    ) { }

    async createRide(dto: RideCreateDto): Promise<RideEntity> {
        const { transport_type_id, ...rideData } = dto;

        const newRide = this.rideRepository.create({
            ...rideData,
            transportType: { id: transport_type_id }, 
        });

        return await this.rideRepository.save(newRide);
    }

    async getRideById(id: number): Promise<RideEntity | null> {
        return this.rideRepository.findOne({ where: { id } });
    }

    async getRides(query?: string): Promise<RideEntity[]> {
        if (query) {
            return this.rideRepository.find({
                where: { transportType: { id: Number(query) } },
            });
        }
        return this.rideRepository.find();
    }
}
