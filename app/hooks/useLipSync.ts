'use client';

import { useEffect, useState, useRef } from 'react';
import { Viseme } from '@/app/types/avatar';

/**
 * Simplified lip-sync configuration
 */
export interface LipSyncConfig {
  // Timing - how fast to update mouth position
  updateInterval: number;  // ms between updates (lower = more responsive)
  
  // Smoothing
  smoothingFactor: number; // 0-1, higher = smoother but laggier
  
  // Thresholds (0-1 normalized)
  silenceThreshold: number;
  
  // Auto-calibration
  useAutoCalibration: boolean;
  calibrationWindowSize: number;
}

export const DEFAULT_LIP_SYNC_CONFIG: LipSyncConfig = {
  updateInterval: 50,      // 20fps - fast enough to catch syllables
  smoothingFactor: 0.4,    // Moderate smoothing
  silenceThreshold: 0.05,  // Below 5% = silent
  useAutoCalibration: true,
  calibrationWindowSize: 30,
};

/**
 * Simple 4-position mouth mapping based on energy intensity:
 * 
 * Energy 0.00 - 0.05: closed (silence)
 * Energy 0.05 - 0.35: open_slight (quiet speech)  
 * Energy 0.35 - 0.65: smile (normal speech)
 * Energy 0.65 - 1.00: open_mid (loud/emphasized)
 */
const MOUTH_POSITIONS: Viseme[] = ['closed', 'open_slight', 'smile', 'open_mid'];

function energyToMouthIndex(energy: number, silenceThreshold: number): number {
  if (energy < silenceThreshold) return 0;  // closed
  if (energy < 0.35) return 1;  // open_slight
  if (energy < 0.65) return 2;  // smile
  return 3;  // open_mid
}

/**
 * Calculate energy from FFT data - focus on voice frequencies
 */
function calculateEnergy(fft: number[]): number {
  if (!fft || fft.length === 0) return 0;
  
  // Focus on speech frequencies (roughly 100-3000Hz, lower FFT bins)
  const speechBins = fft.slice(0, Math.min(24, fft.length));
  
  // RMS energy calculation for better dynamics
  const sumSquares = speechBins.reduce((sum, val) => sum + val * val, 0);
  const rms = Math.sqrt(sumSquares / speechBins.length);
  
  return rms;
}

/**
 * Auto-calibration to adapt to Hume's FFT range
 */
interface CalibrationState {
  min: number;
  max: number;
  samples: number[];
}

function updateCalibration(
  state: CalibrationState,
  energy: number,
  windowSize: number
): CalibrationState {
  const samples = [...state.samples, energy].slice(-windowSize);
  
  const nonZero = samples.filter(s => s > 0.001);
  const min = nonZero.length > 0 ? Math.min(...nonZero) : state.min;
  const max = samples.length > 0 ? Math.max(...samples) : state.max;
  
  return { min, max, samples };
}

function normalizeEnergy(energy: number, cal: CalibrationState): number {
  const range = cal.max - cal.min;
  if (range <= 0) return 0;
  return Math.max(0, Math.min(1, (energy - cal.min) / range));
}

export interface LipSyncResult {
  currentViseme: Viseme;
  currentEnergy: number;
  mouthIndex: number;  // 0-3 for debugging
}

export function useLipSync(
  fft: number[],
  isSpeaking: boolean,
  config: LipSyncConfig = DEFAULT_LIP_SYNC_CONFIG
): LipSyncResult {
  const [currentViseme, setCurrentViseme] = useState<Viseme>('closed');
  const [currentEnergy, setCurrentEnergy] = useState(0);
  const [mouthIndex, setMouthIndex] = useState(0);
  
  const smoothedEnergyRef = useRef(0);
  const calibrationRef = useRef<CalibrationState>({
    min: Infinity,
    max: 0,
    samples: [],
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fftRef = useRef<number[]>([]);
  
  // Keep FFT data in ref for interval access
  useEffect(() => {
    fftRef.current = fft;
  }, [fft]);

  useEffect(() => {
    if (!isSpeaking) {
      // Close mouth when not speaking
      setCurrentViseme('closed');
      setCurrentEnergy(0);
      setMouthIndex(0);
      smoothedEnergyRef.current = 0;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Use interval for consistent timing (more reliable than requestAnimationFrame for this)
    intervalRef.current = setInterval(() => {
      const rawEnergy = calculateEnergy(fftRef.current);
      
      // Auto-calibration
      if (config.useAutoCalibration) {
        calibrationRef.current = updateCalibration(
          calibrationRef.current,
          rawEnergy,
          config.calibrationWindowSize
        );
      }
      
      // Normalize to 0-1
      const normalized = config.useAutoCalibration
        ? normalizeEnergy(rawEnergy, calibrationRef.current)
        : rawEnergy;
      
      // Apply smoothing (exponential moving average)
      const smoothed = smoothedEnergyRef.current + 
        (normalized - smoothedEnergyRef.current) * (1 - config.smoothingFactor);
      smoothedEnergyRef.current = smoothed;
      
      // Map to mouth position (0-3)
      const idx = energyToMouthIndex(smoothed, config.silenceThreshold);
      const viseme = MOUTH_POSITIONS[idx];
      
      setCurrentEnergy(smoothed);
      setMouthIndex(idx);
      setCurrentViseme(viseme);
      
    }, config.updateInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isSpeaking, config]);

  return { currentViseme, currentEnergy, mouthIndex };
}
