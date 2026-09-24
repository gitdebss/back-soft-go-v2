import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { UserEntity } from "../../user/entities/user.entity.js";

// A UNIQUE é a garantia real contra presença duplicada: a checagem no service
// tem janela de corrida, a constraint não (AD-001).
@Entity({ name: 'ride_user' })
@Unique('UQ_ride_user_ride_user', ['idRide', 'userId'])
export class UserRideEntity {
    @PrimaryGeneratedColumn({ name: 'id', type: 'int' })
    id: number;

    @Column({ name: 'id_ride' })
    idRide: number

    @Column({ name: 'user_id' })
    userId: number;

    @ManyToOne(() => UserEntity, { nullable: false })
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;
}
