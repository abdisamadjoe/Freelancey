import { IsString, IsOptional, MinLength } from "class-validator";

export class SignupDto {
  @IsString()
  @MinLength(1)
  orgName: string;

  @IsOptional()
  @IsString()
  planSlug?: string;
}
