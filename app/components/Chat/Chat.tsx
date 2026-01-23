'use client';

import { useCommandDetection } from '@/app/hooks/useCommandDetection';
import { useMicrophoneVolume } from '@/app/hooks/useMicrophoneVolume';
import { useVision } from '@/app/hooks/useVision';
import { Emotion } from '@/app/types/avatar';
import { playCameraClick } from '@/app/utils/sounds';
import { useVoice, VoiceProvider, VoiceReadyState } from '@humeai/voice-react';
import { ChevronDown, ChevronUp, MessageSquare, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AvatarDisplay from '../Avatar/AvatarDisplay';
import CameraCapture from '../Camera/CameraCapture';
import PhotoGrid from '../Photo/PhotoGrid';
import EmotionDisplay, { EmotionScore } from '../Vision/EmotionDisplay';
import VisionStream from '../Vision/VisionStream';
import WeatherOverlay from '../Weather/WeatherOverlay';
import ChatControls from './ChatControls';
import ChatMessages from './ChatMessages';
import ImageViewer from './ImageViewer';

interface ChatProps {
  accessToken: string;
  configId?: string;
}

interface ChatInnerProps extends ChatProps {
  pendingToolCall?: {
    name: string;
    toolCallId: string;
    parameters: string;
    send: {
      success: (content: unknown) => unknown;
      error: (e: { error: string; code: string; level: string; content: string }) => unknown;
    };
  } | null;
  onToolCallHandled?: () => void;
}

// Text-based emotion detection keywords
// Used as fallback/supplement when prosody doesn't match content
const TEXT_EMOTION_KEYWORDS: Record<Emotion, string[]> = {
  happy: [
    'happy',
    'glad',
    'joyful',
    'delighted',
    'pleased',
    'cheerful',
    'wonderful',
    'great',
    'fantastic',
    'awesome',
    'love',
    'loving',
    'excited',
    'amazing',
    'incredible',
    'enthusiastic',
  ],
  excited: ['thrilled', 'ecstatic', 'pumped', 'absolutely amazing', 'so excited'],
  sad: [
    'sad',
    'sorry',
    'unfortunate',
    'disappointed',
    'upset',
    'heartbroken',
    'melancholy',
    'down',
    'blue',
    'grief',
    'crying',
    'tears',
    'miss',
    'lonely',
    'depressed',
  ],
  angry: ['angry', 'mad', 'furious', 'annoyed', 'frustrated', 'irritated', 'outraged', 'hate'],
  surprised: ['surprised', 'shocked', 'amazed', 'astonished', 'wow', 'unexpected', 'unbelievable'],
  fear: ['afraid', 'scared', 'frightened', 'terrified', 'anxious', 'worried', 'nervous', 'fear'],
  disgust: ['disgusted', 'gross', 'revolting', 'nasty', 'yuck', 'ugh'],
  thinking: [
    'thinking',
    'considering',
    'wondering',
    'pondering',
    'hmm',
    'perhaps',
    'maybe',
    'curious',
    'interesting',
  ],
  suspicious: ['suspicious', 'skeptical', 'doubtful', 'uncertain', 'fishy', 'strange'],
  neutral: [],
};

// Detect emotion from text content
function detectEmotionFromText(text: string): Emotion | null {
  if (!text) return null;

  const lowerText = text.toLowerCase();
  let bestMatch: Emotion | null = null;
  let bestScore = 0;

  for (const [emotion, keywords] of Object.entries(TEXT_EMOTION_KEYWORDS)) {
    if (emotion === 'neutral') continue;

    let score = 0;
    for (const keyword of keywords) {
      if (lowerText.includes(keyword)) {
        score++;
        // Boost score if the keyword appears early (more likely to be the main emotion)
        if (lowerText.indexOf(keyword) < 50) {
          score += 0.5;
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = emotion as Emotion;
    }
  }

  // Only return if we found at least one keyword match
  return bestScore >= 1 ? bestMatch : null;
}

// Mapping from Hume emotion names (camelCase) to our avatar emotions
// Hume provides 48+ emotions, we map them to our 10 avatar states
const EMOTION_MAPPING: Record<string, Emotion> = {
  // Happy emotions
  joy: 'happy',
  amusement: 'happy',
  love: 'happy',
  contentment: 'happy',
  satisfaction: 'happy',
  relief: 'happy',
  admiration: 'happy',
  gratitude: 'happy',
  calmness: 'happy',
  pride: 'happy',

  // Excited emotions - only for truly high energy moments
  ecstasy: 'excited',
  triumph: 'excited',

  // These map to happy instead (less intense)
  excitement: 'happy',
  enthusiasm: 'happy',
  interest: 'happy',
  determination: 'happy',
  aestheticAppreciation: 'happy',
  craving: 'happy',
  desire: 'happy',

  // Sad emotions
  sadness: 'sad',
  disappointment: 'sad',
  distress: 'sad',
  grief: 'sad',
  guilt: 'sad',
  shame: 'sad',
  embarrassment: 'sad',
  regret: 'sad',
  sympathy: 'sad',
  empathicPain: 'sad',
  nostalgia: 'sad',
  tiredness: 'sad',

  // Thinking emotions
  concentration: 'thinking',
  contemplation: 'thinking',
  confusion: 'thinking',
  doubt: 'thinking',
  realization: 'thinking',
  curiosity: 'thinking',
  boredom: 'thinking',

  // Angry emotions
  anger: 'angry',
  annoyance: 'angry',
  frustration: 'angry',
  rage: 'angry',
  contempt: 'angry',
  envy: 'angry',

  // Surprised emotions
  surprise: 'surprised',
  surprisePositive: 'surprised',
  surpriseNegative: 'surprised',
  awe: 'surprised',
  amazement: 'surprised',

  // Fear emotions
  fear: 'fear',
  anxiety: 'fear',
  horror: 'fear',
  terror: 'fear',
  nervousness: 'fear',
  worry: 'fear',
  awkwardness: 'fear',

  // Disgust emotions
  disgust: 'disgust',
  revulsion: 'disgust',

  // Suspicious emotions
  suspicion: 'suspicious',
  distrust: 'suspicious',
  skepticism: 'suspicious',
};

// Get the dominant emotion from Hume's emotion scores
function getDominantEmotion(scores: Record<string, number>): Emotion {
  if (!scores || Object.keys(scores).length === 0) {
    return 'neutral';
  }

  // Find the emotion with the highest score
  let maxScore = 0;
  let dominantHumeEmotion = '';

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominantHumeEmotion = emotion;
    }
  }

  // Only change emotion if the score is significant (> 0.1 = 10%)
  if (maxScore < 0.1) {
    return 'neutral';
  }

  // Map to our avatar emotion, default to neutral if not mapped
  return EMOTION_MAPPING[dominantHumeEmotion] || 'neutral';
}

// Inner component that uses the useVoice hook
function ChatInner({ accessToken, configId, pendingToolCall, onToolCallHandled }: ChatInnerProps) {
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const prosodyCountRef = useRef(0);

  // Current spoken text for phrase video matching
  const [currentSpokenText, setCurrentSpokenText] = useState('');

  // Voice emotion tracking for display
  const [voiceEmotions, setVoiceEmotions] = useState<EmotionScore[]>([]);

  // Vision state management
  const {
    isVisionActive,
    videoEmotions,
    lastAnalysis: visionAnalysis,
    isAnalyzing: isVisionAnalyzing,
    faceDetected,
    toggleVision,
    handleFaceDetected,
    analyzeWithQuestion,
    detectSceneChange,
    setVideoEmotions,
  } = useVision({
    onAnalysisComplete: (result) => {
      console.log('Vision analysis complete:', result.type);
    },
    onSceneChange: (result) => {
      // NoVo acknowledges scene changes
      if (result.sceneChanged && sendAssistantInput) {
        let message = '';
        if (result.changeType === 'person_moved') {
          message = `I notice you've moved ${result.personVisible ? 'to a different position' : 'out of frame'}. ${result.description}`;
        } else if (result.changeType === 'camera_moved') {
          message = `I see the camera has been pointed in a different direction. ${result.description}`;
        } else if (result.changeType === 'background_changed') {
          message = `I notice the background has changed. ${result.description}`;
        }

        if (message) {
          console.log('🎥 Scene change acknowledged:', message);
          sendAssistantInput(message);
        }
      }
    },
  });

  // Store vision analysis for AI context
  const visionContextRef = useRef<string | null>(null);

  // Store latest camera analysis for responding to queries
  const [latestCameraAnalysis, setLatestCameraAnalysis] = useState<string | null>(null);
  const lastCameraAnalysisTimeRef = useRef<number>(0);
  const CAMERA_ANALYSIS_INTERVAL = 3000; // Scan every 3 seconds

  // Command detection for bypassing Hume tool calls
  const { detectCommand } = useCommandDetection();
  const processingCommandRef = useRef<boolean>(false);

  // Session tracking
  const sessionIdRef = useRef<string | null>(null);
  const lastRecordedMessageRef = useRef<string>('');

  // Image viewer state
  const [displayedImage, setDisplayedImage] = useState<{
    url: string;
    source: 'camera' | 'web' | 'other';
    caption?: string;
    timestamp: Date;
  } | null>(null);

  // Camera state
  const [showCamera, setShowCamera] = useState(false);
  const pendingToolCallIdRef = useRef<string | null>(null);

  // Flash effect state for photo capture
  const [showFlash, setShowFlash] = useState(false);

  // Weather overlay state
  const [weatherData, setWeatherData] = useState<{
    temperature: { fahrenheit: number; celsius: number };
    condition: string;
    description: string;
    humidity?: number;
    windSpeed?: number;
    icon?: string;
    location?: string;
    feelsLike?: { fahrenheit: number; celsius: number };
    uv?: number;
    isDay?: boolean;
  } | null>(null);
  const [showWeatherOverlay, setShowWeatherOverlay] = useState(false);

  // Quiet mode state - when true, NoVo stays quiet
  const [isQuietMode, setIsQuietMode] = useState(false);
  const quietModeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Silence detection for proactive photo session mode offer
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const hasOfferedPhotoSessionRef = useRef(false);
  const lastUserMessageTimeRef = useRef<number>(Date.now());

  // Photo session mode state
  const [isPhotoSession, setIsPhotoSession] = useState(false);
  const [sessionPhotos, setSessionPhotos] = useState<Array<{ url: string; id: string }>>([]);
  const [showPhotoGrid, setShowPhotoGrid] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<{ url: string; id: string } | null>(null);

  // YOLO bounding box state
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(false);
  const [yoloDetections, setYoloDetections] = useState<any[]>([]);

  // Email confirmation state
  const [emailConfirmation, setEmailConfirmation] = useState<{
    email: string;
    type: 'picture' | 'summary';
    data: any; // Store the data needed to send the email
  } | null>(null);

  // User location for weather (cached)
  const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Weather cache to prevent duplicate API calls
  const weatherCacheRef = useRef<{
    data: any;
    timestamp: number;
    location: { lat: number; lon: number };
  } | null>(null);
  const WEATHER_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  const lastWeatherCallRef = useRef<number>(0);
  const WEATHER_DEBOUNCE = 2000; // 2 seconds between calls

  // Photo session timing - prevent button click within first 2 seconds
  const photoSessionStartTimeRef = useRef<number | null>(null);

  // Get user location on mount - try browser geolocation first, then IP-based fallback
  useEffect(() => {
    if (userLocationRef.current) return;

    // Try browser geolocation first
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          userLocationRef.current = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('✅ User location from browser geolocation');
        },
        (error) => {
          console.log('Browser geolocation not available, using IP-based location:', error.message);
          // Fallback to IP-based geolocation
          fetchIPBasedLocation();
        },
        { timeout: 5000, maximumAge: 3600000 }
      );
    } else {
      // No browser geolocation, use IP-based
      fetchIPBasedLocation();
    }
  }, []);

  // Fetch location from IP address
  const fetchIPBasedLocation = async () => {
    try {
      const response = await fetch('/api/geolocation');
      const data = await response.json();
      if (data.success) {
        userLocationRef.current = {
          latitude: data.latitude,
          longitude: data.longitude,
        };
        console.log('✅ User location from IP geolocation:', {
          city: data.city,
          country: data.country,
        });
      }
    } catch (error) {
      console.error('IP geolocation error:', error);
    }
  };

  const {
    readyState,
    messages,
    isPlaying,
    lastAssistantProsodyMessage,
    sendToolMessage,
    sendAssistantInput,
    sendSessionSettings,
    sendUserInput,
  } = useVoice();

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isSpeaking = isPlaying;
  const isListening = isConnected && !isPlaying;

  // Get user's microphone volume directly (independent of Hume SDK)
  const { volume: micVolume } = useMicrophoneVolume(isConnected);

  // Start session when connected
  useEffect(() => {
    if (isConnected && !sessionIdRef.current) {
      // Start a new session
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.sessionId) {
            sessionIdRef.current = data.sessionId;
            console.log(`📝 Session started: ${data.sessionId}`);
          }
        })
        .catch((err) => console.error('Failed to start session:', err));
    }

    // End session when disconnected
    if (!isConnected && sessionIdRef.current) {
      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', sessionId: sessionIdRef.current }),
      }).catch((err) => console.error('Failed to end session:', err));
      sessionIdRef.current = null;
    }
  }, [isConnected]);

  // Store the last captured image URL for emailing
  const lastCapturedImageRef = useRef<string | null>(null);

  // Track email intent and collected information
  const emailIntentRef = useRef<{
    wantsEmail: boolean;
    email: string | null;
    name: string | null;
  }>({
    wantsEmail: false,
    email: null,
    name: null,
  });

  // User profile state (loaded from Redis based on IP)
  const [userProfile, setUserProfile] = useState<{
    name?: string;
    email?: string;
    phone?: string;
    isReturningUser: boolean;
    visitCount: number;
  } | null>(null);
  const userProfileLoadedRef = useRef(false);
  const identityConfirmedRef = useRef(false);

  // Helper function to save user profile to Redis
  const saveUserProfile = async (updates: { name?: string; email?: string; phone?: string }) => {
    try {
      console.log('💾 Saving user profile:', updates);
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'setProfile',
          ...updates,
        }),
      });
      const result = await response.json();
      if (result.success) {
        console.log('✅ User profile saved:', result.user);
        // Update local state
        setUserProfile((prev) =>
          prev
            ? { ...prev, ...updates }
            : {
                ...updates,
                isReturningUser: false,
                visitCount: 1,
              }
        );
      } else {
        console.error('❌ Failed to save user profile:', result.error);
      }
    } catch (error) {
      console.error('❌ Error saving user profile:', error);
    }
  };

  // Load user profile on mount
  useEffect(() => {
    if (userProfileLoadedRef.current) return;
    userProfileLoadedRef.current = true;

    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.user) {
          console.log('👤 User profile loaded:', data.user);
          setUserProfile({
            name: data.user.name,
            email: data.user.email,
            phone: data.user.phone,
            isReturningUser: data.isReturningUser,
            visitCount: data.user.visitCount,
          });

          // Pre-fill email intent if we have stored email
          if (data.user.email) {
            emailIntentRef.current.email = data.user.email;
          }
          if (data.user.name) {
            emailIntentRef.current.name = data.user.name;
          }
        }
      })
      .catch((err) => console.error('Failed to load user profile:', err));
  }, []);

  // Handle tool calls from VoiceProvider's onToolCall callback
  useEffect(() => {
    if (!pendingToolCall) return;

    console.log('🔧 ChatInner received pending tool call:', pendingToolCall.name);

    // Handle take_picture tool - open camera
    if (pendingToolCall.name === 'take_picture') {
      console.log('📸 Opening camera from onToolCall handler...');
      // Store the send function for later use when photo is captured
      pendingToolCallSendRef.current = pendingToolCall.send;
      setShowCamera(true);
      onToolCallHandled?.();
      return;
    }

    // Handle send_picture_email / send_email_picture
    if (
      pendingToolCall.name === 'send_picture_email' ||
      pendingToolCall.name === 'send_email_picture'
    ) {
      console.log('📧 Handling send_email_picture from onToolCall handler');

      const params = JSON.parse(pendingToolCall.parameters || '{}');

      // Inject stored image URL
      if (lastCapturedImageRef.current) {
        params.image_url = lastCapturedImageRef.current;
        console.log('📸 Injecting stored image URL:', lastCapturedImageRef.current);
      } else {
        console.warn('⚠️ No image URL stored!');
        pendingToolCall.send.error({
          error: 'No photo available. Please take a picture first.',
          code: 'NO_IMAGE',
          level: 'error',
          content: '',
        });
        onToolCallHandled?.();
        return;
      }

      // Execute the email tool
      fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'send_email_picture',
          parameters: params,
        }),
      })
        .then((res) => res.json())
        .then((result) => {
          console.log('📧 Email result:', result);
          if (result.success) {
            pendingToolCall.send.success({
              message: `Picture sent successfully to ${params.email}!`,
            });
          } else {
            pendingToolCall.send.error({
              error: result.error || 'Failed to send email',
              code: 'EMAIL_FAILED',
              level: 'error',
              content: '',
            });
          }
        })
        .catch((error) => {
          console.error('📧 Email error:', error);
          pendingToolCall.send.error({
            error: error.message || 'Failed to send email',
            code: 'EMAIL_ERROR',
            level: 'error',
            content: '',
          });
        });

      onToolCallHandled?.();
      return;
    }

    // Handle send_email_summary - pass conversation messages from client
    if (pendingToolCall.name === 'send_email_summary') {
      console.log('📧 Handling send_email_summary from client');
      console.log('📧 Total messages in state:', messages.length);

      const params = JSON.parse(pendingToolCall.parameters || '{}');

      // Get conversation messages from the messages array
      const filteredMessages = messages.filter(
        (msg) => msg.type === 'user_message' || msg.type === 'assistant_message'
      );
      console.log('📧 Filtered messages (user/assistant):', filteredMessages.length);

      // Log first few messages to debug structure
      if (filteredMessages.length > 0) {
        console.log('📧 Sample message structure:', JSON.stringify(filteredMessages[0], null, 2));
      }

      const conversationMessages = filteredMessages.map((msg) => {
        const typedMsg = msg as {
          type: string;
          message?: { role: string; content: string };
          receivedAt?: Date;
        };
        const extracted = {
          role: typedMsg.message?.role === 'user' ? 'user' : 'assistant',
          content: typedMsg.message?.content || '',
          timestamp: typedMsg.receivedAt ? new Date(typedMsg.receivedAt).getTime() : Date.now(),
        };
        return extracted;
      });

      console.log('📧 Collected', conversationMessages.length, 'messages for summary');
      if (conversationMessages.length > 0) {
        console.log('📧 First extracted message:', conversationMessages[0]);
      }

      // Include user profile in the request
      console.log('📧 Including user profile:', userProfile);

      // Call the API with the messages and user profile
      fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'send_email_summary',
          parameters: {
            ...params,
            messages: conversationMessages,
            userProfile: userProfile,
          },
        }),
      })
        .then((res) => res.json())
        .then((result) => {
          console.log('📧 Summary email result:', result);
          if (result.success) {
            pendingToolCall.send.success({
              message: `Conversation summary sent to ${params.email}!`,
              messageCount: conversationMessages.length,
            });
          } else {
            pendingToolCall.send.error({
              error: result.error || 'Failed to send summary',
              code: 'EMAIL_FAILED',
              level: 'error',
              content: '',
            });
          }
        })
        .catch((error) => {
          console.error('📧 Summary email error:', error);
          pendingToolCall.send.error({
            error: error.message || 'Failed to send summary',
            code: 'EMAIL_ERROR',
            level: 'error',
            content: '',
          });
        });

      onToolCallHandled?.();
      return;
    }

    // Handle analyze_vision tool - analyze what the user is wearing/looks like
    if (pendingToolCall.name === 'analyze_vision') {
      console.log('👁️ Handling analyze_vision from onToolCall handler');
      console.log('👁️ Current vision state - isVisionActive:', isVisionActive);

      const params = JSON.parse(pendingToolCall.parameters || '{}');
      const question = params.question || 'What can you see?';

      // User controls the camera - if it's not on, tell NoVo to ask them to turn it on
      if (!isVisionActive) {
        console.log('👁️ Vision not active - telling NoVo to ask user to enable it');
        pendingToolCall.send.success(
          'CAMERA IS OFF. The user needs to enable it. Say exactly: "I would love to see you! Please tap the eye button at the bottom left of your screen - it will glow red when the camera is on, and then I can see you."'
        );
        onToolCallHandled?.();
        return;
      }

      // Vision IS active - tell NoVo immediately that we CAN see, then analyze
      console.log('👁️ Camera IS ON - analyzing vision with question:', question);
      analyzeWithQuestion(question)
        .then((analysis) => {
          console.log('👁️ Vision analysis complete:', analysis.slice(0, 100) + '...');
          // CRITICAL: Send as a clear string, not an object, telling NoVo we CAN see
          const visionResponse = `CAMERA IS ON - I CAN SEE THE USER! Here is what I observe: ${analysis}`;
          pendingToolCall.send.success(visionResponse);
          onToolCallHandled?.();
        })
        .catch((error) => {
          console.error('👁️ Vision analysis error:', error);
          // Even if analysis fails, camera IS on - don't ask user to enable it
          pendingToolCall.send.success(
            'CAMERA IS ON but I had trouble analyzing the image. I can see the user though! Ask them to adjust their position or lighting.'
          );
          onToolCallHandled?.();
        });

      return;
    }

    // Handle get_weather tool - fetch weather and send to NoVo
    if (pendingToolCall.name === 'get_weather') {
      console.log('🌤️ Handling get_weather tool');

      // Get user's location
      const location = userLocationRef.current;
      const lat = location?.latitude ?? 40.7128; // Default NYC
      const lon = location?.longitude ?? -74.006;

      // Check cache first
      const now = Date.now();
      const cache = weatherCacheRef.current;
      if (
        cache &&
        cache.location.lat === lat &&
        cache.location.lon === lon &&
        now - cache.timestamp < WEATHER_CACHE_DURATION
      ) {
        console.log(
          '🌤️ Using cached weather data (age:',
          Math.round((now - cache.timestamp) / 1000),
          'seconds)'
        );
        const w = cache.data;

        // Display weather visually
        setWeatherData(w);
        setShowWeatherOverlay(true);

        // Auto-hide weather overlay after 4 seconds
        setTimeout(() => {
          setShowWeatherOverlay(false);
        }, 4000);

        // Build weather report for NoVo with proper null checks (Celsius only)
        const location = w.location || 'your area';
        const tempC = w.temperature?.celsius || 'unknown';
        const condition = w.condition || 'unknown conditions';
        const feelsLike = w.feelsLike?.celsius ? ` Feels like ${w.feelsLike.celsius}°C.` : '';
        const humidity = w.humidity ? ` Humidity ${w.humidity}%.` : '';
        const wind = w.windSpeed ? ` Wind ${w.windSpeed} km/h.` : '';
        const uv = w.uv !== undefined ? ` UV index ${w.uv}.` : '';

        const weatherReport = `Current weather in ${location}: ${tempC}°C, ${condition}.${feelsLike}${humidity}${wind}${uv}`;

        console.log('🌤️ Sending cached weather report to NoVo');

        if (sendToolMessage && pendingToolCall.toolCallId) {
          sendToolMessage({
            type: 'tool_response',
            toolCallId: pendingToolCall.toolCallId,
            content: weatherReport,
          } as any);
          console.log('🌤️ Weather tool response sent successfully via sendToolMessage');
        }
        return;
      }

      console.log('🌤️ Fetching fresh weather for location:', { lat, lon });

      // Fetch weather data
      fetch(`/api/weather?lat=${lat}&lon=${lon}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.weather) {
            console.log('🌤️ Weather data received:', data.weather);

            // Cache the weather data
            weatherCacheRef.current = {
              data: data.weather,
              timestamp: Date.now(),
              location: { lat, lon },
            };
            console.log('🌤️ Weather data cached for 5 minutes');

            const w = data.weather;

            // Check if this is mock data (location contains "estimated")
            const isMockData = w.location?.includes('estimated');

            if (isMockData) {
              console.warn('⚠️ Using MOCK weather data - WEATHER_API_KEY not configured');
            } else {
              console.log('✅ Using REAL weather data from WeatherAPI.com');
            }

            // Display weather visually
            setWeatherData(w);
            setShowWeatherOverlay(true);
            console.log('🌤️ Weather overlay displayed');

            // Auto-hide weather overlay after 4 seconds
            setTimeout(() => {
              setShowWeatherOverlay(false);
            }, 4000);

            // Build a natural weather report for NoVo to speak with proper null checks (Celsius only)
            const location = w.location || 'your area';
            const tempC = w.temperature?.celsius || 'unknown';
            const condition = w.condition || 'unknown conditions';
            const feelsLike = w.feelsLike?.celsius ? ` Feels like ${w.feelsLike.celsius}°C.` : '';
            const humidity = w.humidity ? ` Humidity ${w.humidity}%.` : '';
            const wind = w.windSpeed ? ` Wind ${w.windSpeed} km/h.` : '';
            const uv = w.uv !== undefined ? ` UV index ${w.uv}.` : '';

            let weatherReport = `Current weather in ${location}: ${tempC}°C, ${condition}.${feelsLike}${humidity}${wind}${uv}`;

            // Add forecast if available (Celsius only)
            if (w.forecast && w.forecast.length > 0) {
              weatherReport += ' Here is the 3-day forecast: ';
              w.forecast.forEach((day: any, index: number) => {
                const dayDate = day.date || 'unknown date';
                const dayCondition = day.condition || 'unknown';
                const maxTemp = day.maxTemp?.celsius || 'unknown';
                const minTemp = day.minTemp?.celsius || 'unknown';
                const rainChance = day.chanceOfRain || 0;
                weatherReport += `${dayDate}: ${dayCondition}, high ${maxTemp}°C, low ${minTemp}°C, ${rainChance}% chance of rain.`;
                if (index < w.forecast.length - 1) weatherReport += ' ';
              });
            }

            console.log('🌤️ Weather data from API:', w);
            console.log('🌤️ Sending weather report to NoVo:', weatherReport);

            // Use sendToolMessage instead of pendingToolCall.send to avoid SDK bug
            if (sendToolMessage && pendingToolCall.toolCallId) {
              sendToolMessage({
                type: 'tool_response',
                toolCallId: pendingToolCall.toolCallId,
                content: weatherReport,
              } as any);
              console.log('🌤️ Weather tool response sent successfully via sendToolMessage');
            }
          } else {
            console.error('🌤️ Weather API returned error:', data);
            if (sendToolMessage && pendingToolCall.toolCallId) {
              sendToolMessage({
                type: 'tool_error',
                toolCallId: pendingToolCall.toolCallId,
                error: 'Failed to fetch weather data',
                content: '',
              } as any);
            }
          }
          // Call handler AFTER response is sent
          onToolCallHandled?.();
        })
        .catch((error) => {
          console.error('🌤️ Weather fetch error:', error);
          if (sendToolMessage && pendingToolCall.toolCallId) {
            sendToolMessage({
              type: 'tool_error',
              toolCallId: pendingToolCall.toolCallId,
              error: error.message || 'Failed to fetch weather',
              content: '',
            } as any);
          }
          // Call handler AFTER error is sent
          onToolCallHandled?.();
        });

      // Don't call onToolCallHandled here - wait for async operation to complete
      return;
    }

    // Handle be_quiet tool - NoVo stays quiet for a specified duration
    if (pendingToolCall.name === 'be_quiet') {
      console.log('🤫 Handling be_quiet tool');

      const params = JSON.parse(pendingToolCall.parameters || '{}');
      const durationSeconds = params.duration_seconds || 60; // Default 1 minute
      const durationMs = Math.min(durationSeconds, 300) * 1000; // Max 5 minutes

      // Clear any existing timer
      if (quietModeTimerRef.current) {
        clearTimeout(quietModeTimerRef.current);
      }

      // Enter quiet mode
      setIsQuietMode(true);
      console.log(`🤫 Entering quiet mode for ${durationSeconds} seconds`);

      // Set timer to exit quiet mode
      quietModeTimerRef.current = setTimeout(() => {
        setIsQuietMode(false);
        console.log('🤫 Quiet mode ended');
        quietModeTimerRef.current = null;
      }, durationMs);

      pendingToolCall.send.success({
        quiet_mode: true,
        duration_seconds: Math.min(durationSeconds, 300),
        message: `Okay, I'll be quiet for ${Math.min(durationSeconds, 300)} seconds. Just say my name or "NoVo" when you want me to talk again.`,
      });

      onToolCallHandled?.();
      return;
    }

    // Handle resume_talking tool - exit quiet mode early
    if (pendingToolCall.name === 'resume_talking') {
      console.log('🗣️ Handling resume_talking tool');

      // Clear timer and exit quiet mode
      if (quietModeTimerRef.current) {
        clearTimeout(quietModeTimerRef.current);
        quietModeTimerRef.current = null;
      }
      setIsQuietMode(false);

      pendingToolCall.send.success({
        quiet_mode: false,
        message: "I'm back! What can I help you with?",
      });

      onToolCallHandled?.();
      return;
    }

    // For other tools, mark as handled
    onToolCallHandled?.();
  }, [
    pendingToolCall,
    onToolCallHandled,
    messages,
    isVisionActive,
    analyzeWithQuestion,
    faceDetected,
    toggleVision,
    showWeatherOverlay,
  ]);

  // Ref to store the send function for tool calls that need async completion (like camera)
  const pendingToolCallSendRef = useRef<{
    success: (content: unknown) => unknown;
    error: (e: { error: string; code: string; level: string; content: string }) => unknown;
  } | null>(null);

  // Poll for pending tool calls from webhook (bridge between server and client)
  useEffect(() => {
    if (!isConnected) return;

    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch('/api/tool-calls?chatId=default');
        const data = await response.json();

        if (data.hasPending && data.toolCall) {
          console.log('🔧 Received pending tool call from webhook:', data.toolCall.name);

          // Handle take_picture
          if (data.toolCall.name === 'take_picture') {
            console.log('📸 Opening camera from webhook notification...');
            pendingToolCallIdRef.current = data.toolCall.toolCallId;
            setShowCamera(true);
          }

          // Handle send_email_summary
          if (data.toolCall.name === 'send_email_summary') {
            console.log('📧 Handling send_email_summary from webhook notification...');
            const params =
              typeof data.toolCall.parameters === 'string'
                ? JSON.parse(data.toolCall.parameters)
                : data.toolCall.parameters;

            // Get conversation messages
            const conversationMessages = messages
              .filter((msg) => msg.type === 'user_message' || msg.type === 'assistant_message')
              .map((msg) => {
                const typedMsg = msg as {
                  type: string;
                  message?: { role: string; content: string };
                  receivedAt?: Date;
                };
                return {
                  role: typedMsg.message?.role === 'user' ? 'user' : 'assistant',
                  content: typedMsg.message?.content || '',
                  timestamp: typedMsg.receivedAt
                    ? new Date(typedMsg.receivedAt).getTime()
                    : Date.now(),
                };
              });

            console.log('📧 Sending summary with', conversationMessages.length, 'messages');
            console.log('📧 Including user profile:', userProfile);

            // Call the API with the messages and user profile
            fetch('/api/tools/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                toolName: 'send_email_summary',
                parameters: {
                  ...params,
                  messages: conversationMessages,
                  userProfile: userProfile,
                },
              }),
            })
              .then((res) => res.json())
              .then((result) => {
                console.log('📧 Summary email result:', result);
                // Send tool response back to Hume
                if (sendToolMessage && data.toolCall.toolCallId) {
                  sendToolMessage({
                    type: 'tool_response',
                    toolCallId: data.toolCall.toolCallId,
                    content: JSON.stringify({
                      success: result.success,
                      message: result.success
                        ? `Conversation summary sent to ${params.email}!`
                        : result.error,
                      messageCount: conversationMessages.length,
                    }),
                  } as any);
                }
              })
              .catch((error) => {
                console.error('📧 Summary email error:', error);
              });
          }
        }
      } catch (error) {
        // Silently ignore polling errors
      }
    }, 1000); // Poll every second

    return () => clearInterval(pollInterval);
  }, [isConnected]);

  // Track if we've sent session variables for this connection
  const sessionVariablesSentRef = useRef(false);

  // Send user context to Hume AI when connected
  // IMPORTANT: Always send variables (even empty) to avoid Hume error W0106
  // This effect runs when:
  // 1. Connection is established (isConnected becomes true)
  // 2. User profile is loaded (userProfile changes from null to object)
  useEffect(() => {
    if (!isConnected || !sendSessionSettings) return;

    // Reset the ref when disconnected (handled by the cleanup or connection state)
    // Send variables if we haven't sent them yet, OR if profile just loaded and we only sent defaults before
    const shouldSend =
      !sessionVariablesSentRef.current || (userProfile?.name && !identityConfirmedRef.current);

    if (!shouldSend) return;

    // Build context variables - always include all variables with defaults
    const contextVariables: Record<string, string> = {
      user_name: userProfile?.name || '',
      user_email: userProfile?.email || '',
      is_returning_user: userProfile?.isReturningUser ? 'true' : 'false',
      visit_count: String(userProfile?.visitCount || 1),
      vision_enabled: isVisionActive ? 'true' : 'false',
    };

    if (userProfile?.isReturningUser && userProfile?.name) {
      console.log(
        `👤 Returning user detected: ${userProfile.name} (visit #${userProfile.visitCount})`
      );
      identityConfirmedRef.current = true;
    } else {
      console.log('👤 New user or profile not loaded - sending session variables');
    }

    // Send session settings with user context (variables only)
    // Use a small delay to ensure WebSocket is fully ready
    const timer = setTimeout(() => {
      try {
        sendSessionSettings({
          variables: contextVariables,
        });
        console.log('👤 Sent session variables to Hume AI:', contextVariables);
        sessionVariablesSentRef.current = true;
      } catch (error) {
        console.error('Failed to send session settings:', error);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [isConnected, userProfile, sendSessionSettings]);

  // Track if we've sent the initial greeting trigger
  const greetingSentRef = useRef(false);
  const greetingVideoFinishedRef = useRef(false);

  // For returning users, send a greeting trigger ONLY after greeting video finishes
  // This prevents two audio streams playing at once
  useEffect(() => {
    if (
      !isConnected ||
      !sendUserInput ||
      !sessionVariablesSentRef.current ||
      greetingSentRef.current ||
      !greetingVideoFinishedRef.current // Wait for greeting video to finish
    )
      return;

    // Only send greeting for returning users with a known name
    if (userProfile?.isReturningUser && userProfile?.name) {
      // Small delay to ensure greeting video has fully finished
      const timer = setTimeout(() => {
        if (greetingSentRef.current) return; // Double-check

        // Send greeting with name - phrased to get a single simple welcome back
        const greetingMessage = `Hi, it's ${userProfile.name}.`;

        console.log(
          '👤 Sending greeting trigger for returning user (after video):',
          greetingMessage
        );

        try {
          sendUserInput(greetingMessage);
          greetingSentRef.current = true;
          console.log('✅ Greeting trigger sent');
        } catch (error) {
          console.error('Failed to send greeting trigger:', error);
        }
      }, 500); // Wait a bit after video finishes

      return () => clearTimeout(timer);
    }
  }, [
    isConnected,
    userProfile,
    sendUserInput,
    sessionVariablesSentRef.current,
    greetingVideoFinishedRef.current,
  ]);

  // Update camera state in session settings whenever it changes
  // This keeps NoVo constantly aware of whether the camera is on or off
  useEffect(() => {
    if (!isConnected || !sendSessionSettings) return;

    // Update the vision_enabled variable whenever camera state changes
    const timer = setTimeout(() => {
      try {
        sendSessionSettings({
          variables: {
            user_name: userProfile?.name || '',
            user_email: userProfile?.email || '',
            is_returning_user: userProfile?.isReturningUser ? 'true' : 'false',
            visit_count: String(userProfile?.visitCount || 1),
            vision_enabled: isVisionActive ? 'true' : 'false',
          },
        });
        console.log('📹 Updated camera state in session:', {
          vision_enabled: isVisionActive ? 'true' : 'false',
        });
      } catch (error) {
        console.error('Failed to update camera state in session:', error);
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [isVisionActive, isConnected, sendSessionSettings, userProfile]);

  // Reset session tracking when disconnected
  useEffect(() => {
    if (!isConnected) {
      sessionVariablesSentRef.current = false;
      identityConfirmedRef.current = false;
      greetingSentRef.current = false;
      greetingVideoFinishedRef.current = false;
      processedMessageIdsRef.current.clear(); // Clear processed messages
    }
  }, [isConnected]);

  // Track previous vision state to detect actual changes
  const prevVisionActiveRef = useRef<boolean>(false);

  // Update session variables when vision is toggled AND notify NoVo
  useEffect(() => {
    // Only update if we've already sent initial session variables
    if (!isConnected || !sendSessionSettings || !sessionVariablesSentRef.current) return;

    // Check if vision state actually changed
    const visionStateChanged = prevVisionActiveRef.current !== isVisionActive;
    prevVisionActiveRef.current = isVisionActive;

    try {
      sendSessionSettings({
        variables: {
          user_name: userProfile?.name || '',
          user_email: userProfile?.email || '',
          is_returning_user: userProfile?.isReturningUser ? 'true' : 'false',
          visit_count: String(userProfile?.visitCount || 1),
          vision_enabled: isVisionActive ? 'true' : 'false',
        },
      });
      console.log('👁️ Updated vision status:', isVisionActive ? 'ON' : 'OFF');

      // Only notify NoVo if vision state actually changed
      if (visionStateChanged && sendAssistantInput) {
        if (isVisionActive) {
          // Camera just turned ON - just notify NoVo, don't auto-analyze
          console.log('👁️ Camera turned ON - notifying NoVo');
          if (sendAssistantInput) {
            sendAssistantInput('[Camera ON. You can now see the user.]');
          }
        } else {
          // Camera just turned OFF
          console.log('👁️ Camera turned OFF - notifying NoVo');
          if (sendAssistantInput) {
            sendAssistantInput('[Camera OFF. You cannot see the user.]');
          }
        }
      }
    } catch (error) {
      console.error('Failed to update vision status:', error);
    }
  }, [
    isVisionActive,
    isConnected,
    sendSessionSettings,
    sendAssistantInput,
    userProfile,
    analyzeWithQuestion,
  ]);

  // Background camera scanning - continuously analyze camera without speaking
  // This keeps the latest camera analysis ready for when user asks "can you see me?"
  useEffect(() => {
    if (!isVisionActive || !analyzeWithQuestion) return;

    const scanCamera = async () => {
      const now = Date.now();
      // Only scan if enough time has passed since last scan
      if (now - lastCameraAnalysisTimeRef.current < CAMERA_ANALYSIS_INTERVAL) {
        return;
      }

      try {
        console.log('📸 Background camera scan...');
        const analysis = await analyzeWithQuestion(
          'Describe what you see: the person, their appearance, clothing, surroundings, and any notable details.'
        );

        if (!analysis.includes('Vision is not active') && !analysis.includes('Unable to capture')) {
          setLatestCameraAnalysis(analysis);
          lastCameraAnalysisTimeRef.current = now;
          console.log('📸 Camera analysis updated (not spoken)');
        }
      } catch (err) {
        console.error('Background camera scan error:', err);
      }
    };

    // Scan immediately when camera turns on
    scanCamera();

    // Then scan periodically
    const scanInterval = setInterval(scanCamera, CAMERA_ANALYSIS_INTERVAL);

    return () => clearInterval(scanInterval);
  }, [isVisionActive, analyzeWithQuestion]);

  // Fetch weather automatically when user connects (using IP geolocation)
  useEffect(() => {
    if (!isConnected || !userLocationRef.current) return;

    // Fetch weather once on connection
    const fetchWeatherOnConnect = async () => {
      try {
        const { latitude, longitude } = userLocationRef.current!;
        console.log('🌤️ Fetching weather on connection for:', { latitude, longitude });

        const response = await fetch(`/api/weather?lat=${latitude}&lon=${longitude}`);
        const data = await response.json();

        if (data.success && data.weather) {
          setWeatherData(data.weather);
          console.log('🌤️ Weather fetched on connection:', data.weather.location);

          // Send weather context to NoVo so she's aware (Celsius only)
          if (sendAssistantInput && data.weather.forecast) {
            const forecastSummary = data.weather.forecast
              .slice(0, 2)
              .map(
                (day: any) =>
                  `${day.date}: ${day.condition}, ${day.minTemp.celsius}°C-${day.maxTemp.celsius}°C`
              )
              .join('; ');
            sendAssistantInput(
              `[Weather context: Current: ${data.weather.temperature.celsius}°C and ${data.weather.condition}. Forecast: ${forecastSummary}]`
            );
          }
        }
      } catch (error) {
        console.error('Error fetching weather on connect:', error);
      }
    };

    fetchWeatherOnConnect();
  }, [isConnected, sendAssistantInput]);

  // Periodic system context updates - keep NoVo informed about camera, weather, etc.
  // This sends context to NoVo so she's aware, but she decides when to mention it naturally
  useEffect(() => {
    if (!isConnected || !sendAssistantInput) return;

    // Update every 60 seconds with current context (camera, weather, etc.)
    const contextUpdateInterval = setInterval(async () => {
      let contextParts: string[] = [];

      // Add camera context if active
      if (isVisionActive) {
        try {
          const analysis = await analyzeWithQuestion(
            'Briefly describe what you see right now in one sentence.'
          );
          if (
            !analysis.includes('Vision is not active') &&
            !analysis.includes('Unable to capture')
          ) {
            contextParts.push(`Camera: ${analysis}`);
          }
        } catch (err) {
          console.error('Camera context error:', err);
        }
      }

      // Add weather context if available (Celsius only)
      if (weatherData) {
        const weatherContext = `Weather: ${weatherData.temperature.celsius}°C, ${weatherData.condition}, feels like ${weatherData.feelsLike?.celsius}°C`;
        contextParts.push(weatherContext);
      }

      // Send combined context if we have any
      if (contextParts.length > 0) {
        console.log('📋 Sending system context to NoVo');
        sendAssistantInput(`[System context: ${contextParts.join(' | ')}]`);
      }
    }, 60000); // Every 60 seconds

    return () => clearInterval(contextUpdateInterval);
  }, [isVisionActive, isConnected, sendAssistantInput, analyzeWithQuestion, weatherData]);

  // Handle camera capture
  const handleCameraCapture = async (imageDataUrl: string) => {
    console.log('📸 Photo captured!');
    console.log('📸 Image data URL length:', imageDataUrl.length);

    // Play camera click sound
    console.log('🔊 Playing camera click sound...');
    playCameraClick();

    // Close camera
    setShowCamera(false);

    // Save image to disk and get public URL
    try {
      console.log('💾 Saving image to disk...');
      const saveResponse = await fetch('/api/images/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageData: imageDataUrl,
          filename: `photo-${Date.now()}.jpg`,
        }),
      });

      const saveResult = await saveResponse.json();

      if (saveResult.success) {
        // Store the public URL for emailing
        const publicUrl = `${window.location.origin}${saveResult.url}`;
        lastCapturedImageRef.current = publicUrl;
        console.log('✅ Image saved:', publicUrl);
      } else {
        console.error('Failed to save image:', saveResult.error);
        // Fallback: use base64 data URL
        lastCapturedImageRef.current = imageDataUrl;
      }
    } catch (error) {
      console.error('Error saving image:', error);
      // Fallback: use base64 data URL
      lastCapturedImageRef.current = imageDataUrl;
    }

    // Display the captured image
    console.log('🖼️ Setting displayed image...');
    setDisplayedImage({
      url: imageDataUrl,
      source: 'camera',
      caption: 'Picture captured successfully!',
      timestamp: new Date(),
    });
    console.log('✅ Image viewer should now be visible');

    // Auto-dismiss the photo after 5 seconds so NoVo becomes visible again
    setTimeout(() => {
      console.log('📸 Auto-dismissing photo to show NoVo');
      setDisplayedImage(null);
    }, 5000);

    // Send tool response back to Hume AI
    // The response should include the image_url so Hume knows where the image is
    const toolResponseContent = JSON.stringify({
      status: 'captured',
      image_url: lastCapturedImageRef.current,
      message: 'Picture captured successfully! The image is ready to be emailed.',
    });

    console.log('📸 Sending tool response with image URL:', lastCapturedImageRef.current);

    // Try the new onToolCall send function first
    if (pendingToolCallSendRef.current) {
      try {
        pendingToolCallSendRef.current.success({
          status: 'captured',
          image_url: lastCapturedImageRef.current,
          message: 'Picture captured successfully! The image is ready to be emailed.',
        });
        console.log('📸 Tool response sent via onToolCall handler');
      } catch (error) {
        console.error('Failed to send tool response via onToolCall:', error);
      }
      pendingToolCallSendRef.current = null;
    }
    // Fallback to sendToolMessage
    else if (pendingToolCallIdRef.current && sendToolMessage) {
      try {
        // Send tool response with the image URL as JSON
        sendToolMessage({
          type: 'tool_response',
          toolCallId: pendingToolCallIdRef.current,
          content: toolResponseContent,
        } as any);

        console.log('📸 Tool response sent via sendToolMessage');
      } catch (error) {
        console.error('Failed to send tool response:', error);
      }

      pendingToolCallIdRef.current = null;
    } else {
      console.warn(
        '📸 No way to send tool response! pendingToolCallIdRef:',
        pendingToolCallIdRef.current,
        'sendToolMessage:',
        !!sendToolMessage
      );
    }

    // Note: Don't call sendAssistantInput here - the tool response already triggers NoVo to respond
    // Calling both would result in duplicate audio responses
  };

  // Auto-trigger email when we have all required info
  useEffect(() => {
    const intent = emailIntentRef.current;

    if (intent.wantsEmail && intent.email && intent.name && lastCapturedImageRef.current) {
      console.log('📧 Auto-triggering email with collected info:', intent);

      // Reset intent to prevent duplicate sends
      emailIntentRef.current = {
        wantsEmail: false,
        email: null,
        name: null,
      };

      // Send the email
      fetch('/api/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'send_email_picture',
          parameters: {
            email: intent.email,
            user_name: intent.name,
            image_url: lastCapturedImageRef.current,
            caption: 'Picture from NoVo!',
          },
        }),
      })
        .then((res) => res.json())
        .then((result) => {
          console.log('📧 Auto-email result:', result);
          if (result.success) {
            console.log('✅ Email sent successfully!');
          } else {
            console.error('❌ Email failed:', result.error);
          }
        })
        .catch((error) => {
          console.error('📧 Auto-email error:', error);
        });
    }
  }, [messages]);

  // Handle YOLO detections update
  const handleDetectionsUpdate = useCallback((detections: any[]) => {
    setYoloDetections(detections);

    // Send detection summary to NoVo as context (in brackets, not spoken)
    if (detections.length > 0) {
      const summary = detections.map((d) => `${d.class}`).join(', ');
      // Only send if we have meaningful detections
      if (summary.length > 0) {
        console.log('📦 YOLO detections:', summary);
        // Uncomment to send to NoVo as context:
        // sendAssistantInput(`[Objects detected: ${summary}]`);
      }
    }
  }, []);

  // Track processed messages to avoid duplicate processing
  const processedMessageIdsRef = useRef<Set<string>>(new Set());

  // Listen for tool calls (take_picture, show_image, etc.)
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Create a unique ID for this message to prevent duplicate processing
    const msgAny = lastMessage as any;
    const msgType = lastMessage.type;

    // Skip if message has no type
    if (!msgType) {
      console.warn('⚠️ Message received with no type:', lastMessage);
      return;
    }

    const messageId = msgAny.id || msgAny.receivedAt?.toString() || `${msgType}-${messages.length}`;

    // Skip if we've already processed this message
    if (processedMessageIdsRef.current.has(messageId)) {
      return;
    }

    // Mark this message as processed
    processedMessageIdsRef.current.add(messageId);

    // Debug: Log all message types to help troubleshoot tool calls
    console.log(`📨 Message received [${messages.length}]: type="${msgType}"`);

    // Log full message for any tool-related or unknown message types
    if (
      msgType === 'tool_call' ||
      msgType?.includes('tool') ||
      (msgType !== 'user_message' &&
        msgType !== 'assistant_message' &&
        msgType !== 'user_interruption' &&
        msgType !== 'assistant_end' &&
        msgType !== 'assistant_prosody')
    ) {
      console.log('📨 Full message:', JSON.stringify(lastMessage, null, 2));
    }

    // Also check if the message has toolCall nested inside (some SDK versions)
    if (msgAny.toolCall || msgAny.tool_call) {
      console.log('🔧 Found nested toolCall in message!', msgAny.toolCall || msgAny.tool_call);
    }

    // Check for user messages to extract email/name
    if (lastMessage.type === 'user_message') {
      const userMsg = lastMessage as any;
      const content = userMsg.message?.content || '';

      console.log('👤 User message:', content);
      console.log('📸 Photo session active:', isPhotoSession);
      console.log('📹 Vision active:', isVisionActive);
      console.log('🔒 Processing command:', processingCommandRef.current);

      // === COMMAND DETECTION (Bypass Hume tool calls) ===
      if (!processingCommandRef.current) {
        const command = detectCommand(content);
        console.log('🎯 Command detection result:', command);

        if (command) {
          console.log(`🎯 Detected command: ${command.type}`);

          // Skip enable_camera if camera is already on - let it fall through to vision_request
          if (command.type === 'enable_camera' && isVisionActive) {
            console.log(
              '📹 Camera already ON - ignoring enable_camera, checking for vision_request'
            );
            // Don't process this command, let it potentially match vision_request instead
            processingCommandRef.current = false;
          } else if (command.type === 'enable_camera') {
            // Handle enable camera request
            processingCommandRef.current = true;
            console.log('📹 Enable camera request detected');

            // Turn camera ON
            console.log('📹 Turning camera ON');
            toggleVision();
            // if (sendAssistantInput) {
            //   sendAssistantInput('[Camera ON. Ask what they want to show you.]');
            // }
            processingCommandRef.current = false;
          }

          // Handle vision request - if camera is ON, scan for latest info and respond
          else if (command.type === 'vision_request') {
            console.log('👁️ Vision request detected');

            if (isVisionActive) {
              // Camera IS on - scan for fresh camera analysis
              console.log('👁️ Camera is ON - scanning for latest information...');

              // Scan for fresh camera analysis
              analyzeWithQuestion(
                'Describe everything you see in detail - the person, their appearance, clothing, colors, style, and any other visual details.'
              )
                .then((analysis) => {
                  console.log('👁️ Fresh vision analysis complete:', analysis.slice(0, 100) + '...');
                  // Update the stored analysis
                  setLatestCameraAnalysis(analysis);
                  lastCameraAnalysisTimeRef.current = Date.now();

                  if (sendAssistantInput) {
                    // Send the fresh analysis to NoVo so she can speak it
                    console.log('👁️ Sending fresh vision analysis to NoVo');
                    sendAssistantInput(analysis);
                  }
                })
                .catch((error) => {
                  console.error('👁️ Vision analysis error:', error);
                });
            } else {
              // Camera is OFF - let NoVo handle the response naturally
              console.log('👁️ Camera is OFF - NoVo will ask user to enable it');
            }
            processingCommandRef.current = false;
          }

          // Handle take picture request
          else if (command.type === 'take_picture') {
            console.log('📸 Take picture command detected');
            console.log('📸 User said:', content.toLowerCase().trim());
            console.log('📸 Is vision active?', isVisionActive);
            console.log('📸 Is photo session?', isPhotoSession);

            // If camera is on and user says "shoot", capture directly from vision stream
            // Check if content contains shoot/shot/snap (not just exact match)
            const userContent = content.toLowerCase().trim();
            const isQuickCapture = /\b(shoot|shot|snap)\b/i.test(userContent);

            if (isVisionActive && isQuickCapture) {
              console.log('📸 Quick capture from vision stream detected');
              console.log('📸 Checking for window.__visionCaptureFrame...');

              // Capture from vision stream
              if (typeof window !== 'undefined' && (window as any).__visionCaptureFrame) {
                const imageData = (window as any).__visionCaptureFrame();
                console.log('📸 Capture function returned:', imageData ? 'image data' : 'null');

                if (imageData) {
                  // Trigger flash effect
                  setShowFlash(true);
                  setTimeout(() => setShowFlash(false), 300);

                  if (isPhotoSession) {
                    // Photo session mode - add to session array
                    const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    setSessionPhotos((prev) => {
                      const newPhotos = [...prev, { url: imageData, id: photoId }];
                      console.log(
                        `📸 Photo added to session. Total photos now: ${newPhotos.length}`
                      );
                      return newPhotos;
                    });

                    if (sendAssistantInput) {
                      sendAssistantInput(
                        `[Photo captured! Say "shoot" for more, or "done" to finish.]`
                      );
                    }
                  } else {
                    // Single photo mode
                    lastCapturedImageRef.current = imageData;
                    console.log('📸 Photo captured from vision stream');

                    if (sendAssistantInput) {
                      sendAssistantInput(
                        '[Photo captured! Ask: "Want to know about Photo Session Mode? You can take multiple photos by saying \'shoot\'!"]'
                      );
                    }
                  }
                } else {
                  console.error('📸 Failed to capture from vision stream - imageData is null');
                  if (sendAssistantInput) {
                    sendAssistantInput('[Had trouble capturing the photo. Please try again.]');
                  }
                }
              } else {
                console.error('📸 __visionCaptureFrame not available on window');
                if (sendAssistantInput) {
                  sendAssistantInput('[Camera not ready. Please try again.]');
                }
              }
            } else {
              // Open camera capture modal
              console.log(
                '📸 Opening camera capture modal (vision not active or not quick capture)'
              );
              setShowCamera(true);
            }
            processingCommandRef.current = false;
          }

          // Handle email picture request
          else if (command.type === 'send_email_picture') {
            console.log('📧 Email picture request detected');
            if (!lastCapturedImageRef.current) {
              // No picture taken yet
              // if (sendAssistantInput) {
              //   sendAssistantInput('[No photo yet - ask if they want to take one first]');
              // }
            } else if (!userProfile?.email && !command.extractedData?.email) {
              // Need email address
              // if (sendAssistantInput) {
              //   sendAssistantInput('[Need email address to send the picture]');
              // }
            } else {
              // We have picture and email - show confirmation dialog
              const emailToUse = command.extractedData?.email || userProfile?.email || '';
              console.log('📧 Showing email confirmation for:', emailToUse);

              setEmailConfirmation({
                email: emailToUse,
                type: 'picture',
                data: {
                  user_name: userProfile?.name || 'Friend',
                  image_url: lastCapturedImageRef.current,
                  caption: 'Picture from NoVo!',
                },
              });

              // Tell NoVo we're asking for confirmation
              // if (sendAssistantInput) {
              //   sendAssistantInput('[Asking user to confirm email address before sending]');
              // }
            }
            processingCommandRef.current = false;
          }

          // Handle email summary request
          else if (command.type === 'send_email_summary') {
            console.log('📧 Email summary request detected');
            if (!userProfile?.email && !command.extractedData?.email) {
              // Need email address
              // if (sendAssistantInput) {
              //   sendAssistantInput('[Need email address for summary]');
              // }
            } else {
              // We have email - show confirmation dialog
              const emailToUse = command.extractedData?.email || userProfile?.email || '';
              const conversationMessages = messages
                .filter((msg) => msg.type === 'user_message' || msg.type === 'assistant_message')
                .map((msg) => {
                  const typedMsg = msg as {
                    type: string;
                    message?: { role: string; content: string };
                    receivedAt?: Date;
                  };
                  return {
                    role: typedMsg.message?.role === 'user' ? 'user' : 'assistant',
                    content: typedMsg.message?.content || '',
                    timestamp: typedMsg.receivedAt
                      ? new Date(typedMsg.receivedAt).getTime()
                      : Date.now(),
                  };
                });

              console.log('📧 Showing email confirmation for summary:', emailToUse);

              setEmailConfirmation({
                email: emailToUse,
                type: 'summary',
                data: {
                  user_name: userProfile?.name || 'Friend',
                  messages: conversationMessages,
                  userProfile: userProfile,
                },
              });

              // Tell NoVo we're asking for confirmation
              // if (sendAssistantInput) {
              //   sendAssistantInput('[Asking user to confirm email address before sending]');
              // }
            }
            processingCommandRef.current = false;
          }

          // Handle explain photo session request
          else if (command.type === 'explain_photo_session') {
            console.log('📸 Explain photo session request detected');
            // Reset the flag so we can offer again in future sessions
            hasOfferedPhotoSessionRef.current = false;
            if (sendAssistantInput) {
              sendAssistantInput(
                "[Explain: \"Say 'take a series of photos' to start. Say 'shoot' for each photo. Say 'done' to see grid and delete unwanted ones.\"]"
              );
            }
            processingCommandRef.current = false;
          }

          // Handle photo session start request
          else if (command.type === 'photo_session') {
            console.log('📸 Photo session start request detected');

            // Start photo session mode
            setIsPhotoSession(true);
            setSessionPhotos([]);
            setShowPhotoGrid(false);
            photoSessionStartTimeRef.current = Date.now(); // Record start time

            // Turn on camera if not already on
            if (!isVisionActive) {
              toggleVision();
            }

            // if (sendAssistantInput) {
            //   sendAssistantInput(
            //     '[Photo session starting! Camera enlarging. Say "shoot" for each photo.]'
            //   );
            // }
            processingCommandRef.current = false;
          }

          // Handle end photo session request
          else if (command.type === 'end_photo_session') {
            console.log('📸 End photo session request detected');

            // End photo session and show grid
            setIsPhotoSession(false);
            setShowPhotoGrid(true);

            // Only send message if there are actually photos
            if (sendAssistantInput && sessionPhotos.length > 0) {
              sendAssistantInput(
                `[Session ended! Showing ${sessionPhotos.length} photos in grid.]`
              );
            }
            processingCommandRef.current = false;
          }

          // Handle show bounding boxes request
          else if (command.type === 'show_boxes') {
            console.log('📦 Show bounding boxes request detected');
            setShowBoundingBoxes(true);
            if (sendAssistantInput) {
              sendAssistantInput('Showing object detection boxes.');
            }
            processingCommandRef.current = false;
          }

          // Handle hide bounding boxes request
          else if (command.type === 'hide_boxes') {
            console.log('📦 Hide bounding boxes request detected');
            setShowBoundingBoxes(false);
            if (sendAssistantInput) {
              sendAssistantInput('Hiding object detection boxes.');
            }
            processingCommandRef.current = false;
          }

          // Handle fashion analysis request
          else if (command.type === 'fashion_analysis') {
            console.log('👗 Fashion analysis request detected');

            if (isVisionActive) {
              // Camera is on - capture frame and analyze
              const frame = (window as any).__visionCaptureFrame?.();
              if (frame) {
                // Call fashion analysis API
                fetch('/api/vision/fashion', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    imageData: frame,
                    question: 'Analyze this outfit and provide detailed fashion advice.',
                  }),
                })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.success && data.analysis) {
                      console.log('👗 Fashion analysis complete');
                      if (sendAssistantInput) {
                        // Send the analysis directly - NoVo will speak it
                        sendAssistantInput(data.analysis);
                      }
                    }
                  })
                  .catch((error) => {
                    console.error('👗 Fashion analysis error:', error);
                  });
              }
            } else {
              // Camera is off - ask user to turn it on
              if (sendAssistantInput) {
                sendAssistantInput(
                  'I need to see you to analyze your outfit. Can you turn on the camera?'
                );
              }
            }
            processingCommandRef.current = false;
          } else {
            processingCommandRef.current = false;
          }
        }
      }
      // === END COMMAND DETECTION ===

      // Check if user wants to email the picture
      if (
        content.toLowerCase().includes('email') &&
        (content.toLowerCase().includes('yes') ||
          content.toLowerCase().includes('please') ||
          content.toLowerCase().includes('send'))
      ) {
        console.log('📧 User wants to email the picture');
        emailIntentRef.current.wantsEmail = true;
      }

      // Extract email address (including spoken format like "wayne at wharburn dot com")
      const emailMatch = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (!emailMatch) {
        // Try to parse spoken email format: "wayne at wharburn dot com"
        const spokenEmailMatch = content.match(
          /([a-zA-Z0-9._%+-]+)\s+at\s+([a-zA-Z0-9.-]+)\s+dot\s+([a-zA-Z]{2,})/i
        );
        if (spokenEmailMatch) {
          const constructedEmail = `${spokenEmailMatch[1]}@${spokenEmailMatch[2]}.${spokenEmailMatch[3]}`;
          console.log('📧 Constructed email from spoken format:', constructedEmail);
          emailIntentRef.current.email = constructedEmail;
          // Save to Redis
          saveUserProfile({ email: constructedEmail });
        }
      } else {
        emailIntentRef.current.email = emailMatch[0];
        console.log('📧 Extracted email:', emailMatch[0]);
        // Save to Redis
        saveUserProfile({ email: emailMatch[0] });
      }

      // Extract name from various patterns
      // Common words to exclude - these are NOT names
      const excludedWords = new Set([
        'sure',
        'okay',
        'ok',
        'yes',
        'no',
        'yeah',
        'yep',
        'nope',
        'great',
        'good',
        'fine',
        'thanks',
        'thank',
        'please',
        'hello',
        'hi',
        'hey',
        'bye',
        'goodbye',
        'well',
        'actually',
        'really',
        'just',
        'right',
        'correct',
        'true',
        'false',
        'maybe',
        'perhaps',
        'probably',
        'definitely',
        'absolutely',
        'certainly',
        'perfect',
        'awesome',
        'cool',
        'nice',
        'alright',
        'sorry',
        'wow',
        'oh',
        'the',
        'and',
        'but',
        'for',
        'are',
        'was',
        'were',
        'been',
        'being',
        'have',
        'has',
        'had',
        'having',
        'will',
        'would',
        'could',
        'should',
        'email',
        'photo',
        'picture',
        'camera',
        'send',
        'take',
        'call',
      ]);

      if (!emailIntentRef.current.name) {
        let extractedName: string | null = null;

        // Pattern 1: "my name is [name]" or "I'm [name]" or "I am [name]" or "call me [name]"
        const namePattern1 = content.match(
          /(?:my\s+name\s+is|i'?m|i\s+am|call\s+me)\s+([a-zA-Z]+)/i
        );
        if (namePattern1 && namePattern1[1]) {
          extractedName = namePattern1[1];
        }

        // Pattern 2: "it's [name]" - removed $ to allow "it's wayne and the email..."
        if (!extractedName) {
          const namePattern2 = content.match(/(?:it'?s|this\s+is)\s+([a-zA-Z]+)/i);
          if (namePattern2 && namePattern2[1]) {
            extractedName = namePattern2[1];
          }
        }

        // Pattern 3: "yes, [name]" or "yes it's [name]" at the start
        if (!extractedName) {
          const namePattern3 = content.match(/^yes[,\s]+(?:it'?s\s+)?([a-zA-Z]+)/i);
          if (namePattern3 && namePattern3[1]) {
            extractedName = namePattern3[1];
          }
        }

        // Validate the extracted name
        if (extractedName && extractedName.length > 1) {
          const nameLower = extractedName.toLowerCase();
          if (!excludedWords.has(nameLower)) {
            const name =
              extractedName.charAt(0).toUpperCase() + extractedName.slice(1).toLowerCase();
            emailIntentRef.current.name = name;
            console.log('👤 Extracted name from user message:', name);

            // Save to Redis
            saveUserProfile({ name });
          } else {
            console.log('👤 Rejected invalid name:', extractedName);
          }
        }
      }

      // If message looks like just a name (short, no special chars, after asking for name)
      if (
        emailIntentRef.current.wantsEmail &&
        emailIntentRef.current.email &&
        !emailIntentRef.current.name &&
        content.length < 50 &&
        !content.includes('@') &&
        /^[a-zA-Z\s]+$/.test(content)
      ) {
        const name = content.trim();
        emailIntentRef.current.name = name;
        console.log('👤 Extracted name (simple):', name);
        // Save to Redis
        saveUserProfile({ name });
      }

      // Check if user confirms identity ("yes", "that's me", "correct")
      if (
        userProfile?.name &&
        !identityConfirmedRef.current &&
        (content.toLowerCase().includes('yes') ||
          content.toLowerCase().includes("that's me") ||
          content.toLowerCase().includes('thats me') ||
          content.toLowerCase().includes('correct') ||
          content.toLowerCase().includes('right'))
      ) {
        console.log('👤 User confirmed identity as:', userProfile.name);
        identityConfirmedRef.current = true;
        // Pre-fill email intent with stored data
        if (userProfile.email) emailIntentRef.current.email = userProfile.email;
        if (userProfile.name) emailIntentRef.current.name = userProfile.name;
      }

      // Check if user denies identity ("no", "not me", "different person")
      if (
        userProfile?.name &&
        !identityConfirmedRef.current &&
        (content.toLowerCase().includes('no') ||
          content.toLowerCase().includes('not me') ||
          content.toLowerCase().includes("i'm not") ||
          content.toLowerCase().includes('different'))
      ) {
        console.log('👤 User denied identity, clearing stored name');
        // Clear the stored name
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'newUser' }),
        });
        setUserProfile((prev) => (prev ? { ...prev, name: undefined } : null));
      }

      // Extract additional personal information from user messages
      const lowerContent = content.toLowerCase();
      const profileUpdates: Record<string, string | number> = {};

      // Birthday patterns: "my birthday is", "I was born on", "born on"
      const birthdayMatch = content.match(
        /(?:birthday\s+is|born\s+on|born\s+in)\s+([A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*,?\s*\d{4})?|\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i
      );
      if (birthdayMatch) {
        profileUpdates.birthday = birthdayMatch[1];
        console.log('🎂 Extracted birthday:', birthdayMatch[1]);
      }

      // Age patterns: "I'm X years old", "I am X", "age is X"
      const ageMatch = content.match(/(?:i'?m|i\s+am|age\s+is)\s+(\d{1,3})\s*(?:years?\s+old)?/i);
      if (ageMatch) {
        profileUpdates.age = parseInt(ageMatch[1], 10);
        console.log('📅 Extracted age:', ageMatch[1]);
      }

      // Relationship status patterns
      if (
        lowerContent.includes('married') ||
        lowerContent.includes('spouse') ||
        lowerContent.includes('husband') ||
        lowerContent.includes('wife')
      ) {
        profileUpdates.relationshipStatus = 'married';
        console.log('💍 Extracted relationship status: married');
      } else if (lowerContent.includes('single') || lowerContent.includes('not married')) {
        profileUpdates.relationshipStatus = 'single';
        console.log('💍 Extracted relationship status: single');
      } else if (lowerContent.includes('divorced')) {
        profileUpdates.relationshipStatus = 'divorced';
        console.log('💍 Extracted relationship status: divorced');
      } else if (lowerContent.includes('engaged')) {
        profileUpdates.relationshipStatus = 'engaged';
        console.log('💍 Extracted relationship status: engaged');
      }

      // Occupation patterns: "I work as", "I'm a", "my job is", "I do"
      const occupationMatch = content.match(
        /(?:i\s+work\s+as\s+(?:a\s+)?|i'?m\s+a\s+|my\s+job\s+is\s+(?:a\s+)?|i\s+am\s+a\s+|profession\s+is\s+(?:a\s+)?)([a-zA-Z\s]+?)(?:\.|,|$|\s+at\s+|\s+for\s+|\s+and\s+)/i
      );
      if (occupationMatch && occupationMatch[1].trim().length > 2) {
        profileUpdates.occupation = occupationMatch[1].trim();
        console.log('💼 Extracted occupation:', occupationMatch[1].trim());
      }

      // Employer patterns: "I work at", "I work for", "employed at/by"
      const employerMatch = content.match(
        /(?:i\s+work\s+(?:at|for)|employed\s+(?:at|by)|company\s+is)\s+([A-Za-z0-9\s&]+?)(?:\.|,|$|\s+as\s+)/i
      );
      if (employerMatch && employerMatch[1].trim().length > 1) {
        profileUpdates.employer = employerMatch[1].trim();
        console.log('🏢 Extracted employer:', employerMatch[1].trim());
      }

      // Location patterns: "I live in", "I'm from", "located in"
      const locationMatch = content.match(
        /(?:i\s+live\s+in|i'?m\s+from|located\s+in|i\s+am\s+from|based\s+in)\s+([A-Za-z\s,]+?)(?:\.|$|and\s+)/i
      );
      if (locationMatch && locationMatch[1].trim().length > 2) {
        profileUpdates.location = locationMatch[1].trim();
        console.log('📍 Extracted location:', locationMatch[1].trim());
      }

      // Phone number patterns
      const phoneMatch = content.match(
        /(?:phone\s+(?:number\s+)?is|number\s+is|call\s+me\s+(?:at|on))\s*[:\s]*([+]?[\d\s\-\(\)]{10,})/i
      );
      if (phoneMatch) {
        profileUpdates.phone = phoneMatch[1].replace(/\s/g, '');
        console.log('📱 Extracted phone:', phoneMatch[1]);
      }

      // Save any extracted profile updates
      if (Object.keys(profileUpdates).length > 0) {
        console.log('👤 Saving profile updates:', profileUpdates);
        saveUserProfile(profileUpdates as any);
      }
    }

    // Check for assistant messages asking for email/name
    if (lastMessage.type === 'assistant_message') {
      const assistantMsg = lastMessage as any;
      const content = assistantMsg.message?.content || '';

      // If NoVo asks about emailing, set intent
      if (
        content.toLowerCase().includes('email') &&
        (content.toLowerCase().includes('would you like') ||
          content.toLowerCase().includes('want me to') ||
          content.toLowerCase().includes('should i'))
      ) {
        console.log('📧 NoVo asking about emailing - setting intent');
        emailIntentRef.current.wantsEmail = true;
      }

      // If NoVo says she's sending the email, extract email and name from her message
      // Triggers on: "send photo", "sending to", "I'll send that", etc.
      const lowerContent = content.toLowerCase();
      const isSendingMessage =
        (lowerContent.includes('send') || lowerContent.includes('sending')) &&
        (lowerContent.includes('photo') ||
          lowerContent.includes('picture') ||
          lowerContent.includes('to') ||
          lowerContent.includes('email'));

      if (isSendingMessage && lastCapturedImageRef.current) {
        console.log("📧 NoVo says she's sending the photo");

        // Extract email from NoVo's message
        const emailMatch = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        if (emailMatch) {
          emailIntentRef.current.email = emailMatch[0];
          emailIntentRef.current.wantsEmail = true;
          console.log('📧 Extracted email from NoVo:', emailMatch[0]);
        }

        // Extract name from NoVo's message (look for capitalized words that might be names)
        // Common words to exclude - these are NOT names
        const excludedNovoWords = new Set([
          'sure',
          'okay',
          'ok',
          'yes',
          'no',
          'yeah',
          'great',
          'good',
          'perfect',
          'fine',
          'thanks',
          'thank',
          'please',
          'hello',
          'hi',
          'hey',
          'bye',
          'well',
          'actually',
          'really',
          'just',
          'right',
          'alright',
          'got',
          'email',
          'photo',
          'picture',
          'camera',
          'send',
          'sending',
          'sent',
          'would',
          'could',
          'should',
          'will',
          'the',
          'and',
          'for',
          'that',
          'this',
          'your',
          'you',
          'now',
          'away',
          'right',
          'done',
          'here',
        ]);

        let extractedName: string | null = null;

        // Pattern 1: "Got it, [Name]" or "Perfect, [Name]" - name after greeting
        const namePattern1 = content.match(
          /(?:got\s+it|perfect|great|okay|alright),?\s+([A-Z][a-z]+)/i
        );
        if (
          namePattern1 &&
          namePattern1[1] &&
          !excludedNovoWords.has(namePattern1[1].toLowerCase())
        ) {
          extractedName = namePattern1[1];
        }

        // Pattern 2: "send...to [Name]" - name before email
        if (!extractedName) {
          const namePattern2 = content.match(/(?:send|email).*?to\s+([A-Z][a-z]+)(?:@|\s+at\s+)/i);
          if (
            namePattern2 &&
            namePattern2[1] &&
            !excludedNovoWords.has(namePattern2[1].toLowerCase())
          ) {
            extractedName = namePattern2[1];
          }
        }

        // Pattern 3: "[Name]," at the start when addressing user
        if (!extractedName) {
          const namePattern3 = content.match(/^([A-Z][a-z]+),/);
          if (
            namePattern3 &&
            namePattern3[1] &&
            !excludedNovoWords.has(namePattern3[1].toLowerCase())
          ) {
            extractedName = namePattern3[1];
          }
        }

        if (extractedName) {
          emailIntentRef.current.name = extractedName;
          console.log('👤 Extracted name from NoVo:', extractedName);
        } else {
          // Fallback: use stored user profile name
          if (userProfile?.name) {
            emailIntentRef.current.name = userProfile.name;
            console.log('👤 Using stored user profile name:', userProfile.name);
          } else {
            console.log('👤 Could not extract valid name from NoVo message');
          }
        }

        // Trigger email immediately if we have all info
        const intent = emailIntentRef.current;
        console.log('📧 Email trigger check:', {
          wantsEmail: intent.wantsEmail,
          email: intent.email,
          name: intent.name,
          hasImage: !!lastCapturedImageRef.current,
        });
        if (intent.wantsEmail && intent.email && intent.name && lastCapturedImageRef.current) {
          console.log('📧 Auto-triggering email NOW with collected info:', intent);

          // Reset intent to prevent duplicate sends
          emailIntentRef.current = {
            wantsEmail: false,
            email: null,
            name: null,
          };

          // Send the email
          fetch('/api/tools/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              toolName: 'send_email_picture',
              parameters: {
                email: intent.email,
                user_name: intent.name,
                image_url: lastCapturedImageRef.current,
                caption: 'Picture from NoVo!',
              },
            }),
          })
            .then((res) => res.json())
            .then((result) => {
              console.log('📧 Auto-email result:', result);
              if (result.success) {
                console.log('✅ Email sent successfully!');
              } else {
                console.error('❌ Email failed:', result.error);
              }
            })
            .catch((error) => {
              console.error('📧 Auto-email error:', error);
            });
        }
      }
    }

    // Check for tool call messages
    // Hume SDK ToolCallMessage has: type: 'tool_call', name, toolCallId, parameters (string)
    if (lastMessage.type === 'tool_call') {
      const toolCall = lastMessage as {
        type: string;
        name?: string;
        tool_name?: string;
        toolCallId?: string;
        tool_call_id?: string;
        parameters?: string;
      };

      const toolName = toolCall.name || toolCall.tool_name;
      const toolCallId = toolCall.toolCallId || toolCall.tool_call_id;

      console.log('🔧 Tool call detected!');
      console.log('🔧 Tool name:', toolName);
      console.log('🔧 Tool call ID:', toolCallId);
      console.log('🔧 Full tool call message:', JSON.stringify(toolCall, null, 2));

      // Handle take_picture tool
      if (toolName === 'take_picture') {
        console.log('📸 Opening camera...');
        pendingToolCallIdRef.current = toolCallId || null;
        setShowCamera(true);
      }

      // Handle send_email_picture / send_picture_email tool - inject the stored image URL
      // Note: tools-config.json uses 'send_picture_email', but we support both names
      if (toolName === 'send_email_picture' || toolName === 'send_picture_email') {
        console.log('📧 Handling send_email_picture tool call');

        // Parse parameters
        let params: any = {};
        try {
          params = JSON.parse(toolCall.parameters || '{}');
        } catch (error) {
          console.error('Failed to parse tool parameters:', error);
        }

        // Inject the stored image URL
        if (lastCapturedImageRef.current) {
          params.image_url = lastCapturedImageRef.current;
          console.log('📸 Injecting stored image URL:', lastCapturedImageRef.current);
        } else {
          console.warn('⚠️ No image URL stored! User needs to take a picture first.');
          // Send error response back to Hume AI immediately
          if (toolCallId && sendToolMessage) {
            sendToolMessage({
              type: 'tool_error',
              toolCallId: toolCallId,
              error:
                'No photo available. Please take a picture first using the take_picture command.',
              content: '',
            } as any);
          }
          return; // Don't proceed with the API call
        }

        // Execute the tool
        console.log('📧 Executing send_email_picture with params:', params);
        fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: 'send_email_picture',
            parameters: params,
          }),
        })
          .then((res) => res.json())
          .then((result) => {
            console.log('📧 Email result:', result);

            // Send tool response back to Hume AI
            if (toolCallId && sendToolMessage) {
              sendToolMessage({
                type: 'tool_response',
                toolCallId: toolCallId,
                content: result.success
                  ? `Picture sent successfully to ${params.email}!`
                  : `Failed to send picture: ${result.error}`,
              } as any);
            }
          })
          .catch((error) => {
            console.error('📧 Email error:', error);

            // Send error response back to Hume AI
            if (toolCallId && sendToolMessage) {
              sendToolMessage({
                type: 'tool_error',
                toolCallId: toolCallId,
                error: `Failed to send picture: ${error.message}`,
                content: '',
              } as any);
            }
          });
      }
    }

    // Check for tool response messages with image URLs
    if (lastMessage.type === 'tool_response') {
      const toolResponse = lastMessage as {
        tool_name?: string;
        content?: string;
      };

      console.log('🔧 Tool response:', toolResponse.tool_name);

      try {
        const content = JSON.parse(toolResponse.content || '{}');

        // Handle take_picture response with image URL
        if (toolResponse.tool_name === 'take_picture' && content.image_url) {
          console.log('📸 Displaying captured image:', content.image_url);
          setDisplayedImage({
            url: content.image_url,
            source: 'camera',
            caption: content.message,
            timestamp: new Date(),
          });
        }

        // Handle any other tool that returns an image_url
        if (content.image_url && toolResponse.tool_name !== 'take_picture') {
          console.log('🖼️ Displaying image from tool:', toolResponse.tool_name);
          setDisplayedImage({
            url: content.image_url,
            source: 'web',
            caption: content.caption || content.message,
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error('Failed to parse tool response:', error);
      }
    }
  }, [messages]);

  // Record messages
  useEffect(() => {
    if (!sessionIdRef.current || messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Extract content based on message type
    let content = '';
    let role: 'user' | 'assistant' | null = null;

    if (lastMessage.type === 'user_message') {
      const userMsg = lastMessage as { message?: { content?: string } };
      content = userMsg.message?.content || '';
      role = 'user';
    } else if (lastMessage.type === 'assistant_message') {
      const assistantMsg = lastMessage as { message?: { content?: string } };
      content = assistantMsg.message?.content || '';
      role = 'assistant';
    }

    // Only record if we have content and it's different from last recorded
    if (role && content && content !== lastRecordedMessageRef.current) {
      lastRecordedMessageRef.current = content;

      fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'message',
          sessionId: sessionIdRef.current,
          role,
          content,
        }),
      })
        .then(() => console.log(`📝 Recorded ${role} message`))
        .catch((err) => console.error('Failed to record message:', err));
    }
  }, [messages]);

  // Debug: log when speaking state changes
  useEffect(() => {
    console.log(`🔊 isPlaying changed: ${isPlaying}, isSpeaking: ${isSpeaking}`);
    // Clear spoken text when speaking stops
    if (!isPlaying) {
      setCurrentSpokenText('');
    }
  }, [isPlaying, isSpeaking]);

  // Silence detection - offer photo session mode after 30 seconds of silence
  useEffect(() => {
    if (!isConnected || isQuietMode || hasOfferedPhotoSessionRef.current) return;

    // Reset timer when user speaks
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.type === 'user_message') {
      lastUserMessageTimeRef.current = Date.now();

      // Clear existing timer
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }

      // Start new timer - offer photo session mode after 30 seconds of silence
      silenceTimerRef.current = setTimeout(() => {
        if (!hasOfferedPhotoSessionRef.current && sendAssistantInput) {
          console.log('⏰ 30 seconds of silence - offering photo session mode');
          hasOfferedPhotoSessionRef.current = true;
          sendAssistantInput(
            '[After silence, ask: "Want to know about Photo Session Mode? It\'s great for taking multiple photos!"]'
          );
        }
      }, 30000); // 30 seconds
    }

    // Cleanup
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [messages, isConnected, isQuietMode, sendAssistantInput]);

  // Extract emotion from prosody AND text content
  // Blends voice analysis with text-based keyword detection
  useEffect(() => {
    if (lastAssistantProsodyMessage) {
      prosodyCountRef.current++;

      const prosodyScores = lastAssistantProsodyMessage.models?.prosody?.scores;
      // Get the text content from the prosody message
      const messageText = (lastAssistantProsodyMessage as { text?: string }).text || '';

      // Update current spoken text for phrase video matching
      if (messageText) {
        console.log(`🗣️ Hume speaking: "${messageText}"`);
        setCurrentSpokenText(messageText);
      }

      // Skip first 2 prosody messages - they often have unreliable emotion data
      // Default to happy for greetings
      if (prosodyCountRef.current <= 2) {
        const lowerText = messageText.toLowerCase();
        const isGreeting =
          lowerText.includes('hello') ||
          lowerText.includes('hi') ||
          lowerText.includes('hey') ||
          lowerText.includes('welcome') ||
          lowerText.includes('nice to') ||
          lowerText.includes('good to');
        if (isGreeting) {
          console.log(`Early message #${prosodyCountRef.current} - greeting detected, using happy`);
          setCurrentEmotion('happy');
        } else {
          console.log(`Early message #${prosodyCountRef.current} - staying neutral`);
          setCurrentEmotion('neutral');
        }
        return;
      }

      // Detect emotion from text
      const textEmotion = detectEmotionFromText(messageText);

      if (prosodyScores) {
        const scores = prosodyScores as unknown as Record<string, number>;

        // Find top 5 emotions for debugging
        const sortedEmotions = Object.entries(scores)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5);

        // Update voice emotions for display (top 3)
        const topThreeEmotions = sortedEmotions.slice(0, 3).map(([emotion, score]) => ({
          emotion,
          score,
        }));
        setVoiceEmotions(topThreeEmotions);

        console.log('=== Top 5 Prosody Emotions ===');
        sortedEmotions.forEach(([emotion, score]) => {
          console.log(`  ${emotion}: ${(score * 100).toFixed(1)}%`);
        });

        const prosodyEmotion = getDominantEmotion(scores);
        console.log(`Prosody emotion: ${prosodyEmotion}`);
        console.log(`Text emotion: ${textEmotion} (from: "${messageText.slice(0, 50)}...")`);

        // Blend prosody and text emotions:
        // Priority: happy/excited > text emotion > neutral > fear/sad
        // Fear and sad should require very strong signals
        let finalEmotion: Emotion;

        // Get the top emotion score
        const topScore = sortedEmotions[0]?.[1] || 0;

        // If prosody detected happy/excited with decent confidence, use it
        if ((prosodyEmotion === 'happy' || prosodyEmotion === 'excited') && topScore > 0.15) {
          finalEmotion = prosodyEmotion;
          console.log(
            `Using PROSODY emotion (happy/excited with ${(topScore * 100).toFixed(1)}% confidence)`
          );
        }
        // Fear and sad need VERY high confidence (>40%) to override
        else if ((prosodyEmotion === 'fear' || prosodyEmotion === 'sad') && topScore < 0.4) {
          // Don't use fear/sad unless very confident - default to neutral or text
          finalEmotion = textEmotion || 'neutral';
          console.log(
            `Ignoring weak fear/sad (${(topScore * 100).toFixed(1)}%), using: ${finalEmotion}`
          );
        }
        // Text emotion takes precedence for weak prosody signals
        else if (
          textEmotion &&
          (prosodyEmotion === 'neutral' || prosodyEmotion === 'thinking' || topScore < 0.2)
        ) {
          finalEmotion = textEmotion;
          console.log(
            `Using TEXT emotion (prosody was weak: ${prosodyEmotion} at ${(topScore * 100).toFixed(1)}%)`
          );
        }
        // Strong prosody signal (not fear/sad)
        else if (
          prosodyEmotion !== 'neutral' &&
          prosodyEmotion !== 'fear' &&
          prosodyEmotion !== 'sad' &&
          topScore > 0.2
        ) {
          finalEmotion = prosodyEmotion;
          console.log(`Using PROSODY emotion: ${prosodyEmotion}`);
        }
        // Fallback to text or neutral
        else if (textEmotion) {
          finalEmotion = textEmotion;
          console.log(`Using TEXT emotion as fallback`);
        } else {
          // Default to happy for speech (more natural than neutral)
          finalEmotion = 'happy';
          console.log(`No strong emotion detected, defaulting to happy`);
        }

        console.log(`Final avatar emotion: ${finalEmotion}`);
        setCurrentEmotion(finalEmotion);
      } else if (textEmotion) {
        // No prosody data but we have text emotion
        console.log(`No prosody data, using text emotion: ${textEmotion}`);
        setCurrentEmotion(textEmotion);
      }
    }
  }, [lastAssistantProsodyMessage]);

  // Filter messages for display count
  const chatMessages = messages.filter(
    (msg) => msg.type === 'user_message' || msg.type === 'assistant_message'
  );

  // Photo grid handlers
  const handlePhotoDelete = (id: string) => {
    setSessionPhotos((prev) => prev.filter((photo) => photo.id !== id));
  };

  const handleClosePhotoGrid = () => {
    setShowPhotoGrid(false);
    setIsPhotoSession(false);
    setSessionPhotos([]); // Clear photos when closing grid
  };

  const handleEmailPhotos = async () => {
    console.log('📧 Emailing photos:', sessionPhotos.length);

    // Get user profile for email and name
    const userProfile = await fetch('/api/user/profile')
      .then((res) => res.json())
      .catch(() => null);

    if (!userProfile?.email || !userProfile?.name) {
      console.error('📧 Missing user email or name');
      // if (sendAssistantInput) {
      //   sendAssistantInput('[Need email and name to send photos. Ask user for this info.]');
      // }
      return;
    }

    console.log('📧 Sending', sessionPhotos.length, 'photos to', userProfile.email);

    // Send each photo via email
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < sessionPhotos.length; i++) {
      const photo = sessionPhotos[i];
      console.log(`📧 Sending photo ${i + 1}/${sessionPhotos.length}...`);

      try {
        const result = await fetch('/api/tools/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            toolName: 'send_email_picture',
            parameters: {
              email: userProfile.email,
              user_name: userProfile.name,
              image_url: photo.url,
              caption: `Photo ${i + 1} of ${sessionPhotos.length} from your photo session`,
            },
          }),
        }).then((res) => res.json());

        if (result.success) {
          console.log(`📧 Photo ${i + 1} sent successfully`);
          successCount++;
        } else {
          console.error(`📧 Photo ${i + 1} failed:`, result.error);
          failCount++;
        }
      } catch (error) {
        console.error(`📧 Photo ${i + 1} error:`, error);
        failCount++;
      }
    }

    console.log(`📧 Email complete: ${successCount} sent, ${failCount} failed`);

    if (sendAssistantInput) {
      if (successCount === sessionPhotos.length) {
        sendAssistantInput(
          `[All ${sessionPhotos.length} photos sent successfully to ${userProfile.email}!]`
        );
      } else if (successCount > 0) {
        sendAssistantInput(
          `[Sent ${successCount} of ${sessionPhotos.length} photos to ${userProfile.email}. ${failCount} failed.]`
        );
      } else {
        // sendAssistantInput('[Failed to send photos. Please try again.]');
      }
    }

    // Close the grid after sending
    handleClosePhotoGrid();
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-white/80 backdrop-blur-sm">
        <div className="flex items-center">
          <img src="/NOVOC.png" alt="NOVOC" className="h-8 w-auto" />
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected
                ? 'bg-green-500'
                : readyState === VoiceReadyState.CONNECTING
                  ? 'bg-yellow-500 animate-pulse'
                  : 'bg-gray-400'
            }`}
          />
          <span className="text-xs text-gray-600">
            {isConnected
              ? 'Connected'
              : readyState === VoiceReadyState.CONNECTING
                ? 'Connecting...'
                : 'Disconnected'}
          </span>
        </div>
      </header>

      {/* Emotion Display - Voice and Video emotions */}
      <EmotionDisplay
        voiceEmotions={voiceEmotions}
        videoEmotions={videoEmotions}
        isVisionActive={isVisionActive}
      />

      {/* Avatar Section - Dynamic Height */}
      <div
        className={`relative transition-all duration-300 ease-in-out ${
          transcriptVisible ? 'h-[55vh]' : 'flex-1'
        }`}
      >
        {/* Vision Stream (camera preview when active) - positioned inside avatar space */}
        <VisionStream
          isActive={isVisionActive}
          onFaceDetected={handleFaceDetected}
          onEmotionsDetected={setVideoEmotions}
          onFrame={detectSceneChange}
          onDetectionsUpdate={handleDetectionsUpdate}
          isPhotoSession={isPhotoSession}
          showBoundingBoxes={showBoundingBoxes}
        />

        {displayedImage ? (
          <div className="relative w-full h-full flex items-center justify-center bg-black">
            <img
              src={displayedImage.url}
              alt="Captured photo"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setDisplayedImage(null)}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
              aria-label="Close photo"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        ) : (
          <>
            {/* Avatar with fade effect when weather is showing */}
            <div
              className="w-full h-full transition-opacity duration-500 relative"
              style={{ opacity: showWeatherOverlay ? 0.1 : 1 }}
            >
              <AvatarDisplay
                isListening={isListening}
                isSpeaking={isSpeaking}
                spokenText={currentSpokenText}
                micVolume={micVolume}
                isConnected={isConnected}
                onGreetingComplete={() => {
                  console.log('🎬 Greeting video complete - ready to send greeting message');
                  greetingVideoFinishedRef.current = true;
                }}
              />

              {/* Development in Progress Banner */}
              <div className="absolute top-8 left-0 right-0 bg-gradient-to-r from-yellow-500/50 via-yellow-400/50 to-yellow-500/50 text-black py-3 px-6 transform -rotate-2 shadow-lg z-50">
                <p className="text-center text-xl font-bold tracking-wider">
                  🚧 DEVELOPMENT IN PROGRESS 🚧
                </p>
              </div>
            </div>

            {/* Weather overlay - shows on top of faded avatar */}
            <WeatherOverlay
              weather={weatherData}
              isVisible={showWeatherOverlay}
              duration={4000}
              onComplete={() => {
                console.log('🌤️ Weather overlay complete - hiding');
                setShowWeatherOverlay(false);
                setWeatherData(null);
              }}
            />
          </>
        )}

        <ChatControls
          accessToken={accessToken}
          configId={configId}
          isVisionActive={isVisionActive}
          onVisionToggle={toggleVision}
          userProfile={userProfile}
        />
      </div>

      {/* Transcript Section - Collapsible */}
      <div
        className={`bg-white transition-all duration-300 ease-in-out overflow-hidden flex-1 relative z-40 ${
          transcriptVisible ? 'min-h-[200px] opacity-100' : 'h-0 min-h-0 opacity-0'
        }`}
      >
        {/* Header - Ultra-thin centered dropdown */}
        <div className="flex items-center justify-center px-3 py-0.5 bg-gray-100 relative">
          <button
            onClick={() => setTranscriptVisible(false)}
            className="p-1 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Hide transcript"
          >
            <ChevronDown className="w-4 h-4 text-gray-600" />
          </button>

          {/* Message count badge - positioned on the right */}
          {chatMessages.length > 0 && (
            <span className="absolute right-3 text-[10px] text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded-full">
              {chatMessages.length}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="h-[calc(100%-28px)] overflow-y-auto px-3 py-0.5">
          <ChatMessages />
        </div>
      </div>

      {/* Expand button when hidden */}
      {!transcriptVisible && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setTranscriptVisible(true)}
            className="bg-white rounded-full p-3 shadow-lg hover:shadow-xl transition-all border border-gray-200 flex items-center gap-2"
            aria-label="Show transcript"
          >
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <ChevronUp className="w-5 h-5 text-gray-700" />
            {chatMessages.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {chatMessages.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Camera Capture */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => {
            setShowCamera(false);
            pendingToolCallIdRef.current = null;
          }}
        />
      )}

      {/* Finish Session Button - shown during photo session */}
      {isPhotoSession && !showPhotoGrid && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[100] flex flex-col items-center gap-2">
          <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm">
            {sessionPhotos.length} {sessionPhotos.length === 1 ? 'photo' : 'photos'} captured
          </div>
          <button
            type="button"
            onClick={() => {
              // Prevent button click within first 2 seconds of session start
              const timeSinceStart = Date.now() - (photoSessionStartTimeRef.current || 0);
              if (timeSinceStart < 2000) {
                console.log(
                  '📸 Finish button click ignored - session too new (',
                  timeSinceStart,
                  'ms)'
                );
                return;
              }
              console.log('📸 Finish button clicked - ending photo session');
              setIsPhotoSession(false);
              setShowPhotoGrid(true);
              photoSessionStartTimeRef.current = null; // Clear the timer
              // if (sendAssistantInput) {
              //   sendAssistantInput(
              //     `[Session ended! Showing ${sessionPhotos.length} photos in grid.]`
              //   );
              // }
            }}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-semibold shadow-lg transition-all hover:scale-105"
          >
            Finish Session
          </button>
        </div>
      )}

      {/* Flash effect for photo capture */}
      {showFlash && (
        <div className="fixed inset-0 bg-white z-[9999] pointer-events-none animate-flash" />
      )}

      {/* Image Viewer Modal */}
      {displayedImage && (
        <ImageViewer
          imageUrl={displayedImage.url}
          source={displayedImage.source}
          caption={displayedImage.caption}
          timestamp={displayedImage.timestamp}
          onClose={() => setDisplayedImage(null)}
        />
      )}

      {/* Photo Grid Modal */}
      {showPhotoGrid && (
        <PhotoGrid
          photos={sessionPhotos}
          onPhotoDelete={handlePhotoDelete}
          onClose={handleClosePhotoGrid}
          onEmailPhotos={handleEmailPhotos}
        />
      )}
    </div>
  );
}

// Main Chat component with VoiceProvider wrapper
export default function Chat({ accessToken, configId }: ChatProps) {
  // State to pass tool calls to ChatInner
  const [pendingToolCall, setPendingToolCall] = useState<{
    name: string;
    toolCallId: string;
    parameters: string;
    send: {
      success: (content: unknown) => unknown;
      error: (e: { error: string; code: string; level: string; content: string }) => unknown;
    };
  } | null>(null);

  const handleMessage = (message: unknown) => {
    const msg = message as {
      type?: string;
      name?: string;
      toolCallId?: string;
      parameters?: string;
    };
    console.log(`Hume message [${msg.type}]:`, message);

    // Check if this is a tool_call message
    if (msg.type === 'tool_call') {
      console.log('🔧🔧🔧 TOOL CALL detected in onMessage! 🔧🔧🔧');
      console.log('🔧 Tool name:', msg.name);
      console.log('🔧 Tool call ID:', msg.toolCallId);
      console.log('🔧 Full message:', JSON.stringify(msg, null, 2));

      // Handle take_picture by setting state
      if (msg.name === 'take_picture') {
        console.log('📸 Setting pending tool call for camera...');
        setPendingToolCall({
          name: msg.name || '',
          toolCallId: msg.toolCallId || '',
          parameters: msg.parameters || '{}',
          send: {
            success: (content) => {
              console.log('📸 Tool success (from onMessage):', content);
              return content;
            },
            error: (e) => {
              console.error('📸 Tool error (from onMessage):', e);
              return e;
            },
          },
        });
      }
    }
  };

  const handleError = (error: unknown) => {
    // Log detailed error info for debugging WebSocket issues
    console.error('Hume error (raw):', JSON.stringify(error, null, 2));

    if (error && typeof error === 'object') {
      const err = error as Record<string, unknown>;
      console.error('Hume error details:');
      Object.keys(err).forEach((key) => {
        console.error(`  ${key}:`, err[key]);
      });
    }
  };

  // Handle tool calls from Hume AI
  const handleToolCall = async (
    toolCall: { name: string; toolCallId: string; parameters: string },
    send: {
      success: (content: unknown) => unknown;
      error: (e: { error: string; code: string; level: string; content: string }) => unknown;
    }
  ) => {
    try {
      console.log('🔧🔧🔧 TOOL CALL RECEIVED via onToolCall! 🔧🔧🔧');
      console.log('🔧 Tool name:', toolCall.name);
      console.log('🔧 Tool call ID:', toolCall.toolCallId);
      console.log('🔧 Parameters:', toolCall.parameters);

      // Pass to ChatInner via state
      setPendingToolCall({
        name: toolCall.name,
        toolCallId: toolCall.toolCallId,
        parameters: toolCall.parameters,
        send,
      });

      // Return a promise that will be resolved when ChatInner handles the tool call
      // For now, we'll handle simple tools here and complex ones (like camera) in ChatInner

      const params = JSON.parse(toolCall.parameters || '{}');

      // Handle take_picture - this needs to open the camera in ChatInner
      if (toolCall.name === 'take_picture') {
        // Don't send any response here - ChatInner will handle it when photo is captured
        // The send function is passed to ChatInner via pendingToolCall state
        console.log('📸 take_picture: Deferring response to ChatInner (camera capture)');
        return; // Don't call send.success() - let ChatInner do it after capture
      }

      // Handle send_email_summary - needs conversation messages from ChatInner
      if (toolCall.name === 'send_email_summary') {
        // Don't send any response here - ChatInner will handle it with conversation messages
        // The send function is passed to ChatInner via pendingToolCall state
        console.log('📧 send_email_summary: Deferring response to ChatInner (needs messages)');
        return; // Don't call send.success() - let ChatInner do it after sending email
      }

      // Handle send_email_picture / send_picture_email - needs stored image from ChatInner
      if (toolCall.name === 'send_email_picture' || toolCall.name === 'send_picture_email') {
        // Don't send any response here - ChatInner will handle it with the stored image URL
        // The send function is passed to ChatInner via pendingToolCall state
        console.log('📧 send_email_picture: Deferring response to ChatInner (needs image URL)');
        return; // Don't call send.success() - let ChatInner do it after sending email
      }

      // Handle analyze_vision - needs vision stream from ChatInner
      if (toolCall.name === 'analyze_vision') {
        // Don't send any response here - ChatInner will handle it with the vision stream
        // The send function is passed to ChatInner via pendingToolCall state
        console.log('👁️ analyze_vision: Deferring response to ChatInner (needs vision stream)');
        return; // Don't call send.success() - let ChatInner do it after analysis
      }

      // Handle get_weather - ChatInner will send the actual response via sendToolMessage
      if (toolCall.name === 'get_weather') {
        console.log('🌤️ get_weather: Deferring to ChatInner');
        // Return a dummy success to satisfy the SDK, but ChatInner will send the real response
        try {
          return send.success('Processing weather request...');
        } catch (error) {
          // Ignore SDK errors - ChatInner will send the real response via sendToolMessage
          console.log('🌤️ Ignoring SDK error (expected):', error);
          return;
        }
      }

      // Handle be_quiet - needs quiet mode state from ChatInner
      if (toolCall.name === 'be_quiet') {
        console.log('🤫 be_quiet: Deferring response to ChatInner (needs state)');
        return;
      }

      // Handle resume_talking - needs quiet mode state from ChatInner
      if (toolCall.name === 'resume_talking') {
        console.log('🗣️ resume_talking: Deferring response to ChatInner (needs state)');
        return;
      }

      // Handle other tools that can be executed immediately
      if (toolCall.name === 'open_browser') {
        const url = params.url;
        if (url) {
          window.open(url, '_blank');
          return send.success({ message: `Opened ${url} in a new tab` });
        }
        return send.error({
          error: 'No URL provided',
          code: 'MISSING_PARAM',
          level: 'error',
          content: '',
        });
      }

      if (toolCall.name === 'open_translator') {
        const translatorUrl =
          process.env.NEXT_PUBLIC_TRANSLATOR_URL || 'https://translate.google.com';
        window.open(translatorUrl, '_blank');
        return send.success({ message: 'Opened translator' });
      }

      // For other tools, return a generic success
      return send.success({ message: `Tool ${toolCall.name} acknowledged` });
    } catch (error) {
      // Suppress Hume SDK internal errors
      console.warn('🔧 Tool call handler error (suppressed):', error);
    }
  };

  return (
    <VoiceProvider
      onMessage={handleMessage}
      onError={handleError}
      onToolCall={handleToolCall as any}
    >
      <ChatInner
        accessToken={accessToken}
        configId={configId}
        pendingToolCall={pendingToolCall}
        onToolCallHandled={() => setPendingToolCall(null)}
      />
    </VoiceProvider>
  );
}
