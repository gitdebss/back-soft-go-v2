import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service.js';
import { UserEntity } from '../../user/entities/user.entity.js';

interface JwtPayload {
    sub: number;
    name: string;
    email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        configService: ConfigService,
        private readonly userService: UserService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
        });
    }

    async validate(payload: JwtPayload): Promise<UserEntity> {
        const user = await this.userService.findById(payload.sub);

        if (!user) {
            throw new UnauthorizedException();
        }

        return user;
    }
}
