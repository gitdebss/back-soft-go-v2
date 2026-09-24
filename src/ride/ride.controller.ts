import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CreateRideDto } from './dto/create-ride.dto.js';
import { RideService } from './ride.service.js';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserEntity } from '../user/entities/user.entity.js';

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
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Cria uma corrida vinculada à usuária autenticada' })
    @ApiBody({
        schema: {
            example: {
                date: '2026-09-20',
                hour: '18:30',
                city: 'São Leopoldo',
                transportTypeId: 1,
                totalSpots: 4,
                complement: 'Centro',
                obs: 'Vou passar no mercado no caminho',
            },
        },
    })
    async createRide(@Body() rideRequest: CreateRideDto, @Req() req: { user: UserEntity }) {
        const createdRide = await this.rideService.createRide(rideRequest, req.user.id)
        return createdRide;
    }
}
