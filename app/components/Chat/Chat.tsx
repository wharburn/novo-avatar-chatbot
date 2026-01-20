'use client';

import { Emotion } from '@/app/types/avatar';
import { playCameraClick } from '@/app/utils/sounds';
import { useVoice, VoiceProvider, VoiceReadyState } from '@humeai/voice-react';
import { ChevronDown, ChevronUp, MessageSquare, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import AvatarDisplay from '../Avatar/AvatarDisplay';
import CameraCapture from '../Camera/CameraCapture';
import ChatControls from './ChatControls';
import ChatMessages from './ChatMessages';
import ImageViewer from './ImageViewer';

interface ChatProps {
  accessToken: string;
  configId?: string;
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
function ChatInner({ accessToken, configId }: ChatProps) {
  const [transcriptVisible, setTranscriptVisible] = useState(true);
  const [currentEmotion, setCurrentEmotion] = useState<Emotion>('neutral');
  const prosodyCountRef = useRef(0);

  // Current spoken text for phrase video matching
  const [currentSpokenText, setCurrentSpokenText] = useState('');

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

  const {
    readyState,
    messages,
    isPlaying,
    lastAssistantProsodyMessage,
    sendToolMessage,
    sendAssistantInput,
  } = useVoice();

  const isConnected = readyState === VoiceReadyState.OPEN;
  const isSpeaking = isPlaying;
  const isListening = isConnected && !isPlaying;

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
    if (pendingToolCallIdRef.current && sendToolMessage) {
      try {
        // Send tool response with the image URL
        sendToolMessage({
          type: 'tool_response',
          toolCallId: pendingToolCallIdRef.current,
          content: `Picture captured successfully! Image URL: ${lastCapturedImageRef.current}`,
        } as any);

        console.log('📸 Tool response sent with image URL');
      } catch (error) {
        console.error('Failed to send tool response:', error);
      }

      pendingToolCallIdRef.current = null;
    }

    // Make NoVo ask about retaking the photo
    if (sendAssistantInput) {
      try {
        sendAssistantInput(
          "Would you like me to take another one, or is this one okay? If it's okay, I can email it to you."
        );
        console.log('📸 NoVo prompted to ask about retaking');
      } catch (error) {
        console.error('Failed to send assistant input:', error);
      }
    }
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

  // Listen for tool calls (take_picture, show_image, etc.)
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) return;

    // Check for user messages to extract email/name
    if (lastMessage.type === 'user_message') {
      const userMsg = lastMessage as any;
      const content = userMsg.message?.content || '';

      console.log('👤 User message:', content);

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

      // Extract email address
      const emailMatch = content.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        emailIntentRef.current.email = emailMatch[0];
        console.log('📧 Extracted email:', emailMatch[0]);
      }

      // If message looks like a name (short, no special chars, after asking for name)
      if (
        emailIntentRef.current.wantsEmail &&
        emailIntentRef.current.email &&
        !emailIntentRef.current.name &&
        content.length < 50 &&
        !content.includes('@') &&
        /^[a-zA-Z\s]+$/.test(content)
      ) {
        emailIntentRef.current.name = content.trim();
        console.log('👤 Extracted name:', content.trim());
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
    }

    // Check for tool call messages
    if (lastMessage.type === 'tool_call') {
      const toolCall = lastMessage as {
        name?: string;
        tool_name?: string;
        toolCallId?: string;
        tool_call_id?: string;
        parameters?: string;
      };

      const toolName = toolCall.name || toolCall.tool_name;
      const toolCallId = toolCall.toolCallId || toolCall.tool_call_id;

      console.log('🔧 Tool call detected:', toolName);

      // Handle take_picture tool
      if (toolName === 'take_picture') {
        console.log('📸 Opening camera...');
        pendingToolCallIdRef.current = toolCallId || null;
        setShowCamera(true);
      }

      // Handle send_email_picture tool - inject the stored image URL
      if (toolName === 'send_email_picture') {
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
                toolCallId: toolCallId,
                content: result.success
                  ? `Picture sent successfully to ${params.email}!`
                  : `Failed to send picture: ${result.error}`,
              });
            }
          })
          .catch((error) => {
            console.error('📧 Email error:', error);

            // Send error response back to Hume AI
            if (toolCallId && sendToolMessage) {
              sendToolMessage({
                toolCallId: toolCallId,
                content: `Failed to send picture: ${error.message}`,
              });
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

      {/* Avatar Section - Dynamic Height */}
      <div
        className={`relative transition-all duration-300 ease-in-out ${
          transcriptVisible ? 'h-[55vh]' : 'flex-1'
        }`}
      >
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
          <AvatarDisplay
            isListening={isListening}
            isSpeaking={isSpeaking}
            spokenText={currentSpokenText}
            onGreetingComplete={() => {
              console.log('🎬 Greeting complete');
            }}
          />
        )}

        <ChatControls accessToken={accessToken} configId={configId} />
      </div>

      {/* Transcript Section - Collapsible */}
      <div
        className={`bg-white border-t-2 border-gray-200 transition-all duration-300 ease-in-out overflow-hidden flex-1 relative z-40 ${
          transcriptVisible ? 'min-h-[200px] opacity-100' : 'h-0 min-h-0 opacity-0'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-600" />
            <h3 className="text-sm font-medium text-gray-700">Conversation</h3>
            {chatMessages.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                {chatMessages.length}
              </span>
            )}
          </div>
          <button
            onClick={() => setTranscriptVisible(false)}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            aria-label="Hide transcript"
          >
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Messages */}
        <div className="h-[calc(100%-48px)] overflow-y-auto px-4 py-2">
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
    </div>
  );
}

// Main Chat component with VoiceProvider wrapper
export default function Chat({ accessToken, configId }: ChatProps) {
  const handleMessage = (message: unknown) => {
    const msg = message as { type?: string };
    console.log(`Hume message [${msg.type}]:`, message);
  };

  const handleError = (error: unknown) => {
    console.error('Hume error:', error);
    // Log detailed error info for debugging WebSocket issues
    if (error && typeof error === 'object') {
      const err = error as { type?: string; reason?: string; message?: string };
      console.error('Error type:', err.type);
      console.error('Error reason:', err.reason);
      console.error('Error message:', err.message);
    }
  };

  return (
    <VoiceProvider onMessage={handleMessage} onError={handleError}>
      <ChatInner accessToken={accessToken} configId={configId} />
    </VoiceProvider>
  );
}
