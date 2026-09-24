import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

// SPEC_DEVIATION: `name` is trimmed via @Transform for validation purposes only
// (a whitespace-only name must fail @IsNotEmpty as "required", per spec.md's
// Edge Cases). Since main.ts's global ValidationPipe does not set
// { transform: true }, the trimmed entity is used to run class-validator's checks
// but NOT returned to the controller (Nest's ValidationPipe always validates
// against a plainToInstance-transformed entity regardless of the transform
// option; only the returned value differs) - so a name with real content
// surrounded by whitespace still reaches the service untrimmed, unchanged from
// prior behavior.
// `password` is deliberately NOT trimmed: a signup that silently trimmed the
// password before hashing it would hash a different string than a later login
// sends (login never trims), locking out a user whose password has meaningful
// leading/trailing whitespace. @Matches(/\S/) rejects a whitespace-only
// password as "required" without mutating the value that gets hashed.
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

    @IsString()
    @IsNotEmpty()
    @MinLength(8)
    @Matches(/\S/, { message: 'password must not be blank' })
    password: string;

    // Aceita o número em dígitos puros ou no formato mascarado que o frontend
    // exibe. A normalização para dígitos acontece no AuthService, não aqui: o
    // ValidationPipe global não usa { transform: true }, então um @Transform
    // neste DTO validaria o valor limpo mas entregaria o original ao controller
    // (mesma limitação já documentada em `name`, acima).
    @IsOptional()
    @IsString()
    @MaxLength(15)
    @Matches(/^(\d{2}9\d{8}|\(\d{2}\) 9\d{4}-\d{4})$/, {
        message: 'phone must be a valid Brazilian mobile number',
    })
    phone?: string;
}
