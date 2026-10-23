import confetti from "canvas-confetti";

const COLORS = ["#4DA768", "#7BCF8A", "#8ee39a", "#f59e0b", "#38bdf8", "#c084fc", "#f472b6"];

export function confettiBurst(count = 44) {
  if (typeof window === "undefined") return;
  confetti({
    particleCount: Math.round(count * 1.4),
    spread: 72,
    startVelocity: 42,
    origin: { y: 0.75 },
    colors: COLORS,
    ticks: 240,
    scalar: 0.95,
    gravity: 1.05,
    zIndex: 90,
    disableForReducedMotion: true,
  });
  setTimeout(() => {
    confetti({
      particleCount: 26,
      spread: 100,
      startVelocity: 30,
      scalar: 0.7,
      origin: { y: 0.7 },
      colors: COLORS,
      zIndex: 90,
      disableForReducedMotion: true,
    });
  }, 220);
}
