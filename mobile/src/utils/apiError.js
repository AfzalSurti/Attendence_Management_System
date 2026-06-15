export const getApiErrorMessage = (err, fallback = 'Something went wrong') => {
  const detail = err.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => d.msg || JSON.stringify(d)).join(', ');
  }
  if (err.code === 'ECONNABORTED') return 'Server took too long to respond.';
  if (err.message === 'Network Error' || !err.response) {
    return 'Cannot reach server. Check Wi-Fi and backend is running.';
  }
  return fallback;
};
