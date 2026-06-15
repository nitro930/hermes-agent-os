import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert audio to base64
    const arrayBuffer = await audioFile.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString('base64');

    try {
      const ZAI = (await import('z-ai-web-dev-sdk')).default;
      const zai = await ZAI.create();
      
      // Use functions.invoke for ASR since the SDK doesn't have typed ASR method
      const zaiAny = zai as unknown as { functions: { invoke: (fn: string, params: Record<string, unknown>) => Promise<unknown> } };
      const result = await zaiAny.functions.invoke('asr', {
        audio: base64Audio,
        format: audioFile.type || 'audio/webm',
      }) as { text?: string; confidence?: number };

      return NextResponse.json({
        text: result.text || '',
        confidence: result.confidence || 0.9,
      });
    } catch (aiError) {
      console.error('ASR AI error:', aiError);
      // Fallback: return a placeholder indicating ASR is available but had an error
      return NextResponse.json({
        text: '',
        error: 'ASR processing failed - please try again',
        fallback: true,
      });
    }
  } catch (error) {
    console.error('ASR error:', error);
    return NextResponse.json({ error: 'Failed to process audio' }, { status: 500 });
  }
}
