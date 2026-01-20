import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(request: NextRequest) {
  try {
    const { imageData, filename } = await request.json();

    if (!imageData) {
      return NextResponse.json({ success: false, error: 'No image data provided' }, { status: 400 });
    }

    // Extract base64 data from data URL
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    try {
      await mkdir(uploadsDir, { recursive: true });
    } catch (err) {
      // Directory might already exist, that's fine
    }

    // Generate filename if not provided
    const imageFilename = filename || `photo-${Date.now()}.jpg`;
    const filePath = path.join(uploadsDir, imageFilename);

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

