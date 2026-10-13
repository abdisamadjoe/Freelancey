import { IsBoolean, IsEmail, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../common";

export const TICKET_STATUSES = ["open", "in_progress", "resolved"] as const;
export const TICKET_PRIORITIES = ["low", "normal", "high"] as const;

export class SubmitTicketDto {
  @IsString() @IsNotEmpty() @MaxLength(200) subject!: string;
  @IsString() @IsNotEmpty() @MaxLength(5000) message!: string;
  @IsOptional() @IsString() @MaxLength(100) projectId?: string;
  @IsOptional() @IsString() @MaxLength(200) name?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  /** Honeypot: people leave it empty. */
  @IsOptional() @IsString() @MaxLength(200) hp?: string;
}

export class CreateTicketDto {
  @IsString() @IsNotEmpty() clientId!: string;
  @IsOptional() @IsString() projectId?: string;
  @IsString() @IsNotEmpty() @MaxLength(200) subject!: string;
  @IsString() @IsNotEmpty() @MaxLength(5000) message!: string;
  @IsOptional() @IsIn(TICKET_PRIORITIES) priority?: string;
}

export class UpdateTicketDto {
  @IsOptional() @IsIn(TICKET_STATUSES) status?: string;
  @IsOptional() @IsIn(TICKET_PRIORITIES) priority?: string;
}

export class ReplyDto {
  @IsString() @IsNotEmpty() @MaxLength(5000) message!: string;
  /** Email the reply to the client when we have an address. Defaults to on. */
  @IsOptional() @IsBoolean() email?: boolean;
}

export class TicketListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(TICKET_STATUSES) status?: string;
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsString() projectId?: string;
}
