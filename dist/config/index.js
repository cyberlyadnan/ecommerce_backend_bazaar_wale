"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
const envFile = process.env.NODE_ENV === 'development'
    ? '.env.development'
    : process.env.NODE_ENV === 'production'
        ? '.env.production'
        : '.env';
dotenv_1.default.config({
    path: path_1.default.resolve(process.cwd(), envFile),
});
const required = (value, key) => {
    if (typeof value === 'undefined' || value === '') {
        throw new Error(`Environment variable ${key} is required but was not provided.`);
    }
    return value;
};
const toNumber = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};
exports.config = {
    app: {
        env: process.env.NODE_ENV || 'development',
        port: toNumber(process.env.PORT, 5000),
        baseUrl: process.env.APP_BASE_URL || 'http://localhost:5000',
    },
    mongo: {
        uri: required(process.env.MONGODB_URI, 'MONGODB_URI'),
    },
    jwt: {
        accessSecret: required(process.env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
        refreshSecret: required(process.env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
    },
    firebase: {
        projectId: required(process.env.FIREBASE_PROJECT_ID, 'FIREBASE_PROJECT_ID'),
        clientEmail: required(process.env.FIREBASE_CLIENT_EMAIL, 'FIREBASE_CLIENT_EMAIL'),
        privateKey: required((process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'), 'FIREBASE_PRIVATE_KEY'),
    },
    mail: {
        host: required(process.env.SMTP_HOST, 'SMTP_HOST'),
        port: toNumber(process.env.SMTP_PORT, 587),
        user: required(process.env.SMTP_USER, 'SMTP_USER'),
        pass: required(process.env.SMTP_PASS, 'SMTP_PASS'),
        fromEmail: required(process.env.SMTP_FROM_EMAIL, 'SMTP_FROM_EMAIL'),
        fromName: process.env.SMTP_FROM_NAME || 'Ecommerce Platform',
    },
    razorpay: {
        keyId: process.env.RAZORPAY_KEY_ID || '',
        keySecret: process.env.RAZORPAY_KEY_SECRET || '',
    },
};
exports.default = exports.config;
