import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { JwtStrategy } from './jwt.strategy.js';
import { UserService } from '../../user/user.service.js';
import { UserEntity } from '../../user/entities/user.entity.js';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;
    let userService: { findById: ReturnType<typeof vi.fn> };

    const user: UserEntity = {
        id: 1,
        name: 'Ana',
        email: 'ana@example.com',
        passwordHash: 'hashed-password',
        createdAt: new Date(),
    } as UserEntity;

    beforeEach(() => {
        userService = { findById: vi.fn() };
        const configService = {
            getOrThrow: vi.fn().mockReturnValue('test-secret'),
        } as unknown as ConfigService;

        strategy = new JwtStrategy(configService, userService as unknown as UserService);
    });

    it('resolves the current user when the id in the payload still exists', async () => {
        userService.findById.mockResolvedValue(user);

        const result = await strategy.validate({ sub: 1, name: 'Ana', email: 'ana@example.com' });

        expect(userService.findById).toHaveBeenCalledWith(1);
        expect(result).toEqual(user);
    });

    it('throws UnauthorizedException when the user id no longer exists', async () => {
        userService.findById.mockResolvedValue(null);

        await expect(
            strategy.validate({ sub: 999, name: 'Ana', email: 'ana@example.com' }),
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });
});
