export function confettiBurst(count = 44) {
  if (typeof window === "undefined") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const fields = ["#4DA768", "#7BCF8A", "#8ee39a", "#f59e0b", "#38bdf8", "#c084fc", "#f472b6"];
  for (let i = 0; i < count; i++) {
    const bit = document.createElement("span");
    bit.className = "confetti-bit";
    bit.style.left = `${Math.random() * 100}vw`;
    bit.style.background = fields[Math.floor(Math.random() * fields.length)];
    bit.style.animationDuration = `${1.9 + Math.random() * 1.3}s`;
    bit.style.animationDelay = `${Math.random() * 0.35}s`;
    bit.style.width = `${5 + Math.random() * 5}px`;
    bit.style.height = `${8 + Math.random() * 6}px`;
    document.body.appendChild(bit);
    setTimeout(() => bit.remove(), 3600);
  }
}
