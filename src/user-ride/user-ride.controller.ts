import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { CreateUserRideDto } from './dto/create-user-ride.dto.js';
import { UserRideService } from './user-ride.service.js';
import { ApiBody, ApiOperation } from '@nestjs/swagger';

@Controller('user-ride')
export class UserRideController {
    constructor(
        private readonly userRideService: UserRideService
    ) { }

    @Post('/:idRide')
    @ApiOperation({ summary: 'Adiciona um passageiro na corrida com o id passado na url' })
    @ApiBody({
        schema: {
            example: {
                name: 'Giovanna',
                phone: '51999999999',
            },
        },
    })
    async createUserRide(@Body() userRideRequest: CreateUserRideDto, @Param('idRide', ParseIntPipe) idRide: number) {
        const createdUser = await this.userRideService.createUserRide(userRideRequest, idRide)
        return createdUser;
    }

    @Get()
    @ApiOperation({ summary: 'Retorna todos os passageiros vinculados a corridas' })
    async getUserRides() {
        const users = await this.userRideService.getUserRides();
        return users;
    }

    @Get('/:idRide')
    @ApiOperation({ summary: 'Retorna todos os passageiros de uma corrida com o id passado na url' })
    async getUserRidesByRideId(@Param('idRide', ParseIntPipe) idRide: number) {
        const users = await this.userRideService.getUserRidesByRideId(idRide);
        return users;
    }
}
