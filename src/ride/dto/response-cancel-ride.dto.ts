import { RideStatus } from "../entities/ride.entity.js";

// O desfecho do cancelamento é decidido pelo servidor, não pela dona: com
// passageiras a carona fica no mural como `canceled`, sem passageiras ela sai
// como `deleted`. O frontend recarrega o mural de qualquer forma, então só
// precisa saber qual dos dois aconteceu para dar o retorno certo.
export class ResponseCancelRideDto {
    id: number;
    status: RideStatus;
}
