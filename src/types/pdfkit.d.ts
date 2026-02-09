declare module 'pdfkit' {
  interface PDFDocumentOptions {
    size?: string | number[];
    margin?: number;
  }

  class PDFDocument {
    constructor(options?: PDFDocumentOptions);
    on(event: 'data', callback: (chunk: Buffer) => void): this;
    on(event: 'end', callback: () => void): this;
    on(event: 'error', callback: (err: Error) => void): this;
    end(): void;
    font(font?: string): this;
    fontSize(size: number): this;
    fillColor(color: string): this;
    text(...args: unknown[]): this;
    moveTo(x: number, y: number): this;
    lineTo(x: number, y: number): this;
    strokeColor(color: string): this;
    lineWidth(w: number): this;
    stroke(): this;
    rect(x: number, y: number, w: number, h: number): this;
    fillAndStroke(fill?: string, stroke?: string): this;
    image(src: string, x: number, y: number, options?: { width?: number; height?: number }): this;
    addPage(options?: PDFDocumentOptions): this;
    readonly page: { width: number; height: number };
  }

  export = PDFDocument;
}
