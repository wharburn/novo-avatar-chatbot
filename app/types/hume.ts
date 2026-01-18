export interface HumeEVIMessage {
  type: string;
  message?: {
    text: string;
    role: string;
  };
  text?: string;
  emotion?: {
    name: string;
    score: number;
  };
  models?: {
    prosody?: {
      scores: Record<string, number>;
    };
  };
}

export interface HumeConnectionConfig {
  configId: string;
  onMessage: (message: HumeEVIMessage) => void;
  onError: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

export interface HumeAudioConfig {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  sampleRate?: number;
}

export const DEFAULT_AUDIO_CONFIG: HumeAudioConfig = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  sampleRate: 16000
};
