import { useCallback, useState } from "react";

/**
 * `localStorage` key for the mute preference. Follows this app's existing
 * `lam-admin.<feature>` convention (`lam-admin.theme`, `lam-admin.locale`).
 * Unlike the notification *read* state (server-owned, per the confirmed
 * requirement — see `useRequestNotifications`), whether this browser's
 * speaker should beep is a genuine per-device setting, so `localStorage` is
 * the right place for it.
 */
const MUTED_STORAGE_KEY = "lam-admin.notifications.muted";

function readStoredMuted(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    return window.localStorage.getItem(MUTED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

function writeStoredMuted(muted: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(MUTED_STORAGE_KEY, String(muted));
  } catch {
    // Storage can throw (private browsing, disabled storage). The mute
    // toggle still works for the current session via React state; it just
    // won't be remembered next visit.
  }
}

function getAudioContextConstructor(): (new () => AudioContext) | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  // Safari historically only exposes the vendor-prefixed constructor.
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: new () => AudioContext }).webkitAudioContext
  );
}

/**
 * Synthesizes a short two-tone chime with Web Audio's oscillator/gain nodes
 * instead of loading an audio file — no asset to manage, and no network/
 * decode failure path. Swap this function alone if a real sound asset is
 * introduced later; nothing else in this hook depends on how the tone is
 * produced.
 */
function playChimeTone(context: AudioContext): void {
  const now = context.currentTime;
  const notes: Array<{ frequency: number; startOffset: number }> = [
    { frequency: 880, startOffset: 0 },
    { frequency: 1318.5, startOffset: 0.12 },
  ];

  for (const note of notes) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(note.frequency, now + note.startOffset);

    const start = now + note.startOffset;
    const end = start + 0.16;
    gain.gain.setValueAtTime(0.15, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, end);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(end);
  }
}

export type UseNotificationSoundResult = {
  /** True until a user gesture resumes the browser's autoplay-blocked audio context. */
  isBlocked: boolean;
  isMuted: boolean;
  toggleMuted: () => void;
  /** Call from inside a click handler — browsers only allow resuming from a user gesture. */
  enableSound: () => void;
  playChime: () => void;
};

/**
 * See `docs/plans/2026-09-04-admin-request-notifications.md` section 4.4:
 * the alarm's sound is deliberately not "always on" — browsers start an
 * `AudioContext` `suspended` until a user gesture resumes it, and on a
 * kiosk-style admin screen that's been sitting untouched since the last
 * reload/reboot, that means the sound silently doesn't play unless this is
 * surfaced and fixable. `isBlocked` exists so the UI can show that state
 * rather than hide it.
 */
export function useNotificationSound(): UseNotificationSoundResult {
  // Constructed once, in a lazy `useState` initializer rather than an
  // effect: an `AudioContext` must exist before `isBlocked`'s initial value
  // can be known (it depends on the fresh context's own `state`), and this
  // project's lint config (`react-hooks/set-state-in-effect`) disallows
  // deriving that initial state by calling `setState` synchronously inside
  // a mount effect. The context is never reassigned afterwards, so holding
  // it in state (not a ref) is fine — nothing here needs a second render
  // when it's set.
  const [context] = useState<AudioContext | null>(() => {
    const Ctor = getAudioContextConstructor();
    return Ctor ? new Ctor() : null;
  });
  const [isBlocked, setIsBlocked] = useState(() => !context || context.state !== "running");
  const [isMuted, setIsMuted] = useState(() => readStoredMuted());

  const enableSound = useCallback(() => {
    if (!context) {
      return;
    }
    context
      .resume()
      .then(() => setIsBlocked(context.state !== "running"))
      .catch(() => setIsBlocked(true));
  }, [context]);

  const toggleMuted = useCallback(() => {
    setIsMuted((previous) => {
      const next = !previous;
      writeStoredMuted(next);
      return next;
    });
  }, []);

  const playChime = useCallback(() => {
    if (!context || isMuted || context.state !== "running") {
      return;
    }
    playChimeTone(context);
  }, [context, isMuted]);

  return { isBlocked, isMuted, toggleMuted, enableSound, playChime };
}
