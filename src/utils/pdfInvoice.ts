import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';

const COMPANY_NAME = 'BazaarWale Enterprises';
const BUSINESS_TAGLINE = 'B2B Wholesale Marketplace';

interface OrderItem {
  title: string;
  sku?: string;
  qty: number;
  pricePerUnit: number;
  totalPrice: number;
  vendorSnapshot?: { vendorName?: string };
  taxPercentage?: number;
  taxAmount?: number;
}

interface ShippingAddress {
  name?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
}

interface OrderForPdf {
  orderNumber: string;
  placedAt: string | Date;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  paymentStatus: string;
  shippingAddress: ShippingAddress;
  customer?: { name?: string; email?: string; phone?: string } | null;
}

function formatINR(amount: number): string {
  return `₹${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function getLogoPath(): string | null {
  const candidates = [
    path.join(process.cwd(), 'assets', 'logo.png'),
    path.join(process.cwd(), '..', 'frontend', 'public', 'logo.png'),
    path.join(process.cwd(), 'frontend', 'public', 'logo.png'),
    path.join(process.cwd(), 'uploads', 'logo.png'),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return null;
}

export function buildInvoicePdf(order: OrderForPdf): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 595.28 - 80;
    const left = 40;
    const right = 595.28 - 40;
    const tableWidth = pageWidth;
    const rowHeight = 22;
    const headerHeight = 24;
    const maxY = 800;
    const footerY = 820;

    let y = 40;

    // ----- Header: Logo + Company -----
    const logoPath = getLogoPath();
    if (logoPath) {
      try {
        doc.image(logoPath, left, y, { width: 52, height: 52 });
      } catch {
        // ignore if image fails
      }
    }
    doc.fontSize(20).font('Helvetica-Bold').fillColor('#103663');
    doc.text(COMPANY_NAME, logoPath ? left + 60 : left, y + 8, { width: 280 });
    doc.fontSize(9).font('Helvetica').fillColor('#6b7280');
    doc.text(BUSINESS_TAGLINE, logoPath ? left + 60 : left, y + 34, { width: 280 });
    doc.fontSize(11).font('Helvetica').fillColor('#374151');
    doc.text(`Order No: ${order.orderNumber}`, right - 180, y, { width: 180, align: 'right' });
    const placedDate = new Date(order.placedAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
    doc.text(`Date: ${placedDate}`, right - 180, y + 16, { width: 180, align: 'right' });
    doc.text(`Payment: ${order.paymentStatus.toUpperCase()}`, right - 180, y + 32, { width: 180, align: 'right' });
    y += 58;

    doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 20;

    // ----- Bill To -----
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111827').text('Bill To', left, y);
    y += 16;
    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    const customerName = order.customer?.name || order.shippingAddress?.name || 'Customer';
    doc.text(customerName, left, y, { width: 240 });
    y += 14;
    if (order.customer?.email) {
      doc.text(order.customer.email, left, y, { width: 240 });
      y += 14;
    }
    if (order.shippingAddress?.phone || order.customer?.phone) {
      doc.text(String(order.shippingAddress?.phone || order.customer?.phone || ''), left, y, { width: 240 });
      y += 14;
    }
    const addr = order.shippingAddress;
    const addressLines = [addr?.line1, addr?.line2].filter(Boolean) as string[];
    const cityLine = addr?.city && addr?.state && addr?.postalCode
      ? `${addr.city}, ${addr.state} ${addr.postalCode}`
      : [addr?.city, addr?.state, addr?.postalCode].filter(Boolean).join(', ');
    if (cityLine) addressLines.push(cityLine);
    if (addr?.country) addressLines.push(addr.country);
    else addressLines.push('India');
    doc.text(addressLines.join(', '), left, y, { width: 240 });
    y += 32;

    // ----- Table: columns (widths must sum to tableWidth) -----
    const col = {
      sl: left,
      product: left + 28,
      sku: left + 200,
      qty: left + 268,
      unit: left + 308,
      amount: left + 378,
    };
    const colW = {
      product: 168,
      sku: 64,
      qty: 36,
      unit: 66,
      amount: right - 378 - 10,
    };

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827');
    doc.rect(left, y, tableWidth, headerHeight).fillAndStroke('#f8fafc', '#e2e8f0');
    doc.fillColor('#374151');
    doc.text('#', col.sl + 4, y + 6, { width: 20 });
    doc.text('Product', col.product + 4, y + 6, { width: colW.product - 8 });
    doc.text('SKU', col.sku + 4, y + 6, { width: colW.sku - 8 });
    doc.text('Qty', col.qty + 4, y + 6, { width: colW.qty - 8 });
    doc.text('Unit Price', col.unit + 4, y + 6, { width: colW.unit - 8 });
    doc.text('Amount', col.amount + 4, y + 6, { width: colW.amount - 8 });
    y += headerHeight;

    doc.font('Helvetica').fillColor('#374151');
    order.items.forEach((item, i) => {
      const needNewPage = y + rowHeight > maxY;
      if (needNewPage) {
        doc.addPage({ size: 'A4', margin: 40 });
        y = 40;
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#111827');
        doc.rect(left, y, tableWidth, headerHeight).fillAndStroke('#f8fafc', '#e2e8f0');
        doc.fillColor('#374151');
        doc.text('#', col.sl + 4, y + 6, { width: 20 });
        doc.text('Product', col.product + 4, y + 6, { width: colW.product - 8 });
        doc.text('SKU', col.sku + 4, y + 6, { width: colW.sku - 8 });
        doc.text('Qty', col.qty + 4, y + 6, { width: colW.qty - 8 });
        doc.text('Unit Price', col.unit + 4, y + 6, { width: colW.unit - 8 });
        doc.text('Amount', col.amount + 4, y + 6, { width: colW.amount - 8 });
        y += headerHeight;
      }
      const bg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
      doc.rect(left, y, tableWidth, rowHeight).fillAndStroke(bg, '#e2e8f0');
      doc.fontSize(9).font('Helvetica').fillColor('#374151');
      doc.text(String(i + 1), col.sl + 4, y + 5, { width: 20 });
      doc.text(item.title.length > 45 ? item.title.substring(0, 45) + '…' : item.title, col.product + 4, y + 5, { width: colW.product - 8 });
      doc.text((item.sku || '—').substring(0, 14), col.sku + 4, y + 5, { width: colW.sku - 8 });
      doc.text(String(item.qty), col.qty + 4, y + 5, { width: colW.qty - 8 });
      doc.text(formatINR(item.pricePerUnit), col.unit + 4, y + 5, { width: colW.unit - 8 });
      doc.text(formatINR(item.totalPrice), col.amount + 4, y + 5, { width: colW.amount - 8 });
      y += rowHeight;
    });

    y += 14;
    if (y > maxY - 80) {
      doc.addPage({ size: 'A4', margin: 40 });
      y = 40;
    }

    const totalsLeft = col.amount;
    const totalsWidth = right - col.amount;
    doc.font('Helvetica').fontSize(10).fillColor('#374151');
    doc.text('Subtotal:', totalsLeft, y); doc.text(formatINR(order.subtotal), totalsLeft + 90, y, { width: totalsWidth - 100, align: 'right' });
    y += 18;
    doc.text('Shipping:', totalsLeft, y); doc.text(formatINR(order.shippingCost), totalsLeft + 90, y, { width: totalsWidth - 100, align: 'right' });
    y += 18;
    doc.text('Tax (GST):', totalsLeft, y); doc.text(formatINR(order.tax), totalsLeft + 90, y, { width: totalsWidth - 100, align: 'right' });
    y += 22;
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#103663');
    doc.text('Total:', totalsLeft, y); doc.text(formatINR(order.total), totalsLeft + 90, y, { width: totalsWidth - 100, align: 'right' });

    y += 28;
    if (y < footerY) {
      doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
      y += 14;
      doc.font('Helvetica').fontSize(8).fillColor('#94a3b8');
      doc.text(
        `${COMPANY_NAME} | ${BUSINESS_TAGLINE} | This is a computer-generated invoice.`,
        left,
        y,
        { align: 'center', width: pageWidth }
      );
    }

    doc.end();
  });
}
