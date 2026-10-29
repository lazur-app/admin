/** What each cost feature is (llm_usage_events.feature), for the cost pages. */
export const FEATURES: Record<string, { label: string; what: string }> = {
  command: { label: "Voice questions", what: "Holding ⌥⌘ and asking Lazur: listening, the screen, thinking and the spoken answer (Gemini Live)" },
  guide_step: { label: "Step-by-step guides", what: "Each next step of a guide after a click" },
  pointing: { label: "Pointing", what: "Extra vision pass to place a circle exactly on screen" },
  agent_task: { label: "Background jobs", what: "The agent's thinking for multi-step jobs in Chrome and on the Mac" },
  task_notification: { label: "Job updates", what: "Lazur saying a job finished or needs the user" },
  onboarding: { label: "Onboarding", what: "The first-run tutorial" },
  command_mode: { label: "Typed commands", what: "Older text command mode" },
  dictation_stt: { label: "Dictation: speech to text", what: "Turning held-fn speech into text" },
  dictation_stt_preview: { label: "Dictation: live preview", what: "Words shown while still speaking" },
  dictation_polish: { label: "Dictation: clean-up", what: "Removing filler words, punctuation, corrections" },
  polish: { label: "Dictation: clean-up (old)", what: "Clean-up from older app versions" },
  dictionary_resolve: { label: "Words dictionary", what: "Matching names and terms from the user's Words" },
  file_summary: { label: "Saved files", what: "One-line summary when a file is dropped on the notch" },
  memory_session: { label: "Memory: sessions", what: "Summary note for a finished session" },
  memory_day: { label: "Memory: days", what: "Summary note for a finished day" },
};

export const featureLabel = (f: string) => FEATURES[f]?.label ?? f.replace(/_/g, " ");

/** What the tokens of a call paid for (backend admin_metrics.cost_parts). */
export const COST_PARTS: { key: string; label: string; color: string }[] = [
  { key: "voice_in", label: "User's voice", color: "#2563eb" },
  { key: "screen_in", label: "Screenshots", color: "#7c3aed" },
  { key: "text_in", label: "Text & context in", color: "#0d9488" },
  { key: "cached_in", label: "Cached context", color: "#94a3b8" },
  { key: "voice_out", label: "Lazur's voice", color: "#ea580c" },
  { key: "text_out", label: "Text & thinking out", color: "#f59e0b" },
];
