export const MAX_INVOICE_FILE_BYTES = 4 * 1024 * 1024;

const formats = {
  "application/pdf": { extensions: [".pdf"], signature: (bytes: Uint8Array) => ascii(bytes, 0, 5) === "%PDF-" },
  "image/jpeg": { extensions: [".jpg", ".jpeg"], signature: (bytes: Uint8Array) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": { extensions: [".png"], signature: (bytes: Uint8Array) => bytes[0] === 0x89 && ascii(bytes, 1, 3) === "PNG" && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a }
} as const;

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

export type InvoiceFile = Pick<File, "name" | "type" | "size" | "arrayBuffer">;

export async function validateInvoiceFile(file: InvoiceFile): Promise<{ ok: true; extension: string } | { ok: false; error: string }> {
  if (!file.size) return { ok: false, error: "Choose a non-empty invoice file." };
  if (file.size > MAX_INVOICE_FILE_BYTES) return { ok: false, error: "Invoices must be 4 MB or smaller." };

  const mime = file.type.toLowerCase();
  if (!(mime in formats)) return { ok: false, error: "Upload a PDF, JPG, JPEG, or PNG invoice." };

  const extension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
  const format = formats[mime as keyof typeof formats];
  if (!(format.extensions as readonly string[]).includes(extension)) return { ok: false, error: "The file extension does not match its type." };

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!format.signature(bytes)) return { ok: false, error: "The file contents do not match the selected file type." };
  return { ok: true, extension };
}
