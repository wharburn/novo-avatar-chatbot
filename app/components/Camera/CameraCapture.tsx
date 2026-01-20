'use client';

import { Camera, X, RotateCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CameraCaptureProps {
  onCapture: (imageDataUrl: string) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    try {
      setError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Camera error:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError('Failed to access camera: ' + err.message);
        }
      }
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);

    // Stop camera
    stopCamera();

    // Call onCapture with the image
    onCapture(imageDataUrl);

    setIsCapturing(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Take a Picture
        </h3>
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/20 transition-colors text-white"
          aria-label="Close camera"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative flex items-center justify-center">
        {error ? (
          <div className="text-center p-8">
            <Camera className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p className="text-white font-medium mb-2">Camera Error</p>
            <p className="text-gray-300 text-sm">{error}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-white text-black rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-w-full max-h-full object-contain"
            />
            <canvas ref={canvasRef} className="hidden" />
          </>
        )}
      </div>

      {/* Controls */}
      {!error && (
        <div className="p-6 bg-black/50 backdrop-blur-sm flex items-center justify-center gap-4">
          {/* Switch Camera (only on mobile) */}
          <button
            onClick={switchCamera}
            className="p-3 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white md:hidden"
            aria-label="Switch camera"
          >
            <RotateCw className="w-6 h-6" />
          </button>

          {/* Capture Button */}
          <button
            onClick={capturePhoto}
            disabled={isCapturing}
            className="w-16 h-16 rounded-full bg-white border-4 border-gray-300 hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center"
            aria-label="Take picture"
          >
            <div className="w-14 h-14 rounded-full bg-white border-2 border-gray-400"></div>
          </button>

          {/* Spacer for symmetry */}
          <div className="w-12 md:hidden"></div>
        </div>
      )}
    </div>
  );
}

