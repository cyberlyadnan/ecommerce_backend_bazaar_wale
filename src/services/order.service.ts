import mongoose from 'mongoose';

import Cart from '../models/Cart.model';
import Order from '../models/Order.model';
import Product from '../models/Product.model';
import User from '../models/User.model';
import ApiError from '../utils/apiError';
import * as razorpayService from './razorpay.service';
import { getShippingConfigDto } from './shippingConfig.service';

export interface ShippingAddress {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  country?: string;
  postalCode: string;
}

export interface CreateOrderInput {
  shippingAddress: ShippingAddress;
  razorpayOrderId?: string; // Optional, will be created if not provided
  // Frontend should NOT send calculated totals - backend recalculates everything for security
  // If frontend sends these, they will be ignored and recalculated
}

export interface OrderCalculationResult {
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  items: Array<{
    productId: mongoose.Types.ObjectId;
    title: string;
    sku?: string;
    vendorId: mongoose.Types.ObjectId;
    vendorSnapshot: {
      vendorName: string;
      vendorPhone?: string;
    };
    qty: number;
    pricePerUnit: number;
    totalPrice: number;
    taxCode?: string;
    taxPercentage: number;
    taxAmount: number;
  }>;
}

/**
 * Calculate order totals from cart items
 * All calculations happen on backend for security
 */
export const calculateOrderTotals = async (
  userId: string,
): Promise<OrderCalculationResult> => {
  const cart = await Cart.findOne({ userId: new mongoose.Types.ObjectId(userId) })
    .populate('items.productId')
    .lean();

  if (!cart || !cart.items || cart.items.length === 0) {
    throw new ApiError(400, 'Cart is empty');
  }

  const items: OrderCalculationResult['items'] = [];
  let subtotal = 0;
  let totalTax = 0;

  // Process each cart item
  for (const cartItem of cart.items) {
    const product = cartItem.productId as any;

    if (!product) {
      throw new ApiError(404, `Product not found for item: ${cartItem.title}`);
    }

    // Verify product is active and in stock
    if (!product.isActive) {
      throw new ApiError(400, `Product "${product.title}" is not available`);
    }

    if (product.stock < cartItem.qty) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.title}". Available: ${product.stock}, Requested: ${cartItem.qty}`,
      );
    }

    // Get vendor information
    const vendor = await User.findById(cartItem.vendorId).lean();
    if (!vendor) {
      throw new ApiError(404, `Vendor not found for product: ${product.title}`);
    }

    // Calculate item total (before tax)
    const itemTotal = cartItem.pricePerUnit * cartItem.qty;
    subtotal += itemTotal;

    // Get tax information from product (default to 18% if not set)
    const taxPercentage = product.taxPercentage ?? 18;
    const taxCode = product.taxCode || 'GST';
    
    // Calculate tax for this specific item
    const itemTaxAmount = Math.round((itemTotal * taxPercentage) / 100);
    totalTax += itemTaxAmount;

    items.push({
      productId: new mongoose.Types.ObjectId(
        (typeof cartItem.productId === 'object' && cartItem.productId && '_id' in cartItem.productId)
          ? (cartItem.productId._id as mongoose.Types.ObjectId).toString()
          : cartItem.productId.toString()
      ),
      title: cartItem.title,
      sku: product.sku,
      vendorId: new mongoose.Types.ObjectId(cartItem.vendorId),
      vendorSnapshot: {
        vendorName: vendor.businessName || vendor.name,
        vendorPhone: vendor.phone,
      },
      qty: cartItem.qty,
      pricePerUnit: cartItem.pricePerUnit,
      totalPrice: itemTotal,
      taxCode,
      taxPercentage,
      taxAmount: itemTaxAmount,
    });
  }

  // Calculate shipping cost (admin-configurable global pricing)
  const shippingConfig = await getShippingConfigDto();
  const shippingCost = shippingConfig.isEnabled
    ? subtotal >= shippingConfig.freeShippingThreshold
      ? 0
      : Math.max(0, shippingConfig.flatRate)
    : 0;

  // Total tax is sum of all item taxes
  const tax = totalTax;

  // Total amount
  const total = subtotal + shippingCost + tax;

  return {
    subtotal,
    shippingCost,
    tax,
    total,
    items,
  };
};

/**
 * Generate unique order number
 */
const generateOrderNumber = async (): Promise<string> => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');

  const orderNumber = `ORD-${dateStr}-${random}`;

  // Check if order number already exists
  const existing = await Order.findOne({ orderNumber });
  if (existing) {
    // Retry with new random number
    return generateOrderNumber();
  }

  return orderNumber;
};

