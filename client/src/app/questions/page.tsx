import { redirect } from "next/navigation";
import { SquarePen, Trash2 } from "lucide-react";
import { getMyProfile } from "@/lib/profile";
import { getMyQuestions } from "@/lib/quiz-data";
import { TabBar } from "@/components/TabBar";
import { QuestionForm } from "./QuestionForm";
import { deleteQuestion } from "./actions";

export default async function QuestionsPage() {
  const { userId, profile } = await getMyProfile();
  if (!userId) redirect("/login");
  if (!profile) redirect("/onboarding/role");
  // Only women author questions.
  if (profile.role !== "woman") redirect("/home");

  const mine = await getMyQuestions(userId);

  return (
    <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col px-6 pb-28 pt-[max(2rem,env(safe-area-inset-top))]">
      <header className="rise" style={{ animationDelay: "0ms" }}>
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-plum">
          <SquarePen size={14} strokeWidth={2.4} />
          Your questions
        </p>
        <h1 className="mt-1 font-display text-[2rem] font-light leading-tight tracking-tight text-ink">
          Ask men what matters to you.
        </h1>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
          Questions you add join the behavioral quiz every man answers. Their choices feed his
          character score — the one you see in Discover.
        </p>
      </header>

      {mine.length ? (
        <section className="mt-8 space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-soft">
            Added by you ({mine.length})
          </h2>
          {mine.map((q) => (
            <div
              key={q.id}
              className="flex items-start gap-3 rounded-[var(--radius-card)] bg-paper/70 p-4 shadow-[var(--shadow-soft)]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[0.95rem] leading-snug text-ink">{q.prompt}</p>
                {q.qualityLabel ? (
                  <p className="mt-1 text-xs text-plum">measures “{q.qualityLabel}”</p>
                ) : null}
              </div>
              <form action={deleteQuestion}>
                <input type="hidden" name="id" value={q.id} />
                <button
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-soft/60 transition hover:bg-redflag/10 hover:text-redflag"
                  aria-label="Delete question"
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </form>
            </div>
          ))}
        </section>
      ) : null}

      <section className="mt-8 rounded-[var(--radius-card)] border border-plum/15 p-5">
        <h2 className="font-display text-lg font-medium text-ink">Add a question</h2>
        <p className="mb-4 mt-1 text-sm text-ink-soft">
          Pick a quality, describe a situation, and write the answers from best to worst.
        </p>
        <QuestionForm />
      </section>

      <TabBar isWoman />
    </main>
  );
}
