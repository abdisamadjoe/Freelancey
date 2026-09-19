import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentOrg = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const org = request.organization;
    return data ? org?.[data] : org;
  },
);
