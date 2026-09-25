import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
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

    // Declarada antes de `/:id`: se viesse depois, o Nest casaria "mine" com o
    // parâmetro dinâmico e o ParseIntPipe responderia 400 em vez desta rota.
    // Guard obrigatória: aqui não existe "mural sem login" -- é a listagem
    // própria da dona, sem o corte de data que `GET /rides` aplica.
    @Get('/mine')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Retorna todas as corridas da usuária autenticada, sem corte de data. É possível filtrar por data' })
    async getMyRides(
        @Req() req: { user: UserEntity },
        @Query('date') date?: string,
    ) {
        const rides = await this.rideService.getMyRides(req.user.id, date)
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

    // Sem corpo: quem cancela é a usuária do token, e o desfecho — carona
    // cancelada e visível, ou removida do mural — é decidido pelo service.
    @Delete('/:id')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Cancela a corrida com o id passado na url. Restrito à dona da corrida' })
    async cancelRide(@Param('id', ParseIntPipe) id: number, @Req() req: { user: UserEntity }) {
        const canceledRide = await this.rideService.cancelRide(id, req.user.id)
        return canceledRide;
    }
}
