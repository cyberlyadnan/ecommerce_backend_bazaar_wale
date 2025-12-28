"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../config/logger"));
let transporter = null;
const getTransporter = () => {
    if (transporter) {
        return transporter;
    }
    transporter = nodemailer_1.default.createTransport({
        host: config_1.default.mail.host,
        port: config_1.default.mail.port,
        secure: config_1.default.mail.port === 465,
        auth: {
            user: config_1.default.mail.user,
            pass: config_1.default.mail.pass,
        },
    });
    return transporter;
};
const sendMail = async ({ to, subject, html, text }) => {
    const mailTransporter = getTransporter();
    try {
        await mailTransporter.sendMail({
            from: `"${config_1.default.mail.fromName}" <${config_1.default.mail.fromEmail}>`,
            to,
            subject,
            text,
            html,
        });
        logger_1.default.info('Email sent', { to, subject });
    }
    catch (error) {
        logger_1.default.error('Failed to send email', error);
        throw error;
    }
};
exports.sendMail = sendMail;
exports.default = { sendMail: exports.sendMail };
