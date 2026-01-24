import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import {
  DEFAULT_MAX_IMAGE_BYTES,
  resolveSafeUploadPath,
  sanitizeFilename,
  validateImagePayload,
} from '@/app/lib/image-upload';

export async function POST(request: NextRequest) {
  try {
    const { imageData, filename } = await request.json();

    if (!imageData) {
      return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 });
    }

    let mimeType = 'image/jpeg';
    let base64Data = '';

    try {
      const validated = validateImagePayload(imageData, DEFAULT_MAX_IMAGE_BYTES);
      mimeType = validated.mimeType;
      base64Data = validated.base64Data;
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Invalid image payload',
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(base64Data, 'base64');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    await mkdir(uploadsDir, { recursive: true });

    // Sanitize filename and resolve safe path
    const imageFilename = sanitizeFilename(filename, mimeType);
    const filePath = resolveSafeUploadPath(uploadsDir, imageFilename);

    // Save the file
    await writeFile(filePath, buffer);

    // Return the public URL
    const publicUrl = `/uploads/${imageFilename}`;

    console.log('📸 Image saved:', publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: imageFilename,
    });
  } catch (error) {
    console.error('Error saving image:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save image',
      },
      { status: 500 }
    );
  }
}
