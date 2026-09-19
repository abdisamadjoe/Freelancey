import { IsString, IsOptional, MaxLength } from "class-validator";

export class UpdateClientProfileDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  company?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  phone?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  website?: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;
}
