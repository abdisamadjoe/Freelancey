import type { ComponentProps } from "react";
import type { Badge } from "@/components/tailgrids/core/badge";

export type BadgeColor = NonNullable<ComponentProps<typeof Badge>["color"]>;
