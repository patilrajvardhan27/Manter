"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { voiceFinish, voiceTurn, type VoiceInsights } from "@/lib/api";
import { QUALITY_BY_KEY } from "@/lib/constants/qualities";
import { deleteInterview } from "@/app/onboarding/voice/actions";

/**
 * A spoken interview with the matchmaker. Speech-to-text and text-to-speech
 * use the browser's Web Speech API, so there is no audio pipeline to run. The
 * FastAPI service picks each question and keeps the transcript.
 *
 * Turn-taking: the agent speaks, then the mic opens. A turn ends after
 * SILENCE_MS of quiet once some words are heard, or when the person taps
 * "Done". Typing works everywhere, including browsers without speech
 * recognition (Firefox) and when the mic is blocked.
 */

const SILENCE_MS = 2200;

type Phase = "intro" | "thinking" | "speaking" | "listening" | "typing" | "finishing" | "done";
type Line = { role: "agent" | "user"; text: string };

// Minimal Web Speech API typings; not every TS lib.dom ships these.
interface RecognitionResult {
  isFinal: boolean;
  0: { transcript: string };
}
interface RecognitionEvent {
  resultIndex: number;
  results: ArrayLike<RecognitionResult>;
}
interface Recognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
}
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  const preferred = ["Samantha", "Google US English", "Karen", "Daniel", "Microsoft Aria", "Microsoft Jenny"];
  for (const name of preferred) {
    const v = voices.find((x) => x.name.includes(name));
    if (v) return v;
  }
  return voices.find((v) => v.localService) ?? voices[0] ?? null;
}

const DEALBREAKER_LABEL: Record<string, string> = {
  smoking: "Smoking",
  drinking: "Drinking",
  relationship_goal: "Looking for",
};

