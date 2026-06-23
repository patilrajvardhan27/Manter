"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding/gender`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    // If email confirmation is disabled, a session exists immediately.
    if (data.session) {
      router.replace("/onboarding/gender");
      router.refresh();
    } else {
      setSent(true);
    }
  }

  if (sent) {
    return (
      <AuthShell
        eyebrow="Almost there"
        title="Check your email"
        subtitle={
          <>
            We sent a confirmation link to <strong className="text-ink">{email}</strong>. Open
            it on this device to finish setting up your account.
          </>
        }
        footer={
          <Link href="/login" className="font-medium text-plum underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        }
      >
        <div className="rounded-[var(--radius-card)] bg-paper/70 p-5 text-sm leading-relaxed text-ink-soft shadow-[var(--shadow-soft)]">
          Didn&apos;t get it? Check spam, or wait a minute and try registering again.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Create your account"
      title="Start dating by character."
      subtitle="It takes a minute. Your data stays yours — we only ask for what safety and matching need."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-plum underline-offset-4 hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password" hint="At least 8 characters.">
          <Input
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-redflag/10 px-4 py-3 text-sm text-redflag" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </AuthShell>
  );
}
