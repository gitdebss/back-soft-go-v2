import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { CreateRideDto } from './dto/create-ride.dto.js';
import { RideService } from './ride.service.js';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard.js';
import { UserEntity } from '../user/entities/user.entity.js';

@Controller('rides')
export class RideController {
    constructor(
        private readonly rideService: RideService
    ) { }

    // Rota pública: o guard opcional apenas popula `req.user` quando há token,
    // permitindo calcular isOwner/alreadyJoined sem exigir login para ver o mural.
    @Get()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Retorna todas as corridas. É possível filtrar por tipo de transporte e data da corrida' })
    async getRides(
        @Req() req: { user?: UserEntity },
        @Query('transportType') transportType?: string,
        @Query('date') date?: string,
    ) {
        const rides = await this.rideService.getRides(transportType, date, req.user?.id)
        return rides;
    }

    @Get('/:id')
    @UseGuards(OptionalJwtAuthGuard)
    @ApiOperation({ summary: 'Retorna a corrida com o id passado na url' })
    async getRideById(@Param('id', ParseIntPipe) id: number, @Req() req: { user?: UserEntity }) {
        const ride = await this.rideService.getRideById(id, req.user?.id)
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
