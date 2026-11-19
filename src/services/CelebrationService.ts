import confetti from 'canvas-confetti';

export class CelebrationService {
  triggerTaskComplete(): void {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.65 },
        colors: ['#4573d2', '#f06a6a', '#48cfad', '#f8df72', '#ac92ec'],
      });
    } catch {
      // Canvas confetti gracefully degrades in environments without canvas support
    }
  }
}

export const celebrationService = new CelebrationService();
