export const celebrationPalettes = {
  "midnight-gold": {
    name: "Midnight Gold",
    ink: "#0a0d18",
    accent: "#dfb96d",
    light: "#fff1cb",
    confetti: ["#d9ac50", "#edcf94", "#fff2cf"],
  },
  "disco-rose": {
    name: "Disco Rose",
    ink: "#200c1d",
    accent: "#eb93bb",
    light: "#ffe4ef",
    confetti: ["#e6a2b8", "#c57d78", "#ffe5ef"],
  },
  "stardust-silver": {
    name: "Stardust Silver",
    ink: "#091727",
    accent: "#aecdee",
    light: "#f2f7ff",
    confetti: ["#c7d1dc", "#9cbfe8", "#ffffff"],
  },
} as const;

export type CelebrationPalette = keyof typeof celebrationPalettes;
