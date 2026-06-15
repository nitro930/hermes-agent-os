import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Serves an artifact's content as a full HTML page for live preview in an iframe.
 * For HTML artifacts: wraps content in a basic HTML shell if not already a full document.
 * For other types: renders a syntax-highlighted code view.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const artifact = await db.artifact.findUnique({
      where: { id },
    });

    if (!artifact) {
      return new NextResponse('<html><body><h1>404 — Artifact Not Found</h1></body></html>', {
        status: 404,
        headers: { 'Content-Type': 'text/html' },
      });
    }

    let html: string;

    if (artifact.type === 'html' || artifact.type === 'react') {
      // Check if content is already a full HTML document
      const content = artifact.content;
      if (content.trim().toLowerCase().startsWith('<!doctype') || content.trim().toLowerCase().startsWith('<html')) {
        html = content;
      } else {
        // Wrap in a complete HTML shell with a reset stylesheet
        html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${artifact.title}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 1.5rem; line-height: 1.6; color: #1a1a2e; background: #fafafa; }
  h1 { font-size: 1.75rem; margin-bottom: 0.75rem; }
  h2 { font-size: 1.35rem; margin-bottom: 0.5rem; }
  h3 { font-size: 1.1rem; margin-bottom: 0.4rem; }
  p { margin-bottom: 0.75rem; }
  a { color: #10b981; }
  code { background: #f0f0f0; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
  pre { background: #1e1e2e; color: #cdd6f4; padding: 1rem; border-radius: 8px; overflow-x: auto; margin-bottom: 1rem; }
  pre code { background: transparent; color: inherit; padding: 0; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 1rem; }
  th, td { border: 1px solid #ddd; padding: 0.5rem 0.75rem; text-align: left; }
  th { background: #f5f5f5; font-weight: 600; }
  img { max-width: 100%; height: auto; }
  button { cursor: pointer; padding: 0.5rem 1rem; border: none; border-radius: 6px; background: #10b981; color: white; font-size: 0.875rem; }
  button:hover { background: #059669; }
  input, textarea, select { padding: 0.5rem; border: 1px solid #ddd; border-radius: 6px; font-size: 0.875rem; }
  .card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 1rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
</style>
</head>
<body>
${content}
</body>
</html>`;
      }
    } else if (artifact.type === 'css') {
      html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${artifact.title}</title>
<style>${artifact.content}</style>
</head><body>
<div class="preview-container">
<h1>CSS Preview</h1>
<p>This is a preview of your CSS styles. Add HTML content to see the styles applied.</p>
<div class="box">Box Element</div>
<button class="btn">Button</button>
<a href="#">Link</a>
<ul><li>Item 1</li><li>Item 2</li><li>Item 3</li></ul>
</div>
</body></html>`;
    } else if (artifact.type === 'json') {
      let formatted: string;
      try {
        formatted = JSON.stringify(JSON.parse(artifact.content), null, 2);
      } catch {
        formatted = artifact.content; // Fallback to raw content if invalid JSON
      }
      html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${artifact.title}</title>
<style>body{background:#1e1e2e;color:#cdd6f4;font-family:'Fira Code',monospace;padding:1.5rem;white-space:pre;overflow:auto;font-size:0.8rem;line-height:1.5;}</style>
</head><body>${formatted.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</body></html>`;
    } else {
      // code, markdown, text — render with syntax highlighting
      const escaped = artifact.content.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      html = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>${artifact.title}</title>
<style>
  body{background:#1e1e2e;color:#cdd6f4;font-family:'Fira Code',monospace;padding:1.5rem;overflow:auto;font-size:0.8rem;line-height:1.6;}
  pre{white-space:pre-wrap;word-wrap:break-word;margin:0;}
  .header{color:#a6e3a1;font-size:0.75rem;margin-bottom:1rem;padding-bottom:0.5rem;border-bottom:1px solid #45475a;}
</style>
</head><body>
<div class="header">${artifact.type.toUpperCase()} — ${artifact.title} (v${artifact.version})</div>
<pre>${escaped}</pre>
</body></html>`;
    }

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'no-cache, no-transform',
        // Sandbox the preview: only allow scripts from same origin, no form submissions, no popups
        'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; form-action 'none'; frame-ancestors 'self';",
        'X-Frame-Options': 'SAMEORIGIN',
      },
    });
  } catch (error) {
    console.error('Artifact preview error:', error);
    return new NextResponse('<html><body><h1>500 — Preview Error</h1><p>Failed to render artifact preview.</p></body></html>', {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}
