import { redirect } from "next/navigation";

export default function PortalHome(): never {
  redirect("/portal/projects");
}
