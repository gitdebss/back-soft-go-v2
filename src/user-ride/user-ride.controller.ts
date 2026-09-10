import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateUserRideDto } from './dto/create-user-ride.dto.js';
import { UserRideService } from './user-ride.service.js';

@Controller('user-ride')
export class UserRideController {
    constructor(
        private readonly userRideService: UserRideService
    ) { }

    @Post('/:idRide')
    async createUserRide(@Body() userRideRequest: CreateUserRideDto, @Param('idRide', ParseIntPipe) idRide: number) {
        const createdUser = await this.userRideService.createUserRide(userRideRequest, idRide)
        return createdUser;
    }

    @Get()
    async getUserRides() {
        const users = await this.userRideService.getUserRides();
        return users;
    }

    @Get('/:idRide')
    async getUserRidesByRideId(@Param('idRide', ParseIntPipe) idRide: number) {
        const users = await this.userRideService.getUserRidesByRideId(idRide);
        return users;
    }
}
