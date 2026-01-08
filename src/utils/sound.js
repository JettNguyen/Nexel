const NOTES = {
  C5: 523.25,
  G3: 196,
};

const SOUND_DURATIONS = {
  SCORE_BASE: 0.22,
  SCORE_E5: 0.18,
  SCORE_G5: 0.16,
  SCORE_C6: 0.14,
  SCORE_G6: 0.12,
  PLACE: 0.14,
};

const SOUND_DELAYS = {
  E5_OFFSET: 0.08,
  G5_OFFSET: 0.16,
  C6_OFFSET: 0.25,
  G6_OFFSET: 0.35,
};

const SOUND_MULTIPLIERS = {
  MAX_EXCITEMENT: 4,
  MIN_EXCITEMENT: 1,
  VOLUME_BASE: 0.07,
  VOLUME_INCREMENT: 0.015,
  VOLUME_MAX: 0.14,
  E5_VOLUME_RATIO: 0.95,
  G5_VOLUME_RATIO: 0.9,
  C6_VOLUME_RATIO: 0.85,
  G6_VOLUME_RATIO: 0.8,
  PLACE_VOLUME: 0.07,
};

const ATTACK_TIME = 0.02;
const RELEASE_TIME = 0.05;
const RELEASE_LEVEL = 0.001;

export function playSound(type, options = {}) {
  const { multiplier = 1 } = options;
  const context = ensureAudioContext();
  const now = context.currentTime;

  const playTone = (frequency, duration, delay = 0, volume = 0.08) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now + delay);

    gain.gain.setValueAtTime(0, now + delay);
    gain.gain.linearRampToValueAtTime(volume, now + delay + ATTACK_TIME);
    gain.gain.exponentialRampToValueAtTime(RELEASE_LEVEL, now + delay + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(now + delay);
    oscillator.stop(now + delay + duration + RELEASE_TIME);
  };

  if (type === 'score') {
    const baseNote = NOTES.C5;
    const scoreMultiplier = Math.min(SOUND_MULTIPLIERS.MAX_EXCITEMENT, Math.max(SOUND_MULTIPLIERS.MIN_EXCITEMENT, multiplier));
    const baseVolume = Math.min(SOUND_MULTIPLIERS.VOLUME_MAX, SOUND_MULTIPLIERS.VOLUME_BASE + SOUND_MULTIPLIERS.VOLUME_INCREMENT * scoreMultiplier);

    // in C major chord progression
    // base score (90 pts): C5 + E5
    playTone(baseNote, SOUND_DURATIONS.SCORE_BASE, 0, baseVolume);
    playTone(baseNote * 1.25, SOUND_DURATIONS.SCORE_E5, SOUND_DELAYS.E5_OFFSET, baseVolume * SOUND_MULTIPLIERS.E5_VOLUME_RATIO);

    // higher scores: add G5
    if (scoreMultiplier >= 1.5) {
      playTone(baseNote * 1.5, SOUND_DURATIONS.SCORE_G5, SOUND_DELAYS.G5_OFFSET, baseVolume * SOUND_MULTIPLIERS.G5_VOLUME_RATIO);
    }

    // even higher: add C6
    if (scoreMultiplier >= 2.5) {
      playTone(baseNote * 2, SOUND_DURATIONS.SCORE_C6, SOUND_DELAYS.C6_OFFSET, baseVolume * SOUND_MULTIPLIERS.C6_VOLUME_RATIO);
    }

    // highest: add G6
    if (scoreMultiplier >= 3.5) {
      playTone(baseNote * 3, SOUND_DURATIONS.SCORE_G6, SOUND_DELAYS.G6_OFFSET, baseVolume * SOUND_MULTIPLIERS.G6_VOLUME_RATIO);
    }
    return;
  }

  // placement sound: G3
  playTone(NOTES.G3, SOUND_DURATIONS.PLACE, 0, SOUND_MULTIPLIERS.PLACE_VOLUME);
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

let audioContext = null;