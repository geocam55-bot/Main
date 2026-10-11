// @ts-nocheck
import { CanvasTexture } from './three';

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
  const texture = new CanvasTexture(canvas);
  texture.wrapS = 1000; // RepeatWrapping
  texture.wrapT = 1000;
  return texture;
}

export function createConcreteTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c0c0c0';
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 5000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const shade = Math.random() * 40 - 20;
    ctx.fillStyle = `rgb(${192 + shade},${192 + shade},${192 + shade})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = 1000;
  texture.wrapT = 1000;
  return texture;
}

export function createSidingTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#f5f5f0';
  ctx.fillRect(0, 0, 512, 512);

  // Horizontal siding lines
  ctx.strokeStyle = '#d0d0c8';
  ctx.lineWidth = 2;
  for (let y = 0; y < 512; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    // shadow under board
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.beginPath();
    ctx.moveTo(0, y + 2);
    ctx.lineTo(512, y + 2);
    ctx.stroke();
    ctx.strokeStyle = '#d0d0c8';
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = 1000;
  texture.wrapT = 1000;
  return texture;
}

export function createShingleTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#4a4a4a';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 2;
  const rowHeight = 32;
  const colWidth = 64;

  for (let y = 0; y < 512; y += rowHeight) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();

    const offset = (y / rowHeight) % 2 === 0 ? 0 : colWidth / 2;
    for (let x = offset; x < 512; x += colWidth) {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + rowHeight);
      ctx.stroke();
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = 1000;
  texture.wrapT = 1000;
  return texture;
}

export function createWoodTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#c8a276';
  ctx.fillRect(0, 0, 512, 512);

  ctx.strokeStyle = 'rgba(120, 80, 40, 0.15)';
  ctx.lineWidth = 4;
  for (let i = 0; i < 20; i++) {
    const y = i * 30 + Math.random() * 10;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(170, y + 20, 340, y - 20, 512, y);
    ctx.stroke();
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = 1000;
  texture.wrapT = 1000;
  return texture;
}
