import { Router } from 'express';
import { body, param } from 'express-validator';

import {
  addToCartHandler,
  clearCartHandler,
  getCartHandler,
  removeFromCartHandler,
  updateCartItemHandler,
} from '../controllers/cart.controller';
import { authenticate } from '../middlewares/auth.middleware';
import validateRequest from '../middlewares/validation.middleware';

const router = Router();

// All cart routes require authentication (any logged-in user can use cart)
router.use(authenticate());

// Get cart
router.get('/', getCartHandler);

// Add to cart
router.post(
  '/add',
  [
    body('productId').isString().trim().notEmpty().withMessage('Product ID is required'),
    body('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validateRequest,
  addToCartHandler,
);

// Update cart item
router.patch(
  '/update',
  [
    body('productId').isString().trim().notEmpty().withMessage('Product ID is required'),
    body('qty').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  validateRequest,
  updateCartItemHandler,
);

// Remove from cart
router.delete(
  '/remove/:productId',
  [param('productId').isString().trim().notEmpty().withMessage('Product ID is required')],
  validateRequest,
  removeFromCartHandler,
);

// Clear cart
router.delete('/clear', clearCartHandler);

export default router;

