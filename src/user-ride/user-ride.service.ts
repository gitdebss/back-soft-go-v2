import { Injectable } from '@nestjs/common';
import { UserRideEntity } from './entities/user-ride.entity.js';
import { Repository } from 'typeorm';
import { UserRideRequestDto } from './dto/user-ride-request.dto.js';
import { InjectRepository } from '@nestjs/typeorm';
import { RideEntity } from '../ride/entities/ride.entity.js';
import { RideValidator } from '../ride/validators/ride.validator.js';

@Injectable()
export class UserRideService {
    constructor(
        @InjectRepository(UserRideEntity)
        private readonly userRideRepository: Repository<UserRideEntity>,
        @InjectRepository(RideEntity)
        private readonly rideRepository: Repository<RideEntity>
    ) { }

    async createUserRide(userRideRequest: UserRideRequestDto, idRide: number): Promise<UserRideEntity> {

        const ride = await this.rideRepository.findOne({ where: { id: idRide } });

        RideValidator.validateRideExists(ride);

        const newUserRide = this.userRideRepository.create({
            ...userRideRequest,
            ride: { id: idRide }, 
        });

        return await this.userRideRepository.save(newUserRide);
    }

    async getUserRidesByRideId(idRide: number): Promise<UserRideEntity[]> {
        return this.userRideRepository.find({
            where: { ride: { id: idRide } },
            relations: { ride: true },
        });
    }
}
