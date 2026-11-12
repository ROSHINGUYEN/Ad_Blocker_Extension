export interface PlayerObservation {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isAdPlaying: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export class YouTubePlayerObserver {
  private videoElement: HTMLVideoElement | null = null;
  private containerElement: HTMLElement | null = null;

  public attach(video: HTMLVideoElement, container: HTMLElement): void {
    this.videoElement = video;
    this.containerElement = container;
  }

  public getSnapshot(): PlayerObservation {
    if (!this.videoElement) {
      return {
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        isAdPlaying: false,
        hasError: false,
      };
    }

    const hasError = Boolean(this.videoElement.error);
    const errorMessage = this.videoElement.error ? `MediaError code ${this.videoElement.error.code}` : undefined;

    // Check if container has native YouTube ad-showing indicator
    const isAdPlaying = this.containerElement
      ? this.containerElement.classList.contains('ad-showing') ||
        this.containerElement.classList.contains('ad-interrupting')
      : false;

    return {
      isPlaying: !this.videoElement.paused && !this.videoElement.ended && this.videoElement.readyState > 2,
      currentTime: this.videoElement.currentTime,
      duration: this.videoElement.duration || 0,
      isAdPlaying,
      hasError,
      errorMessage,
    };
  }

  public detach(): void {
    this.videoElement = null;
    this.containerElement = null;
  }
}
