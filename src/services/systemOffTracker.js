import { useState, useEffect } from 'react';
import api from './api';

const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const IST_OFFSET_MS = 330 * 60 * 1000; // +05:30 IST
const LOCAL_STORAGE_KEYS = {
  CHECKED_IN: 'ptk_att_checked_in',
  CHECK_IN_DATE: 'ptk_att_date',
  LAST_ACTIVITY: 'ptk_att_last_activity',
  OFF_MINUTES: 'ptk_att_off_minutes',
  CHECK_IN_TIME: 'ptk_att_check_in_time',
  USER_ID: 'ptk_att_user_id'
};

let swRegistration = null;
let swListenerAttached = false;
let lastRecordedActivity = Date.now();
let backgroundTimer = null;
let heartbeatTimer = null;
let lastSyncedOffMinutes = -1;
let lastHeartbeatSent = 0;

/**
 * Format epoch ms into IST ('YYYY-MM-DD') regardless of browser timezone
 */
export const getISTDateStr = (epochMs = Date.now()) => {
  const ist = new Date(epochMs + IST_OFFSET_MS);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Compute 09:30 AM - 06:30 PM IST tracking window bounds (in UTC epoch ms)
 */
const getShiftBoundsMs = (dateStr, checkInTime) => {
  if (!dateStr) return null;
  const shiftStartMs = Date.parse(`${dateStr}T09:30:00+05:30`);
  const shiftEndMs = Date.parse(`${dateStr}T18:30:00+05:30`);
  if (isNaN(shiftStartMs) || isNaN(shiftEndMs)) return null;

  let effectiveStartMs = shiftStartMs;
  if (checkInTime) {
    const clean = String(checkInTime).trim().length === 5 ? `${checkInTime}:00` : String(checkInTime).trim();
    const checkInMs = Date.parse(`${dateStr}T${clean}+05:30`);
    if (!isNaN(checkInMs)) {
      effectiveStartMs = Math.max(shiftStartMs, checkInMs);
    }
  }
  return { effectiveStartMs, shiftEndMs };
};

/**
 * Clamp [startMs, endMs] inside [effectiveStartMs, shiftEndMs] (09:30 AM - 06:30 PM IST)
 */
const computeClampedIdleMs = (lastActMs, nowMs, dateStr, checkInTime) => {
  const bounds = getShiftBoundsMs(dateStr, checkInTime);
  if (!bounds) return Math.max(0, nowMs - lastActMs);
  const clampedStart = Math.max(lastActMs, bounds.effectiveStartMs);
  const clampedEnd = Math.min(nowMs, bounds.shiftEndMs);
  return Math.max(0, clampedEnd - clampedStart);
};

/**
 * Maximum theoretically possible off minutes in the 09:30 AM - 06:30 PM shift window up to nowMs
 */
const getMaxPossibleOffMinutes = (nowMs, dateStr, checkInTime) => {
  const bounds = getShiftBoundsMs(dateStr, checkInTime);
  if (!bounds) return 510;
  const effectiveEnd = Math.min(nowMs, bounds.shiftEndMs);
  const windowMinutes = Math.max(0, Math.floor((effectiveEnd - bounds.effectiveStartMs) / 60000));
  return Math.max(0, windowMinutes - 30);
};

const clampOffMinutes = (minutes, nowMs, dateStr, checkInTime) => {
  const maxOff = getMaxPossibleOffMinutes(nowMs, dateStr, checkInTime);
  return Math.min(maxOff, Math.max(0, parseInt(minutes, 10) || 0));
};

const isTrackingToday = () => {
  const isCheckedIn = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_IN) === 'true';
  if (!isCheckedIn) return false;
  const storedDate = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE);
  return !!storedDate && storedDate === getISTDateStr();
};

/**
 * Register Service Worker at root scope
 */
export const registerAttendanceServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw-attendance.js', {
      scope: '/'
    });
    swRegistration = reg;

    // Listen for messages from Service Worker (attach once)
    if (!swListenerAttached) {
      swListenerAttached = true;
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event.data;
        if (data?.source !== 'PTK_ATTENDANCE_SW') return;

        if (data.type === 'SYSTEM_OFF_TICK') {
          window.dispatchEvent(
            new CustomEvent('ptk_system_off_tick', {
              detail: data.payload
            })
          );
        }
      });
    }

    return reg;
  } catch (err) {
    console.warn('Failed to register attendance service worker:', err);
    return null;
  }
};

