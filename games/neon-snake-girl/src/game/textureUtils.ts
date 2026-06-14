import * as THREE from 'three';

export function canvasTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function createEmojiTexture(
  emoji: string,
  bg: string,
  border: string,
  size = 256,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const r = size * 0.12;
  ctx.fillStyle = bg;
  ctx.strokeStyle = border;
  ctx.lineWidth = size * 0.04;
  roundRect(ctx, size * 0.08, size * 0.08, size * 0.84, size * 0.84, r);
  ctx.fill();
  ctx.stroke();

  ctx.font = `${size * 0.52}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.02);

  return canvasTexture(canvas);
}

export function createRoadTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 2048;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3a3f44';
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 800; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const len = 4 + Math.random() * 18;
    ctx.strokeStyle = `rgba(20, 22, 26, ${0.15 + Math.random() * 0.35})`;
    ctx.lineWidth = 0.5 + Math.random() * 1.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * len, y + len * 0.6);
    ctx.stroke();
  }

  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(25, 28, 32, ${0.2 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 20, 3 + Math.random() * 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(235, 235, 235, 0.85)';
  ctx.lineWidth = 5;
  ctx.setLineDash([28, 22]);
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = 'rgba(200, 200, 200, 0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(w * 0.18, 0);
  ctx.lineTo(w * 0.18, h);
  ctx.moveTo(w * 0.82, 0);
  ctx.lineTo(w * 0.82, h);
  ctx.stroke();

  const tex = canvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 8);
  return tex;
}

export function createRustMetalTexture(seed = 1): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8a4a28';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 600; i++) {
    const x = (Math.sin(i * seed * 13.7) * 0.5 + 0.5) * size;
    const y = (Math.cos(i * seed * 7.3) * 0.5 + 0.5) * size;
    ctx.fillStyle = `rgba(${80 + (i % 40)}, ${35 + (i % 25)}, ${15 + (i % 15)}, ${0.08 + (i % 10) / 40})`;
    ctx.fillRect(x, y, 2 + (i % 6), 2 + (i % 4));
  }

  ctx.strokeStyle = 'rgba(180, 90, 40, 0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * 32);
    ctx.lineTo(size, i * 32 + 10);
    ctx.stroke();
  }

  const tex = canvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** 从参考图底部裁切路面区域，用于与 vista 衔接 */
export function extractRoadFromReference(img: HTMLImageElement): THREE.CanvasTexture | null {
  if (!img.width || !img.height) return null;
  const canvas = document.createElement('canvas');
  const w = 512;
  const h = 512;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const srcH = Math.floor(img.height * 0.42);
  const srcY = img.height - srcH;
  ctx.drawImage(img, 0, srcY, img.width, srcH, 0, 0, w, h);
  return canvasTexture(canvas);
}
