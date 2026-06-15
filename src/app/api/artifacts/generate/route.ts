import { generateArtifactSchema } from '@/lib/validations';
import { ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = generateArtifactSchema.parse(body);

    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    let systemPrompt: string;
    if (data.type === 'html') {
      systemPrompt = 'You are a web developer AI. Generate clean, modern HTML/CSS/JS code based on the user description. Output ONLY the HTML code, no explanations or markdown code fences. Include inline CSS in a <style> tag. Make it visually appealing with modern design, good typography, and responsive layout.';
    } else if (data.type === 'react') {
      systemPrompt = 'You are a React developer AI. Generate a clean React component with inline styles based on the user description. Output ONLY the JSX/React code, no explanations or markdown code fences. Make it modern and visually appealing.';
    } else if (data.type === 'css') {
      systemPrompt = 'You are a CSS developer AI. Generate clean, modern CSS based on the user description. Output ONLY the CSS code, no explanations or markdown code fences.';
    } else if (data.type === 'json') {
      systemPrompt = 'You are a data architect AI. Generate a clean JSON schema or data structure based on the user description. Output ONLY valid JSON, no explanations or markdown code fences.';
    } else {
      systemPrompt = 'You are a developer AI. Generate clean, well-structured code based on the user description. Output ONLY the code, no explanations or markdown code fences.';
    }

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Create: ${data.description}. Make it production-quality with modern best practices.` },
      ],
    });

    let content = completion.choices[0]?.message?.content || '';

    // Strip markdown code fences if present
    content = content.replace(/^```(?:html|jsx|react|css|json|javascript|typescript)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

    return NextResponse.json({ content });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    console.error('Artifact generation error:', error);
    return NextResponse.json({ error: 'Failed to generate artifact' }, { status: 500 });
  }
}
