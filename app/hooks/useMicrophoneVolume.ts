'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Hook to get real-time microphone volume level
 * Uses Web Audio API to analyze microphone input
 */
export function useMicrophoneVolume(isActive: boolean = true) {
  const [volume, setVolume] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  useEffect(() => {
    if (!isActive) {
      // Clean up when not active
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setVolume(0);
      return;
    }

    let mounted = true;

    const initMicrophone = async () => {
      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          } 
        });
        
        if (!mounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;

        // Create audio context and analyser
        const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
        audioContextRef.current = audioContext;

        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        analyserRef.current = analyser;

        // Connect microphone to analyser
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        // Create data array for frequency data
        const bufferLength = analyser.frequencyBinCount;
        dataArrayRef.current = new Uint8Array(bufferLength);

        setIsInitialized(true);
        console.log('🎤 Microphone volume analyzer initialized');

        // Start analyzing
        const analyze = () => {
          if (!mounted || !analyserRef.current || !dataArrayRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          // Calculate volume from frequency data
          // Focus on speech frequencies (lower bins)
          const speechBins = Array.from(dataArrayRef.current.slice(0, 32));
          const sum = speechBins.reduce((a, b) => a + b, 0);
          const avg = sum / speechBins.length;
          
          // Normalize to 0-1 range (values are 0-255)
          const normalizedVolume = Math.min(1, avg / 128);
          
          setVolume(normalizedVolume);

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (error) {
        console.error('🎤 Failed to initialize microphone:', error);
      }
    };

    initMicrophone();

    return () => {
      mounted = false;
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, [isActive]);

  return { volume, isInitialized };
}
