/**
 * Device Detector Utility
 * Detects whether the current device is a mobile phone/tablet or a desktop/laptop system.
 * LMS Attendance policy requires employee punch-in and punch-out to be performed from a desktop/laptop system.
 */

export const isMobileDevice = () => {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // 1. Check navigator.userAgentData (modern Chromium Client Hints)
  if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
    if (navigator.userAgentData.mobile) return true;
  }

  // 2. Comprehensive User Agent regex
  const ua = navigator.userAgent || navigator.vendor || window.opera || '';
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Silk|Kindle/i;
  if (mobileRegex.test(ua)) {
    return true;
  }

  // 3. iPad on iOS 13+ detection (reports as Macintosh Intel but has touch points)
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (isIPadOS) {
    return true;
  }

  // 4. Touch device with phone/tablet screen width (e.g. mobile browsers / viewport emulation)
  const hasTouchScreen = (
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    (navigator.msMaxTouchPoints > 0)
  );

  const isSmallScreen = (window.innerWidth && window.innerWidth <= 768) || (window.screen && window.screen.width <= 768);
  if (hasTouchScreen && isSmallScreen) {
    return true;
  }

  return false;
};

export const getDeviceType = () => {
  return isMobileDevice() ? 'mobile' : 'desktop';
};

export default {
  isMobileDevice,
  getDeviceType
};

