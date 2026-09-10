import { ResponseRideDto } from "../dto/response-ride.dto.js";
import { RideEntity } from "../entities/ride.entity.js";

export class RideMapper {
  static toResponse(ride: RideEntity): ResponseRideDto {
    return {
      id: ride.id,
      date: ride.date,
      hour: ride.hour,
      city: ride.city,
      complement: ride.complement,
      name: ride.name,
      phone: ride.phone,
      transportType: {
        id: ride.transportType.id,
        name: ride.transportType.name,
      },
      total_spots: ride.total_spots,
      obs: ride.obs,
    };
  }
}