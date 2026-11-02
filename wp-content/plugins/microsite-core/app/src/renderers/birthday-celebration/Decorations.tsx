import { DiscoBall } from "./DiscoBall";
import { useId } from "react";

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M20 0 23 17 40 20 23 23 20 40 17 23 0 20 17 17Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BalloonCluster({ side }: { side: "left" | "right" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`celebration-balloons celebration-balloons-${side}`}
      viewBox="0 0 230 540"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`${id}-foil`} cx="28%" cy="23%" r="83%">
          <stop offset="0" stopColor="var(--celebration-light)" />
          <stop offset=".14" stopColor="#fffdf5" />
          <stop offset=".28" stopColor="var(--celebration-metal)" />
          <stop offset=".57" stopColor="var(--celebration-deep)" />
          <stop offset=".8" stopColor="var(--celebration-metal)" />
          <stop offset="1" stopColor="var(--celebration-deep)" />
        </radialGradient>
        <radialGradient id={`${id}-dark`} cx="32%" cy="20%" r="80%">
          <stop offset="0" stopColor="#cbd0d8" />
          <stop offset=".12" stopColor="#434652" />
          <stop offset=".5" stopColor="var(--celebration-ink)" />
          <stop offset=".9" stopColor="#05060b" />
          <stop offset="1" stopColor="var(--celebration-metal)" />
        </radialGradient>
      </defs>
      {[
        { x: 73, y: 83, r: 48 },
        { x: 161, y: 161, r: 53 },
        { x: 57, y: 234, r: 56 },
        { x: 157, y: 311, r: 47 },
      ].map((balloon, index) => (
        <g
          key={index}
          className="celebration-balloon"
          style={{ animationDelay: `${index * -1.7}s` }}
        >
          <path
            d={`M${balloon.x} ${balloon.y + balloon.r * 1.25} Q${balloon.x - 40} ${balloon.y + 150} 111 520`}
            fill="none"
            stroke="var(--celebration-metal)"
            strokeOpacity=".5"
            strokeWidth=".8"
          />
          <ellipse
            cx={balloon.x}
            cy={balloon.y}
            rx={balloon.r}
            ry={balloon.r * 1.2}
            fill={`url(#${id}-${index % 2 ? "dark" : "foil"})`}
            stroke="var(--celebration-light)"
            strokeOpacity=".35"
            strokeWidth=".6"
          />
          <path
            d={`M${balloon.x - 20} ${balloon.y - balloon.r * 0.8} Q${balloon.x - balloon.r * 0.75} ${balloon.y - 15} ${balloon.x - balloon.r * 0.6} ${balloon.y + 10}`}
            fill="none"
            stroke="white"
            strokeOpacity=".55"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d={`M${balloon.x} ${balloon.y + balloon.r * 1.18} l-5 9 h10Z`}
            fill="var(--celebration-metal)"
          />
        </g>
      ))}
    </svg>
  );
}

export function Ribbon({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg
      className={`celebration-ribbon ${className}`}
      viewBox="0 0 90 600"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id}>
          <stop stopColor="var(--celebration-deep)" />
          <stop offset=".4" stopColor="var(--celebration-light)" />
          <stop offset=".55" stopColor="var(--celebration-metal)" />
          <stop offset="1" stopColor="var(--celebration-deep)" />
        </linearGradient>
      </defs>
      <path
        d="M45-20C-40 40 125 90 45 140S-35 220 45 260 125 340 45 390-35 470 45 510 85 565 45 620"
        fill="none"
        stroke={`url(#${id})`}
        strokeWidth="12"
      />
      <path
        d="M45-20C-40 40 125 90 45 140S-35 220 45 260 125 340 45 390-35 470 45 510 85 565 45 620"
        fill="none"
        stroke="var(--celebration-light)"
        strokeWidth=".6"
        strokeOpacity=".65"
      />
    </svg>
  );
}

export function Decorations() {
  return (
    <div className="celebration-decorations" aria-hidden="true">
      <DiscoBall />
      <BalloonCluster side="left" />
      <BalloonCluster side="right" />
      <Ribbon className="celebration-ribbon-left" />
      <Ribbon className="celebration-ribbon-right" />
      <Star className="celebration-star celebration-star-one" />
      <Star className="celebration-star celebration-star-two" />
      <Star className="celebration-star celebration-star-three" />
    </div>
  );
}
