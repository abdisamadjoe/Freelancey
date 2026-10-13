import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { PaginationQueryDto } from "../common";
import { PROPOSAL_STATUSES } from "./proposals.constants";

export class ProposalLineItemDto {
  @IsString() @IsNotEmpty() @MaxLength(300) description!: string;
  @IsInt() @Min(1) @Max(10000) quantity!: number;
  @IsInt() @Min(0) @Max(100_000_000_00) unitPriceCents!: number;
  @IsOptional() @IsBoolean() optional?: boolean;
}

export class CreateProposalDto {
  @IsString() @IsNotEmpty() clientId!: string;
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(10000) scope?: string;
  @IsOptional() @IsString() @MaxLength(5000) deliverables?: string;
  @IsOptional() @IsString() @MaxLength(1000) timeline?: string;
  @IsOptional() @IsString() @MaxLength(3000) paymentTerms?: string;
  @IsOptional() @IsInt() @Min(0) @Max(100) revisionLimit?: number;
  @IsOptional() @IsDateString() validUntil?: string;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;

  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProposalLineItemDto)
  items!: ProposalLineItemDto[];
}

export class UpdateProposalDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(10000) scope?: string | null;
  @IsOptional() @IsString() @MaxLength(5000) deliverables?: string | null;
  @IsOptional() @IsString() @MaxLength(1000) timeline?: string | null;
  @IsOptional() @IsString() @MaxLength(3000) paymentTerms?: string | null;
  @IsOptional() @IsInt() @Min(0) @Max(100) revisionLimit?: number | null;
  @IsOptional() @IsDateString() validUntil?: string | null;
  @IsOptional() @IsString() @Length(3, 3) currency?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => ProposalLineItemDto)
  items?: ProposalLineItemDto[];
}

export class ProposalListQueryDto extends PaginationQueryDto {
  @IsOptional() @IsString() clientId?: string;
  @IsOptional() @IsIn(PROPOSAL_STATUSES) status?: string;
}

export class SendProposalDto {
  /** Email the link to the lead's address. Off means "just give me the link". */
  @IsOptional() @IsBoolean() email?: boolean;
}

export class AcceptProposalDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  optionalItemIds?: string[];
}

export class RejectProposalDto {
  @IsOptional() @IsString() @MaxLength(1000) reason?: string;
}
