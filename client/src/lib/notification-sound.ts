/**
 * Notification sound playback utility.
 * Caches HTMLAudioElement instances for instant replay.
 * Gracefully handles browser autoplay restrictions.
 */

const audioCache = new Map<string, HTMLAudioElement>();

export function playNotificationSound(priority: "normal" | "urgent" = "normal"): void {
  const file =
    priority === "urgent"
      ? "/sounds/notification-urgent.mp3"
      : "/sounds/notification-default.mp3";

  let audio = audioCache.get(file);
  if (!audio) {
    audio = new Audio(file);
    audio.volume = 0.5;
    audioCache.set(file, audio);
  }
  audio.currentTime = 0;
  audio.play().catch(() => {
    // Silently fail if browser blocks autoplay before user interaction
  });
}