/**
 * Post message helper to Service Worker
 */
const postMessageToSW = (type, payload = {}) => {
  try {
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type, payload });
    } else if (swRegistration?.active) {
      swRegistration.active.postMessage({ type, payload });
    }
  } catch (err) {
    // Ignore SW message errors
  }
};

/**
 * Check if application was closed or system was asleep/away > 30 minutes
 * strictly within the 09:30 AM - 06:30 PM IST office window.
 */
export const checkAppResumeAndCalculateOffTime = () => {
  const isCheckedIn = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_IN) === 'true';
  if (!isCheckedIn) return;

  const now = Date.now();
  const todayIST = getISTDateStr(now);
  const storedDate = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE);
  if (!storedDate || storedDate !== todayIST) {
    // Stale session from a previous day — clear without carrying overnight hours
    stopSystemOffTracking();
    return;
  }

  const checkInTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
  const lastActStr = localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY);
  if (!lastActStr) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY, String(now));
    return;
  }

  const lastAct = parseInt(lastActStr, 10);
  const diffMs = computeClampedIdleMs(lastAct, now, storedDate, checkInTime);

  // Check if system was off / app was closed > 30 mins within 09:30 AM - 06:30 PM IST
  if (diffMs > IDLE_THRESHOLD_MS) {
    const totalIdleMinutes = Math.floor(diffMs / 60000);
    const extraOffMinutes = totalIdleMinutes - 30; // 30 mins grace
    const currentTotalOff = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0;
    const newTotal = clampOffMinutes(currentTotalOff + extraOffMinutes, now, storedDate, checkInTime);

    localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(newTotal));
    localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY, String(now));
    lastRecordedActivity = now;

    postMessageToSW('SYNC_OFF_MINUTES', { systemOffMinutes: newTotal });
    postMessageToSW('RECORD_ACTIVITY', { timestamp: now });

    // Immediately sync to server
    syncOffTimeToBackend(newTotal);

    // Notify UI (Widget toast & tracker)
    window.dispatchEvent(
      new CustomEvent('ptk_user_returned_after_idle', {
        detail: {
          idleMinutes: totalIdleMinutes,
          offMinutesAdded: extraOffMinutes,
          totalOffMinutes: newTotal
        }
      })
    );

    window.dispatchEvent(
      new CustomEvent('ptk_system_off_synced', {
        detail: { systemOffMinutes: newTotal }
      })
    );
  } else {
    // Within 30 min grace period, simply refresh activity
    localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY, String(now));
    lastRecordedActivity = now;
  }
};

/**
 * Start tracking system off time (called on Check-In)
 */
export const startSystemOffTracking = ({ date, checkInTime, initialOffMinutes = 0, userId = null }) => {
  const now = Date.now();
  const today = date || getISTDateStr(now);
  const clampedInitial = clampOffMinutes(initialOffMinutes, now, today, checkInTime);

  localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_IN, 'true');
  localStorage.setItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE, today);
  localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY, String(now));
  localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(clampedInitial));
  if (checkInTime) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME, checkInTime);
  }
  if (userId) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.USER_ID, String(userId));
  }

  lastRecordedActivity = now;
  lastSyncedOffMinutes = clampedInitial;

  postMessageToSW('START_TRACKING', {
    date: today,
    checkInTime,
    initialOffMinutes: clampedInitial
  });

  startClientTimer();
  startHeartbeatTimer();
};

/**
 * Stop tracking system off time and clear all local tracking state
 * (called on Check-Out, Logout, or stale-day cleanup)
 */
export const stopSystemOffTracking = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_IN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.OFF_MINUTES);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.USER_ID);

  lastSyncedOffMinutes = -1;
  lastHeartbeatSent = 0;

  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }

  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }

  postMessageToSW('STOP_TRACKING');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ptk_stop_screen_capture'));
  }
};

/**
 * Flush current activity/off-time to backend right before portal logout,
 * then clear all local tracking storage and Service Worker state.
 */
