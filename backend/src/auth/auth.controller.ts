import { Controller, Get, Req } from "@nestjs/common";
import type { Request } from "express";

@Controller("auth")
export class AuthController {
  @Get("me")
  getMe(@Req() req: Request & { user?: any }) {
    return {
      user: req.user,
    };
  }
}
