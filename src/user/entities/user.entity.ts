import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'users' })
export class UserEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ name: 'name', length: 100 })
    name: string;

    @Column({ name: 'email', unique: true })
    email: string;

    @Column({ name: 'password_hash' })
    passwordHash: string;

    @Column({ name: 'phone', type: 'varchar', length: 15, nullable: true })
    phone?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
