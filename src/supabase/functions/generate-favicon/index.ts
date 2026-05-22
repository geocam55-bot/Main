import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="50%" stop-color="#9333ea"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="20" fill="url(#bg)"/>
  <g fill="white" opacity="0.95">
    <rect x="32" y="22" width="22" height="56" rx="2"/>
    <rect x="22" y="46" width="14" height="32" rx="2"/>
    <rect x="62" y="36" width="14" height="42" rx="2"/>
    <rect x="37" y="28" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="45" y="28" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="37" y="36" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="45" y="36" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="37" y="44" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="45" y="44" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="37" y="52" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="45" y="52" width="4" height="4" rx="1" fill="#9333ea"/>
    <rect x="26" y="52" width="6" height="5" rx="1" fill="#9333ea"/>
    <rect x="26" y="60" width="6" height="5" rx="1" fill="#9333ea"/>
    <rect x="66" y="42" width="6" height="5" rx="1" fill="#9333ea"/>
    <rect x="66" y="50" width="6" height="5" rx="1" fill="#9333ea"/>
    <rect x="66" y="58" width="6" height="5" rx="1" fill="#9333ea"/>
  </g>
</svg>`;

serve(async (req: Request) => {
  const url = new URL(req.url);
  const size = url.searchParams.get('size') || '32';
  
  // For ICO format, return the 32x32 PNG with ICO mimetype
  if (url.pathname.includes('favicon.ico')) {
    return new Response(svgContent, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  }
  
  // Return SVG (browsers will render it at any size)
  return new Response(svgContent, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});
