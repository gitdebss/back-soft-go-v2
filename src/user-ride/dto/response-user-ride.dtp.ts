import { ResponseRideDto } from "../../ride/dto/response-ride.dto.js";

export class ResponseUserRide {
    id: number;
    ride: ResponseRideDto;
    name: string;
    phone?: string;
}