/**
 * Create order from cart
 */
export const createOrder = async (
  userId: string,
  input: CreateOrderInput,
): Promise<{ order: any; razorpayOrder?: any }> => {
  // Calculate order totals (validates cart and products)
  const calculation = await calculateOrderTotals(userId);

  // Generate order number
  const orderNumber = await generateOrderNumber();

  // Create Razorpay order if not provided
  let razorpayOrder;
  if (!input.razorpayOrderId) {
    razorpayOrder = await razorpayService.createRazorpayOrder({
      amount: calculation.total * 100, // Convert to paise
      currency: 'INR',
      receipt: orderNumber,
      notes: {
        userId: userId,
        orderNumber: orderNumber,
      },
    });
  } else {
    // Verify the provided Razorpay order exists and matches amount
    const existingOrder = await razorpayService.getOrderDetails(input.razorpayOrderId);
    const expectedAmount = calculation.total * 100;
    if (existingOrder.amount !== expectedAmount) {
      throw new ApiError(
        400,
        'Razorpay order amount does not match calculated order total',
      );
    }
  }

  // Calculate default expected delivery date (1 week from now)
  const defaultExpectedDeliveryDate = new Date();
  defaultExpectedDeliveryDate.setDate(defaultExpectedDeliveryDate.getDate() + 7);

  // SECURITY: Double-check calculation totals before creating order
  // Verify all calculations are correct
  const calculatedTotal = calculation.subtotal + calculation.shippingCost + calculation.tax;
  if (Math.abs(calculatedTotal - calculation.total) > 0.01) {
    throw new ApiError(500, 'Order calculation error - totals do not match');
  }

  // Verify tax calculation matches sum of item taxes
  const sumOfItemTaxes = calculation.items.reduce((sum, item) => sum + item.taxAmount, 0);
  if (Math.abs(sumOfItemTaxes - calculation.tax) > 0.01) {
    throw new ApiError(500, 'Tax calculation error - item taxes do not match total tax');
  }

  // Create order in database with tax information per item
  const order = await Order.create({
    orderNumber,
    userId: new mongoose.Types.ObjectId(userId),
    items: calculation.items.map((item) => ({
      productId: item.productId,
      title: item.title,
      sku: item.sku,
      vendorId: item.vendorId,
      vendorSnapshot: item.vendorSnapshot,
      qty: item.qty,
      pricePerUnit: item.pricePerUnit,
      totalPrice: item.totalPrice,
      taxCode: item.taxCode,
      taxPercentage: item.taxPercentage,
      taxAmount: item.taxAmount,
    })),
    subtotal: calculation.subtotal,
    shippingCost: calculation.shippingCost,
    tax: calculation.tax,
    total: calculation.total,
    paymentStatus: 'pending',
    paymentMethod: 'razorpay',
    razorpayOrderId: razorpayOrder?.id || input.razorpayOrderId,
    status: 'created',
    shippingAddress: input.shippingAddress,
    placedAt: new Date(),
    expectedDeliveryDate: defaultExpectedDeliveryDate,
  });

  // Clear cart after successful order creation
  await Cart.findOneAndUpdate(
    { userId: new mongoose.Types.ObjectId(userId) },
    { $set: { items: [], updatedAt: new Date() } },
  );

  return {
    order: order.toObject(),
    razorpayOrder,
  };
};

/**
 * Verify and complete payment
 */
export const verifyAndCompletePayment = async (
  userId: string,
  orderId: string,
  paymentData: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  },
): Promise<any> => {
  // Find order
  const order = await Order.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    userId: new mongoose.Types.ObjectId(userId),
  });

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Verify order belongs to user
  if (order.userId.toString() !== userId) {
    throw new ApiError(403, 'Unauthorized access to order');
  }

  // Verify Razorpay order ID matches
  if (order.razorpayOrderId !== paymentData.razorpay_order_id) {
    throw new ApiError(400, 'Razorpay order ID mismatch');
  }

  // Verify payment signature (CRITICAL for security)
  const isValidSignature = razorpayService.verifyPaymentSignature(paymentData);

  if (!isValidSignature) {
    throw new ApiError(400, 'Invalid payment signature');
  }

  // Fetch payment details from Razorpay to verify payment
  const paymentDetails = await razorpayService.getPaymentDetails(
    paymentData.razorpay_payment_id,
  );

  // Verify payment amount matches order total
  // This is the critical security check - ensures payment matches what was ordered
  const expectedAmount = order.total * 100; // Convert to paise
  if (paymentDetails.amount !== expectedAmount) {
    throw new ApiError(400, 'Payment amount mismatch');
  }

  // Verify payment status
  if (paymentDetails.status !== 'captured' && paymentDetails.status !== 'authorized') {
    throw new ApiError(400, `Payment not successful. Status: ${paymentDetails.status}`);
  }

  // Update order with payment information
  order.paymentStatus = 'paid';
  order.razorpayPaymentId = paymentData.razorpay_payment_id;
  order.status = 'vendor_shipped_to_warehouse'; // Move to next status
  await order.save();

  // Send confirmation emails (don't await to avoid blocking response)
  sendOrderConfirmationEmails(order).catch((error) => {
    console.error('Failed to send order confirmation emails:', error);
    // Don't throw - email failure shouldn't fail the payment
  });

  return order.toObject();
};

