import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  size?: LogoSize;
  className?: string;
}

const sizeMap: Record<LogoSize, { icon: number; text: string; gap: string }> = {
  sm: { icon: 24, text: "text-sm",  gap: "gap-2" },
  md: { icon: 32, text: "text-xl",  gap: "gap-3" },
  lg: { icon: 48, text: "text-3xl", gap: "gap-4" },
};

export function Logo({ size = "md", className }: LogoProps) {
  const { icon, text, gap } = sizeMap[size];
  const r = icon * 0.2; // corner radius — 20% of icon size

  return (
    <div className={cn("flex items-center", gap, className)}>
      {/* Icon: rounded rect with gold play triangle */}
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Rounded rectangle background */}
        <rect
          x="1"
          y="1"
          width="46"
          height="46"
          rx={r * (48 / icon)}
          fill="#0A0A0A"
          stroke="#D4AF37"
          strokeWidth="1.5"
        />
        {/* Gold play triangle — centered, pointing right */}
        <polygon
          points="19,14 19,34 36,24"
          fill="#D4AF37"
        />
      </svg>

      {/* Wordmark */}
      <span
        className={cn(
          "font-semibold tracking-tight leading-none select-none",
          text,
        )}
      >
        <span className="text-foreground">ArqueOps</span>
        <span className="text-primary"> Tube</span>
      </span>
    </div>
  );
}
