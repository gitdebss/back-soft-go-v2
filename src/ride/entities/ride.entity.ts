import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { TransportRideTypeEntity } from "../../transport-ride-type/entities/transport-ride-type.entity.js";
import { UserEntity } from "../../user/entities/user.entity.js";

@Entity({ name: 'ride' })
export class RideEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    date: string;

    @Column()
    hour: string;

    @Column()
    city: string;

    @Column({ nullable: true })
    complement?: string;

    @ManyToOne(() => TransportRideTypeEntity, { nullable: false })
    @JoinColumn({ name: 'transport_type_id' })
    transportType: TransportRideTypeEntity;

    @Column({ name: 'total_spots' })
    totalSpots: number;

    @Column({ nullable: true })
    obs?: string;

    // Dona da carona. Nome e telefone exibidos no mural vêm daqui (AD-001);
    // a entidade não guarda mais texto digitado.
    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => UserEntity, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn({ nullable: true })
    updated_at: Date;

    @DeleteDateColumn({ nullable: true })
    deleted_at: Date;
}
