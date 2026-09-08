import { Column, CreateDateColumn, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { TransportRideTypeEntity } from "../../transport-ride-type/entities/transport-ride-type.entity.js";

@Entity({ name: 'ride'})
export class RideEntity {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    id: number;

    @Column({ name: 'date', type: 'date' })
    date: Date;

    @Column({ name: 'hour', type: 'time' })
    hour: string;

    @Column({ name: 'city', type: 'varchar', length: 100 })
    city: string;

    @Column({ name: 'complement', type: 'varchar', length: 200 })
    complement?: string;

    @Column({ name: 'name', type: 'varchar', length: 100 })
    name: string;

    @ManyToOne(() => TransportRideTypeEntity, { nullable: false })
    @JoinColumn({ name: 'transport_type_id' })
    transportType: TransportRideTypeEntity;

    @Column({ name: 'total_spots', type: 'int' })
    total_spots: number;

    @Column({ name: 'obs', type: 'varchar', length: 200 })
    obs?: string;

    @Column({ name: 'phone', type: 'varchar', length: 15 })
    phone?: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    created_at: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updated_at: Date;

    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp' })
    deleted_at: Date;
}