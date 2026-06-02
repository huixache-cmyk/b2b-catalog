import { NextResponse } from 'next/server';
import { verifyUser } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await verifyUser(request);
  if (!user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const GITHUB_PAT = process.env.GITHUB_PAT;
  const OWNER = 'huixache-cmyk';
  const REPO = 'b2b-catalog';
  const WORKFLOW_ID = 'b2b-agent-cron.yml';

  if (!GITHUB_PAT) {
    return NextResponse.json(
      { error: 'GitHub PAT no configurado en las variables de entorno' },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_ID}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${GITHUB_PAT}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main',
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API Error:', errorText);
      return NextResponse.json(
        { error: 'Error al disparar el flujo de GitHub', details: errorText },
        { status: response.status }
      );
    }

    return NextResponse.json(
      { message: 'Motor inicializado con éxito' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Request Error:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
