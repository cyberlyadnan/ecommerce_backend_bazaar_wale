import path from 'path';
import dotenv from 'dotenv';

const envFile =
  process.env.NODE_ENV === 'development'
    ? '.env.development'
    : process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env';

dotenv.config({
  path: path.resolve(process.cwd(), envFile),
});

const required = (value: string | undefined, key: string) => {
  if (typeof value === 'undefined' || value === '') {
    throw new Error(`Environment variable ${key} is required but was not provided.`);
  }
  return value;
};

const toNumber = (value: string | undefined, fallback: number) => {
  if (!value) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export interface AppConfig {
  env: string;
  port: number;
  baseUrl: string;
}

export interface MongoConfig {
  uri: string;
}

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export interface FirebaseConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

export interface MailConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromEmail: string;
  fromName: string;
}

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
}

export const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: toNumber(process.env.PORT, 5000),
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:5000',
  } as AppConfig,

  mongo: {
    uri: required(process.env.MONGODB_URI, 'MONGODB_URI'),
  } as MongoConfig,

  jwt: {
    accessSecret: required(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
    refreshSecret: required(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  } as JwtConfig,

  firebase: {
    projectId: required(process.env.FIREBASE_PROJECT_ID, 'FIREBASE_PROJECT_ID'),
    clientEmail: required(process.env.FIREBASE_CLIENT_EMAIL, 'FIREBASE_CLIENT_EMAIL'),
    privateKey: required(
      (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      'FIREBASE_PRIVATE_KEY',
    ),
  } as FirebaseConfig,

  mail: {
    host: required(process.env.SMTP_HOST, 'SMTP_HOST'),
    port: toNumber(process.env.SMTP_PORT, 587),
    user: required(process.env.SMTP_USER, 'SMTP_USER'),
    pass: required(process.env.SMTP_PASS, 'SMTP_PASS'),
    fromEmail: required(process.env.SMTP_FROM_EMAIL, 'SMTP_FROM_EMAIL'),
    fromName: process.env.SMTP_FROM_NAME || 'Ecommerce Platform',
  } as MailConfig,

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || '',
    keySecret: process.env.RAZORPAY_KEY_SECRET || '',
  } as RazorpayConfig,
};

export default config;

