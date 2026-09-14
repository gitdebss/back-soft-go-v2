import { ResponseUserRide } from "../../user-ride/dto/response-user-ride.dtp.js";
import { UserRideEntity } from "../../user-ride/entities/user-ride.entity.js";

export class UserRideMapper {
    static toResponse(user: UserRideEntity): ResponseUserRide {
        return {
            id: user.id,
            name: user.name,
            phone: user.phone,
            ride: {
                id: user.ride.id,
                date: user.ride.date,
                hour: user.ride.hour,
                city: user.ride.city,
                complement: user.ride.complement,
                name: user.ride.name,
                phone: user.ride.phone,
                transportType: {
                    id: user.ride.transportType.id,
                    name: user.ride.transportType.name,
                },
                total_spots: user.ride.total_spots,
                obs: user.ride.obs,
            },
        };
    }
}