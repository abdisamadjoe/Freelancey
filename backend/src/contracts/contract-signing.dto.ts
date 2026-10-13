import { IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { CONTRACT_TEMPLATES } from "@/shared";

const TEMPLATE_IDS = CONTRACT_TEMPLATES.map((t) => t.id);

export class CreateContractFromProposalDto {
  @IsOptional() @IsIn(TEMPLATE_IDS) template?: string;
  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(200) title?: string;
}

export class SendContractLinkDto {
  /** Email the link to the client's address. Off means "just give me the link". */
  @IsOptional() @IsBoolean() email?: boolean;
}

export class SignContractDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name!: string;

  /** The signer ticked "I agree to be bound by this contract". */
  @IsBoolean() consent!: boolean;
}
