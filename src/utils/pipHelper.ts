import { TranslationRecord, OverlayConfig, Language } from '../types';

class PiPHelper {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private video: HTMLVideoElement | null = null;
  private isPipActive: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.canvas.width = 640;
      this.canvas.height = 240;
      this.ctx = this.canvas.getContext('2d');
    }
  }

  public async togglePiP(record: TranslationRecord | null, config: OverlayConfig, targetLang: Language): Promise<boolean> {
    if (this.isPipActive) {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
      this.isPipActive = false;
      return false;
    }

    if (!document.pictureInPictureEnabled) {
      console.warn('Picture-in-Picture is not supported in this browser.');
      return false;
    }

    this.renderCanvas(record, config, targetLang);

    if (!this.video) {
      this.video = document.createElement('video');
      this.video.muted = true;
      this.video.playsInline = true;
      this.video.style.display = 'none';
      document.body.appendChild(this.video);

      const stream = (this.canvas as any).captureStream(15);
      this.video.srcObject = stream;
      await this.video.play();
    }

    try {
      await this.video.requestPictureInPicture();
      this.isPipActive = true;

      this.video.addEventListener(
        'leavepictureinpicture',
        () => {
          this.isPipActive = false;
        },
        { once: true }
      );

      return true;
    } catch (err) {
      console.warn('Failed to open PiP:', err);
      this.isPipActive = false;
      return false;
    }
  }

  public update(record: TranslationRecord | null, config: OverlayConfig, targetLang: Language) {
    if (!this.isPipActive || !this.ctx || !this.canvas) return;
    this.renderCanvas(record, config, targetLang);
  }

  private renderCanvas(record: TranslationRecord | null, config: OverlayConfig, targetLang: Language) {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    // Background
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Border
    ctx.strokeStyle = config.theme === 'fantasy_gold' ? '#f59e0b' : '#06b6d4';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, w - 8, h - 8);

    if (!record) {
      ctx.fillStyle = '#64748b';
      ctx.font = '16px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Aegis Game Translator - Ready for Dialogue', w / 2, h / 2);
      return;
    }

    // Speaker & Lang
    ctx.textAlign = 'left';
    ctx.fillStyle = config.theme === 'fantasy_gold' ? '#fbbf24' : '#22d3ee';
    ctx.font = 'bold 15px sans-serif';
    const speakerLabel = record.speaker ? `[${record.speaker}] ` : '';
    ctx.fillText(`${speakerLabel}${record.detectedLanguage} → ${targetLang.name}`, 20, 36);

    // Main translated text
    ctx.fillStyle = '#f8fafc';
    ctx.font = `${Math.min(26, config.fontSize + 4)}px sans-serif`;
    ctx.textAlign = targetLang.rtl ? 'right' : 'left';
    const textX = targetLang.rtl ? w - 24 : 24;

    this.wrapText(ctx, record.translatedText, textX, 75, w - 48, 32);

    // Notes
    if (record.notes) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(record.notes.slice(0, 70), 20, h - 16);
    }
  }

  private wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
        if (currentY > this.canvas!.height - 35) break;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
}

export const pipHelper = new PiPHelper();
