"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const mongo_sanitize_1 = __importDefault(require("mongo-sanitize"));
const morgan_1 = __importDefault(require("morgan"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = __importDefault(require("./config"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const error_middleware_1 = __importDefault(require("./middlewares/error.middleware"));
const app = (0, express_1.default)();
const corsOptions = {
    origin: (origin, callback) => {
        if (!origin) {
            callback(null, true);
            return;
        }
        callback(null, true);
    },
    credentials: true,
};
app.set('trust proxy', 1);
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)(corsOptions));
app.use((0, morgan_1.default)(config_1.default.app.env === 'production' ? 'combined' : 'dev'));
app.use(express_1.default.json({ limit: '1mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
app.use((_req, _res, next) => {
    if (_req.body) {
        // eslint-disable-next-line no-param-reassign
        _req.body = (0, mongo_sanitize_1.default)(_req.body);
    }
    next();
});
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000,
    max: 200,
}));
app.get('/', (_req, res) => {
    res.json({
        status: 'ok',
        message: 'B2B ecommerce backend is running',
        timestamp: new Date().toISOString(),
    });
});
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', env: config_1.default.app.env });
});
app.use('/api/auth', auth_routes_1.default);
app.use(error_middleware_1.default);
exports.default = app;
