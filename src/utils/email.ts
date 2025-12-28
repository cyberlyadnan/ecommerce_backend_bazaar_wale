import nodemailer, { Transporter } from 'nodemailer';

import config from '../config';
import logger from '../config/logger';

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: config.mail.host,
    port: config.mail.port,
    secure: config.mail.port === 465,
    auth: {
      user: config.mail.user,
      pass: config.mail.pass,
    },
  });

  return transporter;
};

export const sendMail = async ({ to, subject, html, text }: SendMailOptions) => {
  const mailTransporter = getTransporter();

  try {
    await mailTransporter.sendMail({
      from: `"${config.mail.fromName}" <${config.mail.fromEmail}>`,
      to,
      subject,
      text,
      html,
    });
    logger.info('Email sent', { to, subject });
  } catch (error) {
    logger.error('Failed to send email', error);
    throw error;
  }
};

export default { sendMail };

