const nodemailer = require('nodemailer');

// Provider-agnostic SMTP config — works with Gmail (app password), Mailtrap,
// SendGrid's SMTP relay, Brevo, AWS SES SMTP, etc. Nothing is hardcoded to a
// specific vendor; just point these env vars at whichever provider you use.
const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
} = process.env;

const isConfigured = Boolean(SMTP_HOST && SMTP_USER && SMTP_PASS);

// Print exactly what's missing at startup, once, instead of leaving people
// to guess why the "DEV MODE" fallback keeps showing up in the app.
if (!isConfigured) {
  const missing = [
    !SMTP_HOST && 'SMTP_HOST',
    !SMTP_USER && 'SMTP_USER',
    !SMTP_PASS && 'SMTP_PASS',
  ].filter(Boolean);
  console.warn(`[emailService] SMTP not configured — missing: ${missing.join(', ')}. Password reset will fall back to dev-mode links.`);
} else {
  // Never log the password itself — just enough shape info to catch the
  // classic mistakes (pasted with spaces still in it, wrapped in quotes,
  // wrong length for a Google app password, regular password used instead).
  const passLooksLikeAppPassword = /^[a-z]{16}$/i.test(SMTP_PASS);
  console.log(`[emailService] SMTP configured (host=${SMTP_HOST}, port=${SMTP_PORT || 587}, user=${SMTP_USER}, passLength=${SMTP_PASS.length}, passHasSpaces=${/\s/.test(SMTP_PASS)}, passHasQuotes=${/['"]/.test(SMTP_PASS)})`);
  if (SMTP_HOST === 'smtp.gmail.com' && !passLooksLikeAppPassword) {
    console.warn('[emailService] WARNING: this doesn\'t look like a 16-character Gmail app password (no spaces/symbols). If you pasted your normal Gmail password, or left spaces in the app password, Google will reject it with "Username and Password not accepted".');
  }
}

let transporter = null;
if (isConfigured) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true', // true for port 465, false for 587/25 (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const FROM_ADDRESS = EMAIL_FROM || `NextWatch <no-reply@nextwatch.app>`;

function passwordResetHtml(resetLink) {
  return `
  <div style="background:#0b0b0f;padding:40px 20px;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;">
    <div style="max-width:440px;margin:0 auto;background:#13131a;border:1px solid rgba(255,255,255,0.07);border-radius:20px;padding:36px 32px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:28px;">
        <span style="font-size:18px;font-weight:700;color:#eeeef5;">Next<span style="color:#a78bfa;">Watch</span></span>
      </div>
      <h1 style="font-size:22px;font-weight:700;color:#eeeef5;margin:0 0 12px;">Reset your password</h1>
      <p style="font-size:14px;line-height:1.6;color:#9292b0;margin:0 0 24px;">
        We received a request to reset the password for your NextWatch account.
        This link expires in 15 minutes. If you didn't request this, you can safely ignore this email.
      </p>
      <a href="${resetLink}"
         style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#8b5cf6);color:#fff;
                text-decoration:none;font-weight:600;font-size:14px;padding:12px 26px;border-radius:10px;">
        Reset Password
      </a>
      <p style="font-size:12px;line-height:1.6;color:#6b6b8a;margin:24px 0 0;word-break:break-all;">
        Or paste this link into your browser:<br />
        <a href="${resetLink}" style="color:#a78bfa;">${resetLink}</a>
      </p>
    </div>
  </div>`;
}

const EmailService = {
  isConfigured() {
    return isConfigured;
  },

  // Returns true if an actual email was sent, false if SMTP isn't configured
  // (caller should fall back to logging / dev-mode response in that case).
  async sendPasswordResetEmail(to, resetLink) {
    if (!isConfigured) return false;

    await transporter.sendMail({
      from: FROM_ADDRESS,
      to,
      subject: 'Reset your NextWatch password',
      html: passwordResetHtml(resetLink),
      text: `Reset your NextWatch password: ${resetLink} (expires in 15 minutes)`,
    });
    return true;
  },
};

module.exports = EmailService;