import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRideEntity } from './entities/user-ride.entity.js';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { RideEntity } from '../ride/entities/ride.entity.js';
import { UserRideMapper } from '../utils/mappers/user-ride.mapper.js';
import { ResponseUserRide } from './dto/response-user-ride.dtp.js';

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
        const ride = await this.rideRepository.findOne({ where: { id: idRide } });

        if (!ride) throw new NotFoundException('Corrida não encontrada');

        const newUserRide = this.userRideRepository.create({
            idRide,
            userId,
        });

        const saved = await this.userRideRepository.save(newUserRide);

        return UserRideMapper.toResponse(await this.findUserRideOrFail(saved.id));
    }

    async getUserRidesByRideId(idRide: number): Promise<ResponseUserRide[]> {
        const ride = await this.rideRepository.findOne({ where: { id: idRide } });

        if (!ride) throw new NotFoundException('Corrida não encontrada');

        const passengers = await this.userRideRepository.find({
            where: { idRide: ride.id },
            relations: { user: true },
        })

        return passengers.map((passenger) => UserRideMapper.toResponse(passenger));
    }

    private async findUserRideOrFail(id: number): Promise<UserRideEntity> {
        const userRide = await this.userRideRepository.findOne({
            where: { id },
            relations: { user: true },
        });

        if (!userRide) throw new NotFoundException('Presença não encontrada');

        return userRide;
    }
}
