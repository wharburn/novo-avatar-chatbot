'use client';

import { useEffect, useRef } from 'react';

export interface YOLODetection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

interface BoundingBoxOverlayProps {
  detections: YOLODetection[];
  isVisible: boolean;
  videoWidth?: number;
  videoHeight?: number;
}

export default function BoundingBoxOverlay({
  detections,
  isVisible,
  videoWidth = 640,
  videoHeight = 480,
}: BoundingBoxOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !isVisible || detections.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match video
    canvas.width = videoWidth;
    canvas.height = videoHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw each bounding box
    detections.forEach((detection, index) => {
      const [x, y, width, height] = detection.bbox;

      // Alternate colors for different objects
      const colors = ['#00ff00', '#ff00ff', '#00ffff', '#ffff00', '#ff6600', '#00ff99'];
      const color = colors[index % colors.length];

      // Draw box
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw label background
      const label = `${detection.class} ${(detection.score * 100).toFixed(0)}%`;
      ctx.font = 'bold 14px Arial';
      ctx.fillStyle = color;
      const textMetrics = ctx.measureText(label);
      const textHeight = 18;

      ctx.fillRect(x, y - textHeight, textMetrics.width + 8, textHeight);

      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.fillText(label, x + 4, y - 4);
    });
  }, [detections, isVisible, videoWidth, videoHeight]);

  if (!isVisible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-50 pointer-events-none"
      style={{
        width: '100%',
        height: '100%',
        transform: 'scaleX(-1)',
        transformOrigin: 'center',
      }}
    />
  );
}
