"use client";

type Variant = "default" | "appointment" | "document" | "upload" | "report" | "search";

interface EmptyIllustrationProps {
  variant?: Variant;
  size?: number;
}

function Stethoscope({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="var(--primary)" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="42" stroke="var(--primary)" strokeOpacity="0.05" strokeWidth="1" />
      {/* stethoscope tube */}
      <path d="M48 35 C48 35, 42 55, 42 68 C42 78, 48 85, 56 85 C64 85, 70 78, 70 68 C70 55, 64 35, 64 35" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      {/* earpieces */}
      <line x1="48" y1="35" x2="42" y2="25" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <line x1="64" y1="35" x2="70" y2="25" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <circle cx="42" cy="23" r="3" fill="var(--primary)" opacity="0.5" />
      <circle cx="70" cy="23" r="3" fill="var(--primary)" opacity="0.5" />
      {/* chest piece */}
      <circle cx="56" cy="90" r="8" fill="var(--primary)" fillOpacity="0.15" stroke="var(--primary)" strokeWidth="2" opacity="0.8" />
      <circle cx="56" cy="90" r="3" fill="var(--primary)" opacity="0.4" />
      {/* pulse wave */}
      <path d="M30 60 L42 60 L46 50 L50 70 L54 55 L58 65 L62 60 L90 60" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.25" />
    </svg>
  );
}

function CalendarEmpty({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="var(--primary)" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="42" stroke="var(--primary)" strokeOpacity="0.05" strokeWidth="1" />
      {/* calendar body */}
      <rect x="30" y="35" width="60" height="52" rx="8" fill="var(--primary)" fillOpacity="0.08" stroke="var(--primary)" strokeWidth="2" opacity="0.7" />
      {/* header bar */}
      <rect x="30" y="35" width="60" height="16" rx="8" fill="var(--primary)" fillOpacity="0.15" />
      <rect x="30" y="43" width="60" height="8" fill="var(--primary)" fillOpacity="0.15" />
      {/* hooks */}
      <line x1="44" y1="28" x2="44" y2="42" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <line x1="76" y1="28" x2="76" y2="42" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      {/* grid dots */}
      <circle cx="44" cy="62" r="2.5" fill="var(--primary)" opacity="0.25" />
      <circle cx="60" cy="62" r="2.5" fill="var(--primary)" opacity="0.25" />
      <circle cx="76" cy="62" r="2.5" fill="var(--primary)" opacity="0.25" />
      <circle cx="44" cy="76" r="2.5" fill="var(--primary)" opacity="0.25" />
      <circle cx="60" cy="76" r="2.5" fill="var(--primary)" opacity="0.25" />
      <circle cx="76" cy="76" r="2.5" fill="var(--primary)" opacity="0.25" />
      {/* plus */}
      <line x1="60" y1="60" x2="60" y2="78" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
      <line x1="51" y1="69" x2="69" y2="69" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.35" />
    </svg>
  );
}

function DocumentEmpty({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="var(--primary)" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="42" stroke="var(--primary)" strokeOpacity="0.05" strokeWidth="1" />
      {/* doc */}
      <path d="M42 28 L72 28 L82 38 L82 92 C82 95.3 79.3 98 76 98 L44 98 C40.7 98 38 95.3 38 92 L38 34 C38 30.7 40.7 28 44 28 Z" fill="var(--primary)" fillOpacity="0.08" stroke="var(--primary)" strokeWidth="2" opacity="0.7" />
      {/* fold */}
      <path d="M72 28 L72 38 L82 38" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" fill="none" />
      {/* lines */}
      <line x1="50" y1="52" x2="72" y2="52" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="50" y1="62" x2="68" y2="62" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="50" y1="72" x2="64" y2="72" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      <line x1="50" y1="82" x2="60" y2="82" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.2" />
      {/* check */}
      <circle cx="58" cy="57" r="16" fill="var(--primary)" fillOpacity="0.06" stroke="var(--primary)" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
    </svg>
  );
}

function UploadEmpty({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="var(--primary)" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="42" stroke="var(--primary)" strokeOpacity="0.05" strokeWidth="1" />
      {/* cloud */}
      <path d="M38 72 C28 72 22 64 24 56 C26 46 36 42 42 44 C44 34 54 28 64 30 C74 32 80 40 80 48 C88 50 92 58 88 66 C84 74 76 76 70 74 L50 74" fill="var(--primary)" fillOpacity="0.08" stroke="var(--primary)" strokeWidth="2" opacity="0.6" strokeLinejoin="round" />
      {/* arrow up */}
      <line x1="60" y1="82" x2="60" y2="54" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      <polyline points="50,64 60,54 70,64" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
    </svg>
  );
}

function ReportEmpty({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="var(--primary)" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="42" stroke="var(--primary)" strokeOpacity="0.05" strokeWidth="1" />
      {/* bars */}
      <rect x="32" y="70" width="12" height="20" rx="3" fill="var(--primary)" fillOpacity="0.2" stroke="var(--primary)" strokeWidth="1.5" opacity="0.6" />
      <rect x="48" y="54" width="12" height="36" rx="3" fill="var(--primary)" fillOpacity="0.25" stroke="var(--primary)" strokeWidth="1.5" opacity="0.7" />
      <rect x="64" y="40" width="12" height="50" rx="3" fill="var(--primary)" fillOpacity="0.3" stroke="var(--primary)" strokeWidth="1.5" opacity="0.8" />
      <rect x="80" y="58" width="12" height="32" rx="3" fill="var(--primary)" fillOpacity="0.2" stroke="var(--primary)" strokeWidth="1.5" opacity="0.6" />
      {/* trend line */}
      <path d="M34 62 L50 48 L68 36 L86 44" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.4" />
      <circle cx="34" cy="62" r="3" fill="var(--primary)" opacity="0.5" />
      <circle cx="50" cy="48" r="3" fill="var(--primary)" opacity="0.5" />
      <circle cx="68" cy="36" r="3" fill="var(--primary)" opacity="0.5" />
      <circle cx="86" cy="44" r="3" fill="var(--primary)" opacity="0.5" />
    </svg>
  );
}

function SearchEmpty({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="60" cy="60" r="56" stroke="var(--primary)" strokeOpacity="0.08" strokeWidth="1.5" />
      <circle cx="60" cy="60" r="42" stroke="var(--primary)" strokeOpacity="0.05" strokeWidth="1" />
      {/* magnifying glass */}
      <circle cx="52" cy="52" r="20" fill="var(--primary)" fillOpacity="0.06" stroke="var(--primary)" strokeWidth="2.5" opacity="0.7" />
      <line x1="66" y1="66" x2="82" y2="82" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
      {/* X inside */}
      <line x1="44" y1="44" x2="60" y2="60" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
      <line x1="60" y1="44" x2="44" y2="60" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

const ILLUSTRATIONS: Record<Variant, React.ComponentType<{ size: number }>> = {
  default: Stethoscope,
  appointment: CalendarEmpty,
  document: DocumentEmpty,
  upload: UploadEmpty,
  report: ReportEmpty,
  search: SearchEmpty,
};

export default function EmptyIllustration({ variant = "default", size = 120 }: EmptyIllustrationProps) {
  const Illust = ILLUSTRATIONS[variant];
  return (
    <div className="flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity duration-500">
      <Illust size={size} />
    </div>
  );
}
