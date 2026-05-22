import { CanvasTexture } from './three';

export function createShingleTexture(baseColor: number, type: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const r = (baseColor >> 16) & 0xff;
  const g = (baseColor >> 8) & 0xff;
  const b = baseColor & 0xff;

  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 512, 512);

  if (type === 'metal') {
    for (let x = 0; x < 512; x += 40) {
      ctx.fillStyle = `rgba(0,0,0,0.25)`;
      ctx.fillRect(x - 1, 0, 3, 512);
      ctx.fillStyle = `rgba(255,255,255,0.15)`;
      ctx.fillRect(x + 2, 0, 1, 512);
    }
    for (let y = 0; y < 512; y += 64) {
      ctx.fillStyle = `rgba(255,255,255,0.03)`;
      ctx.fillRect(0, y, 512, 32);
    }
  } else if (type === 'cedar-shake') {
    const shakeH = 32;
    for (let row = 0; row < 512; row += shakeH) {
      let x = (row / shakeH) % 2 === 0 ? 0 : -20;
      while (x < 520) {
        const w = 20 + Math.random() * 30;
        const shade = -15 + Math.random() * 30;
        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r + shade))},${Math.max(0, Math.min(255, g + shade))},${Math.max(0, Math.min(255, b + shade))})`;
        ctx.fillRect(x, row, w - 1, shakeH - 1);
        ctx.strokeStyle = `rgba(0,0,0,0.12)`;
        ctx.lineWidth = 0.5;
        for (let gy = row + 4; gy < row + shakeH; gy += 3 + Math.random() * 4) {
          ctx.beginPath();
          ctx.moveTo(x + 1, gy);
          ctx.lineTo(x + w - 2, gy + (Math.random() - 0.5) * 2);
          ctx.stroke();
        }
        x += w;
      }
      ctx.fillStyle = `rgba(0,0,0,0.2)`;
      ctx.fillRect(0, row + shakeH - 2, 512, 2);
    }
  } else {
    const shingleH = type === '3-tab' ? 28 : 24;
    const baseShingleW = type === '3-tab' ? 64 : 45;
    for (let row = 0; row < 512; row += shingleH) {
      let x = ((row / shingleH) % 2) * (baseShingleW / 2);
      while (x < 520) {
        const w = type === '3-tab' ? baseShingleW : 30 + Math.random() * 30;
        const shade = -12 + Math.random() * 24;
        ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r + shade))},${Math.max(0, Math.min(255, g + shade))},${Math.max(0, Math.min(255, b + shade))})`;
        ctx.fillRect(x, row, w - 1, shingleH - 1);
        if (type === 'designer') {
          for (let p = 0; p < 15; p++) {
            const px = x + Math.random() * w;
            const py = row + Math.random() * shingleH;
            const ps = Math.random() * 8 - 4;
            ctx.fillStyle = `rgba(${ps > 0 ? 255 : 0},${ps > 0 ? 255 : 0},${ps > 0 ? 255 : 0},0.08)`;
            ctx.fillRect(px, py, 2, 2);
          }
        }
        x += w;
      }
      ctx.fillStyle = `rgba(0,0,0,0.18)`;
      ctx.fillRect(0, row + shingleH - 2, 512, 2);
    }
  }
  return new CanvasTexture(canvas);
}

export function createSidingTexture(color?: number): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  let r = 240, g = 234, b = 214;
  if (color !== undefined) {
    r = (color >> 16) & 0xff;
    g = (color >> 8) & 0xff;
    b = color & 0xff;
  }
  
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 512, 512);
  const boardH = 24;
  for (let y = 0; y < 512; y += boardH) {
    const shade = Math.random() * 6 - 3;
    ctx.fillStyle = `rgb(${Math.max(0, Math.min(255, r + shade))},${Math.max(0, Math.min(255, g + shade))},${Math.max(0, Math.min(255, b + shade))})`;
    ctx.fillRect(0, y, 512, boardH - 1);
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, y + boardH - 2, 512, 2);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(0, y, 512, 1);
  }
  return new CanvasTexture(canvas);
}

export function createBrickTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8b8a0';
  ctx.fillRect(0, 0, 256, 256);
  const brickW = 40, brickH = 16, mortarW = 3;
  for (let row = 0; row < 256 / (brickH + mortarW); row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2 + mortarW / 2;
    for (let col = -1; col < 256 / (brickW + mortarW) + 1; col++) {
      const x = col * (brickW + mortarW) + offset;
      const y = row * (brickH + mortarW);
      const shade = Math.random() * 30 - 15;
      ctx.fillStyle = `rgb(${139 + shade},${69 + shade * 0.5},${19 + shade * 0.3})`;
      ctx.fillRect(x, y, brickW, brickH);
      ctx.fillStyle = 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, y + brickH - 2, brickW, 2);
    }
  }
  return new CanvasTexture(canvas);
}

export function createGrassTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#6a8a5a';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 2000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.random() * 30 - 15;
    ctx.fillStyle = `rgb(${106 + shade},${138 + shade},${90 + shade})`;
    ctx.fillRect(x, y, 2 + Math.random() * 4, 2 + Math.random() * 4);
  }
  ctx.strokeStyle = 'rgba(80,120,60,0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, y - 3 - Math.random() * 6);
    ctx.stroke();
  }
  return new CanvasTexture(canvas);
}

export function createConcreteTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#b0a898';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3000; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = Math.random() * 20 - 10;
    ctx.fillStyle = `rgba(${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${v > 0 ? 255 : 0},${Math.abs(v) / 100})`;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  return new CanvasTexture(canvas);
}

export function createWoodTexture(color: number = 0x8b6f47): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fillRect(0, 0, 512, 512);
  
  // Wood grain
  for (let i = 0; i < 50; i++) {
    const y = Math.random() * 512;
    const thickness = 1 + Math.random() * 5;
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.fillRect(0, y, 512, thickness);
  }
  
  return new CanvasTexture(canvas);
}
