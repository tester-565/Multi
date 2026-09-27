import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GameProfile, GameScene, OverlayConfig, ROIBox, ROIPreset, TranslationRecord, Language } from '../../types';
import { INITIAL_GAME_SCENES } from '../../data/initialScenes';
import { GameOverlay } from '../overlay/GameOverlay';
import { cropVideoFrameToROI, startDisplayMediaCapture } from '../../utils/screenCapture';
import { translateGameText, ocrAndTranslateImage } from '../../utils/translatorEngine';
import { ttsService } from '../../utils/ttsService';
import { pipHelper } from '../../utils/pipHelper';
import {
  Play,
  Pause,
  Scan,
  Move,
  Monitor,
  Gamepad2,
  Upload,
  RefreshCw,
  ChevronRight,
  Maximize2,
  Layers,
  Sparkles,
  AlertCircle,
  Crop,
  Crosshair,
  Sliders,
  Send,
  Eye,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GameSimulatorProps {
  selectedProfile: GameProfile;
  targetLang: string;
  targetLangObj: Language;
  overlayConfig: OverlayConfig;
  onNewTranslationRecord: (record: TranslationRecord) => void;
  dialogueHistory: TranslationRecord[];
  isAutoScanning: boolean;
  setIsAutoScanning: (scanning: boolean) => void;
}

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'move' | null;

export const GameSimulator: React.FC<GameSimulatorProps> = ({
  selectedProfile,
  targetLang,
  targetLangObj,
  overlayConfig,
  onNewTranslationRecord,
  dialogueHistory,
  isAutoScanning,
  setIsAutoScanning,
}) => {
  // Capture source mode: sandbox simulation, live screen displayMedia, or uploaded image
  const [sourceMode, setSourceMode] = useState<'sandbox' | 'screen' | 'image'>('sandbox');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);

  // Region of Interest (ROI) Box percentages (0-100)
  const [roiPreset, setRoiPreset] = useState<ROIPreset>('dialogue_bottom');
  const [roi, setRoi] = useState<ROIBox>({
    x: 10,
    y: 68,
    width: 80,
    height: 24,
  });

  // ROI Interactive Drag & Resize state
  const [activeHandle, setActiveHandle] = useState<ResizeHandle>(null);
  const [isDrawingRoi, setIsDrawingRoi] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [showRoiSliders, setShowRoiSliders] = useState(false);

  // State
  const [currentRecord, setCurrentRecord] = useState<TranslationRecord | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Custom Direct Dialogue input state
  const [customText, setCustomText] = useState('');
  const [customSpeaker, setCustomSpeaker] = useState('');
  const [showCustomBar, setShowCustomBar] = useState(false);

  // Live Screen Capture Video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isScreenCapturing, setIsScreenCapturing] = useState(false);

  // Uploaded Image
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Viewport container ref
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    initialRoi: ROIBox;
  } | null>(null);

  const currentScene = INITIAL_GAME_SCENES[currentSceneIndex] || INITIAL_GAME_SCENES[0];
  const currentDialogue = currentScene.dialogues[currentDialogueIndex] || currentScene.dialogues[0];

  // Preset ROI bounding boxes
  const applyRoiPreset = (preset: ROIPreset) => {
    setRoiPreset(preset);
    setIsDrawingRoi(false);
    switch (preset) {
      case 'dialogue_bottom':
        setRoi({ x: 10, y: 68, width: 80, height: 24 });
        break;
      case 'dialogue_center':
        setRoi({ x: 15, y: 35, width: 70, height: 35 });
        break;
      case 'top_tracker':
        setRoi({ x: 60, y: 6, width: 36, height: 26 });
        break;
      case 'full':
        setRoi({ x: 0, y: 0, width: 100, height: 100 });
        break;
      case 'custom':
        break;
    }
  };

  // Perform translation on current scene or cropped image
  const performTranslation = useCallback(async () => {
    if (isTranslating) return;
    setIsTranslating(true);
    setErrorMsg(null);

    try {
      if (sourceMode === 'sandbox') {
        const contextHistory = dialogueHistory.slice(-5).map((d) => ({
          speaker: d.speaker,
          text: d.originalText,
        }));

        const result = await translateGameText({
          text: currentDialogue.text,
          sourceLang: currentDialogue.lang,
          targetLang: targetLang,
          gameProfile: selectedProfile,
          contextHistory,
          engine: 'gemini',
        });

        if (!result.speaker && currentDialogue.speaker) {
          result.speaker = currentDialogue.speaker;
        }

        setCurrentRecord(result);
        onNewTranslationRecord(result);
        pipHelper.update(result, overlayConfig, targetLangObj);

        if (overlayConfig.autoSpeak) {
          ttsService.speak({
            text: result.translatedText,
            langCode: targetLang,
            rate: overlayConfig.ttsRate,
            pitch: overlayConfig.ttsPitch,
            voiceName: overlayConfig.ttsVoiceName,
          });
        }
      } else if (sourceMode === 'screen' && videoRef.current) {
        const crop = cropVideoFrameToROI(videoRef.current, roi, true);
        if (!crop) {
          throw new Error('Unable to extract frame from video stream. Ensure game window is active.');
        }

        const result = await ocrAndTranslateImage({
          imageBase64: crop.base64,
          sourceLang: 'auto',
          targetLang: targetLang,
          gameProfile: selectedProfile,
        });

        setCurrentRecord(result);
        onNewTranslationRecord(result);
        pipHelper.update(result, overlayConfig, targetLangObj);

        if (overlayConfig.autoSpeak) {
          ttsService.speak({
            text: result.translatedText,
            langCode: targetLang,
            rate: overlayConfig.ttsRate,
            pitch: overlayConfig.ttsPitch,
            voiceName: overlayConfig.ttsVoiceName,
          });
        }
      } else if (sourceMode === 'image' && imageElementRef.current) {
        const crop = cropVideoFrameToROI(imageElementRef.current, roi, true);
        if (!crop) throw new Error('Could not crop uploaded image.');

        const result = await ocrAndTranslateImage({
          imageBase64: crop.base64,
          sourceLang: 'auto',
          targetLang: targetLang,
          gameProfile: selectedProfile,
        });

        setCurrentRecord(result);
        onNewTranslationRecord(result);
        pipHelper.update(result, overlayConfig, targetLangObj);
      }
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Translation error:', error);
      setErrorMsg(error?.message || 'Failed to process game text');
    } finally {
      setIsTranslating(false);
    }
  }, [
    isTranslating,
    sourceMode,
    currentDialogue,
    dialogueHistory,
    targetLang,
    selectedProfile,
    roi,
    overlayConfig,
    targetLangObj,
    onNewTranslationRecord,
  ]);

  // Handle custom text translation
  const handleTranslateCustomText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!customText.trim() || isTranslating) return;

    setIsTranslating(true);
    setErrorMsg(null);

    try {
      const result = await translateGameText({
        text: customText.trim(),
        sourceLang: 'auto',
        targetLang: targetLang,
        gameProfile: selectedProfile,
        contextHistory: dialogueHistory.slice(-4).map((d) => ({
          speaker: d.speaker,
          text: d.originalText,
        })),
        engine: 'gemini',
      });

      if (customSpeaker.trim()) {
        result.speaker = customSpeaker.trim();
      }

      setCurrentRecord(result);
      onNewTranslationRecord(result);
      pipHelper.update(result, overlayConfig, targetLangObj);

      if (overlayConfig.autoSpeak) {
        ttsService.speak({
          text: result.translatedText,
          langCode: targetLang,
          rate: overlayConfig.ttsRate,
          pitch: overlayConfig.ttsPitch,
          voiceName: overlayConfig.ttsVoiceName,
        });
      }
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMsg(error?.message || 'Failed to translate custom line');
    } finally {
      setIsTranslating(false);
    }
  };

  // Auto-scan timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isAutoScanning) {
      performTranslation();
      timer = setInterval(() => {
        performTranslation();
      }, 2500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isAutoScanning, performTranslation]);

  // Handle external screen capture start
  const handleStartScreenCapture = async () => {
    try {
      setErrorMsg(null);
      const stream = await startDisplayMediaCapture();
      screenStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsScreenCapturing(true);
      setSourceMode('screen');

      stream.getVideoTracks()[0].addEventListener('ended', () => {
        setIsScreenCapturing(false);
        setIsAutoScanning(false);
        setSourceMode('sandbox');
      });
    } catch (e: unknown) {
      const error = e as Error;
      console.warn('Screen capture cancelled or error:', error);
      setErrorMsg(error?.message || 'Screen capture was cancelled or not permitted.');
    }
  };

  const handleStopScreenCapture = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }
    setIsScreenCapturing(false);
    setIsAutoScanning(false);
    setSourceMode('sandbox');
  };

  // Image file upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImageUrl(event.target?.result as string);
        setSourceMode('image');
      };
      reader.readAsDataURL(file);
    }
  };

  // Clipboard paste (Ctrl+V) handler
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              setUploadedImageUrl(event.target?.result as string);
              setSourceMode('image');
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // PiP toggle
  const handleTogglePiP = async () => {
    const active = await pipHelper.togglePiP(currentRecord, overlayConfig, targetLangObj);
    setIsPiPActive(active);
  };

  // Keyboard shortcut: Press 'T' to translate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        performTranslation();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [performTranslation]);

  // Next dialogue line in sandbox
  const handleNextDialogue = () => {
    const nextIdx = (currentDialogueIndex + 1) % currentScene.dialogues.length;
    setCurrentDialogueIndex(nextIdx);
    setTimeout(() => {
      performTranslation();
    }, 120);
  };

  // =====================
  // Interactive ROI Drag & Resize Logic
  // =====================
  const handleMouseDownOnHandle = (handle: ResizeHandle, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setActiveHandle(handle);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initialRoi: { ...roi },
    };
  };

  // Viewport mouse down for Draw Mode
  const handleViewportMouseDown = (e: React.MouseEvent) => {
    if (!isDrawingRoi || !viewportRef.current) return;
    const rect = viewportRef.current.getBoundingClientRect();
    const startX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const startY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setDrawStart({ x: startX, y: startY });
    setRoi({ x: startX, y: startY, width: 2, height: 2 });
  };

  // Global mouse move & up listeners for drag, resize, and draw
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();

      // Handling Draw Mode
      if (isDrawingRoi && drawStart) {
        const currentX = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
        const currentY = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));

        const x = Math.min(drawStart.x, currentX);
        const y = Math.min(drawStart.y, currentY);
        const width = Math.max(4, Math.abs(currentX - drawStart.x));
        const height = Math.max(4, Math.abs(currentY - drawStart.y));

        setRoi({ x, y, width, height });
        setRoiPreset('custom');
        return;
      }

      // Handling Move or Resize Handle Drag
      if (!activeHandle || !dragStartRef.current) return;

      const deltaXPercent = ((e.clientX - dragStartRef.current.clientX) / rect.width) * 100;
      const deltaYPercent = ((e.clientY - dragStartRef.current.clientY) / rect.height) * 100;
      const initial = dragStartRef.current.initialRoi;

      let newX = initial.x;
      let newY = initial.y;
      let newW = initial.width;
      let newH = initial.height;

      if (activeHandle === 'move') {
        newX = Math.max(0, Math.min(100 - initial.width, initial.x + deltaXPercent));
        newY = Math.max(0, Math.min(100 - initial.height, initial.y + deltaYPercent));
      } else {
        // Resizing
        if (activeHandle.includes('e')) {
          newW = Math.max(6, Math.min(100 - initial.x, initial.width + deltaXPercent));
        }
        if (activeHandle.includes('w')) {
          const maxLeftShift = initial.x + initial.width - 6;
          newX = Math.max(0, Math.min(maxLeftShift, initial.x + deltaXPercent));
          newW = initial.width + (initial.x - newX);
        }
        if (activeHandle.includes('s')) {
          newH = Math.max(5, Math.min(100 - initial.y, initial.height + deltaYPercent));
        }
        if (activeHandle.includes('n')) {
          const maxTopShift = initial.y + initial.height - 5;
          newY = Math.max(0, Math.min(maxTopShift, initial.y + deltaYPercent));
          newH = initial.height + (initial.y - newY);
        }
      }

      setRoi({
        x: Math.round(newX * 10) / 10,
        y: Math.round(newY * 10) / 10,
        width: Math.round(newW * 10) / 10,
        height: Math.round(newH * 10) / 10,
      });
      setRoiPreset('custom');
    };

    const handleMouseUp = () => {
      if (activeHandle) {
        setActiveHandle(null);
        dragStartRef.current = null;
      }
      if (isDrawingRoi && drawStart) {
        setDrawStart(null);
        setIsDrawingRoi(false);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeHandle, isDrawingRoi, drawStart]);

  return (
    <div className="space-y-4">
      {/* Top Control Bar: Source Mode Selectors, ROI Preset, Trigger Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Source Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setSourceMode('sandbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              sourceMode === 'sandbox'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            <span>Game Sandbox</span>
          </button>

          <button
            onClick={isScreenCapturing ? handleStopScreenCapture : handleStartScreenCapture}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              sourceMode === 'screen'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>{isScreenCapturing ? 'Live Game Active' : 'Capture PC Window'}</span>
          </button>

          <label
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
              sourceMode === 'image'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Screenshot / Paste</span>
            <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </label>
        </div>

        {/* ROI Target Area Preset Controls & Interactive Draw Toggle */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-400 hidden sm:inline">Capture Zone:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => applyRoiPreset('dialogue_bottom')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                roiPreset === 'dialogue_bottom'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bottom Subtitles
            </button>
            <button
              onClick={() => applyRoiPreset('dialogue_center')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                roiPreset === 'dialogue_center'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Center Dialogue
            </button>
            <button
              onClick={() => applyRoiPreset('top_tracker')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                roiPreset === 'top_tracker'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quest Tracker
            </button>
            <button
              onClick={() => applyRoiPreset('full')}
              className={`px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                roiPreset === 'full'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Screen
            </button>
          </div>

          {/* Interactive Draw Zone Toggle */}
          <button
            onClick={() => setIsDrawingRoi(!isDrawingRoi)}
            title="Click and drag directly on the screen to draw a custom ROI box"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isDrawingRoi
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm animate-pulse'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            <span>{isDrawingRoi ? 'Click & Drag Screen' : 'Draw Custom ROI'}</span>
          </button>

          {/* ROI Sliders Toggle */}
          <button
            onClick={() => setShowRoiSliders(!showRoiSliders)}
            title="Adjust precise ROI coordinates"
            className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
              showRoiSliders
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Translate Frame Now (Hotkey T) */}
          <button
            onClick={performTranslation}
            disabled={isTranslating}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs tracking-wide shadow-md shadow-cyan-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            <Scan className={`w-3.5 h-3.5 ${isTranslating ? 'animate-spin' : ''}`} />
            <span>{isTranslating ? 'Reading...' : 'Translate ROI (T)'}</span>
          </button>

          {/* Continuous Scan Toggle */}
          <button
            onClick={() => setIsAutoScanning(!isAutoScanning)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
              isAutoScanning
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {isAutoScanning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoScanning ? 'Stop Auto' : 'Continuous Live'}</span>
          </button>

          {/* Picture-in-Picture Floating Window */}
          <button
            onClick={handleTogglePiP}
            title="Pop out floating overlay (stays over games!)"
            className={`p-2 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
              isPiPActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Collapsible ROI Coordinates Fine-Tuner */}
      {showRoiSliders && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs animate-in fade-in duration-150">
          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>X Position:</span>
              <span className="font-mono text-cyan-300">{roi.x}%</span>
            </div>
            <input
              type="range"
              min="0"
              max={100 - roi.width}
              value={roi.x}
              onChange={(e) => {
                setRoi({ ...roi, x: Number(e.target.value) });
                setRoiPreset('custom');
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Y Position:</span>
              <span className="font-mono text-cyan-300">{roi.y}%</span>
            </div>
            <input
              type="range"
              min="0"
              max={100 - roi.height}
              value={roi.y}
              onChange={(e) => {
                setRoi({ ...roi, y: Number(e.target.value) });
                setRoiPreset('custom');
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Width:</span>
              <span className="font-mono text-cyan-300">{roi.width}%</span>
            </div>
            <input
              type="range"
              min="8"
              max={100 - roi.x}
              value={roi.width}
              onChange={(e) => {
                setRoi({ ...roi, width: Number(e.target.value) });
                setRoiPreset('custom');
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-slate-400 mb-1">
              <span>Height:</span>
              <span className="font-mono text-cyan-300">{roi.height}%</span>
            </div>
            <input
              type="range"
              min="5"
              max={100 - roi.y}
              value={roi.height}
              onChange={(e) => {
                setRoi({ ...roi, height: Number(e.target.value) });
                setRoiPreset('custom');
              }}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Error alert if any */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200 cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Game Screen Viewport Area */}
      <div
        ref={viewportRef}
        onMouseDown={handleViewportMouseDown}
        className={`relative w-full aspect-video max-h-[640px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center select-none ${
          isDrawingRoi ? 'cursor-crosshair' : 'cursor-default'
        }`}
      >
        {/* Render Sandbox View */}
        {sourceMode === 'sandbox' && (
          <div className="relative w-full h-full">
            <img
              src={currentScene.image}
              alt={currentScene.title}
              className="w-full h-full object-cover select-none pointer-events-none"
            />

            {/* Game Screen Info Header in Sandbox */}
            <div className="absolute top-3 inset-x-3 flex items-center justify-between z-20 pointer-events-none">
              <div className="flex items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-200 shadow-md">
                <span className="font-semibold text-cyan-400">{currentScene.title}</span>
                <span>·</span>
                <span className="text-slate-400">{currentScene.genre.toUpperCase()}</span>
                {currentScene.questObjective && (
                  <span className="hidden md:inline text-slate-400 border-l border-slate-700 pl-2">
                    {currentScene.questObjective}
                  </span>
                )}
              </div>

              {/* Scene Switcher buttons */}
              <div className="flex items-center gap-1.5 pointer-events-auto">
                {INITIAL_GAME_SCENES.map((scene, idx) => (
                  <button
                    key={scene.id}
                    onClick={() => {
                      setCurrentSceneIndex(idx);
                      setCurrentDialogueIndex(0);
                    }}
                    className={`px-2.5 py-1 rounded text-xs font-medium border backdrop-blur-md transition-colors cursor-pointer ${
                      currentSceneIndex === idx
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    Scene {idx + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* In-Game Dialogue Box in Sandbox */}
            <div className="absolute bottom-6 inset-x-8 z-10 pointer-events-auto">
              <div className="bg-slate-950/85 backdrop-blur-md border border-slate-700/60 rounded-xl p-4 shadow-2xl relative">
                {/* Speaker Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400 text-sm tracking-wide">
                      {currentDialogue.speaker}
                    </span>
                    <span className="text-xs text-slate-500 font-mono">[{currentDialogue.lang.toUpperCase()}]</span>
                  </div>

                  {/* Advance Dialogue / Switch line button */}
                  <button
                    onClick={handleNextDialogue}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer border border-slate-700 shadow-sm"
                  >
                    <span>Next Line</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Original Game Text Line */}
                <div className="text-slate-100 font-medium text-base tracking-wide leading-relaxed">
                  {currentDialogue.text}
                </div>

                {/* Subtitle Hint */}
                {currentDialogue.contextHint && (
                  <div className="mt-2 text-xs text-slate-400 font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span>Context: {currentDialogue.contextHint}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Render Live Screen Capture Video */}
        {sourceMode === 'screen' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-contain pointer-events-none"
            />
            {!isScreenCapturing && (
              <div className="text-center p-6 space-y-3 z-10">
                <Monitor className="w-12 h-12 text-slate-500 mx-auto" />
                <div className="text-slate-300 font-medium text-sm">No Active Game Screen Attached</div>
                <p className="text-slate-500 text-xs max-w-sm">
                  Click below to capture any running PC game window, emulator, or monitor.
                </p>
                <button
                  onClick={handleStartScreenCapture}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20 cursor-pointer"
                >
                  Select Game Window to Capture
                </button>
              </div>
            )}
          </div>
        )}

        {/* Render Uploaded / Pasted Screenshot */}
        {sourceMode === 'image' && (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            {uploadedImageUrl ? (
              <img
                ref={imageElementRef}
                src={uploadedImageUrl}
                alt="Game Screenshot"
                className="w-full h-full object-contain pointer-events-none"
              />
            ) : (
              <div className="text-center p-6 space-y-3">
                <Upload className="w-12 h-12 text-slate-500 mx-auto" />
                <div className="text-slate-300 font-medium text-sm">Upload Game Screenshot or Press Ctrl+V</div>
                <p className="text-slate-500 text-xs max-w-sm">
                  Take a screenshot from your game (PrintScreen or Win+Shift+S) and paste it directly anywhere here!
                </p>
              </div>
            )}
          </div>
        )}

        {/* Region of Interest (ROI) Visual Bounding Box - Fully Draggable and Resizable! */}
        <div
          className={`absolute border-2 border-dashed transition-[border-color,box-shadow] z-20 rounded ${
            activeHandle
              ? 'border-amber-400 bg-amber-400/10 shadow-lg shadow-amber-500/20'
              : 'border-cyan-400/90 bg-cyan-400/10 shadow-lg shadow-cyan-500/15'
          }`}
          style={{
            left: `${roi.x}%`,
            top: `${roi.y}%`,
            width: `${roi.width}%`,
            height: `${roi.height}%`,
            pointerEvents: isDrawingRoi ? 'none' : 'auto',
          }}
        >
          {/* Header Tag Bar with Move Drag Handle */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('move', e)}
            className="absolute top-1 left-1.5 bg-slate-950/95 text-cyan-300 text-[10px] font-mono px-2 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1.5 shadow-md cursor-move select-none"
          >
            <Move className="w-2.5 h-2.5 text-cyan-400" />
            <span>
              ROI: {Math.round(roi.width)}% × {Math.round(roi.height)}%
            </span>
          </div>

          {/* Quick Translate Button embedded on ROI tag */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              performTranslation();
            }}
            title="Scan this zone now"
            className="absolute top-1 right-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded shadow flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Scan className="w-2.5 h-2.5" />
            <span>Scan</span>
          </button>

          {/* 8 Resizing Handles (NW, NE, SW, SE, N, S, W, E) */}
          {/* Top-Left */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('nw', e)}
            className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-cyan-400 border border-slate-950 rounded-sm cursor-nwse-resize shadow z-30"
          />
          {/* Top-Right */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('ne', e)}
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 border border-slate-950 rounded-sm cursor-nesw-resize shadow z-30"
          />
          {/* Bottom-Left */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('sw', e)}
            className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-cyan-400 border border-slate-950 rounded-sm cursor-nesw-resize shadow z-30"
          />
          {/* Bottom-Right */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('se', e)}
            className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-cyan-400 border border-slate-950 rounded-sm cursor-nwse-resize shadow z-30"
          />
          {/* Edge Middle Top */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('n', e)}
            className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-cyan-400 border border-slate-950 rounded-sm cursor-ns-resize shadow z-30"
          />
          {/* Edge Middle Bottom */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('s', e)}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-2 bg-cyan-400 border border-slate-950 rounded-sm cursor-ns-resize shadow z-30"
          />
          {/* Edge Middle Left */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('w', e)}
            className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-cyan-400 border border-slate-950 rounded-sm cursor-ew-resize shadow z-30"
          />
          {/* Edge Middle Right */}
          <div
            onMouseDown={(e) => handleMouseDownOnHandle('e', e)}
            className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-cyan-400 border border-slate-950 rounded-sm cursor-ew-resize shadow z-30"
          />
        </div>

        {/* Floating In-Game Translated HUD Overlay */}
        <GameOverlay
          currentRecord={currentRecord}
          config={overlayConfig}
          targetLangObj={targetLangObj}
          onBookmark={(recId) => {
            if (currentRecord && currentRecord.id === recId) {
              setCurrentRecord({ ...currentRecord, bookmarked: !currentRecord.bookmarked });
            }
          }}
          onPopOutPiP={handleTogglePiP}
          isPiPActive={isPiPActive}
        />
      </div>

      {/* Custom Text / Direct Dialogue Tester Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowCustomBar(!showCustomBar)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Translate Custom Text / In-Game Line directly</span>
            {showCustomBar ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <span className="text-[11px] font-mono text-slate-500">
            Active Profile: <strong className="text-cyan-400">{selectedProfile.name}</strong> ({targetLangObj.name})
          </span>
        </div>

        {showCustomBar && (
          <form onSubmit={handleTranslateCustomText} className="mt-3 space-y-2">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Speaker (e.g. Melina, Viktor, Arwen)"
                value={customSpeaker}
                onChange={(e) => setCustomSpeaker(e.target.value)}
                className="w-full sm:w-44 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
              />
              <input
                type="text"
                placeholder="Type or paste in-game dialogue (Japanese, Russian, German, English...)"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
              />
              <button
                type="submit"
                disabled={isTranslating || !customText.trim()}
                className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>Translate</span>
              </button>
            </div>

            {/* Quick Phrase Samples for fast testing */}
            <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500">
              <span>Quick tests:</span>
              <button
                type="button"
                onClick={() => {
                  setCustomSpeaker('アルウェン');
                  setCustomText('日没前に古代の寺院を見つけてください。黄昏の光が消える前に急がねばなりません。');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                🇯🇵 Japanese Quest
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomSpeaker('Viktor');
                  setCustomText('The syndicate operative is waiting at the lower docks with your credits.');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                🇬🇧 Cyberpunk Fixer
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomSpeaker('Ранни');
                  setCustomText('Найдите древний храм до заката. Тьма поглотит тех, кто замедлит шаг.');
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-colors"
              >
                🇷🇺 Russian Warning
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Quick Helper Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-200">Interactive OCR:</strong> Drag the box or corners to adjust the capture
            zone over your game subtitles. Press <kbd className="bg-slate-800 text-slate-300 px-1 py-0.5 rounded border border-slate-700 font-mono">T</kbd> to translate!
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>Shortcuts:</span>
          <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">T</kbd> Translate
          <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">Ctrl+V</kbd> Paste image
        </div>
      </div>
    </div>
  );
};
