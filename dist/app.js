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
const path_1 = __importDefault(require("path"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config_1 = __importDefault(require("./config"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const cart_routes_1 = __importDefault(require("./routes/cart.routes"));
const catalog_routes_1 = __importDefault(require("./routes/catalog.routes"));
const contact_routes_1 = __importDefault(require("./routes/contact.routes"));
const file_routes_1 = __importDefault(require("./routes/file.routes"));
const orders_routes_1 = __importDefault(require("./routes/orders.routes"));
const payments_routes_1 = __importDefault(require("./routes/payments.routes"));
const reviews_routes_1 = __importDefault(require("./routes/reviews.routes"));
const vendorDashboard_routes_1 = __importDefault(require("./routes/vendorDashboard.routes"));
const blog_routes_1 = __importDefault(require("./routes/blog.routes"));
const adminBlog_routes_1 = __importDefault(require("./routes/adminBlog.routes"));
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
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
}));
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
// Global rate limit - more lenient for development
app.use((0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased from 200 to 500 requests per 15 minutes
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
}));
// CORS middleware for static files (uploads)
// This allows images to be loaded from any origin (needed when frontend and API are on different domains)
app.use('/uploads', (req, res, next) => {
    // Set CORS headers for image requests
    const origin = req.headers.origin;
    // Allow the requesting origin, or all origins if no origin header
    if (origin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Content-Type');
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});
app.use('/uploads', express_1.default.static(path_1.default.resolve(process.cwd(), 'uploads')));
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
app.use('/api/cart', cart_routes_1.default);
app.use('/api/catalog', catalog_routes_1.default);
app.use('/api/contact', contact_routes_1.default);
app.use('/api/files', file_routes_1.default);
app.use('/api/orders', orders_routes_1.default);
app.use('/api/payments', payments_routes_1.default);
app.use('/api/reviews', reviews_routes_1.default);
app.use('/api/vendor/dashboard', vendorDashboard_routes_1.default);
app.use('/api/blog', blog_routes_1.default);
app.use('/api/admin/blogs', adminBlog_routes_1.default);
app.use(error_middleware_1.default);
exports.default = app;
