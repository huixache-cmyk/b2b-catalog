import { NextResponse } from 'next/server';
import { removeBackground } from '@imgly/background-removal-node';

export const maxDuration = 60; // Allow 60s since bg removal can be slow the first time

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // removeBackground accepts Blob, ArrayBuffer, Uint8Array or image URL
    // Convert base64 to buffer
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    const blobInput = new Blob([buffer], { type: 'image/png' });

    console.log("Iniciando remoción de fondo en el servidor...");
    
    // Config: Node version downloads models to local cache automatically
    const resultBlob = await removeBackground(blobInput);

    console.log("Fondo removido exitosamente.");

    // Convert result back to base64
    const arrayBuffer = await resultBlob.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuffer);
    const resultBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

    return NextResponse.json({ success: true, data: resultBase64 });
  } catch (error: any) {
    console.error('Error in remove-bg API:', error);
    return NextResponse.json({ error: error.message || 'Error processing image in backend' }, { status: 500 });
  }
}
