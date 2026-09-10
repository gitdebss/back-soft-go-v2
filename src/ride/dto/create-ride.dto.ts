import {
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsPhoneNumber,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

export class CreateRideDto {
    @IsDateString()
    date: string;

    @IsString()
    @IsNotEmpty()
    hour: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    city: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    complement?: string;

    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsInt()
    @Min(1)
    transport_type_id: number;

    @IsInt()
    @Min(1)
    total_spots: number;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    obs?: string;

    @IsOptional()
    @MaxLength(15)
    @IsPhoneNumber('BR')
    phone?: string;
}