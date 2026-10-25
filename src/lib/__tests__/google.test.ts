import { describe, expect, it } from 'vitest'
import { GOOGLE_BUTTON_LABEL, GOOGLE_BUTTON_OPTIONS, GOOGLE_GSI_SRC } from '../google'

describe('Google Identity Services config', () => {
  it('loads the English script', () => {
    expect(GOOGLE_GSI_SRC).toBe('https://accounts.google.com/gsi/client?hl=en')
    expect(new URL(GOOGLE_GSI_SRC).searchParams.get('hl')).toBe('en')
  })

  it('renders an English continue-with button with an English accessible name', () => {
    expect(GOOGLE_BUTTON_OPTIONS.locale).toBe('en')
    expect(GOOGLE_BUTTON_OPTIONS.text).toBe('continue_with')
    expect(GOOGLE_BUTTON_LABEL).toBe('Continue with Google')
  })

  it('keeps the existing button shape', () => {
    expect(GOOGLE_BUTTON_OPTIONS).toMatchObject({ theme: 'outline', size: 'large', shape: 'pill', logo_alignment: 'center' })
  })
})
