const toIsoDate = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getDateRange = (preset) => {
  const today = new Date();
  const to = toIsoDate(today);
  const fromDate = new Date(today);

  if (preset === '7days') fromDate.setDate(today.getDate() - 7);
  else if (preset === '15days') fromDate.setDate(today.getDate() - 15);
  else if (preset === '30days') fromDate.setDate(today.getDate() - 30);
  else return { date_from: null, date_to: null };

  return { date_from: toIsoDate(fromDate), date_to: to };
};

export const PRESET_LABELS = {
  all: 'All Time',
  '7days': 'Last 7 Days',
  '15days': 'Last 15 Days',
  '30days': 'Last 30 Days',
  custom: 'Custom Range',
};
