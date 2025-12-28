"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const serialize = (meta) => {
    if (typeof meta === 'undefined') {
        return '';
    }
    try {
        return ` ${JSON.stringify(meta)}`;
    }
    catch {
        return ` ${String(meta)}`;
    }
};
const log = (level, message, meta) => {
    const timestamp = new Date().toISOString();
    const payload = `[${timestamp}] [${level.toUpperCase()}] ${message}${serialize(meta)}`;
    if (level === 'error') {
        console.error(payload);
    }
    else if (level === 'warn') {
        console.warn(payload);
    }
    else if (level === 'debug') {
        // eslint-disable-next-line no-console
        console.debug(payload);
    }
    else {
        console.log(payload);
    }
};
exports.logger = {
    error: (message, meta) => log('error', message, meta),
    warn: (message, meta) => log('warn', message, meta),
    info: (message, meta) => log('info', message, meta),
    debug: (message, meta) => log('debug', message, meta),
};
exports.default = exports.logger;
