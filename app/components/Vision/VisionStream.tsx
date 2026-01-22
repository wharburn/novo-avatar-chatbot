'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface EmotionResult {
  emotion: string;
  score: number;
}

interface VisionStreamProps {
  isActive: boolean;
  onFrame?: (imageData: string) => void;
  onFaceDetected?: (detected: boolean, faceSize: number) => void;
  onEmotionsDetected?: (emotions: EmotionResult[]) => void;
  analysisInterval?: number; // ms between analysis requests
}

// Simple face detection using canvas analysis
// Returns approximate face size as percentage of frame (0-1)
function detectFaceInFrame(canvas: HTMLCanvasElement): { detected: boolean; faceSize: number } {
  const ctx = canvas.getContext('2d');
  if (!ctx) return { detected: false, faceSize: 0 };

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Simple skin tone detection (not perfect, but works for basic detection)
  let skinPixels = 0;
  const totalPixels = canvas.width * canvas.height;

  // Sample every 4th pixel for performance
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Simple skin tone detection heuristic
    // Works for various skin tones
    if (
      r > 60 &&
      r < 255 &&
      g > 40 &&
      g < 230 &&
      b > 20 &&
      b < 200 &&
      r > g &&
      r > b &&
      Math.abs(r - g) > 15 &&
      r - b > 15
    ) {
      skinPixels++;
    }
  }

  // Calculate skin percentage (accounting for 4x sampling)
  const skinPercentage = (skinPixels * 4) / totalPixels;

  // If more than 15% is skin-colored, likely a face is filling the frame
  // Less than 5% means probably no face or very far away
  const detected = skinPercentage > 0.05;

  return {
    detected,
    faceSize: skinPercentage,
  };
}

export default function VisionStream({
  isActive,
  onFrame,
  onFaceDetected,
  onEmotionsDetected,
  analysisInterval = 3000,
}: VisionStreamProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start camera stream
  const startStream = useCallback(async () => {
    try {
      setError(null);

      // Request camera access with front-facing camera preference
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsStreaming(true);
        console.log('Vision stream started');
      }
    } catch (err) {
      console.error('Failed to start vision stream:', err);
      setError('Camera access denied. Please enable camera permissions.');
      setIsStreaming(false);
    }
  }, []);

  // Stop camera stream
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsStreaming(false);
    console.log('Vision stream stopped');
  }, []);

  // Capture current frame as base64 image
  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas || !isStreaming) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Check for face in frame
    const faceResult = detectFaceInFrame(canvas);
    onFaceDetected?.(faceResult.detected, faceResult.faceSize);

    // Convert to base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.8);
  }, [isStreaming, onFaceDetected]);

  // Handle stream lifecycle
  useEffect(() => {
    if (isActive) {
      startStream();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isActive, startStream, stopStream]);

  // Periodic frame capture for analysis
  useEffect(() => {
    if (!isActive || !isStreaming || !onFrame) return;

    const intervalId = setInterval(() => {
      const frame = captureFrame();
      if (frame) {
        onFrame(frame);
      }
    }, analysisInterval);

    return () => clearInterval(intervalId);
  }, [isActive, isStreaming, onFrame, captureFrame, analysisInterval]);

  // Periodic emotion analysis
  useEffect(() => {
    if (!isActive || !isStreaming || !onEmotionsDetected) return;

    const analyzeEmotions = async () => {
      const frame = captureFrame();
      if (!frame) return;

      try {
        const response = await fetch('/api/vision/emotions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: frame }),
        });

        const result = await response.json();

        if (result.success && result.emotions) {
          onEmotionsDetected(result.emotions);
        }
      } catch (error) {
        console.error('Emotion analysis error:', error);
      }
    };

    // Initial analysis
    const initialTimeout = setTimeout(analyzeEmotions, 1000);

    // Periodic analysis
    const intervalId = setInterval(analyzeEmotions, analysisInterval);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(intervalId);
    };
  }, [isActive, isStreaming, onEmotionsDetected, captureFrame, analysisInterval]);

  // Expose capture function for on-demand analysis
  useEffect(() => {
    // Store capture function on window for external access
    if (isActive && isStreaming) {
      (window as any).__visionCaptureFrame = captureFrame;
    } else {
      delete (window as any).__visionCaptureFrame;
    }

    return () => {
      delete (window as any).__visionCaptureFrame;
    };
  }, [isActive, isStreaming, captureFrame]);

  if (!isActive) return null;

  return (
    <div className="fixed top-20 left-4 z-[100]">
      {/* Small preview window */}
      <div className="relative w-40 h-30 rounded-lg overflow-hidden shadow-xl border-2 border-purple-500 bg-black">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
          style={{ minHeight: '100%', minWidth: '100%' }}
        />

        {/* Status indicator */}
        <div className="absolute top-1 right-1">
          <div
            className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
          />
        </div>

        {/* Vision ON label */}
        <div className="absolute bottom-1 left-1 bg-purple-500/80 text-white text-[8px] px-1 py-0.5 rounded">
          VISION ON
        </div>

        {error && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center p-2">
            <span className="text-red-400 text-[10px] text-center">{error}</span>
          </div>
        )}
      </div>

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Export utility function for on-demand capture
export function captureVisionFrame(): string | null {
  const captureFunc = (window as any).__visionCaptureFrame;
  if (typeof captureFunc === 'function') {
    return captureFunc();
  }
  return null;
}
