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
  HelpCircle,
  Swords,
  Zap,
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
  // Capture source mode
  const [sourceMode, setSourceMode] = useState<'sandbox' | 'screen' | 'image'>('sandbox');
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [currentDialogueIndex, setCurrentDialogueIndex] = useState(0);

  // Region of Interest (ROI) Box percentages (0-100)
  const [roiPreset, setRoiPreset] = useState<ROIPreset>('dialogue_bottom');
  const [roi, setRoi] = useState<ROIBox>({
    x: 10,
    y: 68,
    width: 80,
    height: 26,
  });

  // State
  const [currentRecord, setCurrentRecord] = useState<TranslationRecord | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPiPActive, setIsPiPActive] = useState(false);

  // Live Screen Capture Video ref
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const [isScreenCapturing, setIsScreenCapturing] = useState(false);

  // Uploaded Image
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Interactive sandbox container ref
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const currentScene = INITIAL_GAME_SCENES[currentSceneIndex] || INITIAL_GAME_SCENES[0];
  const currentDialogue = currentScene.dialogues[currentDialogueIndex] || currentScene.dialogues[0];

  // Preset ROI bounding boxes
  const applyRoiPreset = (preset: ROIPreset) => {
    setRoiPreset(preset);
    switch (preset) {
      case 'dialogue_bottom':
        setRoi({ x: 10, y: 68, width: 80, height: 26 });
        break;
      case 'dialogue_center':
        setRoi({ x: 15, y: 35, width: 70, height: 35 });
        break;
      case 'top_tracker':
        setRoi({ x: 5, y: 5, width: 50, height: 20 });
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
        // Translate the current active sandbox dialogue line with context
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

        // Set speaker from dialogue if not parsed
        if (!result.speaker && currentDialogue.speaker) {
          result.speaker = currentDialogue.speaker;
        }

        setCurrentRecord(result);
        onNewTranslationRecord(result);
        pipHelper.update(result, overlayConfig, targetLangObj);

        // Auto speak if enabled
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
        // Crop frame from live video
        const crop = cropVideoFrameToROI(videoRef.current, roi, true);
        if (!crop) {
          throw new Error('Unable to extract frame from video stream. Ensure game window is visible.');
        }

        // Send cropped image to Multimodal Vision OCR
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
        // Crop uploaded image
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

      // Listen for stream ended (user clicked Stop Sharing in browser)
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

  // Keyboard shortcut: Press 'T' or Space to translate
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
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
    // If auto scan is active or instant, trigger translation
    setTimeout(() => {
      performTranslation();
    }, 100);
  };

  return (
    <div className="space-y-4">
      {/* Control Bar: Source Mode Selectors, ROI Preset, Trigger Actions */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3">
        {/* Source Mode Tabs */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setSourceMode('sandbox')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors ${
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

        {/* ROI Target Area Preset Controls */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden sm:inline">Capture Zone:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => applyRoiPreset('dialogue_bottom')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                roiPreset === 'dialogue_bottom'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Bottom Subtitles
            </button>
            <button
              onClick={() => applyRoiPreset('dialogue_center')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                roiPreset === 'dialogue_center'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Center Cutscene
            </button>
            <button
              onClick={() => applyRoiPreset('top_tracker')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                roiPreset === 'top_tracker'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Quest Tracker
            </button>
            <button
              onClick={() => applyRoiPreset('full')}
              className={`px-2.5 py-1 rounded text-xs transition-colors ${
                roiPreset === 'full'
                  ? 'bg-slate-800 text-cyan-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Full Screen
            </button>
          </div>
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
            <span>{isTranslating ? 'Reading Text...' : 'Translate ROI (T)'}</span>
          </button>

          {/* Continuous Scan Toggle */}
          <button
            onClick={() => setIsAutoScanning(!isAutoScanning)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
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
            className={`p-2 rounded-lg border text-xs font-medium transition-colors ${
              isPiPActive
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMsg && (
        <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs px-4 py-2.5 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Game Screen Viewport Area */}
      <div
        ref={viewportRef}
        className="relative w-full aspect-video max-h-[640px] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center select-none"
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
              <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-slate-200">
                <span className="font-semibold text-cyan-400">{currentScene.title}</span>
                <span>·</span>
                <span className="text-slate-400">{currentScene.genre.toUpperCase()}</span>
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
                    className={`px-2.5 py-1 rounded text-xs font-medium border backdrop-blur-md transition-colors ${
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

            {/* Realistic In-Game Dialogue Box in Sandbox */}
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
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer border border-slate-700"
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
                  <div className="mt-2 text-xs text-slate-400 font-mono">
                    Scene context: {currentDialogue.contextHint}
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
                  Click below to capture any running PC game window, emulator, or display monitor.
                </p>
                <button
                  onClick={handleStartScreenCapture}
                  className="px-4 py-2 rounded-lg bg-cyan-500 text-slate-950 font-semibold text-xs shadow-md shadow-cyan-500/20"
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

        {/* Region of Interest (ROI) Visual Bounding Box Indicator */}
        <div
          className="absolute border-2 border-dashed border-cyan-400/80 bg-cyan-400/10 pointer-events-none z-20 transition-all duration-150 rounded"
          style={{
            left: `${roi.x}%`,
            top: `${roi.y}%`,
            width: `${roi.width}%`,
            height: `${roi.height}%`,
          }}
        >
          {/* ROI Tag */}
          <div className="absolute top-1 left-1.5 bg-slate-950/90 text-cyan-300 text-[10px] font-mono px-1.5 py-0.5 rounded border border-cyan-500/40 flex items-center gap-1 shadow-sm">
            <Scan className="w-2.5 h-2.5" />
            <span>ROI Scanner Area</span>
          </div>
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

      {/* Quick Helper Banner */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            <strong className="text-slate-200">How it works:</strong> Game Screen → Screen Capture → OCR → Language
            Detection → Gemini Localization AI → Game HUD Overlay. No game file modifications required!
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span>Shortcuts:</span>
          <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">T</kbd> Translate
          <kbd className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">Ctrl+V</kbd> Paste
          image
        </div>
      </div>
    </div>
  );
};
