/**
 * Sound effects utility
 * Plays various sound effects for user interactions
 */

/**
 * Play camera shutter sound
 * Falls back to a simple beep if camera-click.mp3 is not found
 */
export function playCameraClick() {
  try {
    const audio = new Audio('/sounds/camera-click.mp3');
    audio.volume = 0.5; // 50% volume

    // Fallback to a simple beep if file not found
    audio.addEventListener(
      'error',
      () => {
        console.warn('Camera click sound file not found, using fallback beep');
        playSimpleBeep();
      },
      { once: true }
    );

    audio.play().catch((error) => {
      console.warn('Failed to play camera click sound:', error);
      playSimpleBeep();
    });
  } catch (error) {
    console.warn('Failed to create camera click audio:', error);
    playSimpleBeep();
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
