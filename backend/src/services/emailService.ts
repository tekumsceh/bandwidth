import nodemailer from 'nodemailer';

type EmailPayload = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const host = String(process.env.SMTP_HOST || '').trim();
  if (!host) return null;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').trim() === 'true' || port === 465;
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  return transporter;
}

function fromAddress() {
  return String(process.env.SMTP_FROM || 'Bandwidth <no-reply@bandwidth.local>');
}

export async function sendTransactionalEmail(payload: EmailPayload) {
  const tx = getTransporter();
  if (!tx) {
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        level: 'info',
        type: 'email_preview',
        to: payload.to,
        subject: payload.subject,
        text: payload.text,
        at: new Date().toISOString(),
      }),
    );
    return { delivered: false as const, mode: 'log' as const };
  }

  await tx.sendMail({
    from: fromAddress(),
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });
  return { delivered: true as const, mode: 'smtp' as const };
}

