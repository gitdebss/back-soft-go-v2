import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { TransportRideTypeEntity } from "../../transport-ride-type/entities/transport-ride-type.entity.js";
import { UserEntity } from "../../user/entities/user.entity.js";

// Estado explícito da carona. `deleted` é o cancelamento de uma carona que
// ninguém confirmou presença: some do mural. `canceled` é o de uma carona que
// tem passageiras: continua visível, sinalizada, e o vínculo delas é mantido.
export enum RideStatus {
    ACTIVE = 'active',
    CANCELED = 'canceled',
    DELETED = 'deleted',
}

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

    // `enumName` explícito para a entidade e a migration concordarem sobre o
    // nome do tipo no Postgres.
    @Column({ type: 'enum', enum: RideStatus, enumName: 'ride_status_enum', default: RideStatus.ACTIVE })
    status: RideStatus;

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
