'use client';

import { HumeClient } from 'hume';
import { useCallback, useEffect, useRef, useState } from 'react';

interface HumeMessage {
  type: string;
  message?: {
    text?: string;
    role?: string;
    content?: string;
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
  tool_call?: {
    name: string;
    parameters: string;
    tool_call_id: string;
    response_required: boolean;
  };
}

interface UseHumeEVIProps {
  configId: string;
  onMessage: (message: HumeMessage) => void;
  onError: (error: Error) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

// Define the ChatSocket interface based on the Hume SDK
interface HumeChatSocket {
  on: <T extends 'open' | 'message' | 'close' | 'error'>(
    event: T,
    callback: T extends 'message'
      ? (message: HumeMessage) => void
      : T extends 'error'
        ? (error: Error) => void
        : T extends 'close'
          ? (event: { code: number; reason: string }) => void
          : () => void
  ) => void;
  sendAudioInput: (message: { data: string }) => void;
  sendUserInput: (text: string) => void;
  sendToolResponse: (response: {
    tool_call_id: string;
    content: string;
    type: 'tool_response' | 'tool_error';
  }) => void;
  connect: () => HumeChatSocket;
  close: () => void;
  waitForOpen: () => Promise<unknown>;
  readyState: number;
}

export function useHumeEVI({ configId, onMessage, onError, onOpen, onClose }: UseHumeEVIProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const clientRef = useRef<HumeClient | null>(null);
  const socketRef = useRef<HumeChatSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isConnectingRef = useRef(false);

  // Handle tool calls from Hume AI
  const handleToolCall = useCallback(
    async (toolCall: {
      name: string;
      parameters: string;
      tool_call_id: string;
      response_required: boolean;
    }) => {
      console.log('[Hume EVI] Tool call received:', toolCall.name);

      try {
        // Parse parameters
        const params = JSON.parse(toolCall.parameters);

        // Execute the tool via API
        const response = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            toolName: toolCall.name,
            parameters: params,
          }),
        });

        const result = await response.json();

        // Handle browser opening on client side
        if (result.success && result.data?.action === 'open_browser') {
          window.open(result.data.url, '_blank');
        }

