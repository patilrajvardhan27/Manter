"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Field, Textarea } from "@/components/ui/Field";
import { QUALITIES } from "@/lib/constants/qualities";
import { createQuestion } from "./actions";

const inputBase =
  "w-full rounded-2xl border border-ink/10 bg-cream px-4 py-3.5 text-base text-ink outline-none transition focus:border-plum/50 focus:ring-2 focus:ring-plum/15";

/**
 * Author one behavioral question. The woman picks the quality it measures and
 * writes options from best to worst; positions map to scoring deltas server-side.
 */
export function QuestionForm() {
  const [submitting, setSubmitting] = useState(false);

  return (
    <form action={createQuestion} onSubmit={() => setSubmitting(true)} className="space-y-4">
      <Field label="What quality does this question measure?">
        <select name="quality_key" required defaultValue="" className={inputBase}>
          <option value="" disabled>
            Pick one of the 23…
          </option>
          {QUALITIES.map((q) => (
            <option key={q.key} value={q.key}>
              {q.label}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="The scenario / question"
        hint="Describe a real situation and let him answer in his own words. Claude scores his answer against the quality above."
      >
        <Textarea name="prompt" required minLength={8} maxLength={280} placeholder="e.g. She cancels plans last-minute because she's overwhelmed. What do you do?" />
      </Field>

      <button
        type="submit"
        disabled={submitting}
        className="flex h-14 w-full items-center justify-center gap-1.5 rounded-2xl bg-plum text-base font-semibold text-cream shadow-[var(--shadow-soft)] transition hover:bg-plum-deep active:scale-[0.98] disabled:opacity-50"
      >
        <Plus size={18} strokeWidth={2.4} />
        {submitting ? "Adding…" : "Add question to the quiz"}
      </button>
    </form>
  );
}
