import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: 'transport_ride_type' })
export class TransportRideTypeEntity {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    id: number;

    @Column({ name: 'name', type: 'varchar', length: 100 })
    name: string;
}