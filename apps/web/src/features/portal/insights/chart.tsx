"use client";

import { useEffect, useRef } from "react";
import type { ChartConfiguration } from "chart.js";

/** A design token colour from the CSS variables (charts draw on canvas, not CSS). */
export function token(name: string): string {
  if (typeof window === "undefined") return "";
  return getComputedStyle(document.documentElement).getPropertyValue(`--color-${name}`).trim();
}

let registered: Promise<typeof import("chart.js")> | null = null;
/** Chart.js is loaded only in the browser, on pages with a chart (keeps it out of the Worker). */
function loadChartJs() {
  registered ??= import("chart.js").then((m) => {
    m.Chart.register(
      m.BarController,
      m.BarElement,
      m.LineController,
      m.LineElement,
      m.PointElement,
      m.DoughnutController,
      m.ArcElement,
      m.CategoryScale,
      m.LinearScale,
      m.Filler,
      m.Tooltip,
    );
    m.Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) m.Chart.defaults.animation = false;
    else if (m.Chart.defaults.animation) m.Chart.defaults.animation.duration = 400;
    return m;
  });
  return registered;
}

/** Canvas chart that rebuilds when `config` changes. `label` describes it for screen readers. */
export function ChartCanvas({ config, label, className }: { config: () => ChartConfiguration; label: string; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let chart: import("chart.js").Chart | undefined;
    let cancelled = false;
    void loadChartJs().then(({ Chart }) => {
      if (cancelled || !canvas.current) return;
      chart = new Chart(canvas.current, config());
    });
    return () => {
      cancelled = true;
      chart?.destroy();
    };
  }, [config]);
  return (
    <div className={className} style={{ position: "relative" }}>
      <canvas ref={canvas} role="img" aria-label={label} />
    </div>
  );
}
