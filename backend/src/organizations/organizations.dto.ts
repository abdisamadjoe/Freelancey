import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class SetActiveOrgDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;
}

export class AcceptInvitationDto {
  @IsString()
  @IsNotEmpty()
  invitationId!: string;
}

export class UpdateOrganizationDto {
  @IsString()
  @MinLength(1)
  name!: string;
}
