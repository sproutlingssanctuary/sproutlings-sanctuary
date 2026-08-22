let audioCtx = null;

function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function tone(freqStart, freqEnd, type, duration, vol = 0.12) {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, c.currentTime);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, c.currentTime + duration);
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function playCheckIn()  { tone(523.25, 1046.5, 'sine', 0.4, 0.12); }   // happy ding
export function playCheckOut() { tone(880, 440, 'sine', 0.3, 0.10); }         // soft whoosh
export function playError()    { tone(180, 100, 'sawtooth', 0.25, 0.08); }    // buzz
