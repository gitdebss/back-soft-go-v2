import { IsNotEmpty, IsOptional, IsPhoneNumber, IsString, MaxLength } from "class-validator";

export class UserRideRequestDto {
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsOptional()
    @MaxLength(15)
    @IsPhoneNumber('BR')
    phone?: string
}
