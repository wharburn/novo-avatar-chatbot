'use client';

// Emotion to color mapping
const EMOTION_COLORS: Record<string, string> = {
  // Positive emotions - warm colors
  joy: '#FFD700', // Gold
  happiness: '#FFD700',
  happy: '#FFD700',
  excitement: '#FF6B35', // Orange
  excited: '#FF6B35',
  love: '#FF69B4', // Hot pink
  amusement: '#FFA500', // Orange
  contentment: '#90EE90', // Light green
  satisfaction: '#98FB98', // Pale green
  pride: '#9370DB', // Medium purple
  gratitude: '#87CEEB', // Sky blue
  relief: '#ADD8E6', // Light blue
  admiration: '#DDA0DD', // Plum

  // Neutral/thinking emotions - cool colors
  neutral: '#808080', // Gray
  thinking: '#4169E1', // Royal blue
  concentration: '#4682B4', // Steel blue
  contemplation: '#5F9EA0', // Cadet blue
  curiosity: '#20B2AA', // Light sea green
  interest: '#00CED1', // Dark turquoise

  // Negative emotions - dark/intense colors
  sadness: '#4169E1', // Royal blue
  sad: '#4169E1',
  anger: '#DC143C', // Crimson
  angry: '#DC143C',
  fear: '#800080', // Purple
  anxiety: '#9932CC', // Dark orchid
  disgust: '#006400', // Dark green
  contempt: '#8B0000', // Dark red

  // Surprise emotions
  surprise: '#FF1493', // Deep pink
  surprised: '#FF1493',
  amazement: '#FF00FF', // Magenta
  awe: '#BA55D3', // Medium orchid

  // Other emotions
  confusion: '#DAA520', // Goldenrod
  boredom: '#A9A9A9', // Dark gray
  tiredness: '#778899', // Light slate gray
  suspicious: '#CD853F', // Peru
  doubt: '#BDB76B', // Dark khaki
};

// Get color for an emotion, with fallback
function getEmotionColor(emotion: string): string {
  const lowerEmotion = emotion.toLowerCase();
  return EMOTION_COLORS[lowerEmotion] || '#808080'; // Default gray
}

// Get contrasting text color (black or white) based on background
function getTextColor(bgColor: string): string {
  // Convert hex to RGB
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

export interface EmotionScore {
  emotion: string;
  score: number;
}

interface EmotionDisplayProps {
  voiceEmotions: EmotionScore[];
  videoEmotions: EmotionScore[];
  isVisionActive: boolean;
}

function EmotionBox({
  emotion,
  score,
  isEmpty = false,
}: {
  emotion?: string;
  score?: number;
  isEmpty?: boolean;
}) {
  const bgColor = isEmpty || !emotion ? '#E5E7EB' : getEmotionColor(emotion);
  const textColor = getTextColor(bgColor);

  // Format emotion name: capitalize first letter
  const displayName = emotion
    ? emotion.charAt(0).toUpperCase() + emotion.slice(1).toLowerCase()
    : '';

  // Format score as percentage
  const displayScore = score ? `${Math.round(score * 100)}%` : '';

  return (
    <div
      className="flex-1 h-[30px] rounded-sm flex items-center justify-center text-sm font-bold transition-all duration-300"
      style={{
        backgroundColor: bgColor,
        color: textColor,
      }}
      title={emotion ? `${emotion}: ${Math.round((score || 0) * 100)}%` : 'No emotion detected'}
    >
      {!isEmpty && emotion && (
        <span className="truncate px-2">
          {displayName} {displayScore}
        </span>
      )}
    </div>
  );
}

function EmotionRow({
  label,
  emotions,
  isActive = true,
}: {
  label: string;
  emotions: EmotionScore[];
  isActive?: boolean;
}) {
  // Always show 3 boxes
  const displayEmotions = emotions.slice(0, 3);
  while (displayEmotions.length < 3) {
    displayEmotions.push({ emotion: '', score: 0 });
  }

  return (
    <div className="flex items-center gap-1 px-2">
      <span className="text-[11px] font-semibold text-gray-600 w-12 shrink-0">{label}</span>
      <div className="flex gap-1 flex-1">
        {displayEmotions.map((e, i) => (
          <EmotionBox
            key={i}
            emotion={e.emotion}
            score={e.score}
            isEmpty={!isActive || !e.emotion}
          />
        ))}
      </div>
    </div>
  );
}

export default function EmotionDisplay({
  voiceEmotions,
  videoEmotions,
  isVisionActive,
}: EmotionDisplayProps) {
  return (
    <div className="w-full bg-white/90 backdrop-blur-sm border-b border-gray-200 py-2 space-y-1">
      {/* Voice emotions row */}
      <EmotionRow label="VOICE" emotions={voiceEmotions} isActive={voiceEmotions.length > 0} />

      {/* Video emotions row */}
      <EmotionRow
        label="VIDEO"
        emotions={videoEmotions}
        isActive={isVisionActive && videoEmotions.length > 0}
      />
    </div>
  );
}
