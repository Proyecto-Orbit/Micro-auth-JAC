import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * GoogleCredentialDto: DTO con la credencial firmada por Google.
 */
export class GoogleCredentialDto {
  @ApiProperty({
    description: 'ID token emitido por Google Identity Services tras el inicio de sesión con Google',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6Ii...',
  })
  @IsString()
  @IsNotEmpty()
  credential!: string;
}
