import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { TransportRideTypeEntity } from "../../transport-ride-type/entities/transport-ride-type.entity.js";

@Entity({ name: 'ride'})
export class RideEntity {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    date: Date;

    @Column()
    hour: string;

    @Column()
    city: string;

    @Column({ nullable: true })
    complement?: string;

    @Column()
    name: string;

    @ManyToOne(() => TransportRideTypeEntity, { nullable: false })
    @JoinColumn({ name: 'transport_type_id' })
    transportType: TransportRideTypeEntity;

    @Column()
    total_spots: number;

    @Column({ nullable: true })
    obs?: string;

    @Column({ nullable: true })
    phone?: string;

    @CreateDateColumn()
    created_at: Date;

    @UpdateDateColumn({ nullable: true })
    updated_at: Date;

    @DeleteDateColumn({ nullable: true })
    deleted_at: Date;
}