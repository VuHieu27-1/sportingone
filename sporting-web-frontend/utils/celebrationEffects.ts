/**
 * celebrationEffects.ts
 * Provides premium visual confetti particles and Web Audio victory chime
 * for successful payment and order confirmations.
 */

// Colors matching Sporting ONE design palette (Evergreen, Emerald, Gold, Mint, Accent)
const CONFETTI_COLORS = [
  '#006241', // Sporting green
  '#10B981', // Emerald
  '#34D399', // Mint
  '#F59E0B', // Golden amber
  '#FBBF24', // Warm gold
  '#1E3932', // Dark evergreen
  '#06B6D4', // Cyan accent
  '#EC4899', // Coral pink
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
  shape: 'rect' | 'circle' | 'star';
  opacity: number;
  decay: number;
  wobble: number;
  wobbleSpeed: number;
}

/**
 * Triggers a multi-stage celebratory confetti explosion across the screen.
 */
export const triggerCelebrationConfetti = (durationMs = 2800) => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Prevent multiple overlapping canvases
  const existingCanvas = document.getElementById('sporting-confetti-canvas') as HTMLCanvasElement | null;
  if (existingCanvas) {
    existingCanvas.remove();
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'sporting-confetti-canvas';
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '999999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = (canvas.width = window.innerWidth * (window.devicePixelRatio || 1));
  const height = (canvas.height = window.innerHeight * (window.devicePixelRatio || 1));
  ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;

  const particles: Particle[] = [];
  const particleCount = 140;

  // Helper to create particle
  const createParticle = (originX: number, originY: number, angleMin: number, angleMax: number, speedMin: number, speedMax: number): Particle => {
    const angle = angleMin + Math.random() * (angleMax - angleMin);
    const speed = speedMin + Math.random() * (speedMax - speedMin);
    const rad = (angle * Math.PI) / 180;
    const shapes: ('rect' | 'circle' | 'star')[] = ['rect', 'rect', 'circle', 'star'];

    return {
      x: originX,
      y: originY,
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed,
      size: 6 + Math.random() * 8,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      opacity: 1,
      decay: 0.008 + Math.random() * 0.006,
      wobble: Math.random() * 10,
      wobbleSpeed: 0.06 + Math.random() * 0.08,
    };
  };

  // 1. Left cannon burst
  for (let i = 0; i < particleCount / 3; i++) {
    particles.push(createParticle(cssWidth * 0.1, cssHeight * 0.75, -80, -20, 14, 26));
  }

  // 2. Right cannon burst
  for (let i = 0; i < particleCount / 3; i++) {
    particles.push(createParticle(cssWidth * 0.9, cssHeight * 0.75, -160, -100, 14, 26));
  }

  // 3. Center shower
  for (let i = 0; i < particleCount / 3; i++) {
    particles.push(createParticle(cssWidth * 0.5, cssHeight * 0.35, -135, -45, 8, 20));
  }

  let animationFrameId: number;
  const startTime = performance.now();

  const render = (now: number) => {
    const elapsed = now - startTime;
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.38; // Gravity
      p.vx *= 0.98; // Air resistance
      p.rotation += p.rotationSpeed;
      p.wobble += p.wobbleSpeed;
      p.opacity -= p.decay;

      if (p.opacity <= 0 || p.y > cssHeight + 50) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x + Math.sin(p.wobble) * 3, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;

      if (p.shape === 'rect') {
        ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      } else if (p.shape === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shape === 'star') {
        ctx.beginPath();
        const spikes = 5;
        const outerRadius = p.size / 2;
        const innerRadius = p.size / 4;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;

        ctx.moveTo(0, -outerRadius);
        for (let s = 0; s < spikes; s++) {
          let sx = Math.cos(rot) * outerRadius;
          let sy = Math.sin(rot) * outerRadius;
          ctx.lineTo(sx, sy);
          rot += step;

          sx = Math.cos(rot) * innerRadius;
          sy = Math.sin(rot) * innerRadius;
          ctx.lineTo(sx, sy);
          rot += step;
        }
        ctx.lineTo(0, -outerRadius);
        ctx.closePath();
        ctx.fill();
      }

      ctx.restore();
    }

    if (particles.length > 0 && elapsed < durationMs) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      if (canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
    }
  };

  animationFrameId = requestAnimationFrame(render);

  setTimeout(() => {
    cancelAnimationFrame(animationFrameId);
    if (canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }, durationMs + 500);
};

/**
 * Plays a pleasant, modern, crystal-clear 3-note victory chime (Web Audio API).
 * Zero external audio file dependency.
 */
export const playSuccessChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();

    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }

    const now = audioCtx.currentTime;
    // Chime chords: E5 (659.25Hz) -> G#5 (830.61Hz) -> B5 (987.77Hz) -> E6 (1318.51Hz)
    const notes = [
      { freq: 659.25, time: 0.0, dur: 0.35, gain: 0.15 },
      { freq: 830.61, time: 0.09, dur: 0.4, gain: 0.18 },
      { freq: 987.77, time: 0.18, dur: 0.5, gain: 0.22 },
      { freq: 1318.51, time: 0.28, dur: 0.7, gain: 0.25 },
    ];

    notes.forEach((note) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.time);

      gainNode.gain.setValueAtTime(0.001, now + note.time);
      gainNode.gain.exponentialRampToValueAtTime(note.gain, now + note.time + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur);

      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      osc.start(now + note.time);
      osc.stop(now + note.time + note.dur);
    });

    setTimeout(() => {
      audioCtx.close().catch(() => {});
    }, 1500);
  } catch {
    // Graceful fallback if browser policies block audio
  }
};

/**
 * Combined celebration trigger for payment success.
 */
export const triggerPaymentSuccessCelebration = () => {
  triggerCelebrationConfetti();
  playSuccessChime();
};
