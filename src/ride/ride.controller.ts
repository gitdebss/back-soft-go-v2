import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { CreateRideDto } from './dto/create-ride.dto.js';
import { RideService } from './ride.service.js';
import { ApiBody, ApiOperation } from '@nestjs/swagger';

@Controller('rides')
export class RideController {
    constructor(
        private readonly rideService: RideService
    ) { }

    @Get()
    @ApiOperation({ summary: 'Retorna todas as corridas. É possível filtrar por tipo de transporte e data da corrida' })
    async getRides(@Query('transportType') transportType?: string, @Query('date') date?: string) {
        const rides = await this.rideService.getRides(transportType, date)
        return rides;
    }

    @Get('/:id')
    @ApiOperation({ summary: 'Retorna a corrida com o id passado na url' })
    async getRideById(@Param('id', ParseIntPipe) id: number) {
        const ride = await this.rideService.getRideById(id)
        return ride;
    }

    @Post()
    @ApiOperation({ summary: 'Cria uma corrida' })
    @ApiBody({
        schema: {
            example: {
                date: '2026-09-20',
                hour: '18:30',
                city: 'São Leopoldo',
                transportTypeId: 1,
                totalSpots: 4,
                name: 'Débora',
                complement: 'Centro',
                obs: 'Vou passar no mercado no caminho',
                phone: '51999999999',
            },
        },
    })
    async createRide(@Body() rideRequest: CreateRideDto) {
        const createdRide = await this.rideService.createRide(rideRequest)
        return createdRide;
    }
}
