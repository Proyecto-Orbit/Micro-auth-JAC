import { IsNotEmpty, IsString } from 'class-validator';

/**
 * GoogleCredentialDto: DTO con la credencial firmada por Google.
 */
export class GoogleCredentialDto {
  /**
   * credential: ID token emitido por Google Identity Services.
   */
  @IsString()
  @IsNotEmpty()
  credential!: string;
}
