import { ROIBox } from '../types';

export interface CapturedCropResult {
  dataUrl: string;
  base64: string;
  width: number;
  height: number;
  hash: string;
}

export async function startDisplayMediaCapture(): Promise<MediaStream> {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error('Screen Capture API is not supported in this browser environment.');
  }

  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: {
      displaySurface: 'window',
      frameRate: { ideal: 15, max: 30 },
    } as MediaTrackConstraints,
    audio: false,
  });

  return stream;
}

export function cropVideoFrameToROI(
  source: HTMLVideoElement | HTMLImageElement,
  roi: ROIBox,
  preprocess: boolean = true
): CapturedCropResult | null {
  const naturalWidth = 'videoWidth' in source ? source.videoWidth : source.naturalWidth;
  const naturalHeight = 'videoHeight' in source ? source.videoHeight : source.naturalHeight;

  if (!naturalWidth || !naturalHeight) return null;

  // Compute pixel dimensions
  const cropX = Math.max(0, Math.floor((roi.x / 100) * naturalWidth));
  const cropY = Math.max(0, Math.floor((roi.y / 100) * naturalHeight));
  const cropW = Math.min(naturalWidth - cropX, Math.floor((roi.width / 100) * naturalWidth));
  const cropH = Math.min(naturalHeight - cropY, Math.floor((roi.height / 100) * naturalHeight));

  if (cropW <= 10 || cropH <= 10) return null;

  const canvas = document.createElement('canvas');
  canvas.width = cropW;
  canvas.height = cropH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Draw cropped frame
  ctx.drawImage(source, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

  // Optional gaming font enhancement for OCR
  if (preprocess) {
    enhanceGamingTextContrast(ctx, cropW, cropH);
  }

  const dataUrl = canvas.toDataURL('image/png');
  const base64 = dataUrl.replace(/^data:image\/png;base64,/, '');

  // Fast perceptual hash to detect text changes
  const hash = computeSimpleCanvasHash(ctx, cropW, cropH);

  return {
    dataUrl,
    base64,
    width: cropW,
    height: cropH,
    hash,
  };
}

// Enhances subtitle text contrast against busy game background
function enhanceGamingTextContrast(ctx: CanvasRenderingContext2D, width: number, height: number) {
  try {
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Slight contrast stretch
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Luminance
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Enhance bright subtitle text
      if (lum > 140) {
        data[i] = Math.min(255, r * 1.25);
        data[i + 1] = Math.min(255, g * 1.25);
        data[i + 2] = Math.min(255, b * 1.25);
      } else if (lum < 70) {
        // Deepen dark dialogue box background
        data[i] = Math.max(0, r * 0.7);
        data[i + 1] = Math.max(0, g * 0.7);
        data[i + 2] = Math.max(0, b * 0.7);
      }
    }

    ctx.putImageData(imgData, 0, 0);
  } catch (e) {
    console.warn('Canvas preprocess skipped due to cross-origin or buffer limits:', e);
  }
}

// Simple pixel sampling hash to avoid re-translating static text
function computeSimpleCanvasHash(ctx: CanvasRenderingContext2D, width: number, height: number): string {
  try {
    const samples = 16;
    let sum = 0;
    const stepX = Math.max(1, Math.floor(width / samples));
    const stepY = Math.max(1, Math.floor(height / samples));
    const imgData = ctx.getImageData(0, 0, width, height);

    for (let y = 0; y < height; y += stepY) {
      for (let x = 0; x < width; x += stepX) {
        const idx = (y * width + x) * 4;
        sum = (sum + imgData.data[idx] + imgData.data[idx + 1] + imgData.data[idx + 2]) % 1000000007;
      }
    }
    return sum.toString(36);
  } catch {
    return Math.random().toString();
  }
}
