import { TransportRideTypeEntity } from "../../transport-ride-type/entities/transport-ride-type.entity.js";

export class ResponseRideDto {
    id: number;
    date: string;
    hour: string;
    city: string;
    name: string;
    transportType: TransportRideTypeEntity;
    complement?: string;
    totalSpots: number;
    occupiedSpots: number;
    availableSpots: number;
    obs?: string;
    phone?: string;
}