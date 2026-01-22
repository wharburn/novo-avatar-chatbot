'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { EmotionScore } from '../components/Vision/EmotionDisplay';

interface VisionAnalysisResult {
  type: 'emotion' | 'fashion' | 'describe';
  analysis?: string;
  emotions?: EmotionScore[];
  observation?: string;
}

interface UseVisionOptions {
  onAnalysisComplete?: (result: VisionAnalysisResult) => void;
  faceSizeThreshold?: number; // Percentage threshold for face detection (0-1)
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function useVision(options: UseVisionOptions = {}) {
  const { onAnalysisComplete, faceSizeThreshold = 0.15 } = options;
  
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [videoEmotions, setVideoEmotions] = useState<EmotionScore[]>([]);
  const [lastAnalysis, setLastAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [faceSize, setFaceSize] = useState(0);
  
  // Track last analysis time to prevent too frequent calls
  const lastAnalysisTimeRef = useRef<number>(0);
  const pendingAnalysisRef = useRef<boolean>(false);
  
  // User location for weather-based recommendations
  const userLocationRef = useRef<UserLocation | null>(null);
  
  // Get user location on mount (cached for the session)
  useEffect(() => {
    if (userLocationRef.current) return; // Already have location
    
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocationRef.current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('User location cached for weather context');
        },
        (error) => {
          console.log('Geolocation not available:', error.message);
          // Will use default location in API
        },
        { timeout: 5000, maximumAge: 3600000 } // Cache for 1 hour
      );
    }
  }, []);
  
  // Toggle vision on/off
  const toggleVision = useCallback(() => {
    setIsVisionActive(prev => {
      if (prev) {
        // Turning off - clear state
        setVideoEmotions([]);
        setLastAnalysis(null);
        setFaceDetected(false);
        setFaceSize(0);
      }
      return !prev;
    });
  }, []);
  
  // Handle face detection updates from VisionStream
  const handleFaceDetected = useCallback((detected: boolean, size: number) => {
    setFaceDetected(detected);
    setFaceSize(size);
  }, []);
  
  // Analyze image for emotions (when face is prominent)
  const analyzeEmotions = useCallback(async (imageData: string): Promise<EmotionScore[]> => {
    try {
      const response = await fetch('/api/vision/emotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData }),
      });
      
      const result = await response.json();
      
      if (result.success && result.emotions) {
        return result.emotions;
      }
      
      return [];
    } catch (error) {
      console.error('Emotion analysis error:', error);
      return [];
    }
  }, []);
  
  // Analyze image for fashion/objects (when body is more visible)
  const analyzeFashion = useCallback(async (
    imageData: string, 
    question?: string
  ): Promise<string> => {
    try {
      const location = userLocationRef.current;
      
      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData, 
          analysisType: 'fashion',
          question,
          // Include location for weather-based recommendations
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        return result.analysis || '';
      }
      
      return '';
    } catch (error) {
      console.error('Fashion analysis error:', error);
      return '';
    }
  }, []);
  
  // Main analysis function - decides between emotion and fashion analysis
  const analyzeFrame = useCallback(async (imageData: string, forceType?: 'emotion' | 'fashion') => {
    // Prevent concurrent analysis
    if (isAnalyzing || pendingAnalysisRef.current) return;
    
    // Throttle analysis to max once per 2 seconds
    const now = Date.now();
    if (now - lastAnalysisTimeRef.current < 2000) return;
    
    pendingAnalysisRef.current = true;
    setIsAnalyzing(true);
    lastAnalysisTimeRef.current = now;
    
    try {
      // Decide analysis type based on face size
      const analysisType = forceType || (faceSize > faceSizeThreshold ? 'emotion' : 'fashion');
      
      console.log(`Vision analysis: ${analysisType} (face size: ${(faceSize * 100).toFixed(1)}%)`);
      
      if (analysisType === 'emotion') {
        // Use Hume for emotion analysis
        const emotions = await analyzeEmotions(imageData);
        setVideoEmotions(emotions);
        
        onAnalysisComplete?.({
          type: 'emotion',
          emotions,
        });
      } else {
        // Use GPT-4 Vision for fashion analysis
        const analysis = await analyzeFashion(imageData);
        setLastAnalysis(analysis);
        
        onAnalysisComplete?.({
          type: 'fashion',
          analysis,
        });
      }
    } finally {
      setIsAnalyzing(false);
      pendingAnalysisRef.current = false;
    }
  }, [isAnalyzing, faceSize, faceSizeThreshold, analyzeEmotions, analyzeFashion, onAnalysisComplete]);
  
  // On-demand analysis with specific question
  const analyzeWithQuestion = useCallback(async (question: string): Promise<string> => {
    // Get current frame from vision stream
    const captureFunc = (window as any).__visionCaptureFrame;
    if (typeof captureFunc !== 'function') {
      return 'Vision is not active. Please tap the eye button to enable vision first.';
    }
    
    const imageData = captureFunc();
    if (!imageData) {
      return 'Unable to capture image. Please ensure the camera is working.';
    }
    
    setIsAnalyzing(true);
    
    try {
      const location = userLocationRef.current;
      
      const response = await fetch('/api/vision/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageData, 
          analysisType: 'fashion',
          question,
          // Include location for weather-based recommendations
          latitude: location?.latitude,
          longitude: location?.longitude,
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setLastAnalysis(result.analysis);
        return result.analysis || 'I couldn\'t analyze the image properly.';
      }
      
      return 'Sorry, I had trouble analyzing the image.';
    } catch (error) {
      console.error('Vision question analysis error:', error);
      return 'Sorry, there was an error analyzing the image.';
    } finally {
      setIsAnalyzing(false);
    }
  }, []);
  
  return {
    // State
    isVisionActive,
    videoEmotions,
    lastAnalysis,
    isAnalyzing,
    faceDetected,
    faceSize,
    
    // Actions
    toggleVision,
    handleFaceDetected,
    analyzeFrame,
    analyzeWithQuestion,
    setVideoEmotions,
  };
}
