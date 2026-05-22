import React, { useEffect, useRef, useState } from 'react';
import JSZip from 'jszip';
import logoAsset from 'figma:asset/09aa6b9a364cd19b8e73e23401db6a6a0b182a0e.png';

interface FaviconConfig {
  size: number;
  name: string;
  label: string;
}

const sizes: FaviconConfig[] = [
  { size: 16, name: 'favicon-16x16.png', label: '16x16 (Browser Tab)' },
  { size: 32, name: 'favicon-32x32.png', label: '32x32 (Taskbar)' },
  { size: 48, name: 'favicon-48x48.png', label: '48x48 (Windows)' },
  { size: 64, name: 'favicon-64x64.png', label: '64x64 (Windows)' },
  { size: 128, name: 'favicon-128x128.png', label: '128x128 (Chrome Store)' },
  { size: 192, name: 'favicon-192x192.png', label: '192x192 (Android)' },
  { size: 512, name: 'favicon-512x512.png', label: '512x512 (PWA)' },
  { size: 180, name: 'apple-touch-icon.png', label: '180x180 (iOS)' },
  { size: 32, name: 'favicon.ico', label: '32x32 (favicon.ico)' }
];

export function FaviconGenerator() {
  const [canvases, setCanvases] = useState<Map<string, HTMLCanvasElement>>(new Map());
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const imgToCanvas = async (size: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) throw new Error('Failed to get canvas context');

    const img = new Image();
    img.crossOrigin = 'anonymous'; // Important for external URLs
    
    return new Promise((resolve, reject) => {
      img.onload = () => {
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas);
      };
      img.onerror = reject;
      img.src = logoAsset;
    });
  };

  useEffect(() => {
    const generatePreviews = async () => {
      const newCanvases = new Map<string, HTMLCanvasElement>();
      
      for (const config of sizes) {
        try {
          const canvas = await imgToCanvas(config.size);
          newCanvases.set(config.name, canvas);
        } catch (error) {
          // Failed to generate favicon for this size
        }
      }
      
      setCanvases(newCanvases);
    };

    generatePreviews();
  }, []);

  const downloadCanvas = (canvas: HTMLCanvasElement, filename: string) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    });
  };

  const downloadAllFavicons = async () => {
    setIsGenerating(true);
    const zip = new JSZip();
    
    try {
      for (const config of sizes) {
        const canvas = await imgToCanvas(config.size);
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!));
        });
        zip.file(config.name, blob);
      }
      
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'prospaces-favicons.zip';
      a.click();
      URL.revokeObjectURL(url);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (error) {
      // Error generating favicons
      alert('Error generating favicons. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 p-8">
      <div className="max-w-4xl mx-auto bg-background rounded-2xl shadow-2xl p-8">
        <h1 className="text-purple-600 mb-2">🏢 ProSpaces CRM Favicon Generator</h1>
        <p className="text-muted-foreground mb-8">Download all favicon sizes for your deployment</p>

        <div className="bg-blue-50 border-l-4 border-blue-600 p-4 mb-6 rounded">
          <h3 className="text-blue-600 mt-0 mb-2">📋 Instructions</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Click "Download All Favicons" below</li>
            <li>Extract the ZIP file to get all favicon images</li>
            <li>Upload all PNG files to your <code className="bg-blue-100 px-2 py-1 rounded">/public</code> folder in GitHub</li>
            <li>Deploy to Vercel and your favicon will appear!</li>
          </ol>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {sizes.map((config) => {
            const canvas = canvases.get(config.name);
            const displaySize = Math.min(config.size, 128);
            
            return (
              <div key={config.name} className="text-center p-4 bg-muted rounded-lg border-2 border-border">
                <div className="text-muted-foreground mb-2">{config.label}</div>
                {canvas && (
                  <div className="flex justify-center mb-2">
                    <canvas
                      ref={(el) => {
                        if (el && canvas) {
                          el.width = displaySize;
                          el.height = displaySize;
                          const ctx = el.getContext('2d');
                          ctx?.drawImage(canvas, 0, 0, displaySize, displaySize);
                        }
                      }}
                      className="border border-border rounded"
                      style={{ width: displaySize, height: displaySize }}
                    />
                  </div>
                )}
                <div className="text-muted-foreground text-sm mb-2">{config.name}</div>
                <button
                  onClick={() => canvas && downloadCanvas(canvas, config.name)}
                  disabled={!canvas}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Download
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={downloadAllFavicons}
          disabled={isGenerating || canvases.size === 0}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-4 rounded-lg hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? '📦 Generating...' : '📦 Download All Favicons (ZIP)'}
        </button>

        {showSuccess && (
          <div className="mt-6 bg-green-50 border-l-4 border-green-600 p-4 rounded">
            <h3 className="text-green-600 mt-0 mb-2">✅ Success!</h3>
            <p>Your favicons are downloading. Upload them to <code className="bg-green-100 px-2 py-1 rounded">/public</code> folder and redeploy.</p>
          </div>
        )}
      </div>
    </div>
  );
}