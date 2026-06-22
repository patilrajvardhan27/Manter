"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/home";

  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  async function signInPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.replace(next);
    router.refresh();
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // This is a sign-in page: only authenticate existing accounts, never
        // silently create a new one for an unrecognized email.
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    setLoading(false);
    if (error) {
      // Supabase returns this when the email has no account yet.
      setError(
        error.message.toLowerCase().includes("signups not allowed")
          ? "No account found for that email. Create one to get started."
          : error.message,
      );
      return;
    }
    setMagicSent(true);
  }

  if (magicSent) {
    return (
      <AuthShell
        eyebrow="Magic link sent"
        title="Check your email"
        subtitle={
          <>
            We sent a sign-in link to <strong className="text-ink">{email}</strong>. Tap it to
            come right back in — no password needed.
          </>
        }
        footer={
          <button
            onClick={() => setMagicSent(false)}
            className="font-medium text-plum underline-offset-4 hover:underline"
          >
            Use a different method
          </button>
        }
      >
        <div className="rounded-[var(--radius-card)] bg-paper/70 p-5 text-sm leading-relaxed text-ink-soft shadow-[var(--shadow-soft)]">
          The link expires shortly for your safety. Open it on this device.
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Charms."
      footer={
        <>
          New here?{" "}
          <Link href="/register" className="font-medium text-plum underline-offset-4 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-paper/70 p-1">
        {(["password", "magic"] as const).map((m) => (
          <button
            key={m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={`rounded-xl py-2.5 text-sm font-medium transition ${
              mode === m ? "bg-cream text-plum-deep shadow-sm" : "text-ink-soft"
            }`}
          >
            {m === "password" ? "Password" : "Magic link"}
          </button>
        ))}
      </div>

      <form
        onSubmit={mode === "password" ? signInPassword : sendMagicLink}
        className="space-y-4"
      >
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

        {mode === "password" ? (
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </Field>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-redflag/10 px-4 py-3 text-sm text-redflag" role="alert">
            {error}
          </p>
        ) : null}

        <Button type="submit" disabled={loading}>
          {loading
            ? "One moment…"
            : mode === "password"
              ? "Sign in"
              : "Email me a link"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
