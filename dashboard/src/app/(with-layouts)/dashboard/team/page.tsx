import { redirect } from "next/navigation";

export default function TeamRedirect(): never {
  redirect("/dashboard/clients");
}
