import { IsString, IsOptional, IsArray, IsBoolean, IsDateString, IsInt, MaxLength, Min } from "class-validator";
import { PaginationQueryDto } from "../common";

export class CreateProjectDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  clientUserIds?: string[];

  /** The client (relationship) record this project is for. Its portal contacts get access automatically. */
  @IsString()
  @IsOptional()
  clientId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  budgetCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectType?: string;

  /** A signed contract for this client. It is attached to the new project so the portal shows it. */
  @IsOptional()
  @IsString()
  contractId?: string;
}

export class ClientProjectListQueryDto extends PaginationQueryDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  search?: string;
}

export class ProjectListQueryDto extends ClientProjectListQueryDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  status?: string;

  @IsString()
  @IsOptional()
  archived?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  labels?: string;
}

export class DuplicateProjectDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsBoolean()
  @IsOptional()
  includeTasks?: boolean;

  @IsBoolean()
  @IsOptional()
  includeClients?: boolean;
}

export class UpdateProjectDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  status?: string;

  @IsDateString()
  @IsOptional()
  startDate?: string | null;

  @IsDateString()
  @IsOptional()
  endDate?: string | null;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  clientUserIds?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  hourlyRateCents?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  budgetCents?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectType?: string | null;
}
