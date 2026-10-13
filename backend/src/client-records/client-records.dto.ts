import { Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { PaginationQueryDto } from "../common";
import {
  ACTIVITY_KINDS,
  CLIENT_PRIORITIES,
  CLIENT_STAGES,
  LEAD_SOURCES,
  LEAD_STATUSES,
} from "./client-records.constants";

export class CreateClientRecordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @IsOptional() @IsString() @MaxLength(200) company?: string;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string;
  @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @IsOptional() @IsString() @MaxLength(50) whatsapp?: string;
  @IsOptional() @IsString() @MaxLength(300) website?: string;
  @IsOptional() @IsString() @MaxLength(100) industry?: string;
  @IsOptional() @IsString() @MaxLength(200) location?: string;

  @IsOptional() @IsIn(CLIENT_STAGES) stage?: string;
  @IsOptional() @IsIn(LEAD_STATUSES) leadStatus?: string;
  @IsOptional() @IsIn(LEAD_SOURCES) source?: string;
  @IsOptional() @IsString() @MaxLength(200) interestedIn?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedBudgetCents?: number;

  @IsOptional() @IsIn(CLIENT_PRIORITIES) priority?: string;
  @IsOptional() @IsDateString() nextFollowUpAt?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class UpdateClientRecordDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) name?: string;
  @IsOptional() @IsString() @MaxLength(200) company?: string | null;
  @IsOptional() @IsEmail() @MaxLength(320) email?: string | null;
  @IsOptional() @IsString() @MaxLength(50) phone?: string | null;
  @IsOptional() @IsString() @MaxLength(50) whatsapp?: string | null;
  @IsOptional() @IsString() @MaxLength(300) website?: string | null;
  @IsOptional() @IsString() @MaxLength(100) industry?: string | null;
  @IsOptional() @IsString() @MaxLength(200) location?: string | null;

  @IsOptional() @IsIn(CLIENT_STAGES) stage?: string;
  @IsOptional() @IsIn(LEAD_STATUSES) leadStatus?: string;
  @IsOptional() @IsIn(LEAD_SOURCES) source?: string | null;
  @IsOptional() @IsString() @MaxLength(200) interestedIn?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimatedBudgetCents?: number | null;

  @IsOptional() @IsIn(CLIENT_PRIORITIES) priority?: string | null;
  // null clears the follow-up
  @IsOptional() @IsDateString() nextFollowUpAt?: string | null;
  @IsOptional() @IsString() @MaxLength(500) lostReason?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string | null;
}

export class ClientRecordListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsIn(CLIENT_STAGES) stage?: string;
  @IsOptional() @IsIn(LEAD_STATUSES) leadStatus?: string;
  @IsOptional() @IsString() @MaxLength(100) source?: string;
  @IsOptional() @IsString() @MaxLength(200) search?: string;

  /** Only records whose next follow-up is due now or overdue. */
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  followUpDue?: boolean;

  @IsOptional()
  @IsIn(["true", "false"])
  archived?: string;
}

export class LeadFormSettingsDto {
  @IsBoolean()
  enabled!: boolean;
}

export class CreateClientActivityDto {
  @IsIn(ACTIVITY_KINDS)
  kind!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  summary!: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;
}

/** What the freelancer learns while talking to the lead. Every field is optional free text. */
export class LeadDiscoveryDto {
  @IsOptional() @IsString() @MaxLength(3000) needs?: string;
  @IsOptional() @IsString() @MaxLength(3000) reason?: string;
  @IsOptional() @IsString() @MaxLength(500) budget?: string;
  @IsOptional() @IsString() @MaxLength(500) timeline?: string;
  @IsOptional() @IsString() @MaxLength(5000) requirements?: string;
  @IsOptional() @IsString() @MaxLength(5000) notes?: string;
}

export class ImportLeadsDto {
  /** The CSV file's text. Capped so it fits the API's default request size. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(90_000)
  csv!: string;
}
