import { useState, useEffect, useCallback } from 'react';
import api from './api';

const IST_OFFSET_MS = 330 * 60 * 1000; // +05:30 IST
const OFFICE_START_MINUTES = 9 * 60 + 30;  // 09:30 AM
const OFFICE_END_MINUTES = 18 * 60 + 30;   // 06:30 PM
export const AUTO_CAPTURE_INTERVAL_MINUTES = 10;
const DEFAULT_INTERVAL_MS = AUTO_CAPTURE_INTERVAL_MINUTES * 60 * 1000; // 10 minutes
const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.68;

let activeStream = null;
let captureIntervalId = null;
let workerTimer = null;
let workerBlobUrl = null;
let persistentVideo = null;
let visibilityListenerAttached = false;
let isCapturing = false;
let currentIntervalMs = DEFAULT_INTERVAL_MS;
let lastCapturedAt = null;
let nextCaptureAt = null;
let lastCaptureStatus = null;
let lastError = null;

/**
 * Get current IST date/time helpers independent of browser timezone
 */
export const getISTNowParts = (epochMs = Date.now()) => {
  const ist = new Date(epochMs + IST_OFFSET_MS);
  const year = ist.getUTCFullYear();
  const month = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const day = String(ist.getUTCDate()).padStart(2, '0');
  const hours = ist.getUTCHours();
  const minutes = ist.getUTCMinutes();
  const seconds = ist.getUTCSeconds();
  const totalMinutes = hours * 60 + minutes;
  const isOfficeHours = totalMinutes >= OFFICE_START_MINUTES && totalMinutes <= OFFICE_END_MINUTES;

  const h12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const time12 = `${String(h12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;

  return {
    dateStr: `${year}-${month}-${day}`,
    monthStr: `${year}-${month}`,
    hours,
    minutes,
    totalMinutes,
    time12,
    isOfficeHours
  };
};

export const isWithinOfficeHoursIST = (epochMs = Date.now()) => {
  return getISTNowParts(epochMs).isOfficeHours;
};

const emitStatus = () => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent('ptk_screenshot_status', {
      detail: {
        isSharing: !!(activeStream && activeStream.active),
        isCapturing,
        intervalMinutes: Math.round(currentIntervalMs / 60000),
        lastCapturedAt,
        nextCaptureAt,
        lastCaptureStatus,
        lastError
      }
    })
  );
};

const cleanupPersistentVideo = () => {
  if (persistentVideo) {
    try {
      persistentVideo.pause();
      persistentVideo.srcObject = null;
      if (persistentVideo.parentNode) {
        persistentVideo.parentNode.removeChild(persistentVideo);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    persistentVideo = null;
  }
};

const ensurePersistentVideo = async (stream) => {
  if (persistentVideo && persistentVideo.srcObject === stream && persistentVideo.readyState >= 2) {
    if (persistentVideo.paused) {
      await persistentVideo.play().catch(() => {});
    }
    return persistentVideo;
  }

  cleanupPersistentVideo();
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:2px;height:2px;opacity:0.001;pointer-events:none;';
  video.srcObject = stream;
  if (document.body) {
    document.body.appendChild(video);
  }
  persistentVideo = video;

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Screen video frame timeout')), 6000);
    const onReady = () => {
      video.play()
        .then(() => {
          clearTimeout(timer);
          resolve();
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    };
    if (video.readyState >= 2) {
      onReady();
    } else {
      video.onloadeddata = onReady;
      video.onloadedmetadata = onReady;
    }
  });

  await new Promise((r) => setTimeout(r, 150));
  return video;
};

const drawSourceToJpegDataUrl = (source, srcWidth, srcHeight) => {
  const safeW = srcWidth || 1280;
  const safeH = srcHeight || 720;
  const scale = safeW > MAX_WIDTH ? MAX_WIDTH / safeW : 1;
  const targetWidth = Math.max(1, Math.round(safeW * scale));
  const targetHeight = Math.max(1, Math.round(safeH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
};

const captureFrameAsDataUrl = async (stream) => {
  const videoTrack = stream?.getVideoTracks?.()[0];
  if (videoTrack && typeof window !== 'undefined' && typeof window.ImageCapture === 'function') {
    try {
      const imageCapture = new window.ImageCapture(videoTrack);
      const bitmap = await imageCapture.grabFrame();
      const dataUrl = drawSourceToJpegDataUrl(bitmap, bitmap.width, bitmap.height);
      if (typeof bitmap.close === 'function') {
        bitmap.close();
      }
      return dataUrl;
    } catch (e) {
      // Fallback to persistent video element if ImageCapture.grabFrame fails
    }
  }

  const video = await ensurePersistentVideo(stream);
  return drawSourceToJpegDataUrl(video, video.videoWidth, video.videoHeight);
};

/**
 * Capture frame from active shared screen (or prompt once if not started) and upload to server.
 * Strictly enforces 09:30 AM - 06:30 PM IST office hours.
 */
export const captureAndUploadScreenshot = async ({ notes = '', autoPrompt = false } = {}) => {
  const istParts = getISTNowParts();
  if (!istParts.isOfficeHours) {
    lastError = 'Capture paused: outside office hours (09:30 AM – 06:30 PM IST).';
    emitStatus();
    return { success: false, reason: 'outside_office_hours', message: lastError };
  }

  if (!activeStream || !activeStream.active) {
    if (!autoPrompt) {
      lastError = 'Screen monitoring is not active.';
      emitStatus();
      return { success: false, reason: 'not_sharing', message: lastError };
    }
    const started = await startScreenMonitoring({ captureImmediately: false });
    if (!started.success) return started;
  }

  if (isCapturing) {
    return { success: false, reason: 'busy', message: 'Capture already in progress' };
  }

  try {
    isCapturing = true;
    lastError = null;
    emitStatus();

    const imageDataUrl = await captureFrameAsDataUrl(activeStream);
    const res = await api.post('/screenshots/upload', {
      image: imageDataUrl,
      notes
    });

    lastCapturedAt = Date.now();
    if (activeStream && activeStream.active) {
      nextCaptureAt = lastCapturedAt + currentIntervalMs;
    }
    lastCaptureStatus = 'Uploaded';
    lastError = null;
    emitStatus();

    window.dispatchEvent(new CustomEvent('ptk_screenshot_uploaded', { detail: res.data?.data }));
    return { success: true, data: res.data?.data };
  } catch (err) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to upload screenshot';
    lastError = msg;
    lastCaptureStatus = 'Failed';
    if (activeStream && activeStream.active) {
      nextCaptureAt = Date.now() + 60 * 1000;
    }
    emitStatus();
    return { success: false, message: msg };
  } finally {
    isCapturing = false;
    emitStatus();
  }
};

/**
 * Start periodic screen capture monitoring (every 10 minutes by default) during 09:30 AM - 06:30 PM IST
 */
export const startScreenMonitoring = async ({ intervalMinutes = 10, captureImmediately = true } = {}) => {
  if (!navigator?.mediaDevices?.getDisplayMedia) {
    const msg = 'Screen capture is not supported in this browser or device.';
    lastError = msg;
    emitStatus();
    return { success: false, message: msg };
  }

  try {
    if (!activeStream || !activeStream.active) {
      activeStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'monitor',
          frameRate: { ideal: 1, max: 5 }
        },
        audio: false
      });

      const [track] = activeStream.getVideoTracks();
      if (track) {
        track.onended = () => {
          stopScreenMonitoring();
        };
      }
    }

    currentIntervalMs = Math.max(1, intervalMinutes) * 60 * 1000;
    stopBackgroundScheduler();

    // Schedule next capture cleanly every 10 minutes; use Web Worker + fallback interval to avoid Chrome background-tab throttling
    nextCaptureAt = Date.now() + currentIntervalMs;
    startBackgroundScheduler();

    lastError = null;
    emitStatus();

    if (captureImmediately && isWithinOfficeHoursIST()) {
      await captureAndUploadScreenshot({ notes: 'Auto capture started (Office Hours)' });
    } else if (!isWithinOfficeHoursIST()) {
      lastError = 'Screen monitoring armed. Auto-capture (every 10 mins) will run between 09:30 AM – 06:30 PM IST.';
      emitStatus();
    }

    return { success: true };
  } catch (err) {
    const msg = err?.name === 'NotAllowedError'
      ? 'Screen sharing permission was cancelled.'
      : (err?.message || 'Unable to start screen monitoring');
    lastError = msg;
    emitStatus();
    return { success: false, message: msg };
  }
};

const runScheduledCaptureTick = () => {
  if (!activeStream || !activeStream.active) {
    stopScreenMonitoring();
    return;
  }

  if (isCapturing) return;

  const now = Date.now();
  if (!isWithinOfficeHoursIST(now)) {
    lastError = 'Outside office hours (09:30 AM – 06:30 PM IST). Capture paused until 09:30 AM.';
    emitStatus();
    return;
  }

  if (!lastCapturedAt || (nextCaptureAt && now >= nextCaptureAt)) {
    nextCaptureAt = now + currentIntervalMs;
    captureAndUploadScreenshot({ notes: 'Auto capture every 10 mins (Office Hours)' });
  }
};

const handleVisibilityChange = () => {
  if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
    runScheduledCaptureTick();
  }
};

const stopBackgroundScheduler = () => {
  if (captureIntervalId) {
    clearInterval(captureIntervalId);
    captureIntervalId = null;
  }
  if (workerTimer) {
    try {
      workerTimer.terminate();
    } catch (e) {
      // Ignore worker terminate errors
    }
    workerTimer = null;
  }
  if (workerBlobUrl) {
    try {
      URL.revokeObjectURL(workerBlobUrl);
    } catch (e) {
      // Ignore revoke errors
    }
    workerBlobUrl = null;
  }
  if (visibilityListenerAttached && typeof document !== 'undefined') {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    visibilityListenerAttached = false;
  }
};

const startBackgroundScheduler = () => {
  stopBackgroundScheduler();

  if (typeof Worker !== 'undefined' && typeof Blob !== 'undefined') {
    try {
      const workerCode = 'setInterval(function(){ postMessage("tick"); }, 10000);';
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      workerBlobUrl = URL.createObjectURL(blob);
      workerTimer = new Worker(workerBlobUrl);
      workerTimer.onmessage = () => runScheduledCaptureTick();
    } catch (e) {
      workerTimer = null;
    }
  }

  // Keep a lightweight main-thread fallback interval as well
  captureIntervalId = setInterval(runScheduledCaptureTick, 15000);

  if (!visibilityListenerAttached && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    visibilityListenerAttached = true;
  }
};

/**
 * Stop screen monitoring and release media tracks
 */
export const stopScreenMonitoring = () => {
  stopBackgroundScheduler();
  cleanupPersistentVideo();
  if (activeStream) {
    try {
      activeStream.getTracks().forEach((t) => t.stop());
    } catch (e) {
      // Ignore stop errors
    }
    activeStream = null;
  }
  nextCaptureAt = null;
  isCapturing = false;
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.removeItem('ptk_ss_permission_prompted');
  }
  emitStatus();
};

// Stop screen monitoring automatically on Check-Out or Logout
if (typeof window !== 'undefined') {
  window.addEventListener('ptk_stop_screen_capture', () => {
    stopScreenMonitoring();
  });
}

/**
 * React Hook for live screen monitoring state & office-hours clock
 */
export const useScreenshotCapture = () => {
  const [state, setState] = useState(() => ({
    isSharing: !!(activeStream && activeStream.active),
    isCapturing,
    intervalMinutes: Math.round(currentIntervalMs / 60000),
    lastCapturedAt,
    nextCaptureAt,
    lastCaptureStatus,
    lastError
  }));
  const [istClock, setIstClock] = useState(() => getISTNowParts());
  const [nextCaptureInSeconds, setNextCaptureInSeconds] = useState(0);

  useEffect(() => {
    const onStatus = (e) => {
      if (e?.detail) setState(e.detail);
    };
    window.addEventListener('ptk_screenshot_status', onStatus);

    const clockTimer = setInterval(() => {
      const now = Date.now();
      setIstClock(getISTNowParts(now));
      if (activeStream && activeStream.active && nextCaptureAt) {
        setNextCaptureInSeconds(Math.max(0, Math.ceil((nextCaptureAt - now) / 1000)));
      } else {
        setNextCaptureInSeconds(0);
      }
    }, 1000);

    return () => {
      window.removeEventListener('ptk_screenshot_status', onStatus);
      clearInterval(clockTimer);
    };
  }, []);

  const start = useCallback((opts) => startScreenMonitoring(opts), []);
  const stop = useCallback(() => stopScreenMonitoring(), []);
  const captureNow = useCallback((opts) => captureAndUploadScreenshot(opts), []);

  return {
    ...state,
    istClock,
    nextCaptureInSeconds,
    start,
    stop,
    captureNow
  };
};

