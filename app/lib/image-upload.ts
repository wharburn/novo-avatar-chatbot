import path from 'path';

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const DEFAULT_MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10MB

export function estimateBase64Size(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export function parseImageData(imageData: string): { mimeType: string; base64Data: string } {
  if (imageData.startsWith('data:')) {
    const match = imageData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Invalid data URL format');
    }
    return { mimeType: match[1].toLowerCase(), base64Data: match[2] };
  }

  return { mimeType: 'image/jpeg', base64Data: imageData };
}

export function sanitizeFilename(filename: string | undefined, mimeType: string): string {
  const extFromMime = ALLOWED_MIME_TYPES[mimeType] || 'jpg';
  const safeBaseName = filename ? path.basename(filename) : '';
  const cleaned = safeBaseName.replace(/[^A-Za-z0-9._-]/g, '_');
  const parsed = path.parse(cleaned);
  const baseName = parsed.name || `photo-${Date.now()}`;
  const ext = parsed.ext.toLowerCase();

  const allowedExts = new Set(['.jpg', '.jpeg', '.png', '.webp']);
  const finalExt = allowedExts.has(ext) ? ext : `.${extFromMime}`;

  return `${baseName}${finalExt}`;
}

export function resolveSafeUploadPath(uploadsDir: string, filename: string): string {
  const filePath = path.join(uploadsDir, filename);
  const resolvedUploadsDir = path.resolve(uploadsDir);
  const resolvedFilePath = path.resolve(filePath);

  if (!resolvedFilePath.startsWith(resolvedUploadsDir + path.sep)) {
    throw new Error('Invalid filename path');
  }

  return resolvedFilePath;
}

export function validateImagePayload(
  imageData: string,
  maxBytes: number = DEFAULT_MAX_IMAGE_BYTES
): { mimeType: string; base64Data: string; sizeBytes: number } {
  const { mimeType, base64Data } = parseImageData(imageData);

  if (!ALLOWED_MIME_TYPES[mimeType]) {
    throw new Error(`Unsupported image type: ${mimeType}`);
  }

  const estimatedSize = estimateBase64Size(base64Data);
  if (estimatedSize > maxBytes) {
    throw new Error(`Image exceeds max size of ${maxBytes} bytes`);
  }

  return { mimeType, base64Data, sizeBytes: estimatedSize };
}
