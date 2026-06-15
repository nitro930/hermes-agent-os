import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, voice = 'default', speed = 1.0 } = body;

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      
      const result = await zai.tts.synthesize({
        text,
        voice,
        speed,
      });

      // Return audio data as base64
      return NextResponse.json({
        audio: result.audio || result.base64 || '',
        format: 'audio/mp3',
      });
    } catch (aiError) {
      console.error('TTS AI error:', aiError);
      return NextResponse.json({
        audio: '',
        error: 'TTS synthesis failed',
        fallback: true,
      });
    }
  } catch (error) {
    console.error('TTS error:', error);
    return NextResponse.json({ error: 'Failed to synthesize speech' }, { status: 500 });
  }
}
