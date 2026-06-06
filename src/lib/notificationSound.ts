// A synthesized notification chime played through the Web Audio API, so we ship
// no audio asset and add no dependency. Deliberately resilient: any failure
// (browser autoplay policy, no AudioContext, suspended context) is swallowed —
// the sound is a nicety, never a hard requirement.
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // Browsers start the context suspended until a user gesture; resume() here
    // lets it sound once the user has interacted with the page at least once.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

// One clean sine tone with a quick attack and exponential decay.
function tone(ac: AudioContext, freq: number, at: number, dur: number, gain: number) {
  const osc = ac.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(at);
  osc.stop(at + dur);
}

// A soft ascending two-note chime — "you have a notification".
export function playNotificationChime() {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime;
  tone(ac, 880, t0, 0.16, 0.18); // A5
  tone(ac, 1174.7, t0 + 0.11, 0.26, 0.16); // D6
}
