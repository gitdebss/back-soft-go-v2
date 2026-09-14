import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRideEntity } from './entities/user-ride.entity.js';
import { Repository } from 'typeorm';
import { CreateUserRideDto } from './dto/create-user-ride.dto.js';
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

    async createUserRide(userRideRequest: CreateUserRideDto, idRide: number): Promise<ResponseUserRide> {

        const ride = await this.rideRepository.findOne({ where: { id: idRide } });

        if (!ride) throw new NotFoundException('Corrida não encontrada');

        const newUserRide = this.userRideRepository.create({
            ...userRideRequest,
            ride: { id: idRide }, 
        });

        return UserRideMapper.toResponse(await this.userRideRepository.save(newUserRide));
    }

    async getUserRides(): Promise<ResponseUserRide[] | null> {
        const userRides = await this.userRideRepository.find()

        return userRides.map((user) => UserRideMapper.toResponse(user));
    }

    async getUserRidesByRideId(idRide: number): Promise<ResponseUserRide[] | null> {
        const ride = await this.rideRepository.findOne({ where: { id: idRide } });

        if (!ride) throw new NotFoundException('Corrida não encontrada');

        const users = await this.userRideRepository.find({
            where: { ride: { id: idRide } },
            relations: { ride: true },
        })

        return users.map((user) => UserRideMapper.toResponse(user));
    }
}
