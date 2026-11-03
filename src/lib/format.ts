import type { BusinessProcess, WorkMode } from "@/lib/types";

export const modeLabels: Record<WorkMode, string> = {
  manual: "Manual",
  semi_automated: "Semi-otomatis",
  automated: "Otomatis",
};

export function money(value: number, currency = "IDR") {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

export function number(value: number, digits = 0) {
  return new Intl.NumberFormat("id-ID", { maximumFractionDigits: digits }).format(Number.isFinite(value) ? value : 0);
}

export function minutes(value: number) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.round(value)) : 0;
  if (safe >= 60) {
    const hours = Math.floor(safe / 60);
    const rest = safe % 60;
    return rest ? `${hours}j ${rest}m` : `${hours}j`;
  }
  return `${safe} mnt`;
}

export function processById(processes: BusinessProcess[], id: string) {
  return processes.find((item) => item.id === id);
}
