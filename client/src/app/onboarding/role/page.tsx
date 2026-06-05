import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { RoleChooser } from "./RoleChooser";

export default async function RolePage() {
  const { profile } = await getMyProfile();
  // Already onboarded — role is immutable, send them home.
  if (profile) redirect("/home");

  return <RoleChooser />;
}
