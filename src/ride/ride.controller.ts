import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { RideRequestDto } from './dto/ride.request.dto.js';

@Controller('ride')
export class RideController {

    @Get()
    getRides(@Query('transportType') query?: string) { }

    @Post()
    createRide(@Body() rideRequest: RideRequestDto) { }
}
