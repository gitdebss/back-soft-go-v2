import { Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common';
import { UserRideService } from './user-ride.service.js';
import { ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UserEntity } from '../user/entities/user.entity.js';

@Controller('user-ride')
export class UserRideController {
    constructor(
        private readonly userRideService: UserRideService
    ) { }

    // Sem corpo: a passageira é a usuária do token.
    @Post('/:idRide')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Confirma a presença da usuária autenticada na corrida com o id passado na url' })
    async createUserRide(@Param('idRide', ParseIntPipe) idRide: number, @Req() req: { user: UserEntity }) {
        const createdUser = await this.userRideService.createUserRide(idRide, req.user.id)
        return createdUser;
    }

    @Get('/:idRide')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Retorna as passageiras de uma corrida. Restrito à dona da corrida' })
    async getUserRidesByRideId(@Param('idRide', ParseIntPipe) idRide: number) {
        const users = await this.userRideService.getUserRidesByRideId(idRide);
        return users;
    }
}
