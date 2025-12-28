import { Router } from 'express';
import * as reviewController from '../controllers/review.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Get product reviews (public)
router.get('/product/:productId', reviewController.getProductReviews);

// Get user's review for a product (authenticated)
router.get('/product/:productId/user', authenticate(), reviewController.getUserReview);

// Create review (all authenticated users can review products)
router.post('/', authenticate(), reviewController.createReview);

// Update review (all authenticated users can update their own reviews)
router.put('/:reviewId', authenticate(), reviewController.updateReview);

// Delete review (all authenticated users can delete their own reviews)
router.delete('/:reviewId', authenticate(), reviewController.deleteReview);

export default router;

