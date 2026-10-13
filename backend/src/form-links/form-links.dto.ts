import { IsBoolean, IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from "class-validator";
import { FORM_KINDS } from "./form-links.constants";

export class CreateFormLinkDto {
  @IsString() @IsNotEmpty() clientId!: string;
  @IsIn(FORM_KINDS) kind!: string;

  /** Required for a project brief, not allowed for onboarding. */
  @IsOptional() @IsString() @IsNotEmpty() projectId?: string;

  /** Email the link to the client's address. Off means "just give me the link". */
  @IsOptional() @IsBoolean() email?: boolean;
}

export class FormLinkListQueryDto {
  @IsString() @IsNotEmpty() clientId!: string;
  @IsOptional() @IsIn(FORM_KINDS) kind?: string;
  @IsOptional() @IsString() projectId?: string;
}

export class SubmitFormDto {
  @IsObject() answers!: Record<string, unknown>;
}
