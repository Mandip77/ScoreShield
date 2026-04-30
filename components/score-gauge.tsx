"use client";

interface ScoreGaugeProps {
  score: number;
  grade: string;
  size?: number;
}

const GRADE_COLOR: Record<string, string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

export function ScoreGauge({ score, grade, size = 180 }: ScoreGaugeProps) {
  const radius = size / 2 - 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const color = GRADE_COLOR[grade] ?? "#6b7280";

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={16}
          className="text-muted"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={16}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text
          x={size / 2}
          y={size / 2 + 6}
          textAnchor="middle"
          className="rotate-90"
          fill="currentColor"
          fontSize={size / 4}
          fontWeight="bold"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          {score}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 26}
          textAnchor="middle"
          fill={color}
          fontSize={size / 8}
          fontWeight="bold"
          style={{ transform: `rotate(90deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
        >
          Grade {grade}
        </text>
      </svg>
    </div>
  );
}
