import { IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString, MaxLength, ValidateIf } from "class-validator";

export class StartOnboardingDto {
  @IsOptional() @IsString() projectId?: string;
}

export class SendInviteDto {
  @IsOptional() @IsString() projectId?: string;
}

export class AddOnboardingItemDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
}

export class UpdateOnboardingItemDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(1000) description?: string;
  @IsOptional() @IsBoolean() done?: boolean;

  /** Link to a document to sign or an invoice to pay; null unlinks. */
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsIn(["document", "invoice"])
  linkedType?: "document" | "invoice" | null;

  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsString()
  linkedId?: string | null;
}

export class ToggleMineDto {
  @IsBoolean() done!: boolean;
}

export class SaveIntakeDto {
  @IsObject() answers!: Record<string, unknown>;
  @IsOptional() @IsBoolean() submit?: boolean;
}

export class IntakeToNoteDto {
  @IsString() @IsNotEmpty() projectId!: string;
}
