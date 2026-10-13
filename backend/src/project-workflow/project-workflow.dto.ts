import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { MILESTONE_STATUSES } from "./project-workflow.constants";

export class ApplyTemplateDto {
  @IsString() @IsNotEmpty() templateId!: string;
}

export class CreateMilestoneDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsDateString() dueDate?: string;
}

export class UpdateMilestoneDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string | null;
  @IsOptional() @IsDateString() dueDate?: string | null;
  @IsOptional() @IsIn(MILESTONE_STATUSES) status?: string;
}

export class CreateMeetingDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsDateString() scheduledAt!: string;
  @IsOptional() @IsInt() @Min(1) @Max(1440) durationMin?: number;
  @IsOptional() @IsString() @MaxLength(500) location?: string;
  @IsOptional() @IsString() @MaxLength(10000) notes?: string;
}

export class UpdateMeetingDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsDateString() scheduledAt?: string;
  @IsOptional() @IsInt() @Min(1) @Max(1440) durationMin?: number | null;
  @IsOptional() @IsString() @MaxLength(500) location?: string | null;
  @IsOptional() @IsString() @MaxLength(10000) notes?: string | null;
}

export class CreateExpenseDto {
  @IsString() @IsNotEmpty() @MaxLength(300) description!: string;
  @IsInt() @Min(0) @Max(100_000_000_00) amountCents!: number;
  @IsDateString() incurredOn!: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional() @IsBoolean() billable?: boolean;
  @IsOptional() @IsString() @MaxLength(3) currency?: string;
}

export class UpdateExpenseDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(300) description?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100_000_000_00) amountCents?: number;
  @IsOptional() @IsDateString() incurredOn?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string | null;
  @IsOptional() @IsBoolean() billable?: boolean;
}
