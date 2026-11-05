import type { Response } from "express";

/** Neutralise spreadsheet formula injection (=, +, -, @, tab, CR at the start of a cell). */
const cell = (v: unknown): string => {
  let s = v === null || v === undefined ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function sendCsv(res: Response, filename: string, rows: Record<string, unknown>[]): void {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const body = [headers.join(","), ...rows.map((r) => headers.map((h) => cell(r[h])).join(","))].join("\r\n");
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
  res.send("\uFEFF" + body); // BOM so Excel opens UTF-8 correctly
}
