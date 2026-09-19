import { IsString, IsOptional, IsObject, IsNotEmpty } from "class-validator";
import { ContractContent, ContractTemplateId } from "@/shared";

export class CreateContractDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  template: ContractTemplateId;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsObject()
  @IsOptional()
  content?: ContractContent;
}

export class UpdateContractDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  template?: ContractTemplateId;

  @IsString()
  @IsOptional()
  clientId?: string;

  @IsObject()
  @IsOptional()
  content?: ContractContent;

  @IsString()
  @IsOptional()
  status?: string;
}

export class DuplicateContractDto {
  @IsString()
  @IsOptional()
  title?: string;
}
