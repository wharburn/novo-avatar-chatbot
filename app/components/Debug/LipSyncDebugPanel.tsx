'use client';

import { useState } from 'react';
import { Settings, X, RotateCcw } from 'lucide-react';

export interface LipSyncConfig {
  updateInterval: number;      // ms between updates
  smoothingFactor: number;     // 0-1, higher = smoother
  silenceThreshold: number;    // Below this = silent
  useAutoCalibration: boolean;
  calibrationWindowSize: number;
}

export const DEFAULT_CONFIG: LipSyncConfig = {
  updateInterval: 50,
  smoothingFactor: 0.4,
  silenceThreshold: 0.05,
  useAutoCalibration: true,
  calibrationWindowSize: 30,
};

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

function Slider({ label, value, min, max, step, unit = '', onChange }: SliderProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-800 font-mono">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
      />
    </div>
  );
}

interface LipSyncDebugPanelProps {
  config: LipSyncConfig;
  onConfigChange: (config: LipSyncConfig) => void;
  currentEnergy?: number;
  currentViseme?: string;
  mouthIndex?: number;
  isVisible?: boolean;
}

export default function LipSyncDebugPanel({
  config,
  onConfigChange,
  currentEnergy = 0,
  currentViseme = 'closed',
  mouthIndex = 0,
  isVisible: initialVisible = false,
}: LipSyncDebugPanelProps) {
  const [isOpen, setIsOpen] = useState(initialVisible);

  const updateConfig = (key: keyof LipSyncConfig, value: number | boolean) => {
    onConfigChange({ ...config, [key]: value });
  };

  const resetToDefaults = () => {
    onConfigChange(DEFAULT_CONFIG);
  };

  // Energy bar visualization (0-1 range)
  const energyPercent = Math.min(100, currentEnergy * 100);
  
  // Mouth position labels
  const mouthLabels = ['Closed', 'Slight', 'Smile', 'Open'];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 left-4 z-50 bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
        title="Open Lip-Sync Debug Panel"
      >
        <Settings className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 left-4 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 w-72 max-h-[60vh] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg sticky top-0">
        <h3 className="font-semibold text-gray-800 text-sm">Lip-Sync Debug</h3>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Live Stats */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-xs text-gray-500 mb-2">Live Stats</div>
          
          {/* Mouth position indicator */}
          <div className="flex justify-between text-sm mb-2">
            <span>Mouth:</span>
            <span className="font-mono font-semibold text-blue-600">
              {mouthLabels[mouthIndex]} ({currentViseme})
            </span>
          </div>
          
          {/* Visual mouth position */}
          <div className="flex gap-1 mb-3">
            {mouthLabels.map((label, i) => (
              <div
                key={label}
                className={`flex-1 h-6 rounded text-xs flex items-center justify-center font-medium transition-colors ${
                  i === mouthIndex
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i}
              </div>
            ))}
          </div>
          
          {/* Energy level */}
          <div className="flex justify-between text-sm mb-1">
            <span>Energy:</span>
            <span className="font-mono">{(currentEnergy * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-400 via-yellow-400 to-red-400 transition-all duration-75"
              style={{ width: `${energyPercent}%` }}
            />
          </div>
          
          {/* Threshold markers */}
          <div className="relative h-2 mt-1">
            <div className="absolute text-[8px] text-gray-400" style={{ left: '5%' }}>|</div>
            <div className="absolute text-[8px] text-gray-400" style={{ left: '35%' }}>|</div>
            <div className="absolute text-[8px] text-gray-400" style={{ left: '65%' }}>|</div>
          </div>
        </div>

        {/* Settings */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Timing
          </div>
          <Slider
            label="Update Interval"
            value={config.updateInterval}
            min={20}
            max={150}
            step={10}
            unit="ms"
            onChange={(v) => updateConfig('updateInterval', v)}
          />
          <Slider
            label="Smoothing"
            value={config.smoothingFactor}
            min={0}
            max={0.9}
            step={0.1}
            onChange={(v) => updateConfig('smoothingFactor', v)}
          />
        </div>

        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Threshold
          </div>
          <Slider
            label="Silence Threshold"
            value={config.silenceThreshold}
            min={0.01}
            max={0.2}
            step={0.01}
            onChange={(v) => updateConfig('silenceThreshold', v)}
          />
        </div>

        {/* Toggles */}
        <div className="mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.useAutoCalibration}
              onChange={(e) => updateConfig('useAutoCalibration', e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-calibrate</span>
          </label>
        </div>

        {/* Export Config */}
        <div className="pt-3 border-t">
          <button
            onClick={() => {
              console.log('Lip-Sync Config:', JSON.stringify(config, null, 2));
              navigator.clipboard?.writeText(JSON.stringify(config, null, 2));
            }}
            className="w-full text-xs text-gray-500 hover:text-gray-700 py-2 hover:bg-gray-50 rounded transition-colors"
          >
            Copy Config to Clipboard
          </button>
        </div>
      </div>
    </div>
  );
}
