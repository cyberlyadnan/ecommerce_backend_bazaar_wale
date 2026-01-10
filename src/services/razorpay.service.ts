import Razorpay from 'razorpay';
import crypto from 'crypto';

import config from '../config';
import ApiError from '../utils/apiError';

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: config.razorpay.keyId,
  key_secret: config.razorpay.keySecret,
});

export interface CreateOrderOptions {
  amount: number; // Amount in paise (smallest currency unit)
  currency?: string;
  receipt?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  attempts: number;
  notes: Record<string, string>;
  created_at: number;
}

/**
 * Create a Razorpay order
 * Amount should be in paise (INR * 100)
 */
export const createRazorpayOrder = async (
  options: CreateOrderOptions,
): Promise<RazorpayOrderResponse> => {
  if (!config.razorpay.keyId || !config.razorpay.keySecret) {
    throw new ApiError(500, 'Razorpay configuration is missing');
  }

  if (options.amount < 100) {
    throw new ApiError(400, 'Minimum order amount is ₹1.00 (100 paise)');
  }

  try {
    const orderOptions = {
      amount: options.amount, // Amount in paise
      currency: options.currency || 'INR',
      receipt: options.receipt || `receipt_${Date.now()}`,
      notes: options.notes || {},
    };

    const order = await razorpay.orders.create(orderOptions);
    return order as RazorpayOrderResponse;
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);
    throw new ApiError(
      500,
      error?.error?.description || 'Failed to create Razorpay order',
    );
  }
};

export interface VerifyPaymentSignatureParams {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

/**
 * Verify Razorpay payment signature
 * This is critical for security - always verify on backend
 */
export const verifyPaymentSignature = (
  params: VerifyPaymentSignatureParams,
): boolean => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = params;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      console.error('Missing required payment verification parameters');
      return false;
    }

    // Create the signature string
    const signatureString = `${razorpay_order_id}|${razorpay_payment_id}`;

    // Generate expected signature using HMAC SHA256
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(signatureString)
      .digest('hex');

    // Convert both signatures to buffers
    // Handle invalid hex strings gracefully
    let receivedSignatureBuffer: Buffer;
    try {
      receivedSignatureBuffer = Buffer.from(razorpay_signature, 'hex');
    } catch (error) {
      console.error('Invalid signature hex format:', error);
      return false;
    }

    const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex');

    // timingSafeEqual requires both buffers to be the same length
    // If lengths differ, signatures don't match
    if (receivedSignatureBuffer.length !== expectedSignatureBuffer.length) {
      console.error('Signature length mismatch');
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      receivedSignatureBuffer,
      expectedSignatureBuffer,
    );
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
};

/**
 * Fetch payment details from Razorpay
 */
export const getPaymentDetails = async (paymentId: string) => {
  try {
    const payment = await razorpay.payments.fetch(paymentId);
    return payment;
  } catch (error: any) {
    console.error('Razorpay fetch payment error:', error);
    throw new ApiError(
      500,
      error?.error?.description || 'Failed to fetch payment details',
    );
  }
};

/**
 * Fetch order details from Razorpay
 */
export const getOrderDetails = async (orderId: string) => {
  try {
    const order = await razorpay.orders.fetch(orderId);
    return order;
  } catch (error: any) {
    console.error('Razorpay fetch order error:', error);
    throw new ApiError(
      500,
      error?.error?.description || 'Failed to fetch order details',
    );
  }
};

export default {
  createRazorpayOrder,
  verifyPaymentSignature,
  getPaymentDetails,
  getOrderDetails,
};

