/**
 * When to show the short in-app hello (plan 3.1: real onboarding happens on
 * WhatsApp). Shown once per account: never again after it was completed or
 * dismissed. Pure functions so they are unit-tested.
 */

/** onboarding_progress row (or null) -> should the modal open? */
export function shouldShowOnboarding(progress) {
  if (!progress) return true;
  return !progress.is_completed && !progress.skipped;
}

/** In-app steps: 1) language + currency, 2) open Zul on WhatsApp. */
export const ONBOARDING_STEPS = ['locale', 'whatsapp'];
