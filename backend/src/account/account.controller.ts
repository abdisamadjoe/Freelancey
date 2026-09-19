import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { IsString, MinLength } from "class-validator";
import { AccountService } from "./account.service";
import { CurrentUser } from "../common";
import { UserOnlyAuthGuard } from "./user-only-auth.guard";

class DeleteAccountDto {
  @IsString()
  @MinLength(1)
  password: string;
}

@Controller("account")
@UseGuards(UserOnlyAuthGuard)
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Get("deletion-info")
  getDeletionInfo(@CurrentUser("id") userId: string) {
    return this.accountService.getDeletionInfo(userId);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteAccount(
    @CurrentUser("id") userId: string,
    @Body() dto: DeleteAccountDto,
  ) {
    return this.accountService.deleteAccount(userId, dto.password);
  }
}
