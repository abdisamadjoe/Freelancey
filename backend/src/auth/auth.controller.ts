import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { UserOnlyAuthGuard } from "../account/user-only-auth.guard";
import type { Request } from "express";

@Controller("auth")
@UseGuards(UserOnlyAuthGuard)
export class AuthController {
  @Get("me")
  getMe(@Req() req: Request & { user?: any }) {
    return {
      user: req.user,
    };
  }
}
