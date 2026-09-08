import { Column, Entity } from "typeorm";

@Entity({ name: 'transport_ride_type' })
export class TransportRideTypeEntity {
    @Column({ name: 'id', type: 'int', primary: true, generated: true })
    id: number;

    @Column({ name: 'name', type: 'varchar', length: 100 })
    name: string;
}