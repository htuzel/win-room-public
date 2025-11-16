// Win Room v2.0 - Confetti Helper
import confetti from 'canvas-confetti';

/**
 * Trigger confetti for jackpot
 */
export function celebrateJackpot() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#22c55e', '#16a34a', '#dcfce7'];

  (function frame() {
    confetti({
      particleCount: 2,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: colors,
    });

    confetti({
      particleCount: 2,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

/**
 * Trigger confetti for streak
 */
export function celebrateStreak() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#22c55e', '#16a34a', '#dcfce7'],
  });
}

/**
 * Trigger confetti for claim
 */
export function celebrateClaim() {
  confetti({
    particleCount: 50,
    spread: 50,
    origin: { y: 0.7 },
    colors: ['#22c55e', '#dcfce7'],
  });
}
