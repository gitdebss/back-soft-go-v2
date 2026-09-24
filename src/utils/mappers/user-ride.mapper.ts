import { ResponseUserRide } from "../../user-ride/dto/response-user-ride.dtp.js";
import { UserRideEntity } from "../../user-ride/entities/user-ride.entity.js";

export class UserRideMapper {
    // Nome e telefone da passageira vêm da conta dela (AD-001).
    static toResponse(userRide: UserRideEntity): ResponseUserRide {
        return {
            id: userRide.id,
            name: userRide.user.name,
            phone: userRide.user.phone ?? null,
        };
    }
}
