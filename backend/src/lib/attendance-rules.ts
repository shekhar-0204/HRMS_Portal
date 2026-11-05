/**
 * ASSUMPTIONS - confirm against the BRD and adjust:
 *  - Shift starts 09:30 IST with a 15-minute grace period -> check-in after 09:45 is "Late".
 *  - Less than 4 hours worked -> "Half-Day".
 */
export const LATE_AFTER_MINUTES = 9 * 60 + 45;
export const HALF_DAY_BELOW_MINUTES = 4 * 60;
export const CORRECTION_WINDOW_DAYS = 30;
