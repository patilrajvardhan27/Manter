import Link from "next/link";
import { redirect } from "next/navigation";
import { getMyProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { VoiceInterview } from "@/components/VoiceInterview";

/**
 * The voice matchmaker. Reached in onboarding (after the quiz, before
 * priorities) and from the profile page (?from=home) to retake it.
 */
export default async function VoicePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/gender");

  const supabase = await createClient();
  const { data: previous } = await supabase
    .from("voice_profiles")
    .select("profile_id")
    .eq("profile_id", userId)
    .maybeSingle();

  const nextHref = from === "home" ? "/home" : "/onboarding/priorities";

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pt-[max(2rem,env(safe-area-inset-top))]">
      <header>
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-brand-deep">
          Charms
        </Link>
      </header>
      <div className="flex flex-1 flex-col py-8">
        <h1 className="font-display text-[2rem] font-light leading-tight tracking-tight text-ink">
          Talk to your matchmaker
        </h1>
        <div className="mt-6 flex flex-1 flex-col">
          <VoiceInterview name={profile.display_name} nextHref={nextHref} hasPrevious={Boolean(previous)} />
        </div>
      </div>
    </main>
  );
}
