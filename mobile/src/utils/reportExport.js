import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { formatCoords } from './coordinates';

const formatDate = (date) => {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const formatTime = (datetime) => {
  if (!datetime) return '--';
  return new Date(datetime).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit',
  });
};

const escapeCsv = (value) => {
  const str = value == null ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const buildRows = (records) =>
  records.map((r) => [
    formatDate(r.date),
    r.project_code || '--',
    r.project_name || '--',
    formatTime(r.checkin_time),
    formatCoords(r.checkin_latitude, r.checkin_longitude),
    formatTime(r.checkout_time),
    formatCoords(r.checkout_latitude, r.checkout_longitude),
    r.working_hours != null ? `${r.working_hours}` : '--',
  ]);

export const buildAttendanceCsv = (employeeName, records, rangeLabel) => {
  const headers = [
    'Date', 'Project Code', 'Project Name',
    'Check-in Time', 'Check-in Location',
    'Check-out Time', 'Check-out Location', 'Working Hours',
  ];
  const lines = [
  `Employee,${escapeCsv(employeeName)}`,
  `Report Period,${escapeCsv(rangeLabel)}`,
  `Generated,${escapeCsv(new Date().toLocaleString('en-IN'))}`,
  '',
  headers.join(','),
  ...buildRows(records).map((row) => row.map(escapeCsv).join(',')),
  ];
  return lines.join('\n');
};

const buildAttendanceHtml = (employeeName, records, rangeLabel) => {
  const rows = records.map((r) => `
    <tr>
      <td>${formatDate(r.date)}</td>
      <td>${r.project_code || '--'}</td>
      <td>${r.project_name || '--'}</td>
      <td>${formatTime(r.checkin_time)}</td>
      <td>${formatCoords(r.checkin_latitude, r.checkin_longitude)}</td>
      <td>${formatTime(r.checkout_time)}</td>
      <td>${formatCoords(r.checkout_latitude, r.checkout_longitude)}</td>
      <td>${r.working_hours != null ? r.working_hours : '--'}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #222; }
          h1 { color: #1a237e; font-size: 20px; margin-bottom: 4px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #1a237e; color: #fff; }
          tr:nth-child(even) { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>Attendance Report — ${employeeName}</h1>
        <div class="meta">Period: ${rangeLabel} | Generated: ${new Date().toLocaleString('en-IN')}</div>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Project Code</th>
              <th>Project</th>
              <th>Check-in</th>
              <th>Check-in Location</th>
              <th>Check-out</th>
              <th>Check-out Location</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8">No records found</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

const shareFile = async (uri, mimeType) => {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, { mimeType, UTI: mimeType });
};

export const exportAttendanceExcel = async (employeeName, records, rangeLabel) => {
  const csv = buildAttendanceCsv(employeeName, records, rangeLabel);
  const safeName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');
  const path = `${FileSystem.cacheDirectory}attendance_${safeName}_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await shareFile(path, 'text/csv');
};

export const exportAttendancePdf = async (employeeName, records, rangeLabel) => {
  const html = buildAttendanceHtml(employeeName, records, rangeLabel);
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf');
};
