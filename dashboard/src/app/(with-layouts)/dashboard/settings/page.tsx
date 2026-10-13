import { redirect } from "next/navigation";

export default function SettingsPage(): never {
  redirect("/dashboard/settings/account");
}
