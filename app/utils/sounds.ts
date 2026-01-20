/**
 * Sound effects utility
 * Plays various sound effects for user interactions
 */

/**
 * Play camera shutter sound
 */
export function playCameraClick() {
  try {
    const audio = new Audio('/sounds/camera-click.mp3');
    audio.volume = 0.5; // 50% volume
    audio.play().catch((error) => {
      console.warn('Failed to play camera click sound:', error);
    });
  } catch (error) {
    console.warn('Failed to create camera click audio:', error);
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

