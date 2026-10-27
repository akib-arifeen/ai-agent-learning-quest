/**
 * Google Identity Services, pinned to English. The surrounding app is English, and the
 * browser's own locale would otherwise give the button (and the popup) another language.
 */

/** The GSI script, with `hl=en` so the button and popup labels stay English. */
export const GOOGLE_GSI_SRC = 'https://accounts.google.com/gsi/client?hl=en'

/** The accessible name for Google's button; the iframe carries the visible label. */
export const GOOGLE_BUTTON_LABEL = 'Continue with Google'

/** Button shape/behaviour. `locale: 'en'` keeps Google's own label in English too. */
export const GOOGLE_BUTTON_OPTIONS = {
  theme: 'outline',
  size: 'large',
  shape: 'pill',
  text: 'continue_with',
  logo_alignment: 'center',
  locale: 'en',
} as const
