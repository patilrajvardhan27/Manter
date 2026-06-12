"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus, X, Loader2, ImageIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PHOTO_BUCKET, MAX_PHOTOS } from "@/lib/photos";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import {
  ProfileDetailsFields,
  detailsFromProfile,
  detailsPayload,
  type DetailsState,
} from "@/components/ProfileDetailsFields";
import type { Profile } from "@/lib/profile";

interface Photo {
  path: string;
  url: string;
}

export function EditProfileForm({
  profile,
  initialPhotos,
}: {
  profile: Profile;
  initialPhotos: Photo[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState(profile.display_name);
  const [age, setAge] = useState(profile.age ? String(profile.age) : "");
  const [city, setCity] = useState(profile.city ?? "");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [details, setDetails] = useState<DetailsState>(detailsFromProfile(profile));
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function persistPhotoPaths(next: Photo[]) {
    const { error } = await supabase
      .from("profiles")
      .update({ photos: next.map((p) => p.path) })
      .eq("id", profile.id);
    if (error) throw error;
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (photos.length >= MAX_PHOTOS) {
      setError(`You can have at most ${MAX_PHOTOS} photos.`);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Images must be under 5 MB.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${profile.id}/${crypto.randomUUID()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;

      const { data: signed } = await supabase.storage
        .from(PHOTO_BUCKET)
        .createSignedUrl(path, 3600);

      const next = [...photos, { path, url: signed?.signedUrl ?? "" }];
      await persistPhotoPaths(next);
      setPhotos(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function removePhoto(path: string) {
    setError(null);
    const next = photos.filter((p) => p.path !== path);
    try {
      await persistPhotoPaths(next);
      setPhotos(next);
      await supabase.storage.from(PHOTO_BUCKET).remove([path]); // best-effort cleanup
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove photo.");
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const ageNum = Number(age);
    if (!Number.isInteger(ageNum) || ageNum < 18) {
      setError("You must be 18 or older to use Manter.");
      return;
    }
    if (!displayName.trim()) {
      setError("Display name can't be empty.");
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim(),
        age: ageNum,
        city: city.trim() || null,
        bio: bio.trim() || null,
        ...detailsPayload(details),
      })
      .eq("id", profile.id);
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }
    router.push("/home");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
      <header className="flex items-center gap-2 pb-4">
        <Link
          href="/home"
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-paper"
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={2.2} />
        </Link>
        <h1 className="font-display text-xl font-medium text-ink">Edit profile</h1>
      </header>

      {/* Photos */}
      <section className="mb-6">
        <p className="text-sm font-medium text-ink-soft">
          Photos <span className="text-ink-soft/60">({photos.length}/{MAX_PHOTOS})</span>
        </p>
        <p className="mt-0.5 text-xs text-ink-soft/80">
          Up to {MAX_PHOTOS}. Women see men&apos;s photos in Discover; a man sees a woman&apos;s
          photos only once she&apos;s started the conversation.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-3">
          {photos.map((p) => (
            <div
              key={p.path}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-paper shadow-[var(--shadow-soft)]"
            >
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-ink-soft/40">
                  <ImageIcon size={22} />
                </div>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.path)}
                aria-label="Remove photo"
                className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-cream backdrop-blur transition active:scale-90"
              >
                <X size={15} strokeWidth={2.6} />
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS ? (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="flex aspect-[3/4] flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed border-plum/25 text-plum transition hover:border-plum/45 active:scale-[0.98] disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 size={22} className="animate-spin" />
              ) : (
                <>
                  <Plus size={22} strokeWidth={2.2} />
                  <span className="text-[0.7rem] font-semibold">Add</span>
                </>
              )}
            </button>
          ) : null}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPickFile}
        />
      </section>

      {/* Details */}
      <form onSubmit={onSave} className="space-y-4">
        <Field label="Display name">
          <Input
            required
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
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
            />
          </Field>
          <Field label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Optional" />
          </Field>
        </div>
        <Field label="Bio">
          <Textarea
            maxLength={300}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A line or two about you."
          />
        </Field>

        <div className="border-t border-ink/[0.06] pt-4">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-plum">
            About you <span className="font-normal normal-case text-ink-soft/70">· optional</span>
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

        <Button type="submit" disabled={saving || uploading}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </main>
  );
}
