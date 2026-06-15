export const formatCoords = (lat, lng) => {
  if (lat == null || lng == null) return '--';
  return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
};

export const coordsToForm = (lat, lng) => ({
  latitude: lat != null ? String(lat) : '',
  longitude: lng != null ? String(lng) : '',
});

export const parseCoord = (value) => {
  if (value === '' || value == null) return null;
  const n = parseFloat(value);
  return Number.isNaN(n) ? null : n;
};
