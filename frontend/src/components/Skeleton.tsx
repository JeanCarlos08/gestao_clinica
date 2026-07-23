"use client";

interface SkeletonProps {
  lines?: number;
  style?: React.CSSProperties;
}

export default function Skeleton({ lines = 3, style }: SkeletonProps) {
  return (
    <div style={{ padding: 16, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 14,
            borderRadius: 4,
            background: "linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)",
            backgroundSize: "200% 100%",
            animation: "shimmer 1.5s infinite",
            marginBottom: 8,
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0 } 100% { background-position: -200% 0 } }`}</style>
    </div>
  );
}
