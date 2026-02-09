import PDFDocument from 'pdfkit';

const COMPANY_NAME = 'Bazaarwale';
const COMPANY_TAGLINE = 'B2B Wholesale Marketplace';

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

export function buildDeliveryLabelPdf(orderNumber: string, shippingAddress: ShippingAddress): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // Label size: 4" x 6" (288 x 432 pt) - standard shipping label
    const doc = new PDFDocument({ size: [288, 432], margin: 24 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const padding = 20;
    let y = 24;

    // FROM (small)
    doc.fontSize(8).font('Helvetica').fillColor('#6b7280').text('FROM', 24, y);
    y += 14;
    doc.fontSize(11).font('Helvetica-Bold').fillColor('#111827').text(COMPANY_NAME, 24, y);
    y += 14;
    doc.fontSize(9).font('Helvetica').fillColor('#374151').text(COMPANY_TAGLINE, 24, y);
    y += 28;

    // Divider
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(24, y).lineTo(264, y).stroke();
    y += 24;

    // TO
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text('SHIP TO', 24, y);
    y += 18;
    doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text(shippingAddress.name ?? 'Recipient', 24, y, { width: 220 });
    y += 20;
    if (shippingAddress.phone) {
      doc.fontSize(11).font('Helvetica').fillColor('#374151').text(shippingAddress.phone, 24, y);
      y += 16;
    }
    doc.fontSize(11).font('Helvetica').fillColor('#374151');
    doc.text(shippingAddress.line1 ?? '', 24, y, { width: 220 });
    y += 14;
    if (shippingAddress.line2) {
      doc.text(shippingAddress.line2, 24, y, { width: 220 });
      y += 14;
    }
    const cityStatePin = [shippingAddress.city, shippingAddress.state, shippingAddress.postalCode].filter(Boolean).join(', ');
    doc.text(cityStatePin, 24, y, { width: 220 });
    y += 14;
    if (shippingAddress.country) {
      doc.text(shippingAddress.country, 24, y, { width: 220 });
      y += 16;
    } else {
      doc.text('India', 24, y, { width: 220 });
      y += 16;
    }

    y += 20;
    doc.strokeColor('#e5e7eb').lineWidth(1).moveTo(24, y).lineTo(264, y).stroke();
    y += 20;

    // Order number - prominent for scanning
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280').text('Order No.', 24, y);
    y += 16;
    doc.fontSize(18).font('Helvetica-Bold').fillColor('#103663').text(orderNumber, 24, y);
    y += 28;

    // Barcode-style block (visual only - not a real barcode)
    doc.rect(24, y, 240, 44).fillAndStroke('#f9fafb', '#d1d5db');
    doc.fontSize(12).font('Helvetica').fillColor('#374151').text(orderNumber, 0, y + 14, { width: 288, align: 'center' });
    y += 52;

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af');
    doc.text('Handle with care. Keep dry.', 24, y, { width: 240, align: 'center' });

    doc.end();
  });
}
