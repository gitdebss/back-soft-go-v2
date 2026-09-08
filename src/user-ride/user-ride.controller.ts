import { Body, Controller, Param, Post } from '@nestjs/common';
import { UserRideRequestDto } from './dto/user-ride-request.dto.js';
import { UserRideService } from './user-ride.service.js';

@Controller('user-ride')
export class UserRideController {
    constructor(
        private readonly userRideService: UserRideService
    ) { }

    @Post('/:idRide')
    createUserRide(@Body() userRideRequest: UserRideRequestDto, @Param('idRide') idRide: number) {
        return this.userRideService.createUserRide(userRideRequest, idRide);
    }
}