export const flushAndStopOnLogout = () => {
  try {
    if (isTrackingToday()) {
      const now = Date.now();
      const date = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE) || getISTDateStr(now);
      const checkInTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
      const lastAct = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY), 10) || lastRecordedActivity;
      const baseOff = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0;
      const idleMs = computeClampedIdleMs(lastAct, now, date, checkInTime);
      const sessionOff = idleMs > IDLE_THRESHOLD_MS ? Math.floor((idleMs - IDLE_THRESHOLD_MS) / 60000) : 0;
      const finalOff = clampOffMinutes(baseOff + sessionOff, now, date, checkInTime);

      const token = localStorage.getItem('token');
      const baseUrl = api.defaults.baseURL || '';
      if (token && baseUrl && typeof fetch === 'function') {
        fetch(`${baseUrl}/attendance/heartbeat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            'x-device-type': 'desktop'
          },
          body: JSON.stringify({
            date,
            system_off_minutes: finalOff
          }),
          keepalive: true
        }).catch(() => {});
      }
    }
  } catch (e) {
    // Ignore errors during logout flush
  } finally {
    stopSystemOffTracking();
  }
};

/**
 * Sync accumulated System Off Minutes to backend
 */
export const syncOffTimeToBackend = async (systemOffMinutes) => {
  if (!isTrackingToday()) return;

  const now = Date.now();
  const date = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE) || getISTDateStr(now);
  const checkInTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
  const minutes = clampOffMinutes(systemOffMinutes, now, date, checkInTime);

  // Avoid duplicate network requests if unchanged
  if (minutes === lastSyncedOffMinutes) return;

  try {
    await api.post('/attendance/sync-system-off-time', {
      date,
      system_off_minutes: minutes
    });
    lastSyncedOffMinutes = minutes;
    localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(minutes));
    postMessageToSW('SYNC_OFF_MINUTES', { systemOffMinutes: minutes });

    window.dispatchEvent(
      new CustomEvent('ptk_system_off_synced', {
        detail: { systemOffMinutes: minutes }
      })
    );
  } catch (err) {
    console.warn('Failed to sync system off time to backend:', err.message);
  }
};

/**
 * Periodic Heartbeat to backend (keeps last_activity_time fresh while working)
 */
export const sendHeartbeatIfNeeded = async () => {
  if (!isTrackingToday()) return;

  const now = Date.now();
  if (now - lastHeartbeatSent < 50000) return; // once every ~50 seconds
  lastHeartbeatSent = now;

  try {
    const date = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE) || getISTDateStr(now);
    const checkInTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
    const currentOff = clampOffMinutes(
      parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0,
      now,
      date,
      checkInTime
    );
    await api.post('/attendance/heartbeat', {
      date,
      system_off_minutes: currentOff
    });
  } catch (e) {
    // Ignore heartbeat network drops
  }
};

/**
 * Record user activity (throttled to avoid performance hits)
 */
let lastThrottleCheck = 0;
export const recordUserActivity = (evt) => {
  if (evt?.type === 'visibilitychange' && document.visibilityState !== 'visible') {
    return;
  }

  const now = Date.now();
  if (now - lastThrottleCheck < 3000) return; // throttle to once every 3s
  lastThrottleCheck = now;

  const isCheckedIn = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_IN) === 'true';
  if (!isCheckedIn) return;

  const storedDate = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE);
  if (!storedDate || storedDate !== getISTDateStr(now)) {
    stopSystemOffTracking();
    return;
  }

  const checkInTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
  const prevActivity = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY), 10) || lastRecordedActivity;
  const idleMs = computeClampedIdleMs(prevActivity, now, storedDate, checkInTime);

  // If idle exceeded 30 minutes inside 09:30 AM - 06:30 PM IST, finalize the session
  if (idleMs > IDLE_THRESHOLD_MS) {
    const extraOffMinutes = Math.floor((idleMs - IDLE_THRESHOLD_MS) / 60000);
    const currentTotalOff = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0;
    const newTotal = clampOffMinutes(currentTotalOff + extraOffMinutes, now, storedDate, checkInTime);

    localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(newTotal));
    postMessageToSW('SYNC_OFF_MINUTES', { systemOffMinutes: newTotal });
    syncOffTimeToBackend(newTotal);

    window.dispatchEvent(
      new CustomEvent('ptk_user_returned_after_idle', {
        detail: {
          idleMinutes: Math.floor(idleMs / 60000),
          offMinutesAdded: extraOffMinutes,
          totalOffMinutes: newTotal
        }
      })
    );
  }

  lastRecordedActivity = now;
  localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY, String(now));
  postMessageToSW('RECORD_ACTIVITY', { timestamp: now });

  // Send heartbeat if due
  sendHeartbeatIfNeeded();
};

/**
 * Background Client Timer: checks every 10 seconds for idle over 30 mins
 */
const startClientTimer = () => {
  if (backgroundTimer) clearInterval(backgroundTimer);

  backgroundTimer = setInterval(() => {
    if (!isTrackingToday()) return;

    const now = Date.now();
    const storedDate = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE);
    const checkInTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
    const lastAct = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY), 10) || lastRecordedActivity;
    const idleMs = computeClampedIdleMs(lastAct, now, storedDate, checkInTime);

    if (idleMs > IDLE_THRESHOLD_MS) {
      // Inactivity is past 30 minutes inside 09:30 AM - 06:30 PM -> system off time is actively ticking
      const currentSessionOffMinutes = Math.floor((idleMs - IDLE_THRESHOLD_MS) / 60000);
      const baseOffMinutes = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0;
      const currentTotalOffMinutes = clampOffMinutes(
        baseOffMinutes + currentSessionOffMinutes,
        now,
        storedDate,
        checkInTime
      );

      // Periodically sync every 60 seconds while idle
      if (currentTotalOffMinutes > lastSyncedOffMinutes && (idleMs % 60000 < 12000)) {
        syncOffTimeToBackend(currentTotalOffMinutes);
      }

      window.dispatchEvent(
        new CustomEvent('ptk_system_off_tick', {
          detail: {
            idleSeconds: Math.floor(idleMs / 1000),
            isIdleOver30Min: true,
            currentSessionOffMinutes,
            totalOffMinutes: currentTotalOffMinutes
          }
        })
      );
    }
  }, 10000);
};

/**
 * Heartbeat Timer: sends active heartbeat every 60s
 */
const startHeartbeatTimer = () => {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  heartbeatTimer = setInterval(() => {
    sendHeartbeatIfNeeded();
  }, 60000);
};

// Global Activity Event Listeners
if (typeof window !== 'undefined') {
  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'];
  events.forEach((evt) => {
    window.addEventListener(evt, recordUserActivity, { passive: true });
  });

  // Re-check on tab focus / window focus / page resume
  window.addEventListener('focus', () => {
    checkAppResumeAndCalculateOffTime();
    recordUserActivity();
  });

  window.addEventListener('pageshow', () => {
    checkAppResumeAndCalculateOffTime();
  });
}

/**
 * Custom React Hook: useSystemOffTracker
 * Provides components with live reactive status of attendance activity & system off time
 */
export const useSystemOffTracker = (initialStats) => {
  const [isCheckedIn, setIsCheckedIn] = useState(() => {
    if (initialStats?.todayStatus === 'checked-in') return true;
    return isTrackingToday();
  });

  const [systemOffMinutes, setSystemOffMinutes] = useState(() => {
    const stored = isTrackingToday()
      ? (parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0)
      : 0;
    const serverOff = initialStats?.systemOffMinutes || 0;
    return Math.max(stored, serverOff);
  });

  const [idleSeconds, setIdleSeconds] = useState(0);
  const [isIdleOver30Min, setIsIdleOver30Min] = useState(false);
  const [returnNotification, setReturnNotification] = useState(null);

  // Run app resume calculation on hook mount
  useEffect(() => {
    checkAppResumeAndCalculateOffTime();
  }, []);

  // Sync with initialStats whenever fetched from API
  useEffect(() => {
    if (initialStats) {
      if (initialStats.todayStatus === 'checked-in') {
        const now = Date.now();
        const todayIST = getISTDateStr(now);
        const storedDate = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE);
        const checkInTime = initialStats.rawCheckIn || localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
        const hasValidTodayStorage = storedDate === todayIST;

        setIsCheckedIn(true);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_IN, 'true');
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE, todayIST);
        if (checkInTime) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME, checkInTime);
        }
        if (!hasValidTodayStorage || !localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY)) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY, String(now));
          lastRecordedActivity = now;
        }

        const serverOff = typeof initialStats.systemOffMinutes === 'number'
          ? clampOffMinutes(initialStats.systemOffMinutes, now, todayIST, checkInTime)
          : 0;
        const clientOff = hasValidTodayStorage
          ? clampOffMinutes(parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0, now, todayIST, checkInTime)
          : 0;
        const maxOff = Math.max(serverOff, clientOff);

        setSystemOffMinutes(maxOff);
        localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(maxOff));
        postMessageToSW('SYNC_OFF_MINUTES', { systemOffMinutes: maxOff });

        if (clientOff > serverOff) {
          syncOffTimeToBackend(clientOff);
        }

        startClientTimer();
        startHeartbeatTimer();
      } else if (initialStats.todayStatus === 'checked-out' || initialStats.todayStatus === 'not-checked-in') {
        setIsCheckedIn(false);
        stopSystemOffTracking();
        setSystemOffMinutes(
          initialStats.todayStatus === 'checked-out' && typeof initialStats.systemOffMinutes === 'number'
            ? initialStats.systemOffMinutes
            : 0
        );
      }
    }
  }, [initialStats]);

  useEffect(() => {
    registerAttendanceServiceWorker();

    const handleTick = (e) => {
      const { idleSeconds, isIdleOver30Min, totalOffMinutes } = e.detail || {};
      if (typeof idleSeconds === 'number') setIdleSeconds(idleSeconds);
      if (typeof isIdleOver30Min === 'boolean') setIsIdleOver30Min(isIdleOver30Min);
      if (typeof totalOffMinutes === 'number') setSystemOffMinutes(totalOffMinutes);
    };

    const handleSynced = (e) => {
      if (typeof e.detail?.systemOffMinutes === 'number') {
        setSystemOffMinutes(e.detail.systemOffMinutes);
      }
    };

    const handleReturn = (e) => {
      const { idleMinutes, offMinutesAdded, totalOffMinutes } = e.detail || {};
      if (offMinutesAdded > 0) {
        if (typeof totalOffMinutes === 'number') {
          setSystemOffMinutes(totalOffMinutes);
        }
        setReturnNotification({
          idleMinutes,
          offMinutesAdded,
          totalOffMinutes,
          timestamp: Date.now()
        });
      }
    };

    window.addEventListener('ptk_system_off_tick', handleTick);
    window.addEventListener('ptk_system_off_synced', handleSynced);
    window.addEventListener('ptk_user_returned_after_idle', handleReturn);

    // Live second-by-second ticker for UI
    const uiInterval = setInterval(() => {
      const checked = isTrackingToday();
      setIsCheckedIn(checked);

      if (checked) {
        const now = Date.now();
        const storedDate = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE);
        const checkInTime = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);
        const lastAct = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY), 10) || lastRecordedActivity;
        const diffMs = computeClampedIdleMs(lastAct, now, storedDate, checkInTime);
        const diffSec = Math.floor(diffMs / 1000);
        setIdleSeconds(diffSec);
        setIsIdleOver30Min(diffMs > IDLE_THRESHOLD_MS);
      } else {
        setIdleSeconds(0);
        setIsIdleOver30Min(false);
      }
    }, 1000);

    return () => {
      window.removeEventListener('ptk_system_off_tick', handleTick);
      window.removeEventListener('ptk_system_off_synced', handleSynced);
      window.removeEventListener('ptk_user_returned_after_idle', handleReturn);
      clearInterval(uiInterval);
    };
  }, []);

  // Determine status pill: 'active' | 'grace' (idle < 30m) | 'system_off' (idle > 30m) | 'not_checked_in'
  let activityStatus = 'not_checked_in';
  if (isCheckedIn) {
    if (isIdleOver30Min) {
      activityStatus = 'system_off';
    } else if (idleSeconds > 120) {
      activityStatus = 'grace'; // Inactive > 2 min but under 30 min grace
    } else {
      activityStatus = 'active';
    }
  }

  return {
    isCheckedIn,
    idleSeconds,
    isIdleOver30Min,
    systemOffMinutes,
    activityStatus,
    returnNotification,
    dismissNotification: () => setReturnNotification(null)
  };
};
