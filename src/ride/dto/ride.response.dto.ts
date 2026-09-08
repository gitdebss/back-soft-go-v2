import { TransportRideTypeEntity } from "../../transport-ride-type/entities/transport-ride-type.entity.js";

export class RideResponseDto {
    id: number;

    date: Date;

    hour: string;

    city: string;

    name: string;

    transportType: TransportRideTypeEntity;

    total_spots: number;

    obs?: string;

    phone?: string;

    created_at: Date;
}