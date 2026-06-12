"use client";

import { Field, Input, Select } from "@/components/ui/Field";
import type { Profile } from "@/lib/profile";
import {
  DRINKING_OPTIONS,
  SMOKING_OPTIONS,
  EXERCISE_OPTIONS,
  RELATIONSHIP_GOALS,
  INTEREST_SUGGESTIONS,
  parseInterests,
} from "@/lib/constants/profileFields";

/** Raw form state for the optional details (strings, as the inputs hold them). */
export interface DetailsState {
  profession: string;
  education: string;
  height: string;
  drinking: string;
  smoking: string;
  exercise: string;
  relationshipGoal: string;
  interests: string; // comma-separated
}

export const EMPTY_DETAILS: DetailsState = {
  profession: "",
  education: "",
  height: "",
  drinking: "",
  smoking: "",
  exercise: "",
  relationshipGoal: "",
  interests: "",
};

/** Seed the form from an existing profile (edit flow). */
export function detailsFromProfile(p: Profile): DetailsState {
  return {
    profession: p.profession ?? "",
    education: p.education ?? "",
    height: p.height_cm ? String(p.height_cm) : "",
    drinking: p.drinking ?? "",
    smoking: p.smoking ?? "",
    exercise: p.exercise ?? "",
    relationshipGoal: p.relationship_goal ?? "",
    interests: p.interests.join(", "),
  };
}

/** Convert form state into the `profiles` columns to insert/update. */
export function detailsPayload(d: DetailsState) {
  const height = Number(d.height);
  const validHeight = Number.isInteger(height) && height >= 120 && height <= 250;
  return {
    profession: d.profession.trim() || null,
    education: d.education.trim() || null,
    height_cm: validHeight ? height : null,
    drinking: d.drinking || null,
    smoking: d.smoking || null,
    exercise: d.exercise || null,
    relationship_goal: d.relationshipGoal || null,
    interests: parseInterests(d.interests),
  };
}

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </Select>
    </Field>
  );
}

/** The optional "about you" inputs, shared by onboarding + edit. */
export function ProfileDetailsFields({
  value,
  onChange,
}: {
  value: DetailsState;
  onChange: (patch: Partial<DetailsState>) => void;
}) {
  return (
    <div className="space-y-4">
      <Field label="Profession">
        <Input
          maxLength={60}
          value={value.profession}
          onChange={(e) => onChange({ profession: e.target.value })}
          placeholder="e.g. Software engineer"
        />
      </Field>
      <Field label="Education">
        <Input
          maxLength={60}
          value={value.education}
          onChange={(e) => onChange({ education: e.target.value })}
          placeholder="e.g. BSc, NYU"
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Height (cm)">
          <Input
            type="number"
            inputMode="numeric"
            min={120}
            max={250}
            value={value.height}
            onChange={(e) => onChange({ height: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <SelectField
          label="Looking for"
          value={value.relationshipGoal}
          options={RELATIONSHIP_GOALS}
          onChange={(v) => onChange({ relationshipGoal: v })}
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <SelectField
          label="Drinking"
          value={value.drinking}
          options={DRINKING_OPTIONS}
          onChange={(v) => onChange({ drinking: v })}
        />
        <SelectField
          label="Smoking"
          value={value.smoking}
          options={SMOKING_OPTIONS}
          onChange={(v) => onChange({ smoking: v })}
        />
        <SelectField
          label="Exercise"
          value={value.exercise}
          options={EXERCISE_OPTIONS}
          onChange={(v) => onChange({ exercise: v })}
        />
      </div>

      <Field label="Interests" hint="Comma-separated, up to 12.">
        <Input
          value={value.interests}
          onChange={(e) => onChange({ interests: e.target.value })}
          placeholder={INTEREST_SUGGESTIONS.slice(0, 4).join(", ")}
        />
      </Field>
    </div>
  );
}
