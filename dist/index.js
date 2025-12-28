"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const config_1 = __importDefault(require("./config"));
const logger_1 = __importDefault(require("./config/logger"));
const start = async () => {
    try {
        await mongoose_1.default.connect(config_1.default.mongo.uri);
        logger_1.default.info('Connected to MongoDB');
        app_1.default.listen(config_1.default.app.port, () => {
            logger_1.default.info(`Server running on port ${config_1.default.app.port}`);
        });
    }
    catch (error) {
        logger_1.default.error('Failed to start server', error);
        process.exit(1);
    }
};
start();
