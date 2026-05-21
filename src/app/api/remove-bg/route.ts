import { NextResponse } from 'next/server';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const apiKey = process.env.REMOVE_BG_API_KEY;

    if (!apiKey) {
      console.log("REMOVE_BG_API_KEY no está configurada. Se indicará al cliente que realice fallback local.");
      return NextResponse.json({ success: false, error: 'REMOVE_BG_API_KEY_NOT_CONFIGURED' });
    }

    // Extraemos la parte base64 pura (sin el prefijo data:image/png;base64,)
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    console.log("Iniciando remoción de fondo mediante API externa (remove.bg)...");

    const formData = new FormData();
    formData.append("image_b64", base64Data);
    formData.append("size", "auto");

    const response = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: {
        "X-Api-Key": apiKey,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error al llamar a la API de remove.bg:", response.status, errorText);
      return NextResponse.json({ success: false, error: `remove.bg API error: ${response.status} - ${response.statusText}` });
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBuffer = Buffer.from(arrayBuffer);
    const resultBase64 = `data:image/png;base64,${resultBuffer.toString('base64')}`;

    console.log("Fondo removido exitosamente en la nube con remove.bg.");
    return NextResponse.json({ success: true, data: resultBase64, source: 'remove.bg' });

  } catch (error: any) {
    console.error('Error in remove-bg API route:', error);
    return NextResponse.json({ success: false, error: error.message || 'Error processing image in backend' });
  }
}
