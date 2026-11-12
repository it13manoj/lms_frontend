const AGENT_BASE_URL = 'http://127.0.0.1:47891';
const DEFAULT_API_URL = process.env.REACT_APP_API_URL || 'https://lms.parakshtech.com/api';
export const DESKTOP_AGENT_DOWNLOAD_URL = '/downloads/ParakshTechTracker.zip';

const fetchWithTimeout = async (url, options = {}, timeoutMs = 1800) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    if (!res.ok) return null;
    return await res.json().catch(() => null);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
};

export const checkDesktopAgentStatus = async () => {
  const data = await fetchWithTimeout(`${AGENT_BASE_URL}/status`, { method: 'GET' });
  if (data && data.running) {
    return { installed: true, ...data };
  }
  return { installed: false, running: false, tracking: false };
};

export const startDesktopAgent = async ({ token, email } = {}) => {
  const authToken = token || localStorage.getItem('token');
  if (!authToken) return { success: false };

  const data = await fetchWithTimeout(`${AGENT_BASE_URL}/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: authToken,
      apiUrl: DEFAULT_API_URL,
      email: email || ''
    })
  });
  return data || { success: false };
};

export const stopDesktopAgent = async () => {
  const data = await fetchWithTimeout(`${AGENT_BASE_URL}/stop`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  });
  return data || { success: false };
};

