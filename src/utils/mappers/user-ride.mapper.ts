import { ResponseUserRide } from "../../user-ride/dto/response-user-ride.dtp.js";
import { UserRideEntity } from "../../user-ride/entities/user-ride.entity.js";

export class UserRideMapper {
    static toResponse(user: UserRideEntity): ResponseUserRide {
        return {
            id: user.id,
            name: user.name,
            phone: user.phone,
        };
    }
}