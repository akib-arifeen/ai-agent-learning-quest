/**
 * Sends the 6-digit sign-in codes. Plain SMTP via nodemailer — by default a Gmail account
 * with an app password (SMTP_USER / SMTP_PASS), which is free for a few hundred emails a
 * day and needs no domain. Without SMTP set, codes are only printed to the server log in
 * local dev so the flow can still be tested; in production the code option is hidden.
 * Server-only.
 */

import nodemailer from 'nodemailer'

const user = () => (process.env.SMTP_USER || '').trim()
const pass = () => (process.env.SMTP_PASS || '').replace(/\s+/g, '')

/** Can we email codes? (Always true in local dev, where codes go to the console.) */
export const otpEnabled = () => (!!user() && !!pass()) || process.env.NODE_ENV !== 'production'

/** Email a sign-in code. */
export async function sendCode(to: string, code: string) {
  if (!user() || !pass()) {
    console.log(`[dev] sign-in code for ${to}: ${code}`)
    return
  }
  const transport = nodemailer.createTransport({
    host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: user(), pass: pass() },
  })
  await transport.sendMail({
    from: `"Spark · Creative AI Agent Quest" <${user()}>`,
    to,
    subject: `${code} is your Creative AI Agent Quest code`,
    text: `Your sign-in code is ${code}\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:28px;background:#fbf8ec;border-radius:20px;color:#1c2230">
      <p style="font-size:15px;margin:0 0 6px">Hey! Here’s your sign-in code:</p>
      <p style="font-size:38px;font-weight:800;letter-spacing:8px;margin:8px 0 14px">${code}</p>
      <p style="font-size:13px;color:#5b6170;margin:0">It works for 10 minutes. If you didn’t ask for it, just ignore this email.<br>— Spark ✦</p>
    </div>`,
  })
}

/** Email a password-recovery code. Same transport as sign-in; purpose-specific copy. */
export async function sendRecoveryCode(to: string, code: string) {
  if (!user() || !pass()) {
    // Never put a real code in production logs; the recovery route is off there without SMTP.
    if (process.env.NODE_ENV === 'production') throw new Error('SMTP is not configured')
    console.log(`[dev] password reset code for ${to}: ${code}`)
    return
  }
  const transport = nodemailer.createTransport({
    host: (process.env.SMTP_HOST || 'smtp.gmail.com').trim(),
    port: Number(process.env.SMTP_PORT || 465),
    secure: Number(process.env.SMTP_PORT || 465) === 465,
    auth: { user: user(), pass: pass() },
  })
  await transport.sendMail({
    from: `"Spark · Creative AI Agent Quest" <${user()}>`,
    to,
    subject: 'Reset your Creative AI Agent Quest password',
    text: `Your password reset code is ${code}\n\nIt works for 10 minutes. If you didn't ask for this, you can ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:420px;margin:auto;padding:28px;background:#fbf8ec;border-radius:20px;color:#1c2230">
      <p style="font-size:15px;margin:0 0 6px">Here’s your password reset code:</p>
      <p style="font-size:38px;font-weight:800;letter-spacing:8px;margin:8px 0 14px">${code}</p>
      <p style="font-size:13px;color:#5b6170;margin:0">It works for 10 minutes. If you didn’t ask for this, just ignore this email.<br>— Spark ✦</p>
    </div>`,
  })
}
