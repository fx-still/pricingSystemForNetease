const EXCEL_EPOCH_OFFSET = 25569;
const DAY_MS = 24 * 60 * 60 * 1000;

function asString(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

export function normalizeAccountId(value: unknown): string {
  return asString(value).replace(/\r?\n/g, "").trim().toLowerCase();
}

export function parsePrice(value: unknown): number | undefined {
  const raw = asString(value);
  if (!raw) {
    return undefined;
  }

  const normalized = raw
    .replace(/[￥¥元,\s]/g, "")
    .replace(/[^0-9.-]/g, "");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }
  return parsed;
}

export function parseFansW(value: unknown): number | undefined {
  const raw = asString(value).toLowerCase();
  if (!raw) {
    return undefined;
  }

  const hasWanUnit = raw.includes("w") || raw.includes("万");
  const numeric = Number(raw.replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  if (hasWanUnit) {
    return numeric;
  }

  if (numeric > 10000) {
    return numeric / 10000;
  }
  return numeric;
}

export function parseNumber(value: unknown): number | undefined {
  const raw = asString(value);
  if (!raw) {
    return undefined;
  }
  const numeric = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return undefined;
  }
  return numeric;
}

export function parseDateToYmd(value: unknown): string | undefined {
  if (value === null || value === undefined || value === "") {
    return undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date((value - EXCEL_EPOCH_OFFSET) * DAY_MS);
    if (Number.isNaN(date.getTime())) {
      return undefined;
    }
    return date.toISOString().slice(0, 10);
  }

  const raw = asString(value);
  if (!raw) {
    return undefined;
  }

  const replaced = raw.replace(/\./g, "-").replace(/\//g, "-");
  const date = new Date(replaced);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString().slice(0, 10);
}

export function toSafeText(value: unknown): string | undefined {
  const raw = asString(value);
  return raw || undefined;
}
