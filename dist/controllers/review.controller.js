"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserReview = exports.getProductReviews = exports.deleteReview = exports.updateReview = exports.createReview = void 0;
const reviewService = __importStar(require("../services/review.service"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const createReview = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const { productId, rating, title, comment, images } = req.body;
        if (!productId || !rating) {
            throw new apiError_1.default(400, 'Product ID and rating are required');
        }
        if (rating < 1 || rating > 5) {
            throw new apiError_1.default(400, 'Rating must be between 1 and 5');
        }
        const review = await reviewService.createReview({
            productId,
            userId: user._id.toString(),
            rating: Number(rating),
            title,
            comment,
            images: images || [],
        });
        res.status(201).json({
            message: 'Review created successfully',
            review,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.createReview = createReview;
const updateReview = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const { reviewId } = req.params;
        const { rating, title, comment, images } = req.body;
        if (rating !== undefined && (rating < 1 || rating > 5)) {
            throw new apiError_1.default(400, 'Rating must be between 1 and 5');
        }
        const review = await reviewService.updateReview(reviewId, user._id.toString(), {
            rating: rating !== undefined ? Number(rating) : undefined,
            title,
            comment,
            images,
        });
        res.json({
            message: 'Review updated successfully',
            review,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateReview = updateReview;
const deleteReview = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const { reviewId } = req.params;
        await reviewService.deleteReview(reviewId, user._id.toString());
        res.json({
            message: 'Review deleted successfully',
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteReview = deleteReview;
const getProductReviews = async (req, res, next) => {
    try {
        const { productId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const sortBy = req.query.sortBy || 'createdAt';
        const result = await reviewService.getProductReviews(productId, {
            page,
            limit,
            sortBy,
        });
        res.json(result);
    }
    catch (error) {
        next(error);
    }
};
exports.getProductReviews = getProductReviews;
const getUserReview = async (req, res, next) => {
    try {
        const user = req.user;
        if (!user) {
            throw new apiError_1.default(401, 'Authentication required');
        }
        const { productId } = req.params;
        const review = await reviewService.getUserReview(productId, user._id.toString());
        res.json({ review });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserReview = getUserReview;
