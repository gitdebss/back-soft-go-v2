import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { RideCreateDto } from './dto/ride-create.dto.js';
import { RideService } from './ride.service.js';

@Controller('ride')
export class RideController {
    constructor(
        private readonly rideService: RideService
    ) { }

    @Get()
    async getRides(@Query('transportType') query?: string) { 
        const rides = await this.rideService.getRides(query)
        return rides;
    }

    @Get('/:id')
    async getRideById(@Param('id', ParseIntPipe) id: number) { 
        const ride = await this.rideService.getRideById(id)
        return ride;
    }

    @Post()
    async createRide(@Body() rideRequest: RideCreateDto) { 
        const createdRide = await this.rideService.createRide(rideRequest)
        return createdRide;
    }
}
