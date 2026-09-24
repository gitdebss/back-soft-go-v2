import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from './entities/user.entity.js';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    async create(data: { name: string; email: string; passwordHash: string; phone?: string }): Promise<UserEntity> {
        const newUser = this.userRepository.create(data);

        return this.userRepository.save(newUser);
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { email } });
    }

    async findById(id: number): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { id } });
    }
}
