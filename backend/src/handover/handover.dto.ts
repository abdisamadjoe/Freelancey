import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, IsUrl, MaxLength } from "class-validator";
import { HANDOVER_KINDS } from "./handover.constants";

export class CompleteProjectDto {
  /** Needed to complete a project that still has open work. */
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(500) overrideReason?: string;
}

export class AddHandoverItemDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsIn(HANDOVER_KINDS) kind?: string;
  @IsOptional() @IsString() @MaxLength(3000) details?: string;
  @IsOptional() @IsUrl({ protocols: ["http", "https"], require_protocol: true }) @MaxLength(1000) linkUrl?: string;
}

export class UpdateHandoverItemDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(3000) details?: string | null;
  @IsOptional() @IsUrl({ protocols: ["http", "https"], require_protocol: true }) @MaxLength(1000) linkUrl?: string | null;
  @IsOptional() @IsBoolean() done?: boolean;
}

export class ShareHandoverDto {
  /** Email the link to the client's address. Off means "just give me the link". */
  @IsOptional() @IsBoolean() email?: boolean;
}
