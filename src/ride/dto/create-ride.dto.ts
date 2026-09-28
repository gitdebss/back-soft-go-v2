import {
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';

// Nome e telefone saíram do corpo: a carona é atribuída à usuária autenticada
// a partir do token (AD-001).
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

    @IsInt()
    @Min(1)
    transportTypeId: number;

    // Opcional: ônibus não tem vaga limitada, então o formulário não envia o
    // campo para esse tipo de transporte. Quando presente, continua exigindo
    // ao menos 1 vaga.
    @IsOptional()
    @IsInt()
    @Min(1)
    totalSpots?: number;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    obs?: string;
}
