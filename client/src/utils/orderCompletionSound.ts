let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    audioCtx = new Ctx();
  }
  return audioCtx;
}

/** Soft crystal chime — under 1s, no asset file. */
export function playSuccessChime(): void {
  const ac = ctx();
  if (!ac) return;
  void ac.resume().then(() => {
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, t0);
    osc.frequency.exponentialRampToValueAtTime(1320, t0 + 0.12);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.12, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.65);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.7);

    const osc2 = ac.createOscillator();
    const g2 = ac.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1760, t0 + 0.08);
    g2.gain.setValueAtTime(0, t0 + 0.08);
    g2.gain.linearRampToValueAtTime(0.04, t0 + 0.1);
    g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    osc2.connect(g2);
    g2.connect(ac.destination);
    osc2.start(t0 + 0.08);
    osc2.stop(t0 + 0.6);
  });
}

/** Gentle error tone — minimal, non-alarming. */
export function playErrorTone(): void {
  const ac = ctx();
  if (!ac) return;
  void ac.resume().then(() => {
    const t0 = ac.currentTime;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, t0);
    osc.frequency.linearRampToValueAtTime(180, t0 + 0.25);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(0.08, t0 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.4);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t0);
    osc.stop(t0 + 0.45);
  });
}

export function triggerSuccessHaptic(): void {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([12, 40, 12]);
  }
}
