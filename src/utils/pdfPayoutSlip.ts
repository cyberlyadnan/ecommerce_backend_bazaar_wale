import PDFDocument from 'pdfkit';

const COMPANY_NAME = 'BazaarWale Enterprises';
const SIGNED_AS = 'BazaarWale';

interface VendorInfo {
  name?: string | null;
  businessName?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface PayoutForSlip {
  _id: string;
  vendorId: VendorInfo & { _id?: string };
  grossAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  netAmount: number;
  amount: number;
  currency: string;
  status: string;
  paymentMode: string;
  paymentReference?: string | null;
  paidAt?: Date | string | null;
  createdAt: string | Date;
  adminNotes?: string | null;
}

function formatINR(amount: number): string {
  return `Rs. ${Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function buildPayoutSlipPdf(payout: PayoutForSlip): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const left = 50;
    const right = 545.28;
    const pageWidth = 495.28;
    let y = 50;

    doc.fontSize(20).font('Helvetica-Bold').fillColor('#103663');
    doc.text(COMPANY_NAME, left, y);
    y += 28;
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
    doc.text('B2B Wholesale Marketplace', left, y);
    y += 32;

    doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 24;

    doc.fontSize(16).font('Helvetica-Bold').fillColor('#111827');
    doc.text('PAYOUT SLIP', left, y);
    y += 28;

    const vendorName = payout.vendorId?.businessName || payout.vendorId?.name || 'Vendor';
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#374151').text('Vendor', left, y);
    y += 16;
    doc.font('Helvetica').fontSize(11).fillColor('#111827');
    doc.text(vendorName, left, y);
    y += 16;
    if (payout.vendorId?.email) {
      doc.fontSize(10).fillColor('#6b7280').text(payout.vendorId.email, left, y);
      y += 14;
    }
    if (payout.vendorId?.phone) {
      doc.text(payout.vendorId.phone, left, y);
      y += 18;
    } else {
      y += 8;
    }

    const slipDate = payout.paidAt
      ? new Date(payout.paidAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
      : new Date(payout.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
    doc.text(`Payout ID: ${String(payout._id)}`, right - 200, 110, { width: 200, align: 'right' });
    doc.text(`Date: ${slipDate}`, right - 200, 126, { width: 200, align: 'right' });
    doc.text(`Status: ${(payout.status || 'pending').toUpperCase()}`, right - 200, 142, { width: 200, align: 'right' });

    y += 20;
    doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 24;

    doc.fontSize(11).font('Helvetica').fillColor('#374151');
    doc.text('Gross amount', left, y);
    doc.text(formatINR(payout.grossAmount ?? 0), right - 120, y, { width: 120, align: 'right' });
    y += 22;
    doc.text(`Commission (${payout.commissionPercent ?? 0}%)`, left, y);
    doc.text(formatINR(payout.commissionAmount ?? 0), right - 120, y, { width: 120, align: 'right' });
    y += 26;
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#103663');
    doc.text('Net amount (payable)', left, y);
    doc.text(formatINR(payout.netAmount ?? payout.amount ?? 0), right - 120, y, { width: 120, align: 'right' });
    y += 32;

    doc.font('Helvetica').fontSize(10).fillColor('#6b7280');
    doc.text(`Payment mode: ${(payout.paymentMode || 'bank').toUpperCase()}`, left, y);
    y += 16;
    if (payout.paymentReference) {
      doc.text(`Reference: ${payout.paymentReference}`, left, y);
      y += 16;
    }
    if (payout.adminNotes) {
      doc.text(`Notes: ${payout.adminNotes}`, left, y, { width: pageWidth });
      y += 24;
    } else {
      y += 16;
    }

    y += 40;
    doc.moveTo(left, y).lineTo(right, y).strokeColor('#e5e7eb').lineWidth(0.5).stroke();
    y += 28;
    doc.fontSize(10).font('Helvetica').fillColor('#6b7280');
    doc.text('Authorised by', left, y);
    y += 20;
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#111827');
    doc.text(SIGNED_AS, left, y);
    y += 24;
    doc.font('Helvetica').fontSize(9).fillColor('#9ca3af');
    doc.text(`${COMPANY_NAME} | This is a computer-generated payout slip.`, left, y, { width: pageWidth });

    doc.end();
  });
}
