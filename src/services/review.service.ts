import mongoose from 'mongoose';
import ApiError from '../utils/apiError';
import Review from '../models/Review.model';
import Product from '../models/Product.model';
import User, { UserDocument } from '../models/User.model';

interface CreateReviewData {
  productId: string;
  userId: string;
  rating: number;
  title?: string;
  comment?: string;
  images?: Array<{ url: string; alt?: string }>;
}

interface UpdateReviewData {
  rating?: number;
  title?: string;
  comment?: string;
  images?: Array<{ url: string; alt?: string }>;
}

export const createReview = async (data: CreateReviewData) => {
  const { productId, userId, rating, title, comment, images } = data;

  // Check if product exists
  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, 'Product not found');
  }

  // Check if user exists
  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new ApiError(404, 'User not found');
  }

  // Check if review already exists
  const existingReview = await Review.findOne({
    product: productId,
    user: userId,
    isDeleted: false,
  });

  if (existingReview) {
    throw new ApiError(400, 'You have already reviewed this product');
  }

  // Create review
  const review = await Review.create({
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

export const updateReview = async (
  reviewId: string,
  userId: string,
  data: UpdateReviewData,
) => {
  const review = await Review.findOne({
    _id: reviewId,
    user: userId,
    isDeleted: false,
  });

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  if (data.rating !== undefined) review.rating = data.rating;
  if (data.title !== undefined) review.title = data.title?.trim();
  if (data.comment !== undefined) review.comment = data.comment?.trim();
  if (data.images !== undefined) {
    review.images = data.images as typeof review.images;
    review.markModified('images');
  }

  await review.save();

  // Update product rating
  await updateProductRating(review.product);

  return review;
};

export const deleteReview = async (reviewId: string, userId: string) => {
  const review = await Review.findOne({
    _id: reviewId,
    user: userId,
    isDeleted: false,
  });

  if (!review) {
    throw new ApiError(404, 'Review not found');
  }

  review.isDeleted = true;
  await review.save();

  // Update product rating
  await updateProductRating(review.product);

  return review;
};

export const getProductReviews = async (
  productId: string,
  options: { page?: number; limit?: number; sortBy?: string } = {},
) => {
  const { page = 1, limit = 10, sortBy = 'createdAt' } = options;
  const skip = (page - 1) * limit;

  const reviews = await Review.find({
    product: productId,
    isApproved: true,
    isDeleted: false,
  })
    .populate('user', 'name email')
    .sort({ [sortBy]: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  const total = await Review.countDocuments({
    product: productId,
    isApproved: true,
    isDeleted: false,
  });

  // Calculate rating distribution
  const ratingStats = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
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

  const ratingDistribution: Record<number, number> = {};
  ratingStats.forEach((stat) => {
    ratingDistribution[stat._id] = stat.count;
  });

  // Calculate average rating
  const avgRatingResult = await Review.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
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

export const getUserReview = async (productId: string, userId: string) => {
  const review = await Review.findOne({
    product: productId,
    user: userId,
    isDeleted: false,
  })
    .populate('user', 'name email')
    .lean();

  return review;
};

const updateProductRating = async (productId: string | mongoose.Types.ObjectId) => {
  const productObjectId = typeof productId === 'string' 
    ? new mongoose.Types.ObjectId(productId) 
    : productId;

  const result = await Review.aggregate([
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
    await Product.findByIdAndUpdate(productObjectId, {
      $set: {
        'meta.averageRating': Math.round(result[0].avgRating * 10) / 10,
        'meta.totalReviews': result[0].totalReviews,
      },
    });
  } else {
    // If no reviews, reset to default
    await Product.findByIdAndUpdate(productObjectId, {
      $set: {
        'meta.averageRating': 0,
        'meta.totalReviews': 0,
      },
    });
  }
};

