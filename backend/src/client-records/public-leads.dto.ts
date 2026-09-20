import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";

/** Fields accepted from the public contact form. `hp` is a honeypot: humans leave it empty. */
export class PublicLeadDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(50) whatsapp?: string;
  @IsOptional() @IsString() @MaxLength(200) company?: string;
  @IsOptional() @IsString() @MaxLength(300) website?: string;
  @IsOptional() @IsString() @MaxLength(200) interestedIn?: string;
  @IsOptional() @IsString() @MaxLength(100) budget?: string;
  @IsOptional() @IsString() @MaxLength(3000) message?: string;
  @IsOptional() @IsString() @MaxLength(200) hp?: string;
}
