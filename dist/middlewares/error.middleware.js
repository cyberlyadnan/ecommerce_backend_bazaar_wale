"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const config_1 = __importDefault(require("../config"));
const logger_1 = __importDefault(require("../config/logger"));
const apiError_1 = __importDefault(require("../utils/apiError"));
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const errorHandler = (err, req, res, _next) => {
    let statusCode = 500;
    let message = 'Internal server error';
    if (err instanceof apiError_1.default) {
        statusCode = err.statusCode;
        message = err.message;
    }
    else if (err instanceof Error) {
        message = err.message;
    }
    if (statusCode >= 500 || config_1.default.app.env !== 'production') {
        logger_1.default.error('Request failed', {
            err,
            path: req.path,
            method: req.method,
        });
    }
    res.status(statusCode).json({
        message,
        ...(config_1.default.app.env !== 'production' && err instanceof Error
            ? { stack: err.stack }
            : {}),
    });
};
exports.errorHandler = errorHandler;
exports.default = exports.errorHandler;