        // Send tool response back to Hume
        if (toolCall.response_required && socketRef.current) {
          const toolResponse = {
            tool_call_id: toolCall.tool_call_id,
            content: result.success ? JSON.stringify(result.data) : `Error: ${result.error}`,
            type: result.success ? ('tool_response' as const) : ('tool_error' as const),
          };

          socketRef.current.sendToolResponse(toolResponse);
          console.log('[Hume EVI] Tool response sent:', toolResponse);
        }
      } catch (error) {
        console.error('[Hume EVI] Tool execution error:', error);

        // Send error response back to Hume
        if (toolCall.response_required && socketRef.current) {
          socketRef.current.sendToolResponse({
            tool_call_id: toolCall.tool_call_id,
            content: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
            type: 'tool_error',
          });
        }
      }
    },
    []
  );

  const handleMessage = useCallback(
    (message: HumeMessage) => {
      console.log('Hume message:', message.type, message);
      onMessage(message);

      switch (message.type) {
        case 'user_message':
          setIsListening(false);
          break;

        case 'assistant_message':
          setIsSpeaking(true);
          break;

        case 'assistant_end':
          setIsSpeaking(false);
          break;

        case 'user_interruption':
          setIsSpeaking(false);
          setIsListening(true);
          break;

        case 'audio_output':
          setIsSpeaking(true);
          break;

        case 'tool_call':
          // Handle tool calls
          if (message.tool_call) {
            handleToolCall(message.tool_call);
          }
          break;
      }
    },
    [onMessage, handleToolCall]
  );

  // Convert audio blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
        const base64Data = base64.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const startAudioCapture = useCallback(
    (stream: MediaStream, socket: HumeChatSocket) => {
      // Check for supported MIME types
      const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ];

      let selectedMimeType = '';
      for (const mimeType of mimeTypes) {
        if (MediaRecorder.isTypeSupported(mimeType)) {
          selectedMimeType = mimeType;
          break;
        }
      }

      console.log('Using audio MIME type:', selectedMimeType || 'default');

      const options: MediaRecorderOptions = selectedMimeType ? { mimeType: selectedMimeType } : {};

      try {
        const mediaRecorder = new MediaRecorder(stream, options);

        mediaRecorder.ondataavailable = async (event) => {
          if (event.data.size > 0 && socket && socket.readyState === 1) {
            try {
              const base64Data = await blobToBase64(event.data);
              socket.sendAudioInput({ data: base64Data });
            } catch (err) {
              console.error('Error sending audio:', err);
            }
          }
        };

        mediaRecorder.onerror = (event) => {
          console.error('MediaRecorder error:', event);
        };

        mediaRecorder.start(100); // Send chunks every 100ms
        mediaRecorderRef.current = mediaRecorder;
        setIsListening(true);
        console.log('Audio capture started');
      } catch (error) {
        console.error('Failed to start MediaRecorder:', error);
        onError(error instanceof Error ? error : new Error('Failed to start audio capture'));
      }
    },
    [onError]
  );

  const connect = useCallback(async () => {
    if (isConnectingRef.current || isConnected) {
      console.log('Already connecting or connected');
      return;
    }

    isConnectingRef.current = true;
    setConnectionError(null);

    try {
      const apiKey = process.env.NEXT_PUBLIC_HUME_API_KEY;

      if (!apiKey) {
        throw new Error(
          'Hume API key not configured. Please set NEXT_PUBLIC_HUME_API_KEY in your environment variables.'
        );
      }

      if (!configId) {
        throw new Error(
          'Hume Config ID not configured. Please set NEXT_PUBLIC_HUME_CONFIG_ID in your environment variables.'
        );
      }

      console.log('Connecting to Hume EVI with config:', configId);

      // Initialize Hume client
      const client = new HumeClient({
        apiKey,
      });

      clientRef.current = client;

      // Create the chat socket (this is synchronous)
      const chatSocket = client.empathicVoice.chat.connect({
        configId: configId,
      }) as unknown as HumeChatSocket;

      // Set up event handlers BEFORE connecting
      chatSocket.on('open', () => {
        console.log('Hume WebSocket opened');
        setIsConnected(true);
        onOpen?.();
      });

      chatSocket.on('message', (message: HumeMessage) => {
        handleMessage(message);
      });

      chatSocket.on('error', (err: Error) => {
        console.error('EVI socket error:', err);
        setConnectionError(err.message || 'Socket error');
        onError(err);
      });

      chatSocket.on('close', (event: { code: number; reason: string }) => {
        console.log('Hume WebSocket closed:', event);
        setIsConnected(false);
        setIsListening(false);
        setIsSpeaking(false);
        onClose?.();
      });

      socketRef.current = chatSocket;

      // Connect and wait for it to open
      chatSocket.connect();

      try {
        await chatSocket.waitForOpen();
        console.log('WebSocket connection established');
      } catch (err) {
        throw new Error('Failed to establish WebSocket connection');
      }

      // Get microphone access
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      console.log('Microphone access granted');
      setAudioStream(stream);
      startAudioCapture(stream, chatSocket);
    } catch (error) {
      console.error('Failed to connect to Hume:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect';
      setConnectionError(errorMessage);
      onError(error instanceof Error ? error : new Error(errorMessage));
      isConnectingRef.current = false;
    }
  }, [configId, isConnected, onError, onOpen, onClose, handleMessage, startAudioCapture]);

  const disconnect = useCallback(() => {
    console.log('Disconnecting from Hume...');

    if (mediaRecorderRef.current?.state !== 'inactive') {
      try {
        mediaRecorderRef.current?.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
      mediaRecorderRef.current = null;
    }

    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (audioContextRef.current?.state !== 'closed') {
      audioContextRef.current?.close().catch(() => {});
      audioContextRef.current = null;
    }

    if (audioStream) {
      audioStream.getTracks().forEach((track) => track.stop());
      setAudioStream(null);
    }

    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    setIsConnected(false);
    setIsListening(false);
    setIsSpeaking(false);
    isConnectingRef.current = false;
  }, [audioStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isSpeaking,
    isListening,
    audioStream,
    connectionError,
    connect,
    disconnect,
  };
}
