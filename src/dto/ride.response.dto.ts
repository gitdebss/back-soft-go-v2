export class RideResponseDto {
    id: number;
    date: Date;
    hour: string;
    city: string;
    complement?: string;
    transportType: string; // pode ser enum
    totalSpots: number;
    occupiedSpots: number;
    obs?: string;
    name: string;
    phone?: string;
}