/** Business timezone is Asia/Kolkata (BR-009). All date-only fields are exchanged as YYYY-MM-DD. */
export const toDateOnly = (d?: Date | null): string | undefined =>
  d ? d.toISOString().slice(0, 10) : undefined;

export const fromDateOnly = (s?: string | null): Date | null =>
  s ? new Date(`${s}T00:00:00.000Z`) : null;
