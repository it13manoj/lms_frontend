import { SelfieSegmentation } from '@mediapipe/selfie_segmentation';

/**
 * High-Performance Client-Side Virtual Background Processor
 * Segments video frames using MediaPipe WebAssembly and composites
 * custom backgrounds (blur, image, or gradient) onto an HTML5 canvas stream.
 */
class VirtualBackgroundProcessor {
  constructor() {
    this.selfieSegmentation = null;
    this.videoElement = null;
    this.canvas = null;
    this.ctx = null;
    this.outputStream = null;
    this.activeBg = { type: 'none' };
    this.isRunning = false;
    this.bgImage = null;
    this.isModelLoaded = false;
    this.isInitializing = false;
    this.animationFrameId = null;
    this.isProcessing = false;
  }

  async init() {
    if (this.selfieSegmentation && this.isModelLoaded) return;
    if (this.isInitializing) return;
    this.isInitializing = true;

    try {
      this.selfieSegmentation = new SelfieSegmentation({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
      });

      this.selfieSegmentation.setOptions({
        modelSelection: 1, // 1: landscape/desktop mode for high accuracy
        selfieMode: false
      });

      this.selfieSegmentation.onResults(this.onResults.bind(this));

      if (!this.videoElement) {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        this.videoElement.muted = true;
        this.videoElement.style.position = 'fixed';
        this.videoElement.style.top = '-9999px';
        this.videoElement.style.left = '-9999px';
        this.videoElement.style.width = '640px';
        this.videoElement.style.height = '360px';
        document.body.appendChild(this.videoElement);
      }

      if (!this.canvas) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = 640;
        this.canvas.height = 360;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      }

      this.isModelLoaded = true;
      console.log('[VirtualBackground] MediaPipe SelfieSegmentation initialized successfully');
    } catch (err) {
      console.error('[VirtualBackground] Failed to initialize SelfieSegmentation:', err);
    } finally {
      this.isInitializing = false;
    }
  }

  async setBackground(bgConfig) {
    this.activeBg = bgConfig || { type: 'none' };

    if (this.activeBg.type === 'image' && this.activeBg.url) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = this.activeBg.url;
      await new Promise((resolve) => {
        img.onload = () => {
          this.bgImage = img;
          resolve();
        };
        img.onerror = () => {
          console.warn('[VirtualBackground] Failed to load background image:', this.activeBg.url);
          this.bgImage = null;
          resolve();
        };
      });
    } else {
      this.bgImage = null;
    }
  }

  async start(rawStream, bgConfig) {
    if (!rawStream || rawStream.getVideoTracks().length === 0) return null;

    await this.init();
    await this.setBackground(bgConfig);

    if (this.activeBg.type === 'none') {
      this.stop();
      return rawStream;
    }

    this.videoElement.srcObject = rawStream;
    await new Promise((resolve) => {
      if (this.videoElement.readyState >= 2) {
        resolve();
      } else {
        this.videoElement.onloadeddata = () => resolve();
        setTimeout(resolve, 800); // Safety timeout
      }
    });

    try {
      await this.videoElement.play();
    } catch (e) {
      console.warn('[VirtualBackground] Offscreen video play note:', e);
    }

    if (this.videoElement.videoWidth && this.videoElement.videoHeight) {
      this.canvas.width = this.videoElement.videoWidth;
      this.canvas.height = this.videoElement.videoHeight;
    }

    this.isRunning = true;
    this.processLoop();

    if (!this.outputStream || this.outputStream.getVideoTracks().length === 0) {
      this.outputStream = this.canvas.captureStream(30);
    }

    // Preserve original audio tracks in the returned stream
    const audioTracks = rawStream.getAudioTracks();
    audioTracks.forEach(track => {
      if (!this.outputStream.getAudioTracks().some(t => t.id === track.id)) {
        this.outputStream.addTrack(track);
      }
    });

    return this.outputStream;
  }

  processLoop() {
    if (!this.isRunning || !this.videoElement) return;

    if (
      this.videoElement.readyState >= 2 && 
      !this.videoElement.paused && 
      !this.videoElement.ended &&
      !this.isProcessing
    ) {
      this.isProcessing = true;
      this.selfieSegmentation.send({ image: this.videoElement })
        .catch(() => {})
        .finally(() => {
          this.isProcessing = false;
        });
    }

    if ('requestVideoFrameCallback' in this.videoElement) {
      this.videoElement.requestVideoFrameCallback(() => this.processLoop());
    } else {
      this.animationFrameId = requestAnimationFrame(() => this.processLoop());
    }
  }

  onResults(results) {
    if (!this.isRunning || !this.ctx || !this.canvas) return;

    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // 1. Draw segmentation mask
    ctx.drawImage(results.segmentationMask, 0, 0, width, height);

    // 2. Keep ONLY pixels belonging to the person
    ctx.globalCompositeOperation = 'source-in';
    ctx.drawImage(results.image, 0, 0, width, height);

    // 3. Draw background behind the person
    ctx.globalCompositeOperation = 'destination-over';

    if (this.activeBg.type === 'blur') {
      const blurAmount = parseInt(this.activeBg.blurAmount || '16', 10);
      ctx.filter = `blur(${blurAmount}px)`;
      ctx.drawImage(results.image, 0, 0, width, height);
      ctx.filter = 'none';
    } else if (this.activeBg.type === 'image' && this.bgImage) {
      ctx.drawImage(this.bgImage, 0, 0, width, height);
    } else if (this.activeBg.type === 'gradient') {
      const grad = ctx.createLinearGradient(0, 0, width, height);
      if (this.activeBg.id === 'gradient-purple') {
        grad.addColorStop(0, '#312e81');
        grad.addColorStop(1, '#1e1b4b');
      } else {
        grad.addColorStop(0, '#1e3a8a');
        grad.addColorStop(1, '#0f172a');
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.drawImage(results.image, 0, 0, width, height);
    }

    ctx.restore();
  }

  stop() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  destroy() {
    this.stop();
    if (this.videoElement && this.videoElement.parentNode) {
      this.videoElement.parentNode.removeChild(this.videoElement);
      this.videoElement = null;
    }
    if (this.selfieSegmentation) {
      try {
        this.selfieSegmentation.close();
      } catch (e) {}
      this.selfieSegmentation = null;
    }
    this.canvas = null;
    this.ctx = null;
    this.outputStream = null;
    this.isModelLoaded = false;
  }
}

export const virtualBgProcessor = new VirtualBackgroundProcessor();
export default virtualBgProcessor;

