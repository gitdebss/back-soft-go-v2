export class RideCreateDto {
    date: Date;
    hour: string;
    city: string;
    complement?: string;
    transport_type_id: number;
    total_spots: number;
    obs?: string;
    name: string;
    phone?: string;
}