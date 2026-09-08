import { Column, Entity } from "typeorm";

@Entity({ name: 'ride_user' })
export class UserRideEntity {
    @Column({ name: 'id', type: 'int', primary: true, generated: true })
    id: number;

    @Column({ name: 'id_ride', type: 'int' })
    idRide: number;

    @Column({ name: 'name', type: 'varchar', length: 100 })
    name: string;
    
    @Column({ name: 'phone', type: 'varchar', length: 15 })
    phone?: string;
}