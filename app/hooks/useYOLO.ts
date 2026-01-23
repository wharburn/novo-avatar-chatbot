'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import * as tf from '@tensorflow/tfjs';

export interface YOLODetection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

interface UseYOLOOptions {
  onDetectionsUpdate?: (detections: YOLODetection[]) => void;
  detectionInterval?: number; // ms between detections
  confidenceThreshold?: number; // 0-1, filter low confidence detections
}

export function useYOLO(options: UseYOLOOptions = {}) {
  const {
    onDetectionsUpdate,
    detectionInterval = 200, // 5 FPS by default
    confidenceThreshold = 0.5,
  } = options;

  const [detections, setDetections] = useState<YOLODetection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const lastDetectionTimeRef = useRef<number>(0);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load YOLO model once on mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        console.log('🤖 Loading YOLO model...');
        // Use TensorFlow backend with GPU acceleration if available
        await tf.ready();
        const model = await cocoSsd.load();
        modelRef.current = model;
        setIsLoading(false);
        console.log('✅ YOLO model loaded successfully');
      } catch (err) {
        console.error('Failed to load YOLO model:', err);
        setError('Failed to load object detection model');
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      // Cleanup
      if (modelRef.current) {
        modelRef.current.dispose();
      }
    };
  }, []);

  // Run object detection on a frame
  const detectObjects = useCallback(
    async (imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement) => {
      if (!modelRef.current || isLoading) return [];

      const now = Date.now();
      // Throttle detections
      if (now - lastDetectionTimeRef.current < detectionInterval) {
        return detections;
      }

      try {
        setIsDetecting(true);
        const predictions = await modelRef.current.detect(imageElement);

        // Filter by confidence threshold and format
        const formatted: YOLODetection[] = predictions
          .filter((pred) => pred.score >= confidenceThreshold)
          .map((pred) => ({
            class: pred.class,
            score: pred.score,
            bbox: pred.bbox as [number, number, number, number],
          }));

        setDetections(formatted);
        lastDetectionTimeRef.current = now;
        onDetectionsUpdate?.(formatted);

        return formatted;
      } catch (err) {
        console.error('Object detection error:', err);
        return [];
      } finally {
        setIsDetecting(false);
      }
    },
    [detections, detectionInterval, confidenceThreshold, isLoading, onDetectionsUpdate]
  );

  // Get human-readable summary of detections
  const getDetectionSummary = useCallback((): string => {
    if (detections.length === 0) return 'No objects detected';

    const grouped = detections.reduce(
      (acc, det) => {
        if (!acc[det.class]) acc[det.class] = [];
        acc[det.class].push(det.score);
        return acc;
      },
      {} as Record<string, number[]>
    );

    return Object.entries(grouped)
      .map(([className, scores]) => {
        const count = scores.length;
        const avgConfidence = (scores.reduce((a, b) => a + b, 0) / scores.length * 100).toFixed(0);
        return `${count}x ${className} (${avgConfidence}% confidence)`;
      })
      .join(', ');
  }, [detections]);

  return {
    // State
    detections,
    isLoading,
    error,
    isDetecting,

    // Methods
    detectObjects,
    getDetectionSummary,
  };
}