/**
 * Send order confirmation emails to customer and vendors
 */
const sendOrderConfirmationEmails = async (order: any) => {
  const { sendMail } = await import('../utils/email');
  const {
    generateCustomerOrderEmail,
    generateVendorOrderEmail,
  } = await import('../utils/emailTemplates');

  // Get customer details
  const customer = await User.findById(order.userId).lean();
  if (!customer) {
    console.error('Customer not found for order:', order.orderNumber);
    return;
  }

  // Send email to customer if email exists
  if (customer.email) {
    try {
      await sendMail({
        to: customer.email,
        subject: `Order Confirmation - ${order.orderNumber}`,
        html: generateCustomerOrderEmail(order, customer.name),
      });
      console.log('Customer order confirmation email sent:', customer.email);
    } catch (error) {
      console.error('Failed to send customer email:', error);
    }
  }

  // Group order items by vendor
  const vendorItemsMap = new Map<string, any[]>();
  for (const item of order.items) {
    const vendorId = item.vendorId.toString();
    if (!vendorItemsMap.has(vendorId)) {
      vendorItemsMap.set(vendorId, []);
    }
    vendorItemsMap.get(vendorId)!.push(item);
  }

  // Send email to each vendor
  for (const [vendorId, vendorItems] of vendorItemsMap.entries()) {
    try {
      const vendor = await User.findById(vendorId).lean();
      if (!vendor || !vendor.email) {
        console.log(`Vendor ${vendorId} not found or has no email`);
        continue;
      }

      await sendMail({
        to: vendor.email,
        subject: `New Order Received - ${order.orderNumber}`,
        html: generateVendorOrderEmail(
          order,
          vendor.businessName || vendor.name,
          vendorItems,
        ),
      });
      console.log('Vendor order notification email sent:', vendor.email);
    } catch (error) {
      console.error(`Failed to send email to vendor ${vendorId}:`, error);
    }
  }
};

/**
 * Get user orders
 */
export const getUserOrders = async (userId: string) => {
  const orders = await Order.find({
    userId: new mongoose.Types.ObjectId(userId),
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  return orders.map((order) => ({
    ...order,
    _id: order._id.toString(),
    userId: order.userId.toString(),
    items: order.items.map((item) => ({
      ...item,
      productId: item.productId.toString(),
      vendorId: item.vendorId.toString(),
    })),
  }));
};

/**
 * Get order by ID
 */
export const getOrderById = async (orderId: string, userId: string) => {
  const order = await Order.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    userId: new mongoose.Types.ObjectId(userId),
    isDeleted: false,
  }).lean();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  return {
    ...order,
    _id: order._id.toString(),
    userId: order.userId.toString(),
    items: order.items.map((item) => ({
      ...item,
      productId: item.productId.toString(),
      vendorId: item.vendorId.toString(),
    })),
  };
};

/**
 * Get vendor orders (without customer details)
 */
export const getVendorOrders = async (vendorId: string) => {
  // Find all orders that contain items from this vendor
  const orders = await Order.find({
    'items.vendorId': new mongoose.Types.ObjectId(vendorId),
    isDeleted: false,
  })
    .sort({ createdAt: -1 })
    .lean();

  // Filter and format orders to only include vendor's items
  const vendorOrders = orders.map((order) => {
    const vendorItems = order.items.filter(
      (item) => item.vendorId.toString() === vendorId,
    );

    if (vendorItems.length === 0) {
      return null;
    }

    // Calculate totals for vendor's items only (using per-item tax)
    const vendorSubtotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const vendorTax = vendorItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
    const vendorTotal = vendorSubtotal + vendorTax;

    return {
      _id: order._id.toString(),
      orderNumber: order.orderNumber,
      items: vendorItems.map((item) => ({
        ...item,
        productId: item.productId.toString(),
        vendorId: item.vendorId.toString(),
      })),
      subtotal: vendorSubtotal,
      tax: vendorTax,
      total: vendorTotal,
      paymentStatus: order.paymentStatus,
      status: order.status,
      placedAt: order.placedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      // NO customer details included
    };
  }).filter(Boolean);

  return vendorOrders;
};

