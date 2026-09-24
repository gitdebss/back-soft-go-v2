import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UserEntity } from '../../user/entities/user.entity.js';

// Deixa a rota pública enxergar a usuária quando há token válido, sem recusar
// quem não tem. Usado no mural (`GET /rides`), que continua aberto mas precisa
// saber se a usuária logada é a dona da carona ou já confirmou presença.
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
    handleRequest<TUser = UserEntity | undefined>(_err: unknown, user: unknown): TUser {
        return (user || undefined) as TUser;
    }
}