export function VoiceInterview({
  name,
  nextHref,
  hasPrevious,
}: {
  name: string;
  nextHref: string;
  hasPrevious: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("intro");
  const [lines, setLines] = useState<Line[]>([]);
  const [heard, setHeard] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [turn, setTurn] = useState({ n: 0, max: 9 });
  const [voiceOk, setVoiceOk] = useState(false);
  const [speakAloud, setSpeakAloud] = useState(true);
  const [insights, setInsights] = useState<VoiceInsights | null>(null);

  const session = useRef<string | null>(null);
  const rec = useRef<Recognition | null>(null);
  const listening = useRef(false);
  const buffer = useRef("");
  const silence = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const voiceMode = useRef(true);
  const restarts = useRef(0); // recognition restarts this turn without hearing anything

  useEffect(() => {
    // Decide after mount so server and client render the same markup.
    const ok = Boolean(getRecognition()) && "speechSynthesis" in window;
    setVoiceOk(ok);
    voiceMode.current = ok;
    if (ok) window.speechSynthesis.getVoices(); // starts the async voice list load
    return () => {
      listening.current = false;
      rec.current?.abort();
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines, heard, phase]);

  const userAnswers = lines.filter((l) => l.role === "user").length;

  async function token(): Promise<string> {
    const {
      data: { session: s },
    } = await createClient().auth.getSession();
    if (!s) throw new Error("Your session expired. Sign in again.");
    return s.access_token;
  }

  // ---- speaking ---------------------------------------------------------

  function speak(text: string, then: () => void) {
    if (!voiceMode.current || !speakAloud || !("speechSynthesis" in window)) {
      then();
      return;
    }
    let called = false;
    const once = () => {
      if (!called) {
        called = true;
        then();
      }
    };
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1.02;
    u.onend = once;
    u.onerror = once;
    setPhase("speaking");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  function skipSpeaking() {
    window.speechSynthesis.cancel(); // fires onend, which opens the mic
  }

  // ---- listening --------------------------------------------------------

  const stopListening = useCallback(() => {
    listening.current = false;
    if (silence.current) clearTimeout(silence.current);
    rec.current?.stop();
  }, []);

  function listen() {
    const Ctor = getRecognition();
    if (!Ctor || !voiceMode.current) {
      setPhase("typing");
      return;
    }
    buffer.current = "";
    setHeard("");
    const r = new Ctor();
    r.lang = navigator.language || "en-US";
    r.continuous = true;
    r.interimResults = true;
    restarts.current = 0;
    r.onresult = (e) => {
      restarts.current = 0;
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) buffer.current += t;
        else interim += t;
      }
      setHeard((buffer.current + interim).trim());
      if (silence.current) clearTimeout(silence.current);
      silence.current = setTimeout(() => {
        if (listening.current && buffer.current.trim()) finishAnswer();
      }, SILENCE_MS);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        listening.current = false;
        voiceMode.current = false;
        setError("Microphone access is blocked. You can type your answers instead.");
        setPhase("typing");
      }
      // "no-speech" and "aborted" are normal; onend restarts if still listening.
    };
    r.onend = () => {
      // Chrome ends recognition on its own after pauses or ~60s. Keep going
      // until we decide the turn is over.
      if (!listening.current) return;
      if (++restarts.current > 6) {
        listening.current = false;
        voiceMode.current = false;
        setError("Voice input keeps dropping. You can type your answers instead.");
        setPhase("typing");
        return;
      }
      try {
        r.start();
      } catch {
        // already started
      }
    };
    rec.current = r;
    listening.current = true;
    setPhase("listening");
    try {
      r.start();
    } catch {
      setPhase("typing");
    }
  }

  function finishAnswer() {
    const text = (buffer.current || heard).trim();
    stopListening();
    if (!text) {
      listen();
      return;
    }
    setHeard("");
    void send(text);
  }

  // ---- talking to the server --------------------------------------------

  function afterAgent(done: boolean) {
    if (done) void finish();
    else if (voiceMode.current) listen();
    else setPhase("typing");
  }

  async function start() {
    setError(null);
    // Prime speech synthesis inside the tap; iOS blocks it otherwise.
    if (voiceMode.current && speakAloud) window.speechSynthesis.speak(new SpeechSynthesisUtterance(""));
    setPhase("thinking");
    try {
      const res = await voiceTurn(null, null, await token());
      session.current = res.session_id;
      setTurn({ n: res.turn, max: res.max_turns });
      setLines([{ role: "agent", text: res.say }]);
      speak(res.say, () => afterAgent(res.done));
    } catch (e) {
      setError((e as Error).message);
      setPhase("intro");
    }
  }

  async function send(text: string) {
    if (!session.current) return;
    setError(null);
    setLines((l) => [...l, { role: "user", text }]);
    setPhase("thinking");
    try {
      const res = await voiceTurn(session.current, text, await token());
      setTurn({ n: res.turn, max: res.max_turns });
      setLines((l) => [...l, { role: "agent", text: res.say }]);
      speak(res.say, () => afterAgent(res.done));
    } catch (e) {
      // Put the answer back so one tap resends it.
      setError((e as Error).message);
      setLines((l) => l.slice(0, -1));
      setDraft(text);
      setPhase("typing");
    }
  }

  async function finish() {
    if (!session.current) return;
    stopListening();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    setError(null);
    setPhase("finishing");
    try {
      setInsights(await voiceFinish(session.current, await token()));
      setPhase("done");
    } catch (e) {
      setError((e as Error).message);
      setPhase("typing");
    }
  }

  function switchToTyping() {
    stopListening();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    voiceMode.current = false;
    setDraft((d) => d || heard);
    setHeard("");
    setPhase("typing");
  }

  function submitDraft(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    void send(text);
  }

  async function onDelete() {
    const res = await deleteInterview();
    if (res.ok) router.push(nextHref);
    else setError(res.error ?? "Couldn't delete the interview.");
  }

  // ---- views ------------------------------------------------------------

  if (phase === "intro") {
    return (
      <div className="space-y-6">
        <div className="space-y-3 text-[0.95rem] leading-relaxed text-ink-soft">
          <p>
            The quiz shows how you think through hard moments. This fills in the rest: humour, reliability,
            how you share the load, what you want in a partner. About nine questions, five minutes.
          </p>
          <p>
            {voiceOk
              ? "Your browser turns speech into text. Depending on your browser, that audio may be processed by its maker (Google for Chrome, Apple for Safari). Only the text reaches us."
              : "Your browser can't do speech recognition, so you'll type your answers. Chrome, Edge and Safari support voice."}{" "}
            The transcript is private to you. Others only see the character scores it feeds into, and you can delete
            it any time.
          </p>
          {hasPrevious ? <p>Starting again replaces what your last interview showed.</p> : null}
        </div>

        {voiceOk ? (
          <label className="flex items-center gap-3 text-sm text-ink">
            <input
              type="checkbox"
              checked={speakAloud}
              onChange={(e) => setSpeakAloud(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-brand)]"
            />
            Read questions aloud
          </label>
        ) : null}

        {error ? <p className="text-sm text-redflag">{error}</p> : null}

        <div className="space-y-3">
          <PrimaryButton onClick={start}>{voiceOk ? "Start talking" : "Start interview"}</PrimaryButton>
          <a href={nextHref} className="block text-center text-sm text-ink-soft underline underline-offset-4">
            Skip for now
          </a>
        </div>
      </div>
    );
  }

  if (phase === "done" && insights) {
    return (
      <div className="space-y-6">
        <p className="text-[0.95rem] leading-relaxed text-ink-soft">
          Here&apos;s what your matchmaker took from that. Scores blend with your quiz, weighted by how much each
          answer actually showed.
        </p>

        {insights.traits.length ? (
          <section className="rounded-lg border border-ink/10 bg-paper/50 p-4">
            <h2 className="font-display text-lg text-ink">What came through</h2>
            <ul className="mt-3 space-y-3">
              {insights.traits.map((t) => (
                <li key={t.quality_key}>
                  <p className="text-[0.92rem] font-medium text-ink">
                    {QUALITY_BY_KEY[t.quality_key]?.label ?? t.quality_key}
                  </p>
                  <p className="text-sm leading-relaxed text-ink-soft">{t.evidence}</p>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-ink-soft">
            Nothing specific enough to score yet. Short answers are fine, but stories give your matchmaker more to go on.
          </p>
        )}

        {insights.partner_priorities.length || insights.dealbreakers.length ? (
          <section className="rounded-lg border border-ink/10 bg-paper/50 p-4">
            <h2 className="font-display text-lg text-ink">What you want</h2>
            {insights.partner_priorities.length ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                {insights.partner_priorities
                  .slice()
                  .sort((a, b) => b.weight - a.weight)
                  .map((p) => QUALITY_BY_KEY[p.quality_key]?.label ?? p.quality_key)
                  .join(", ")}
                . These start your priorities on the next step.
              </p>
            ) : null}
            {insights.dealbreakers.length ? (
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                Dealbreakers:{" "}
                {insights.dealbreakers.map((d) => `${DEALBREAKER_LABEL[d.field]}: ${d.value}`).join(", ")}. You
                won&apos;t be introduced to anyone who matches these.
              </p>
            ) : null}
          </section>
        ) : null}

        {error ? <p className="text-sm text-redflag">{error}</p> : null}

        <div className="space-y-3">
          <PrimaryButton onClick={() => router.push(nextHref)}>Continue</PrimaryButton>
          <button onClick={onDelete} className="block w-full text-center text-sm text-ink-soft underline underline-offset-4">
            Delete this interview
          </button>
        </div>
      </div>
    );
  }

  const status: Record<Phase, string> = {
    intro: "",
    thinking: "Thinking",
    speaking: "Speaking",
    listening: heard ? "Listening. It sends after a short pause." : "Listening",
    typing: "Type your answer",
    finishing: "Reading back through your answers",
    done: "",
  };

  return (
    <div className="flex flex-1 flex-col">
      <p className="text-sm text-ink-soft">
        Question {Math.max(1, turn.n)} of about {turn.max}
      </p>

      <div aria-live="polite" className="mt-5 flex-1 space-y-5">
        {lines.map((l, i) =>
          l.role === "agent" ? (
            <p key={i} className="font-display text-[1.3rem] font-light leading-snug text-ink">
              {l.text}
            </p>
          ) : (
            <p key={i} className="border-l-2 border-ink/15 pl-3 text-[0.95rem] leading-relaxed text-ink-soft">
              {l.text}
            </p>
          ),
        )}
        {phase === "listening" && heard ? (
          <p className="border-l-2 border-brand/40 pl-3 text-[0.95rem] leading-relaxed text-ink">{heard}</p>
        ) : null}
        <div ref={bottom} />
      </div>

      <div className="sticky bottom-0 mt-6 space-y-3 bg-cream pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <p className="text-sm font-medium text-brand" role="status">
          {status[phase]}
        </p>

        {error ? <p className="text-sm text-redflag">{error}</p> : null}

        {phase === "typing" ? (
          <form onSubmit={submitDraft} className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              maxLength={1500}
              placeholder="Your answer"
              autoFocus
              className="w-full resize-none rounded-lg border border-ink/15 bg-paper/40 px-3 py-2.5 text-[0.95rem] text-ink outline-none focus:border-brand"
            />
            <div className="flex gap-2">
              <PrimaryButton type="submit" disabled={!draft.trim()}>
                Send
              </PrimaryButton>
              {voiceOk ? (
                <SecondaryButton
                  onClick={() => {
                    voiceMode.current = true;
                    listen();
                  }}
                >
                  Talk instead
                </SecondaryButton>
              ) : null}
            </div>
          </form>
        ) : null}

        {phase === "listening" ? (
          <div className="flex gap-2">
            <PrimaryButton onClick={finishAnswer} disabled={!heard}>
              Done
            </PrimaryButton>
            <SecondaryButton onClick={switchToTyping}>Type instead</SecondaryButton>
          </div>
        ) : null}

        {phase === "speaking" ? <SecondaryButton onClick={skipSpeaking}>Skip to answering</SecondaryButton> : null}

        {userAnswers >= 2 && (phase === "listening" || phase === "typing" || phase === "speaking") ? (
          <button onClick={finish} className="text-sm text-ink-soft underline underline-offset-4">
            Wrap up now
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className="flex h-12 w-full items-center justify-center rounded-lg bg-brand px-4 text-[0.95rem] font-semibold text-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
    />
  );
}

function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className="flex h-12 w-full items-center justify-center rounded-lg border border-ink/15 px-4 text-[0.95rem] font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-40"
    />
  );
}
