import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

// SPEC_DEVIATION: values are trimmed via @Transform for validation purposes only
// (a whitespace-only name/password must fail @IsNotEmpty/@MinLength as "required",
// per spec.md's Edge Cases). Since main.ts's global ValidationPipe does not set
// { transform: true }, the trimmed entity is used to run class-validator's checks
// but NOT returned to the controller (Nest's ValidationPipe always validates
// against a plainToInstance-transformed entity regardless of the transform
// option; only the returned value differs) - so a value with real content
// surrounded by whitespace still reaches the service untrimmed, unchanged from
// prior behavior.
// Reason: keeps this fix scoped to DTO validation only; main.ts is out of scope.
function trimIfString({ value }: { value: unknown }): unknown {
    return typeof value === 'string' ? value.trim() : value;
}

export class SignUpDto {
    @Transform(trimIfString)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    name: string;

    @IsEmail()
    @IsNotEmpty()
    email: string;

    @Transform(trimIfString)
    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    password: string;
}
