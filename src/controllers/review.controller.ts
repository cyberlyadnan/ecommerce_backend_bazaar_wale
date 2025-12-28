import { Request, Response, NextFunction } from 'express';
import * as reviewService from '../services/review.service';
import ApiError from '../utils/apiError';

export const createReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { productId, rating, title, comment, images } = req.body;

    if (!productId || !rating) {
      throw new ApiError(400, 'Product ID and rating are required');
    }

    if (rating < 1 || rating > 5) {
      throw new ApiError(400, 'Rating must be between 1 and 5');
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
  } catch (error) {
    next(error);
  }
};

export const updateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { reviewId } = req.params;
    const { rating, title, comment, images } = req.body;

    if (rating !== undefined && (rating < 1 || rating > 5)) {
      throw new ApiError(400, 'Rating must be between 1 and 5');
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
  } catch (error) {
    next(error);
  }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { reviewId } = req.params;

    await reviewService.deleteReview(reviewId, user._id.toString());

    res.json({
      message: 'Review deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

export const getProductReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { productId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const sortBy = (req.query.sortBy as string) || 'createdAt';

    const result = await reviewService.getProductReviews(productId, {
      page,
      limit,
      sortBy,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getUserReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = req.user;
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { productId } = req.params;

    const review = await reviewService.getUserReview(productId, user._id.toString());

    res.json({ review });
  } catch (error) {
    next(error);
  }
};

