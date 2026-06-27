import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { formatCoords } from './coordinates';
import { isWeb } from './platform';

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

const selfieImg = (url) => {
  if (!url || !url.startsWith('http')) return '--';
  return `<img src="${url}" style="width:56px;height:56px;object-fit:cover;border-radius:4px;" />`;
};

const buildRows = (records, includeEmployee = false) =>
  records.map((r) => {
    const base = [
      formatDate(r.date),
      r.project_code || '--',
      r.project_name || '--',
      formatTime(r.checkin_time),
      r.checkin_selfie_url || '--',
      formatCoords(r.checkin_latitude, r.checkin_longitude),
      formatTime(r.checkout_time),
      r.checkout_selfie_url || '--',
      formatCoords(r.checkout_latitude, r.checkout_longitude),
      r.working_hours != null ? `${r.working_hours}` : '--',
    ];
    if (includeEmployee) {
      return [r.employee_name || '--', r.mobile_number || '--', ...base];
    }
    return base;
  });

export const buildAttendanceCsv = (employeeName, records, rangeLabel) => {
  const headers = [
    'Date', 'Project Code', 'Project Name',
    'Check-in Time', 'Check-in Selfie URL', 'Check-in Location',
    'Check-out Time', 'Check-out Selfie URL', 'Check-out Location', 'Working Hours',
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

export const buildBulkAttendanceCsv = (title, records, filterLabel) => {
  const headers = [
    'Employee', 'Mobile', 'Date', 'Project Code', 'Project Name',
    'Check-in Time', 'Check-in Selfie URL', 'Check-in Location',
    'Check-out Time', 'Check-out Selfie URL', 'Check-out Location', 'Working Hours',
  ];
  const lines = [
    `Report,${escapeCsv(title)}`,
    `Filters,${escapeCsv(filterLabel)}`,
    `Generated,${escapeCsv(new Date().toLocaleString('en-IN'))}`,
    '',
    headers.join(','),
    ...buildRows(records, true).map((row) => row.map(escapeCsv).join(',')),
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
      <td>${selfieImg(r.checkin_selfie_url)}</td>
      <td>${formatCoords(r.checkin_latitude, r.checkin_longitude)}</td>
      <td>${formatTime(r.checkout_time)}</td>
      <td>${selfieImg(r.checkout_selfie_url)}</td>
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
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; vertical-align: top; }
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
              <th>Check-in Selfie</th>
              <th>Check-in Location</th>
              <th>Check-out</th>
              <th>Check-out Selfie</th>
              <th>Check-out Location</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="10">No records found</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

const buildBulkAttendanceHtml = (title, records, filterLabel) => {
  const rows = records.map((r) => `
    <tr>
      <td>${r.employee_name || '--'}</td>
      <td>${r.mobile_number || '--'}</td>
      <td>${formatDate(r.date)}</td>
      <td>${r.project_code || '--'}</td>
      <td>${r.project_name || '--'}</td>
      <td>${formatTime(r.checkin_time)}</td>
      <td>${selfieImg(r.checkin_selfie_url)}</td>
      <td>${formatCoords(r.checkin_latitude, r.checkin_longitude)}</td>
      <td>${formatTime(r.checkout_time)}</td>
      <td>${selfieImg(r.checkout_selfie_url)}</td>
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
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
          th { background: #1a237e; color: #fff; }
          tr:nth-child(even) { background: #f5f5f5; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="meta">Filters: ${filterLabel} | Generated: ${new Date().toLocaleString('en-IN')}</div>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Mobile</th>
              <th>Date</th>
              <th>Project Code</th>
              <th>Project</th>
              <th>Check-in</th>
              <th>Check-in Selfie</th>
              <th>Check-in Location</th>
              <th>Check-out</th>
              <th>Check-out Selfie</th>
              <th>Check-out Location</th>
              <th>Hours</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="12">No records found</td></tr>'}
          </tbody>
        </table>
      </body>
    </html>
  `;
};

const downloadOnWeb = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

const printHtmlOnWeb = (html) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups to download PDF.');
  }
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
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
  if (isWeb) {
    downloadOnWeb(csv, `attendance_${safeName}_${Date.now()}.csv`, 'text/csv;charset=utf-8');
    return;
  }
  const path = `${FileSystem.cacheDirectory}attendance_${safeName}_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await shareFile(path, 'text/csv');
};

export const exportAttendancePdf = async (employeeName, records, rangeLabel) => {
  const html = buildAttendanceHtml(employeeName, records, rangeLabel);
  if (isWeb) {
    printHtmlOnWeb(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf');
};

export const exportBulkAttendanceExcel = async (title, records, filterLabel) => {
  const csv = buildBulkAttendanceCsv(title, records, filterLabel);
  if (isWeb) {
    downloadOnWeb(csv, `attendance_bulk_${Date.now()}.csv`, 'text/csv;charset=utf-8');
    return;
  }
  const path = `${FileSystem.cacheDirectory}attendance_bulk_${Date.now()}.csv`;
  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await shareFile(path, 'text/csv');
};

export const exportBulkAttendancePdf = async (title, records, filterLabel) => {
  const html = buildBulkAttendanceHtml(title, records, filterLabel);
  if (isWeb) {
    printHtmlOnWeb(html);
    return;
  }
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf');
};
