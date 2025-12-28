"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVendorOrderEmail = exports.generateCustomerOrderEmail = void 0;
/**
 * Generate customer order confirmation email template
 */
const generateCustomerOrderEmail = (order, customerName) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #6366f1;
      margin: 0;
      font-size: 28px;
    }
    .success-badge {
      display: inline-block;
      background-color: #10b981;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 10px;
    }
    .order-info {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      color: #111827;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .items-table th {
      background-color: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .text-right {
      text-align: right;
    }
    .total-section {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.final {
      border-top: 2px solid #6366f1;
      margin-top: 10px;
      padding-top: 15px;
      font-size: 18px;
      font-weight: 700;
      color: #6366f1;
    }
    .address-section {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin-top: 20px;
    }
    .address-section h3 {
      margin-top: 0;
      color: #374151;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Order Confirmation</h1>
      <div class="success-badge">✓ Payment Successful</div>
    </div>

    <p>Dear ${customerName},</p>
    <p>Thank you for your order! We're excited to confirm that your order has been received and payment has been processed successfully.</p>

    <div class="order-info">
      <div class="info-row">
        <span class="info-label">Order Number:</span>
        <span class="info-value"><strong>${order.orderNumber}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Order Date:</span>
        <span class="info-value">${formatDate(order.placedAt)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Status:</span>
        <span class="info-value" style="color: #10b981; font-weight: 600;">Paid</span>
      </div>
      ${order.razorpayPaymentId ? `
      <div class="info-row">
        <span class="info-label">Payment ID:</span>
        <span class="info-value" style="font-family: monospace; font-size: 12px;">${order.razorpayPaymentId}</span>
      </div>
      ` : ''}
    </div>

    <h2 style="color: #374151; margin-top: 30px;">Order Items</h2>
    <table class="items-table">
      <thead>
        <tr>
          <th>Product</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${order.items.map((item) => `
        <tr>
          <td>
            <strong>${item.title}</strong>
            ${item.sku ? `<br><small style="color: #6b7280;">SKU: ${item.sku}</small>` : ''}
          </td>
          <td class="text-right">${item.qty}</td>
          <td class="text-right">${formatCurrency(item.pricePerUnit)}</td>
          <td class="text-right"><strong>${formatCurrency(item.totalPrice)}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(order.subtotal)}</span>
      </div>
      <div class="total-row">
        <span>Shipping:</span>
        <span>${formatCurrency(order.shippingCost)}</span>
      </div>
      <div class="total-row">
        <span>Tax (GST):</span>
        <span>${formatCurrency(order.tax)}</span>
      </div>
      <div class="total-row final">
        <span>Total Amount:</span>
        <span>${formatCurrency(order.total)}</span>
      </div>
    </div>

    <div class="address-section">
      <h3>Shipping Address</h3>
      <p>
        ${order.shippingAddress.name}<br>
        ${order.shippingAddress.line1}<br>
        ${order.shippingAddress.line2 ? order.shippingAddress.line2 + '<br>' : ''}
        ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}<br>
        ${order.shippingAddress.country || 'India'}<br>
        Phone: ${order.shippingAddress.phone}
      </p>
    </div>

    <p style="margin-top: 30px;">We'll send you another email once your order has been shipped. You can track your order status anytime from your account.</p>

    <div class="footer">
      <p>Thank you for shopping with us!</p>
      <p><strong>Bazaarwale</strong></p>
      <p style="margin-top: 10px; font-size: 12px;">If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `;
};
exports.generateCustomerOrderEmail = generateCustomerOrderEmail;
/**
 * Generate vendor order notification email template
 * NO customer details included for privacy
 */
const generateVendorOrderEmail = (order, vendorName, vendorItems) => {
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0,
        }).format(amount);
    };
    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    // Calculate totals for vendor's items only
    const vendorSubtotal = vendorItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const vendorTax = Math.round(vendorSubtotal * 0.18);
    const vendorTotal = vendorSubtotal + vendorTax;
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Received</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #6366f1;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #6366f1;
      margin: 0;
      font-size: 28px;
    }
    .new-badge {
      display: inline-block;
      background-color: #3b82f6;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 600;
      margin-top: 10px;
    }
    .order-info {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
    }
    .info-value {
      color: #111827;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .items-table th {
      background-color: #f9fafb;
      padding: 12px;
      text-align: left;
      font-weight: 600;
      color: #374151;
      border-bottom: 2px solid #e5e7eb;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    .items-table tr:last-child td {
      border-bottom: none;
    }
    .text-right {
      text-align: right;
    }
    .total-section {
      background-color: #f9fafb;
      border-radius: 6px;
      padding: 20px;
      margin-top: 20px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
    }
    .total-row.final {
      border-top: 2px solid #6366f1;
      margin-top: 10px;
      padding-top: 15px;
      font-size: 18px;
      font-weight: 700;
      color: #6366f1;
    }
    .notice-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .notice-box p {
      margin: 0;
      color: #92400e;
      font-size: 14px;
    }
    .footer {
      text-align: center;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Order Received</h1>
      <div class="new-badge">New Order</div>
    </div>

    <p>Dear ${vendorName},</p>
    <p>You have received a new order! Please review the order details below and prepare the items for shipment.</p>

    <div class="order-info">
      <div class="info-row">
        <span class="info-label">Order Number:</span>
        <span class="info-value"><strong>${order.orderNumber}</strong></span>
      </div>
      <div class="info-row">
        <span class="info-label">Order Date:</span>
        <span class="info-value">${formatDate(order.placedAt)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Payment Status:</span>
        <span class="info-value" style="color: #10b981; font-weight: 600;">Paid</span>
      </div>
    </div>

    <div class="notice-box">
      <p><strong>Note:</strong> Customer details are kept confidential for privacy. Shipping will be handled by our warehouse. Please prepare the items according to the quantities specified below.</p>
    </div>

    <h2 style="color: #374151; margin-top: 30px;">Your Products in This Order</h2>
    <table class="items-table">
      <thead>
        <tr>
          <th>Product</th>
          <th class="text-right">Quantity</th>
          <th class="text-right">Unit Price</th>
          <th class="text-right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${vendorItems.map((item) => `
        <tr>
          <td>
            <strong>${item.title}</strong>
            ${item.sku ? `<br><small style="color: #6b7280;">SKU: ${item.sku}</small>` : ''}
          </td>
          <td class="text-right">${item.qty}</td>
          <td class="text-right">${formatCurrency(item.pricePerUnit)}</td>
          <td class="text-right"><strong>${formatCurrency(item.totalPrice)}</strong></td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="total-section">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>${formatCurrency(vendorSubtotal)}</span>
      </div>
      <div class="total-row">
        <span>Tax (GST):</span>
        <span>${formatCurrency(vendorTax)}</span>
      </div>
      <div class="total-row final">
        <span>Your Total:</span>
        <span>${formatCurrency(vendorTotal)}</span>
      </div>
    </div>

    <p style="margin-top: 30px;">Please prepare these items for shipment to our warehouse. You will receive further instructions regarding shipping logistics.</p>

    <div class="footer">
      <p>Thank you for being part of our platform!</p>
      <p><strong>Bazaarwale</strong></p>
      <p style="margin-top: 10px; font-size: 12px;">If you have any questions, please contact our support team.</p>
    </div>
  </div>
</body>
</html>
  `;
};
exports.generateVendorOrderEmail = generateVendorOrderEmail;
