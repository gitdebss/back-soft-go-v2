export class RideRequestDto {
    date: Date;
    hour: string;
    city: string;
    complement?: string;
    transportType: string; // pode ser enum
    totalSpots: number;
    obs?: string;
    name: string;
    phone?: string;
}