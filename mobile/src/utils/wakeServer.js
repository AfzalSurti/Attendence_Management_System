import { BASE_URL } from '../services/api';

const WAKE_TIMEOUT_MS = 90000;

/**
 * Pings the API root to wake Render free-tier server during cold start.
 */
export const wakeServer = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), WAKE_TIMEOUT_MS);

  try {
    const response = await fetch(`${BASE_URL}/`, {
      method: 'GET',
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
};
