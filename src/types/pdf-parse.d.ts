declare module "pdf-parse" {
  interface PdfData {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
  }

  const pdfParse: (
    buffer: Buffer | Uint8Array | string,
    options?: unknown,
  ) => Promise<PdfData>;
  export default pdfParse;
}
