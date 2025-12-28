import { NextFunction, Request, Response } from 'express';

import * as cartService from '../services/cart.service';
import ApiError from '../utils/apiError';

export const getCartHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const cart = await cartService.getCart(req.user._id.toString());
    
    if (!cart) {
      return res.json({ cart: null, items: [] });
    }

    res.json({ cart, items: cart.items });
  } catch (error) {
    next(error);
  }
};

export const addToCartHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { productId, qty } = req.body;

    if (!productId || typeof qty !== 'number' || qty < 1) {
      throw new ApiError(400, 'Invalid request. productId and qty (>= 1) are required.');
    }

    const result = await cartService.addToCart(req.user._id.toString(), { productId, qty });

    res.json({
      message: 'Item added to cart',
      cart: result,
      items: result?.items || [],
    });
  } catch (error) {
    next(error);
  }
};

export const updateCartItemHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { productId, qty } = req.body;

    if (!productId || typeof qty !== 'number' || qty < 1) {
      throw new ApiError(400, 'Invalid request. productId and qty (>= 1) are required.');
    }

    const result = await cartService.updateCartItem(req.user._id.toString(), { productId, qty });

    res.json({
      message: 'Cart item updated',
      cart: result,
      items: result?.items || [],
    });
  } catch (error) {
    next(error);
  }
};

export const removeFromCartHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const { productId } = req.params;

    if (!productId) {
      throw new ApiError(400, 'Product ID is required');
    }

    const result = await cartService.removeFromCart(req.user._id.toString(), productId);

    res.json({
      message: 'Item removed from cart',
      cart: result,
      items: result?.items || [],
    });
  } catch (error) {
    next(error);
  }
};

export const clearCartHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      throw new ApiError(401, 'Authentication required');
    }

    const result = await cartService.clearCart(req.user._id.toString());

    res.json({
      message: 'Cart cleared',
      cart: result,
      items: result?.items || [],
    });
  } catch (error) {
    next(error);
  }
};

