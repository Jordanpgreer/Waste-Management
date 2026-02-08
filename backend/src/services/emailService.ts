import nodemailer, { Transporter } from 'nodemailer';

interface SendEmailInput {
  from: string;
  to: string;
  subject: string;
  text: string;
}

class EmailService {
  private transporter: Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true';
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass || Number.isNaN(port)) {
      this.transporter = null;
      return;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });
  }

  isConfigured(): boolean {
    return this.transporter !== null;
  }

  async sendEmail(input: SendEmailInput): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS.');
    }

    await this.transporter.sendMail({
      from: input.from,
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
  }
}

export const emailService = new EmailService();

