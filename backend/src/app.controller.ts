import { Controller, Get } from "@nestjs/common";
import { Public } from "./common";

@Controller()
export class AppController {
  @Public()
  @Get()
  getHello() {
    return { message: "yeah bro.. Gigly is up and cooking." };
  }
}
