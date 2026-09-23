import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBody, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import { SignUpDto } from './dto/sign-up.dto.js';
import { SignInDto } from './dto/sign-in.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { UserMapper } from '../utils/mappers/user.mapper.js';
import { UserEntity } from '../user/entities/user.entity.js';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService
    ) { }

    @Post('signup')
    @ApiOperation({ summary: 'Cria uma nova conta de usuária' })
    @ApiBody({
        schema: {
            example: {
                name: 'Débora',
                email: 'debora@example.com',
                password: 'senha1234',
            },
        },
    })
    async signUp(@Body() signUpDto: SignUpDto) {
        const user = await this.authService.signUp(signUpDto);
        return UserMapper.toResponse(user);
    }

    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Autentica a usuária e retorna um token JWT' })
    @ApiBody({
        schema: {
            example: {
                email: 'debora@example.com',
                password: 'senha1234',
            },
        },
    })
    async login(@Body() signInDto: SignInDto) {
        const user = await this.authService.validateUser(signInDto.email, signInDto.password);
        return this.authService.login(user);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Retorna o perfil da usuária autenticada' })
    async me(@Req() req: { user: UserEntity }) {
        return UserMapper.toResponse(req.user);
    }
}
