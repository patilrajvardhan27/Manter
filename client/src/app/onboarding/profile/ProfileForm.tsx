"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import {
  ProfileDetailsFields,
  EMPTY_DETAILS,
  detailsPayload,
  type DetailsState,
} from "@/components/ProfileDetailsFields";
import type { Role } from "@/lib/profile";

export function ProfileForm({ role }: { role: Role }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [age, setAge] = useState("");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [details, setDetails] = useState<DetailsState>(EMPTY_DETAILS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18) {
      setError("You must be 18 or older to use Charms.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      router.replace("/login");
      return;
    }

    // RLS: a user may only insert a profile row with their own id.
    const { error } = await supabase.from("profiles").insert({
      id: user.id,
      role,
      display_name: displayName.trim(),
      age: ageNum,
      city: city.trim() || null,
      bio: bio.trim() || null,
      ...detailsPayload(details),
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    // Men take the behavioral quiz next; women take two quick priority questions.
    router.replace(role === "man" ? "/onboarding/quiz" : "/onboarding/priorities");
    router.refresh();
  }

  return (
    <AuthShell
      eyebrow="Step 2 of 2"
      title="Tell us about you."
      subtitle={
        role === "woman"
          ? "The basics for your profile. Next, you'll set which qualities matter most."
          : "The basics for your profile. Next, you'll take the character quiz."
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Display name">
          <Input
            required
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="What should people call you?"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Age">
            <Input
              type="number"
              inputMode="numeric"
              min={18}
              max={120}
              required
              value={age}
              onChange={(e) => setAge(e.target.value)}
              placeholder="18+"
            />
          </Field>
          <Field label="City">
            <Input
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Optional"
            />
          </Field>
        </div>
        <Field label="Bio" hint="A line or two. You can edit this anytime.">
          <Textarea
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={
              role === "woman"
                ? "What you're looking for, in your words."
                : "Who you are beyond a checklist."
            }
          />
        </Field>

        <div className="border-t border-ink/[0.06] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-plum">
            About you <span className="font-normal normal-case text-ink-soft/70">· optional</span>
          </p>
          <p className="mt-1 mb-4 text-xs text-ink-soft/80">
            A few details for your profile. You can fill these in or skip and add them later.
          </p>
          <ProfileDetailsFields
            value={details}
            onChange={(patch) => setDetails((d) => ({ ...d, ...patch }))}
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-redflag/10 px-4 py-3 text-sm text-redflag" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Finish setup"}
        </Button>
      </form>
    </AuthShell>
  );
}
