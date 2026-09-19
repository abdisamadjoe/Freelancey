import { IsString, IsUrl } from "class-validator";

const urlOptions = { require_tld: false };

export class CreateCheckoutDto {
  @IsString()
  planSlug: string;

  @IsUrl(urlOptions)
  successUrl: string;

  @IsUrl(urlOptions)
  cancelUrl: string;
}

export class CreatePortalDto {
  @IsUrl(urlOptions)
  returnUrl: string;
}
