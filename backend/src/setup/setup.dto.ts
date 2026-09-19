import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsInt,
  Min,
  Max,
  ValidateIf,
} from "class-validator";

export class UpdateEmailSettingsDto {
  @IsEnum(["none", "resend", "smtp"])
  provider!: "none" | "resend" | "smtp";

  @ValidateIf((o) => o.provider === "resend")
  @IsString()
  resendApiKey?: string;

  @ValidateIf((o) => o.provider === "smtp")
  @IsString()
  smtpHost?: string;

  @ValidateIf((o) => o.provider === "smtp")
  @IsInt()
  @Min(1)
  @Max(65535)
  smtpPort?: number;

  @ValidateIf((o) => o.provider === "smtp")
  @IsString()
  @IsOptional()
  smtpUser?: string;

  @ValidateIf((o) => o.provider === "smtp")
  @IsString()
  @IsOptional()
  smtpPass?: string;

  @ValidateIf((o) => o.provider === "smtp")
  @IsBoolean()
  @IsOptional()
  smtpSecure?: boolean;

  @IsEmail()
  @IsOptional()
  fromEmail?: string;
}

export class TestEmailDto {
  @IsEmail()
  to!: string;
}
