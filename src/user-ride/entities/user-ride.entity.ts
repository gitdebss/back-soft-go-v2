import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { RideEntity } from "../../ride/entities/ride.entity.js";

@Entity({ name: 'ride_user' })
export class UserRideEntity {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    id: number;

    @ManyToOne(() => RideEntity, { nullable: false })
    @JoinColumn({ name: 'id_ride' })
    ride: RideEntity;

    @Column({ name: 'name', type: 'varchar', length: 100 })
    name: string;
    
    @Column({ name: 'phone', type: 'varchar', length: 15 })
    phone?: string;
}