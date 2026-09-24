import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service.js';
import { UserEntity } from '../user/entities/user.entity.js';
import { SignUpDto } from './dto/sign-up.dto.js';

const SALT_ROUNDS = 10;
const DUPLICATE_EMAIL_MESSAGE = 'E-mail já cadastrado';
const INVALID_CREDENTIALS_MESSAGE = 'E-mail ou senha inválidos';
const POSTGRES_UNIQUE_VIOLATION_CODE = '23505';

@Injectable()
export class AuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) { }

    async signUp(dto: SignUpDto): Promise<UserEntity> {
        const existingUser = await this.userService.findByEmail(dto.email);

        if (existingUser) {
            throw new ConflictException(DUPLICATE_EMAIL_MESSAGE);
        }

        const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);

        try {
            return await this.userService.create({
                name: dto.name,
                email: dto.email,
                passwordHash,
                phone: this.toDigits(dto.phone),
            });
        } catch (error) {
            if (this.isUniqueViolation(error)) {
                throw new ConflictException(DUPLICATE_EMAIL_MESSAGE);
            }

            throw error;
        }
    }

    async validateUser(email: string, password: string): Promise<UserEntity> {
        const user = await this.userService.findByEmail(email);

        if (!user) {
            throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);

        if (!passwordMatches) {
            throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
        }

        return user;
    }

    login(user: UserEntity): { accessToken: string } {
        const payload = { sub: user.id, name: user.name, email: user.email };

        return {
            accessToken: this.jwtService.sign(payload),
        };
    }

    // O telefone é armazenado somente com dígitos (AD-002): o link de contato
    // `wa.me/55<numero>` exige o número puro. Um valor vazio vira `undefined`
    // para gravar NULL em vez de string vazia.
    private toDigits(phone?: string): string | undefined {
        const digits = phone?.replace(/\D/g, '');

        return digits ? digits : undefined;
    }

    private isUniqueViolation(error: unknown): boolean {
        return (
            typeof error === 'object' &&
            error !== null &&
            (error as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION_CODE
        );
    }
}
