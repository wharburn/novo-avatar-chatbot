/**
 * Sound effects utility
 * Plays various sound effects for user interactions
 */

/**
 * Play camera shutter sound using Web Audio API
 * Creates a realistic two-click shutter sound
 */
export function playCameraClick() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create a realistic camera shutter sound with two quick clicks
    const playClick = (time: number, frequency: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();

      oscillator.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Sharp, mechanical click sound
      oscillator.frequency.value = frequency;
      oscillator.type = 'square';

      filter.type = 'bandpass';
      filter.frequency.value = 2000;
      filter.Q.value = 10;

      // Very short, sharp envelope for click sound
      gainNode.gain.setValueAtTime(0.4, time);
      gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.02);

      oscillator.start(time);
      oscillator.stop(time + 0.02);
    };

    // Two quick clicks for realistic shutter sound
    const now = audioContext.currentTime;
    playClick(now, 1200); // First click (higher pitch)
    playClick(now + 0.05, 1000); // Second click (lower pitch)
  } catch (error) {
    console.warn('Failed to play camera click sound:', error);
  }
}

/**
 * Play a simple beep sound as fallback
 */
function playSimpleBeep() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800; // 800 Hz beep
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (error) {
    console.warn('Failed to play fallback beep:', error);
  }
}

/**
 * Play a generic notification sound
 */
export function playNotification() {
  try {
    const audio = new Audio('/sounds/notification.mp3');
    audio.volume = 0.3; // 30% volume
    audio.play().catch((error) => {
      console.warn('Failed to play notification sound:', error);
    });
  } catch (error) {
    console.warn('Failed to create notification audio:', error);
  }
}

/**
 * Play email sent sound
 */
export function playEmailSent() {
  try {
    const audio = new Audio('/sounds/email-sent.mp3');
    audio.volume = 0.4; // 40% volume
    audio.play().catch((error) => {
      console.warn('Failed to play email sent sound:', error);
    });
  } catch (error) {
    console.warn('Failed to create email sent audio:', error);
  }
}
