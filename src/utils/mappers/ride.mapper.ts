import { ResponseRideDto } from "../../ride/dto/response-ride.dto.js";
import { RideEntity } from "../../ride/entities/ride.entity.js";

export class RideMapper {
  static toResponse(ride: RideEntity, occupiedSpots: number): ResponseRideDto {
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
      totalSpots: ride.totalSpots,
      occupiedSpots: occupiedSpots,
      availableSpots: ride.totalSpots - occupiedSpots,
      obs: ride.obs,
    };
  }
}