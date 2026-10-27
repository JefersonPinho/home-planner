export type Rgba = [number, number, number, number];

export type BoxSpec = {
  cx: number;
  cy: number;
  cz: number;
  w: number;
  h: number;
  d: number;
  color: Rgba;
};

function shade(hex: string, amount: number, alpha = 1): Rgba {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const channels = [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  return channels.map((channel) => {
    const next = amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount);
    return Math.min(255, Math.max(0, next)) / 255;
  }).concat(alpha) as Rgba;
}

function box(w: number, h: number, d: number, cx: number, cy: number, cz: number, color: Rgba): BoxSpec {
  return { w: Math.max(w, 0.02), h: Math.max(h, 0.02), d: Math.max(d, 0.02), cx, cy, cz, color };
}

export function shapeBoxes(shape: string, w: number, d: number, h: number, color: string): BoxSpec[] {
  const base = shade(color, 0);
  const dark = shade(color, -0.28);
  const light = shade(color, 0.28);
  const wood = shade("#c4a574", 0);
  const black = shade("#111827", 0);
  if (shape === "sofa" || shape === "sofa-l") {
    const parts = [
      box(w * 0.94, 0.12, d * 0.72, 0, 0.06, d * 0.04, dark),
      box(w * 0.72, 0.16, d * 0.48, 0, 0.22, d * 0.08, light),
      box(w * 0.9, h * 0.72, d * 0.16, 0, h * 0.42, -d * 0.34, base),
      box(w * 0.1, h * 0.55, d * 0.72, -w * 0.42, h * 0.3, 0.02, base),
      box(w * 0.1, h * 0.55, d * 0.72, w * 0.42, h * 0.3, 0.02, base),
    ];
    if (shape === "sofa-l") {
      parts.push(
        box(w * 0.42, 0.16, d * 0.42, w * 0.24, 0.22, d * 0.28, light),
        box(w * 0.12, h * 0.5, d * 0.38, w * 0.4, h * 0.28, d * 0.28, base),
      );
    }
    return parts;
  }
  if (shape === "bed") {
    return [
      box(w, 0.16, d, 0, 0.08, 0, wood),
      box(w * 0.92, 0.18, d * 0.72, 0, 0.26, d * 0.06, light),
      box(w, Math.max(h * 0.7, 0.4), 0.08, 0, 0.2 + Math.max(h * 0.7, 0.4) / 2, -d / 2 + 0.04, base),
      box(w * 0.48, 0.08, d * 0.16, 0, 0.4, -d * 0.22, shade("#ffffff", 0)),
    ];
  }
  if (shape === "table") {
    return [
      box(w, 0.05, d, 0, h - 0.025, 0, base),
      ...corners(w, d, 0.06).map(([x, z]) => box(0.06, h - 0.05, 0.06, x, (h - 0.05) / 2, z, dark)),
    ];
  }
  if (shape === "chair") {
    return [
      box(w * 0.86, 0.06, d * 0.86, 0, h * 0.48, 0, base),
      box(w * 0.86, h * 0.46, 0.05, 0, h * 0.74, -d * 0.38, base),
      ...corners(w * 0.7, d * 0.7, 0).map(([x, z]) => box(0.04, h * 0.46, 0.04, x, h * 0.23, z, dark)),
    ];
  }
  if (shape === "office-chair") {
    return [
      box(w * 0.7, 0.08, d * 0.7, 0, h * 0.48, 0, base),
      box(w * 0.7, h * 0.42, 0.06, 0, h * 0.74, -d * 0.22, dark),
      box(0.08, h * 0.28, 0.08, 0, h * 0.22, 0, dark),
      box(w * 0.7, 0.04, d * 0.7, 0, 0.05, 0, black),
    ];
  }
  if (shape === "wardrobe") {
    return [
      box(w, h, d, 0, h / 2, 0, base),
      box(w * 0.46, h * 0.92, 0.02, -w * 0.24, h * 0.48, d / 2, light),
      box(w * 0.46, h * 0.92, 0.02, w * 0.24, h * 0.48, d / 2, light),
    ];
  }
  if (shape === "fridge") {
    return [
      box(w, h * 0.68, d, 0, h * 0.34, 0, base),
      box(w, h * 0.3, d, 0, h * 0.84, 0, light),
      box(w * 0.9, 0.02, 0.01, 0, h * 0.68, d / 2, dark),
    ];
  }
  if (shape === "tv") {
    return [
      box(w, h * 0.72, 0.04, 0, h * 0.62, 0, black),
      box(0.08, h * 0.18, 0.08, 0, h * 0.16, 0, dark),
      box(w * 0.46, 0.04, d * 0.7, 0, 0.04, 0, dark),
    ];
  }
  if (shape === "toilet") {
    return [
      box(w * 0.9, h * 0.45, d * 0.62, 0, h * 0.28, d * 0.08, base),
      box(w * 0.8, h * 0.55, d * 0.28, 0, h * 0.55, -d * 0.28, light),
    ];
  }
  if (shape === "sink") {
    return [
      box(w, h * 0.72, d, 0, h * 0.36, 0, base),
      box(w * 0.7, 0.08, d * 0.55, 0, h * 0.78, 0, light),
      box(0.04, 0.16, 0.04, 0, h * 0.9, -d * 0.05, dark),
    ];
  }
  if (shape === "shower") {
    const glass = shade("#bfdbfe", 0.2, 0.45);
    return [
      box(w, 0.08, d, 0, 0.04, 0, dark),
      box(0.04, h, d, -w / 2, h / 2, 0, light),
      box(w, h, 0.03, 0, h / 2, -d / 2, glass),
      box(0.03, h, d, w / 2, h / 2, 0, glass),
    ];
  }
  if (shape === "stove") {
    return [
      box(w, h * 0.86, d, 0, h * 0.4, 0, base),
      box(w * 0.92, 0.03, d * 0.92, 0, h * 0.86, 0, black),
      box(w * 0.7, h * 0.35, 0.02, 0, h * 0.32, d / 2, dark),
    ];
  }
  if (shape === "cooktop") {
    return [
      box(w, h, d, 0, h / 2, 0, black),
      box(w * 0.16, 0.02, d * 0.22, -w * 0.22, h, -d * 0.18, shade("#9ca3af", 0)),
      box(w * 0.16, 0.02, d * 0.22, w * 0.22, h, -d * 0.18, shade("#9ca3af", 0)),
      box(w * 0.16, 0.02, d * 0.22, -w * 0.22, h, d * 0.18, shade("#9ca3af", 0)),
      box(w * 0.16, 0.02, d * 0.22, w * 0.22, h, d * 0.18, shade("#9ca3af", 0)),
    ];
  }
  if (shape === "counter") {
    return [
      box(w, h * 0.86, d * 0.92, 0, h * 0.4, 0, base),
      box(w, 0.05, d, 0, h - 0.025, 0, light),
    ];
  }
  if (shape === "cabinet" || shape === "nightstand" || shape === "rack") {
    return [
      box(w, h, d, 0, h / 2, 0, base),
      box(w * 0.86, 0.02, 0.015, 0, h * 0.62, d / 2, dark),
    ];
  }
  if (shape === "desk") {
    return [
      box(w, 0.05, d, 0, h - 0.025, 0, base),
      box(w * 0.28, h - 0.05, d * 0.9, -w * 0.32, (h - 0.05) / 2, 0, dark),
      box(0.05, h - 0.05, d * 0.86, w * 0.42, (h - 0.05) / 2, 0, dark),
    ];
  }
  if (shape === "shelf") {
    return [0.08, 0.38, 0.68, 0.92].map((factor, index) =>
      box(w, 0.03, d, 0, Math.max(h * factor, 0.04), 0, index === 0 ? dark : base),
    ).concat([
      box(0.04, h, d, -w / 2 + 0.02, h / 2, 0, wood),
      box(0.04, h, d, w / 2 - 0.02, h / 2, 0, wood),
    ]);
  }
  if (shape === "grill") {
    return [
      box(w, h * 0.45, d, 0, h * 0.62, 0, dark),
      box(w * 0.86, 0.04, d * 0.8, 0, h * 0.86, 0, black),
      ...corners(w * 0.8, d * 0.7, 0).map(([x, z]) => box(0.06, h * 0.4, 0.06, x, h * 0.2, z, base)),
    ];
  }
  if (shape === "monitor") {
    return [
      box(w, h * 0.72, 0.04, 0, h * 0.62, 0, black),
      box(0.06, h * 0.22, 0.06, 0, h * 0.16, 0, dark),
      box(w * 0.4, 0.03, d, 0, 0.02, 0, dark),
    ];
  }
  if (shape === "plant") {
    return [
      box(w * 0.7, h * 0.35, d * 0.7, 0, h * 0.16, 0, shade("#b45309", -0.1)),
      box(w * 0.55, h * 0.5, d * 0.55, 0, h * 0.62, 0, base),
    ];
  }
  return [box(w, h, d, 0, h / 2, 0, base)];
}

function corners(w: number, d: number, inset: number): [number, number][] {
  const x = w / 2 - inset - 0.04;
  const z = d / 2 - inset - 0.04;
  return [
    [-x, -z],
    [x, -z],
    [-x, z],
    [x, z],
  ];
}
