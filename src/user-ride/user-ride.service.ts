import { Injectable } from '@nestjs/common';
import { UserRideEntity } from './entities/user-ride.entity.js';
import { Repository } from 'typeorm';
import { UserRideRequestDto } from './dto/user-ride-request.dto.js';

@Injectable()
export class UserRideService {
    constructor(
        private readonly userRideRepository: Repository<UserRideEntity>
    ) { }

    async createUserRide(userRideRequest: UserRideRequestDto, idRide: number): Promise<UserRideEntity> {

        const newUserRide = this.userRideRepository.create({
            ...userRideRequest,
            ride: { id: idRide }, 
        });

        return await this.userRideRepository.save(newUserRide);
    }
}
