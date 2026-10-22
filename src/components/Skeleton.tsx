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
          className="skeleton"
          style={{
            height: 14,
            marginBottom: 8,
            width: i === lines - 1 ? "60%" : "100%",
          }}
        />
      ))}
    </div>
  );
}
