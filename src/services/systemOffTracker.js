import { useState, useEffect } from 'react';
import api from './api';

const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes in milliseconds
const LOCAL_STORAGE_KEYS = {
  CHECKED_IN: 'ptk_att_checked_in',
  CHECK_IN_DATE: 'ptk_att_date',
  LAST_ACTIVITY: 'ptk_att_last_activity',
  OFF_MINUTES: 'ptk_att_off_minutes',
  CHECK_IN_TIME: 'ptk_att_check_in_time'
};

let swRegistration = null;
let lastRecordedActivity = Date.now();
let backgroundTimer = null;
let lastSyncedOffMinutes = -1;

/**
 * Register Service Worker at root scope
 */
export const registerAttendanceServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.info('Service Worker not supported in this browser.');
    return null;
  }

  try {
    const reg = await navigator.serviceWorker.register('/sw-attendance.js', {
      scope: '/'
    });
    swRegistration = reg;

    // Listen for messages from Service Worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      const data = event.data;
      if (data?.source !== 'PTK_ATTENDANCE_SW') return;

      if (data.type === 'USER_RETURNED_AFTER_IDLE') {
        const { idleMinutes, offMinutesAdded, totalOffMinutes } = data.payload || {};
        // Notify window listeners
        window.dispatchEvent(
          new CustomEvent('ptk_user_returned_after_idle', {
            detail: { idleMinutes, offMinutesAdded, totalOffMinutes }
          })
        );
        // Sync to backend immediately
        syncOffTimeToBackend(totalOffMinutes);
      } else if (data.type === 'SYSTEM_OFF_TICK') {
        window.dispatchEvent(
          new CustomEvent('ptk_system_off_tick', {
            detail: data.payload
          })
        );
      }
    });

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
 * Start tracking system off time (called on Check-In)
 */
export const startSystemOffTracking = ({ date, checkInTime, initialOffMinutes = 0 }) => {
  const today = date || new Date().toISOString().split('T')[0];
  const now = Date.now();

  localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_IN, 'true');
  localStorage.setItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE, today);
  localStorage.setItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY, String(now));
  localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(initialOffMinutes));
  if (checkInTime) {
    localStorage.setItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME, checkInTime);
  }

  lastRecordedActivity = now;
  lastSyncedOffMinutes = initialOffMinutes;

  postMessageToSW('START_TRACKING', {
    date: today,
    checkInTime,
    initialOffMinutes
  });

  startClientTimer();
};

/**
 * Stop tracking system off time (called on Check-Out)
 */
export const stopSystemOffTracking = () => {
  localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECKED_IN);
  localStorage.removeItem(LOCAL_STORAGE_KEYS.CHECK_IN_TIME);

  if (backgroundTimer) {
    clearInterval(backgroundTimer);
    backgroundTimer = null;
  }

  postMessageToSW('STOP_TRACKING');
};

/**
 * Sync accumulated System Off Minutes to backend
 */
export const syncOffTimeToBackend = async (systemOffMinutes) => {
  const isCheckedIn = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_IN) === 'true';
  if (!isCheckedIn) return;

  const date = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECK_IN_DATE) || new Date().toISOString().split('T')[0];
  const minutes = Math.max(0, parseInt(systemOffMinutes, 10) || 0);

  // Avoid redundant network requests if unchanged
  if (minutes === lastSyncedOffMinutes) return;

  try {
    await api.post('/attendance/sync-system-off-time', {
      date,
      system_off_minutes: minutes
    });
    lastSyncedOffMinutes = minutes;
    localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(minutes));

    // Inform other components
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
 * Record user activity (throttled to avoid performance hits)
 */
let lastThrottleCheck = 0;
export const recordUserActivity = () => {
  const now = Date.now();
  if (now - lastThrottleCheck < 3000) return; // throttle to once every 3s
  lastThrottleCheck = now;

  const isCheckedIn = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_IN) === 'true';
  if (!isCheckedIn) return;

  const prevActivity = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY), 10) || lastRecordedActivity;
  const idleMs = now - prevActivity;

  // If idle exceeded 30 minutes, finalize the session
  if (idleMs > IDLE_THRESHOLD_MS) {
    const extraOffMinutes = Math.floor((idleMs - IDLE_THRESHOLD_MS) / 60000);
    const currentTotalOff = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0;
    const newTotal = currentTotalOff + extraOffMinutes;

    localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(newTotal));
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
};

