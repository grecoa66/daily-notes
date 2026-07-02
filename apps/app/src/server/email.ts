import nodemailer from "nodemailer";

import { env } from "./env.js";

function createTransport() {
  if (env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  return null;
}

const transport = createTransport();

type SendMailOptions = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function sendMail(options: SendMailOptions): Promise<void> {
  if (transport) {
    await transport.sendMail({
      from: env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
    return;
  }

  console.log(
    [
      "",
      "─────────────────────────────────────────",
      `📧  EMAIL (dev console — no SMTP configured)`,
      `To:      ${options.to}`,
      `Subject: ${options.subject}`,
      "",
      options.text,
      "─────────────────────────────────────────",
      "",
    ].join("\n"),
  );
}

export function buildPasswordResetEmail(resetUrl: string): Pick<SendMailOptions, "subject" | "text" | "html"> {
  const subject = "Reset your Daily Notes password";

  const text = [
    "You requested a password reset for your Daily Notes account.",
    "",
    `Reset your password here: ${resetUrl}`,
    "",
    "This link expires in 30 minutes. If you didn't request this, you can ignore this email.",
  ].join("\n");

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: sans-serif; color: #111; max-width: 480px; margin: 40px auto; padding: 0 16px;">
  <h2 style="font-size: 20px; margin-bottom: 8px;">Reset your password</h2>
  <p style="color: #555; margin-bottom: 24px;">
    You requested a password reset for your Daily Notes account.
    Click the button below to choose a new password.
    This link expires in <strong>30 minutes</strong>.
  </p>
  <a href="${resetUrl}"
     style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;border-radius:6px;text-decoration:none;font-size:14px;">
    Reset password
  </a>
  <p style="margin-top: 24px; font-size: 12px; color: #999;">
    If you didn't request this, you can safely ignore this email.
    Your password won't change until you click the link above and set a new one.
  </p>
</body>
</html>`.trim();

  return { subject, text, html };
}
