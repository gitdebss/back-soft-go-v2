import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RideCreateDto } from './dto/ride-create.dto.js';
import { RideService } from './ride.service.js';

@Controller('ride')
export class RideController {
    constructor(
        private readonly rideService: RideService
    ) { }

    @Get()
    getRides(@Query('transportType') query?: string) { 
        return this.rideService.getRides(query);
    }

    @Get('/:id')
    getRideById(@Param('id') id: number) { 
        return this.rideService.getRideById(id);
    }

    @Post()
    createRide(@Body() rideRequest: RideCreateDto) { 
        return this.rideService.createRide(rideRequest);
    }
}