/**
 * Get all orders for admin (with full details)
 */
export const getAdminOrders = async (
  filter?: 'all' | 'admin_only',
  statusFilter?: string,
  search?: string,
) => {
  let query: mongoose.FilterQuery<typeof Order> = {
    isDeleted: false,
  };

  // If filtering for admin orders only, find orders where at least one item has an admin vendor
  if (filter === 'admin_only') {
    // Get all admin user IDs
    const adminUsers = await User.find({ role: 'admin' })
      .select('_id')
      .lean();
    const adminIds = adminUsers.map((admin: any) => admin._id);

    // Find orders where at least one item has an admin vendor
    query = {
      ...query,
      'items.vendorId': { $in: adminIds },
    };
  }

  // Status filter
  if (statusFilter && statusFilter !== 'all') {
    const validStatuses = [
      'created',
      'vendor_shipped_to_warehouse',
      'received_in_warehouse',
      'packed',
      'shipped',
      'delivered',
      'cancelled',
    ];
    if (validStatuses.includes(statusFilter)) {
      query.status = statusFilter as any;
    }
  }

  // Search filter
  if (search && search.trim().length > 0) {
    const searchTerm = search.trim();
    const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');

    // Search in order number
    const orderNumberMatch = { orderNumber: searchRegex };

    // Search in vendor names/business names
    const matchingVendors = await User.find({
      $or: [
        { name: searchRegex },
        { businessName: searchRegex },
        { gstNumber: searchRegex },
      ],
    })
      .select('_id')
      .lean();
    const vendorIds = matchingVendors.map((vendor: any) => vendor._id);

    // Search in product titles
    const matchingProducts = await Product.find({
      title: searchRegex,
    })
      .select('_id')
      .lean();
    const productIds = matchingProducts.map((product: any) => product._id);

    // Combine search conditions
    const searchConditions: mongoose.FilterQuery<typeof Order>[] = [orderNumberMatch];

    if (vendorIds.length > 0) {
      searchConditions.push({ 'items.vendorId': { $in: vendorIds } });
    }

    if (productIds.length > 0) {
      searchConditions.push({ 'items.productId': { $in: productIds } });
    }

    if (searchConditions.length > 1) {
      query.$or = searchConditions;
    } else if (searchConditions.length === 1) {
      Object.assign(query, searchConditions[0]);
    }
  }

  const orders = await Order.find(query)
    .populate('userId', 'name email phone')
    .sort({ createdAt: -1 })
    .lean();

  // Get unique vendor IDs from all orders
  const allVendorIds = new Set<string>();
  orders.forEach((order: any) => {
    order.items.forEach((item: any) => {
      allVendorIds.add(item.vendorId.toString());
    });
  });

  // Populate vendor details
  const vendors = await User.find({
    _id: { $in: Array.from(allVendorIds).map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select('_id name email phone businessName gstNumber role')
    .lean();

  const vendorMap = new Map(
    vendors.map((vendor: any) => [vendor._id.toString(), vendor]),
  );

  return orders.map((order: any) => {
    // Get unique vendors for this order
    const orderVendorIds = [
      ...new Set(order.items.map((item: any) => item.vendorId.toString())),
    ];
    const orderVendors = orderVendorIds
      .map((vendorId) => vendorMap.get(vendorId))
      .filter(Boolean)
      .map((vendor: any) => ({
        _id: vendor._id.toString(),
        name: vendor.name,
        businessName: vendor.businessName,
        gstNumber: vendor.gstNumber,
        role: vendor.role,
      }));

    return {
      ...order,
      _id: order._id.toString(),
      userId: order.userId.toString(),
      customer: order.userId
        ? {
            name: order.userId.name,
            email: order.userId.email,
            phone: order.userId.phone,
          }
        : null,
      vendors: orderVendors,
      items: order.items.map((item: any) => ({
        ...item,
        productId: item.productId.toString(),
        vendorId: item.vendorId.toString(),
      })),
    };
  });
};

/**
 * Get order by ID for admin (with full details)
 */
export const getAdminOrderById = async (orderId: string) => {
  const order = await Order.findOne({
    _id: new mongoose.Types.ObjectId(orderId),
    isDeleted: false,
  })
    .populate('userId', 'name email phone')
    .lean();

  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Get unique vendor IDs from order items
  const vendorIds = [
    ...new Set(order.items.map((item: any) => item.vendorId.toString())),
  ];

  // Populate vendor details
  const vendors = await User.find({
    _id: { $in: vendorIds.map((id) => new mongoose.Types.ObjectId(id)) },
  })
    .select('_id name email phone businessName gstNumber role')
    .lean();

  const vendorMap = new Map(
    vendors.map((vendor: any) => [vendor._id.toString(), vendor]),
  );

  return {
    ...order,
    _id: order._id.toString(),
    userId: order.userId.toString(),
    customer: (order as any).userId
      ? {
          name: (order as any).userId.name,
          email: (order as any).userId.email,
          phone: (order as any).userId.phone,
        }
      : null,
    items: order.items.map((item: any) => ({
      ...item,
      productId: item.productId.toString(),
      vendorId: item.vendorId.toString(),
    })),
    vendors: vendors.map((vendor: any) => ({
      _id: vendor._id.toString(),
      name: vendor.name,
      email: vendor.email,
      phone: vendor.phone,
      businessName: vendor.businessName,
      gstNumber: vendor.gstNumber,
      role: vendor.role,
    })),
  };
};

/**
 * Update order status
 */
export const updateOrderStatus = async (
  orderId: string,
  newStatus: string,
  updatedBy: string,
  role: 'admin' | 'vendor',
) => {
  const validStatuses = [
    'created',
    'vendor_shipped_to_warehouse',
    'received_in_warehouse',
    'packed',
    'shipped',
    'delivered',
    'cancelled',
  ];

  if (!validStatuses.includes(newStatus)) {
    throw new ApiError(400, 'Invalid order status');
  }

  const order = await Order.findById(new mongoose.Types.ObjectId(orderId));
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  // Role-based status update restrictions
  if (role === 'vendor') {
    // Vendors can mark as shipped to warehouse or cancel
    if (
      newStatus !== 'vendor_shipped_to_warehouse' &&
      newStatus !== 'cancelled'
    ) {
      throw new ApiError(
        403,
        'Vendors can only mark orders as shipped to warehouse or cancel them',
      );
    }
    // Check if order contains items from this vendor
    const hasVendorItems = order.items.some(
      (item) => item.vendorId.toString() === updatedBy,
    );
    if (!hasVendorItems) {
      throw new ApiError(403, 'You can only update orders containing your products');
    }
    // Can only cancel if order is still in created status
    if (newStatus === 'cancelled' && order.status !== 'created') {
      throw new ApiError(
        400,
        'Can only cancel orders that are still in created status',
      );
    }

    // When vendor marks as shipped to warehouse, auto-set expected delivery date (1 week from now)
    if (newStatus === 'vendor_shipped_to_warehouse') {
      const expectedDeliveryDate = new Date();
      expectedDeliveryDate.setDate(expectedDeliveryDate.getDate() + 7);
      order.expectedDeliveryDate = expectedDeliveryDate;
    }
  }

  if (role === 'admin') {
    // Admin can update to any status except 'vendor_shipped_to_warehouse' (that's vendor only)
    if (newStatus === 'vendor_shipped_to_warehouse') {
      throw new ApiError(403, 'Only vendors can mark orders as shipped to warehouse');
    }

    // When admin marks as shipped, store the shipped date
    if (newStatus === 'shipped') {
      order.shippedDate = new Date();
    }
  }

  order.status = newStatus as any;
  await order.save();

  return order.toObject();
};

/**
 * Update expected delivery date (admin only)
 */
export const updateExpectedDeliveryDate = async (
  orderId: string,
  expectedDeliveryDate: Date,
) => {
  const order = await Order.findById(new mongoose.Types.ObjectId(orderId));
  if (!order) {
    throw new ApiError(404, 'Order not found');
  }

  order.expectedDeliveryDate = expectedDeliveryDate;
  await order.save();

  return order.toObject();
};

export default {
  calculateOrderTotals,
  createOrder,
  verifyAndCompletePayment,
  getUserOrders,
  getOrderById,
  getVendorOrders,
  getAdminOrders,
  getAdminOrderById,
  updateOrderStatus,
  updateExpectedDeliveryDate,
};

