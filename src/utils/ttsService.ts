// Text-To-Speech (TTS) Service using Web Speech API

class TTSService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private isMuted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getVoices(): SpeechSynthesisVoice[] {
    if (this.voices.length === 0 && this.synth) {
      this.loadVoices();
    }
    return this.voices;
  }

  public getVoicesForLanguage(langCode: string): SpeechSynthesisVoice[] {
    const all = this.getVoices();
    const prefix = langCode.toLowerCase().split('-')[0];
    return all.filter((v) => v.lang.toLowerCase().startsWith(prefix));
  }

  public speak({
    text,
    langCode,
    rate = 1.0,
    pitch = 1.0,
    voiceName,
  }: {
    text: string;
    langCode: string;
    rate?: number;
    pitch?: number;
    voiceName?: string;
  }): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synth || this.isMuted || !text.trim()) {
        resolve();
        return;
      }

      // Cancel ongoing speech to avoid overlapping dialogues
      this.synth.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.pitch = pitch;

      // Select voice
      const available = this.getVoices();
      if (voiceName) {
        const found = available.find((v) => v.name === voiceName);
        if (found) utterance.voice = found;
      } else {
        const langMatches = this.getVoicesForLanguage(langCode);
        if (langMatches.length > 0) {
          utterance.voice = langMatches[0];
          utterance.lang = langMatches[0].lang;
        } else {
          utterance.lang = langCode;
        }
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => {
        console.warn('TTS playback error:', e);
        resolve();
      };

      this.synth.speak(utterance);
    });
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) this.stop();
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }
}

export const ttsService = new TTSService();
