/**
 * ParakshTech LMS - Attendance System Off / Idle Tracker Service Worker
 * Runs in background to monitor system idle & away time between Check-In and Check-Out.
 * Idle threshold: 30 minutes (1800 seconds).
 * If employee is inactive for > 30 minutes, System Off Time begins accumulating.
 */

const SW_VERSION = 'ptk-sw-attendance-v1.1';
const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes (1800,000 ms)

let trackerState = {
  isTracking: false,
  checkInDate: null,
  checkInTime: null,
  lastActivityTimestamp: Date.now(),
  accumulatedOffSeconds: 0,
  currentIdleSessionOffSeconds: 0,
  employeeId: null
};

// IndexedDB Helper to persist state across Service Worker terminations
const DB_NAME = 'ptk_attendance_db';
const STORE_NAME = 'tracker_state';

const openDB = () => {
  return new Promise((resolve) => {
    if (!('indexedDB' in self)) return resolve(null);
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
};

const saveStateToDB = async (state) => {
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(state, 'current_state');
  } catch (e) {
    // Ignore DB save errors
  }
};

const loadStateFromDB = async () => {
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get('current_state');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
};

// Lifecycle: Install & Activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const saved = await loadStateFromDB();
      if (saved) {
        trackerState = { ...trackerState, ...saved };
      }
      return self.clients.claim();
    })()
  );
});

// Broadcast helper to notify all active windows/tabs
const broadcastMessage = async (type, payload = {}) => {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of clients) {
      client.postMessage({
        source: 'PTK_ATTENDANCE_SW',
        type,
        payload: {
          ...payload,
          timestamp: Date.now()
        }
      });
    }
  } catch (err) {
    // Ignore broadcast errors
  }
};

// Periodic Background Monitor (every 15 seconds)
setInterval(() => {
  if (!trackerState.isTracking) return;

  const now = Date.now();
  const idleMs = now - trackerState.lastActivityTimestamp;

  if (idleMs > IDLE_THRESHOLD_MS) {
    // Inactivity exceeds 30 minutes -> counting System Off Time
    const excessSeconds = Math.floor((idleMs - IDLE_THRESHOLD_MS) / 1000);
    trackerState.currentIdleSessionOffSeconds = excessSeconds;
    const totalOffSeconds = trackerState.accumulatedOffSeconds + excessSeconds;

    broadcastMessage('SYSTEM_OFF_TICK', {
      idleMs,
      idleSeconds: Math.floor(idleMs / 1000),
      isIdleOver30Min: true,
      currentSessionOffSeconds: excessSeconds,
      totalOffMinutes: Math.floor(totalOffSeconds / 60),
      totalOffSeconds
    });
  } else {
    trackerState.currentIdleSessionOffSeconds = 0;
    broadcastMessage('ACTIVE_TICK', {
      idleMs,
      idleSeconds: Math.floor(idleMs / 1000),
      isIdleOver30Min: false,
      graceRemainingSeconds: Math.max(0, Math.floor((IDLE_THRESHOLD_MS - idleMs) / 1000)),
      totalOffMinutes: Math.floor(trackerState.accumulatedOffSeconds / 60)
    });
  }
}, 15000);

// Client Message Listener
self.addEventListener('message', async (event) => {
  const { type, payload } = event.data || {};

  switch (type) {
    case 'START_TRACKING': {
      trackerState.isTracking = true;
      trackerState.checkInDate = payload?.date || new Date().toISOString().split('T')[0];
      trackerState.checkInTime = payload?.checkInTime || null;
      trackerState.lastActivityTimestamp = Date.now();
      trackerState.accumulatedOffSeconds = (payload?.initialOffMinutes || 0) * 60;
      trackerState.currentIdleSessionOffSeconds = 0;
      trackerState.employeeId = payload?.employeeId || null;

      await saveStateToDB(trackerState);

      broadcastMessage('TRACKING_STARTED', {
        checkInDate: trackerState.checkInDate,
        initialOffMinutes: payload?.initialOffMinutes || 0
      });
      break;
    }

    case 'RECORD_ACTIVITY': {
      if (!trackerState.isTracking) {
        trackerState.lastActivityTimestamp = Date.now();
        return;
      }

      const now = Date.now();
      const idleMs = now - trackerState.lastActivityTimestamp;

      // If user was away for > 30 mins before this action, finalize the off-session
      if (idleMs > IDLE_THRESHOLD_MS) {
        const sessionOffSec = Math.floor((idleMs - IDLE_THRESHOLD_MS) / 1000);
        trackerState.accumulatedOffSeconds += sessionOffSec;
        trackerState.currentIdleSessionOffSeconds = 0;

        broadcastMessage('USER_RETURNED_AFTER_IDLE', {
          idleMinutes: Math.floor(idleMs / 60000),
          offMinutesAdded: Math.floor(sessionOffSec / 60),
          totalOffMinutes: Math.floor(trackerState.accumulatedOffSeconds / 60)
        });
      }

      trackerState.lastActivityTimestamp = now;
      await saveStateToDB(trackerState);
      break;
    }

    case 'SYNC_OFF_MINUTES': {
      if (typeof payload?.systemOffMinutes === 'number') {
        trackerState.accumulatedOffSeconds = payload.systemOffMinutes * 60;
        trackerState.currentIdleSessionOffSeconds = 0;
        await saveStateToDB(trackerState);
      }
      break;
    }

    case 'STOP_TRACKING': {
      trackerState.isTracking = false;
      trackerState.currentIdleSessionOffSeconds = 0;
      await saveStateToDB(trackerState);
      broadcastMessage('TRACKING_STOPPED', {
        totalOffMinutes: Math.floor(trackerState.accumulatedOffSeconds / 60)
      });
      break;
    }

    case 'GET_STATUS': {
      const now = Date.now();
      const idleMs = now - trackerState.lastActivityTimestamp;
      const isOver = idleMs > IDLE_THRESHOLD_MS;
      const currentExcess = isOver ? Math.floor((idleMs - IDLE_THRESHOLD_MS) / 1000) : 0;
      const totalOffSec = trackerState.accumulatedOffSeconds + currentExcess;

      if (event.source) {
        event.source.postMessage({
          source: 'PTK_ATTENDANCE_SW',
          type: 'STATUS_RESPONSE',
          payload: {
            isTracking: trackerState.isTracking,
            idleSeconds: Math.floor(idleMs / 1000),
            isIdleOver30Min: isOver,
            totalOffMinutes: Math.floor(totalOffSec / 60),
            totalOffSeconds: totalOffSec,
            lastActivityTimestamp: trackerState.lastActivityTimestamp
          }
        });
      }
      break;
    }

    default:
      break;
  }
});
