// src/demo.ts
import type { FieldDataResponse, Point } from "./types";

// 文字列→安定したseed
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 疑似乱数
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function makeDemoFieldData(padId: string, hours = 24): FieldDataResponse {
  const seed = hashString(padId);
  const rnd = mulberry32(seed);

  const now = Date.now();
  const end = now;
  const start = now - hours * 60 * 60 * 1000;

  // 10分間隔（24h => 144点）
  const stepMs = 10 * 60 * 1000;

  const waterBase = 8 + rnd() * 10; // 8〜18cm
  const waterAmp = 2 + rnd() * 4;   // 2〜6cm
  const tempBase = 12 + rnd() * 10; // 12〜22℃
  const tempAmp = 3 + rnd() * 6;    // 3〜9℃
  const phaseW = rnd() * Math.PI * 2;
  const phaseT = rnd() * Math.PI * 2;

  let battery = 70 + rnd() * 30; // 70〜100%

  const points: Point[] = [];
  for (let t = start; t <= end; t += stepMs) {
    const day = (t - start) / (24 * 60 * 60 * 1000); // 0..1

    const w =
      waterBase +
      waterAmp * Math.sin(day * Math.PI * 2 + phaseW) +
      (rnd() - 0.5) * 0.8;

    const temp =
      tempBase +
      tempAmp * Math.sin(day * Math.PI * 2 + phaseT) +
      (rnd() - 0.5) * 0.6;

    battery -= 0.05 + rnd() * 0.03;
    battery = clamp(battery + (rnd() < 0.02 ? 1.5 : 0), 0, 100);

    points.push({
      t,
      waterCm: clamp(w, 0, 30),
      temp: clamp(temp, 0, 40),
      battery: clamp(battery, 0, 100),
    });
  }

  // ✅ nullは返さない（無いときは last を省略）
  const last = points.length ? points[points.length - 1] : undefined;
  return last ? { points, last } : { points };
}
