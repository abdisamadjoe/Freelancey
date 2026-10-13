import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  ValidateNested,
} from "class-validator";

export class DeliverableLinkDto {
  @IsString() @IsNotEmpty() @MaxLength(100) label!: string;
  @IsUrl({ protocols: ["http", "https"], require_protocol: true }) @MaxLength(1000) url!: string;
}

export class CreateDeliverableDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title!: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() milestoneId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DeliverableLinkDto)
  links?: DeliverableLinkDto[];
}

export class UpdateDeliverableDto {
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string | null;
  @IsOptional() @IsString() milestoneId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => DeliverableLinkDto)
  links?: DeliverableLinkDto[];
}

export class SendDeliverableDto {
  /** Email the link to the client's address. Off means "just give me the link". */
  @IsOptional() @IsBoolean() email?: boolean;
}

export class ApproveDeliverableDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;
}

export class RequestChangesDto {
  @IsString() @IsNotEmpty() @MaxLength(3000) message!: string;
}