/**
 * Background Client Timer: checks every 10 seconds for idle over 30 mins
 */
const startClientTimer = () => {
  if (backgroundTimer) clearInterval(backgroundTimer);

  backgroundTimer = setInterval(() => {
    const isCheckedIn = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_IN) === 'true';
    if (!isCheckedIn) return;

    const now = Date.now();
    const lastAct = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY), 10) || lastRecordedActivity;
    const idleMs = now - lastAct;

    if (idleMs > IDLE_THRESHOLD_MS) {
      // Inactivity is past 30 minutes -> system off time is actively ticking
      const currentSessionOffMinutes = Math.floor((idleMs - IDLE_THRESHOLD_MS) / 60000);
      const baseOffMinutes = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0;
      const currentTotalOffMinutes = baseOffMinutes + currentSessionOffMinutes;

      // Periodically sync every 2 minutes while idle
      if (currentTotalOffMinutes > lastSyncedOffMinutes && (idleMs % 120000 < 15000)) {
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

// Global Activity Event Listeners
if (typeof window !== 'undefined') {
  const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'visibilitychange'];
  events.forEach((evt) => {
    window.addEventListener(evt, recordUserActivity, { passive: true });
  });

  // Re-check on tab focus
  window.addEventListener('focus', recordUserActivity);
}

/**
 * Custom React Hook: useSystemOffTracker
 * Provides components with live reactive status of attendance activity & system off time
 */
export const useSystemOffTracker = (initialStats) => {
  const [isCheckedIn, setIsCheckedIn] = useState(() => {
    if (initialStats?.todayStatus === 'checked-in') return true;
    return localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_IN) === 'true';
  });

  const [systemOffMinutes, setSystemOffMinutes] = useState(() => {
    return initialStats?.systemOffMinutes || parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.OFF_MINUTES), 10) || 0;
  });

  const [idleSeconds, setIdleSeconds] = useState(0);
  const [isIdleOver30Min, setIsIdleOver30Min] = useState(false);
  const [returnNotification, setReturnNotification] = useState(null);

  // Sync with initialStats whenever fetched from API
  useEffect(() => {
    if (initialStats) {
      if (initialStats.todayStatus === 'checked-in') {
        setIsCheckedIn(true);
        localStorage.setItem(LOCAL_STORAGE_KEYS.CHECKED_IN, 'true');
        if (typeof initialStats.systemOffMinutes === 'number') {
          setSystemOffMinutes(initialStats.systemOffMinutes);
          localStorage.setItem(LOCAL_STORAGE_KEYS.OFF_MINUTES, String(initialStats.systemOffMinutes));
        }
        startClientTimer();
      } else if (initialStats.todayStatus === 'checked-out') {
        setIsCheckedIn(false);
        stopSystemOffTracking();
        if (typeof initialStats.systemOffMinutes === 'number') {
          setSystemOffMinutes(initialStats.systemOffMinutes);
        }
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
      const { idleMinutes, offMinutesAdded } = e.detail || {};
      if (offMinutesAdded > 0) {
        setReturnNotification({
          idleMinutes,
          offMinutesAdded,
          timestamp: Date.now()
        });
      }
    };

    window.addEventListener('ptk_system_off_tick', handleTick);
    window.addEventListener('ptk_system_off_synced', handleSynced);
    window.addEventListener('ptk_user_returned_after_idle', handleReturn);

    // Live second-by-second ticker for UI
    const uiInterval = setInterval(() => {
      const checked = localStorage.getItem(LOCAL_STORAGE_KEYS.CHECKED_IN) === 'true';
      setIsCheckedIn(checked);

      if (checked) {
        const lastAct = parseInt(localStorage.getItem(LOCAL_STORAGE_KEYS.LAST_ACTIVITY), 10) || lastRecordedActivity;
        const diffMs = Date.now() - lastAct;
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

