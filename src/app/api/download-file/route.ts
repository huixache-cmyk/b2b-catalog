import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const content = formData.get('content') as string;
    const filename = formData.get('filename') as string || 'document.bin';
    const mimeType = formData.get('mimeType') as string || 'application/octet-stream';
    const isBase64 = formData.get('isBase64') as string === 'true';

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    let buffer: Buffer;
    if (isBase64) {
      // Extract base64 data, removing the data URI prefix if it exists
      const base64Data = content.includes(',') ? content.split(',')[1] : content;
      buffer = Buffer.from(base64Data, 'base64');
    } else {
      buffer = Buffer.from(content, 'utf-8');
    }

    // Convert Node.js Buffer to Uint8Array to satisfy standard Fetch BodyInit typing
    const uint8Array = new Uint8Array(buffer);

    return new NextResponse(uint8Array, {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': uint8Array.length.toString(),
      },
    });
  } catch (error) {
    console.error('Error in download-file API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
