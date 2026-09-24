import { ResponseRideDto } from "../../ride/dto/response-ride.dto.js";
import { RideEntity } from "../../ride/entities/ride.entity.js";

// Contexto da usuária que fez a requisição. Ambos false quando a requisição
// chega sem token: o mural é público.
export interface RideViewerContext {
  isOwner: boolean;
  alreadyJoined: boolean;
}

export class RideMapper {
  // `name` e `phone` continuam no topo da resposta, mas agora vêm da dona da
  // carona (`ride.user`) em vez de texto digitado no formulário.
  static toResponse(
    ride: RideEntity,
    occupiedSpots: number,
    viewer: RideViewerContext = { isOwner: false, alreadyJoined: false },
  ): ResponseRideDto {
    return {
      id: ride.id,
      date: ride.date,
      hour: ride.hour,
      city: ride.city,
      complement: ride.complement,
      name: ride.user.name,
      phone: ride.user.phone ?? null,
      transportType: {
        id: ride.transportType.id,
        name: ride.transportType.name,
      },
      totalSpots: ride.totalSpots,
      occupiedSpots: occupiedSpots,
      availableSpots: ride.totalSpots - occupiedSpots,
      obs: ride.obs,
      status: ride.status,
      isOwner: viewer.isOwner,
      alreadyJoined: viewer.alreadyJoined,
    };
  }
}
