"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserReview = exports.getProductReviews = exports.deleteReview = exports.updateReview = exports.createReview = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const apiError_1 = __importDefault(require("../utils/apiError"));
const Review_model_1 = __importDefault(require("../models/Review.model"));
const Product_model_1 = __importDefault(require("../models/Product.model"));
const User_model_1 = __importDefault(require("../models/User.model"));
const createReview = async (data) => {
    const { productId, userId, rating, title, comment, images } = data;
    // Check if product exists
    const product = await Product_model_1.default.findById(productId);
    if (!product) {
        throw new apiError_1.default(404, 'Product not found');
    }
    // Check if user exists
    const user = await User_model_1.default.findById(userId);
    if (!user || user.isDeleted) {
        throw new apiError_1.default(404, 'User not found');
    }
    // Check if review already exists
    const existingReview = await Review_model_1.default.findOne({
        product: productId,
        user: userId,
        isDeleted: false,
    });
    if (existingReview) {
        throw new apiError_1.default(400, 'You have already reviewed this product');
    }
    // Create review
    const review = await Review_model_1.default.create({
        product: productId,
        user: userId,
        rating,
        title: title?.trim(),
        comment: comment?.trim(),
        images: images || [],
        isVerifiedPurchase: false, // Can be updated based on order history
    });
    // Calculate and update product average rating (optional - can be done via aggregation)
    await updateProductRating(productId);
    return review;
};
exports.createReview = createReview;
const updateReview = async (reviewId, userId, data) => {
    const review = await Review_model_1.default.findOne({
        _id: reviewId,
        user: userId,
        isDeleted: false,
    });
    if (!review) {
        throw new apiError_1.default(404, 'Review not found');
    }
    if (data.rating !== undefined)
        review.rating = data.rating;
    if (data.title !== undefined)
        review.title = data.title?.trim();
    if (data.comment !== undefined)
        review.comment = data.comment?.trim();
    if (data.images !== undefined) {
        review.images = data.images;
        review.markModified('images');
    }
    await review.save();
    // Update product rating
    await updateProductRating(review.product);
    return review;
};
exports.updateReview = updateReview;
const deleteReview = async (reviewId, userId) => {
    const review = await Review_model_1.default.findOne({
        _id: reviewId,
        user: userId,
        isDeleted: false,
    });
    if (!review) {
        throw new apiError_1.default(404, 'Review not found');
    }
    review.isDeleted = true;
    await review.save();
    // Update product rating
    await updateProductRating(review.product);
    return review;
};
exports.deleteReview = deleteReview;
const getProductReviews = async (productId, options = {}) => {
    const { page = 1, limit = 10, sortBy = 'createdAt' } = options;
    const skip = (page - 1) * limit;
    const reviews = await Review_model_1.default.find({
        product: productId,
        isApproved: true,
        isDeleted: false,
    })
        .populate('user', 'name email')
        .sort({ [sortBy]: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    const total = await Review_model_1.default.countDocuments({
        product: productId,
        isApproved: true,
        isDeleted: false,
    });
    // Calculate rating distribution
    const ratingStats = await Review_model_1.default.aggregate([
        {
            $match: {
                product: new mongoose_1.default.Types.ObjectId(productId),
                isApproved: true,
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: '$rating',
                count: { $sum: 1 },
            },
        },
        {
            $sort: { _id: -1 },
        },
    ]);
    const ratingDistribution = {};
    ratingStats.forEach((stat) => {
        ratingDistribution[stat._id] = stat.count;
    });
    // Calculate average rating
    const avgRatingResult = await Review_model_1.default.aggregate([
        {
            $match: {
                product: new mongoose_1.default.Types.ObjectId(productId),
                isApproved: true,
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
            },
        },
    ]);
    const avgRating = avgRatingResult[0]?.avgRating || 0;
    const totalReviews = avgRatingResult[0]?.totalReviews || 0;
    return {
        reviews,
        pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
        },
        stats: {
            averageRating: Math.round(avgRating * 10) / 10,
            totalReviews,
            ratingDistribution,
        },
    };
};
exports.getProductReviews = getProductReviews;
const getUserReview = async (productId, userId) => {
    const review = await Review_model_1.default.findOne({
        product: productId,
        user: userId,
        isDeleted: false,
    })
        .populate('user', 'name email')
        .lean();
    return review;
};
exports.getUserReview = getUserReview;
const updateProductRating = async (productId) => {
    const productObjectId = typeof productId === 'string'
        ? new mongoose_1.default.Types.ObjectId(productId)
        : productId;
    const result = await Review_model_1.default.aggregate([
        {
            $match: {
                product: productObjectId,
                isApproved: true,
                isDeleted: false,
            },
        },
        {
            $group: {
                _id: null,
                avgRating: { $avg: '$rating' },
                totalReviews: { $sum: 1 },
            },
        },
    ]);
    if (result.length > 0) {
        await Product_model_1.default.findByIdAndUpdate(productObjectId, {
            $set: {
                'meta.averageRating': Math.round(result[0].avgRating * 10) / 10,
                'meta.totalReviews': result[0].totalReviews,
            },
        });
    }
    else {
        // If no reviews, reset to default
        await Product_model_1.default.findByIdAndUpdate(productObjectId, {
            $set: {
                'meta.averageRating': 0,
                'meta.totalReviews': 0,
            },
        });
    }
};
