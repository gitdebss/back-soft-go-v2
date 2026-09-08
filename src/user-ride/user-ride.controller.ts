import { Body, Controller, Param, Post } from '@nestjs/common';
import { UserRideRequestDto } from './dto/user-ride.request.dto.js';

@Controller('user-ride')
export class UserRideController {
    @Post('/:idRide')
    createUserRide(@Body() userRideRequest: UserRideRequestDto, @Param('idRide') idRide: number) { }
}
