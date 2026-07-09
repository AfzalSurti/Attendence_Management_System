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

const selfieUrl = (url) => (url && url.startsWith('http') ? url : '--');

const SINGLE_HEADERS = [
  'Date', 'Project Code', 'Project Name',
  'Check-in Time', 'Check-in Selfie', 'Check-in Location',
  'Check-out Time', 'Check-out Selfie', 'Check-out Location', 'Working Hours',
];

const BULK_HEADERS = [
  'Employee', 'Mobile', 'Date', 'Project Code', 'Project Name',
  'Check-in Time', 'Check-in Selfie', 'Check-in Location',
  'Check-out Time', 'Check-out Selfie', 'Check-out Location', 'Working Hours',
];

const buildSingleRows = (records) =>
  records.map((r) => [
    formatDate(r.date),
    r.project_code || '--',
    r.project_name || '--',
    formatTime(r.checkin_time),
    selfieUrl(r.checkin_selfie_url),
    formatCoords(r.checkin_latitude, r.checkin_longitude),
    formatTime(r.checkout_time),
    selfieUrl(r.checkout_selfie_url),
    formatCoords(r.checkout_latitude, r.checkout_longitude),
    r.working_hours != null ? `${r.working_hours}` : '--',
  ]);

const buildBulkRows = (records) =>
  records.map((r) => [
    r.employee_name || '--',
    r.mobile_number || '--',
    formatDate(r.date),
    r.project_code || '--',
    r.project_name || '--',
    formatTime(r.checkin_time),
    selfieUrl(r.checkin_selfie_url),
    formatCoords(r.checkin_latitude, r.checkin_longitude),
    formatTime(r.checkout_time),
    selfieUrl(r.checkout_selfie_url),
    formatCoords(r.checkout_latitude, r.checkout_longitude),
    r.working_hours != null ? `${r.working_hours}` : '--',
  ]);

const escapeHtml = (value) => {
  const str = value == null ? '' : String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const buildTableHtml = (headers, rows) => {
  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((c) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}">No records found</td></tr>`;

  return `
    <table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;">
      <thead>
        <tr style="background:#1a237e;color:#fff;font-weight:bold;">${head}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
};

const buildAttendanceHtml = (employeeName, records, rangeLabel) => `
  <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family:Arial,sans-serif;padding:24px;color:#222;">
      <h1 style="color:#1a237e;font-size:20px;margin-bottom:4px;">Attendance Report — ${escapeHtml(employeeName)}</h1>
      <p style="color:#666;font-size:12px;margin-bottom:20px;">
        Period: ${escapeHtml(rangeLabel)} | Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}
      </p>
      ${buildTableHtml(SINGLE_HEADERS, buildSingleRows(records))}
    </body>
  </html>
`;

const buildBulkAttendanceHtml = (title, records, filterLabel) => `
  <html>
    <head><meta charset="utf-8" /></head>
    <body style="font-family:Arial,sans-serif;padding:24px;color:#222;">
      <h1 style="color:#1a237e;font-size:20px;margin-bottom:4px;">${escapeHtml(title)}</h1>
      <p style="color:#666;font-size:12px;margin-bottom:20px;">
        Filters: ${escapeHtml(filterLabel)} | Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}
      </p>
      ${buildTableHtml(BULK_HEADERS, buildBulkRows(records))}
    </body>
  </html>
`;

const buildExcelHtml = (title, subtitle, headers, rows) => `
  <html xmlns:o="urn:schemas-microsoft-com:office:office"
        xmlns:x="urn:schemas-microsoft-com:office:excel"
        xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Attendance</x:Name>
              <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
    </head>
    <body>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(subtitle)} | Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}</p>
      ${buildTableHtml(headers, rows)}
    </body>
  </html>
`;

const downloadOnWeb = (content, filename, mimeType) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const downloadBinaryOnWeb = (binaryData, filename, mimeType) => {
  const blob = new Blob([binaryData], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const fallbackPdfDownloadOnWeb = (title, subtitle, headers, rows, filename) => {
  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#222;">
        <h1 style="color:#1a237e;font-size:20px;margin-bottom:4px;">${escapeHtml(title)}</h1>
        <p style="color:#666;font-size:12px;margin-bottom:20px;">
          ${escapeHtml(subtitle)} | Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}
        </p>
        ${buildTableHtml(headers, rows)}
      </body>
    </html>
  `;
  downloadOnWeb(html, filename.replace(/\.pdf$/i, '.html'), 'text/html;charset=utf-8');
};

const savePdfOnWeb = async (title, subtitle, headers, rows, filename) => {
  try {
    // Dynamic import keeps web build stable in Expo and avoids module init issues.
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const autoTableFn = autoTableModule.default || autoTableModule.autoTable;
    if (!jsPDF || !autoTableFn) {
      throw new Error('PDF library not available');
    }

    const doc = new jsPDF({
      orientation: headers.length > 8 ? 'landscape' : 'portrait',
      unit: 'pt',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setTextColor(26, 35, 126);
    doc.text(title, 40, 40, { maxWidth: pageWidth - 80 });

    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.text(`${subtitle} | Generated: ${new Date().toLocaleString('en-IN')}`, 40, 58, { maxWidth: pageWidth - 80 });

    autoTableFn(doc, {
      head: [headers],
      body: rows.length ? rows : [['No records found']],
      startY: 72,
      styles: { fontSize: 7, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 40, right: 40 },
    });

    doc.save(filename);
  } catch (err) {
    // Fallback ensures user still gets export instead of silent failure.
    fallbackPdfDownloadOnWeb(title, subtitle, headers, rows, filename);
  }
};

const shareFile = async (uri, mimeType) => {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device');
  }
  await Sharing.shareAsync(uri, { mimeType, UTI: mimeType });
};

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const createWorkbook = async (title, subtitle, headers, rows) => {
  const XLSX = await import('xlsx');
  const data = [
    [title],
    [subtitle],
    [`Generated: ${new Date().toLocaleString('en-IN')}`],
    [],
    headers,
    ...(rows.length ? rows : [new Array(headers.length).fill('No records found')]),
  ];

  const sheet = XLSX.utils.aoa_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance');
  return { XLSX, workbook };
};

const exportXlsx = async (filename, title, subtitle, headers, rows) => {
  const { XLSX, workbook } = await createWorkbook(title, subtitle, headers, rows);

  if (isWeb) {
    const xlsxArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadBinaryOnWeb(xlsxArray, filename, XLSX_MIME);
    return;
  }

  const xlsxBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  const path = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(path, xlsxBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  await shareFile(path, XLSX_MIME);
};

const buildAttendanceCsv = (employeeName, records, rangeLabel) => {
  const escapeCsv = (value) => {
    const str = value == null ? '' : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    `Employee,${escapeCsv(employeeName)}`,
    `Report Period,${escapeCsv(rangeLabel)}`,
    `Generated,${escapeCsv(new Date().toLocaleString('en-IN'))}`,
    '',
    SINGLE_HEADERS.join(','),
    ...buildSingleRows(records).map((row) => row.map(escapeCsv).join(',')),
  ];
  return lines.join('\n');
};

const buildBulkAttendanceCsv = (title, records, filterLabel) => {
  const escapeCsv = (value) => {
    const str = value == null ? '' : String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    `Report,${escapeCsv(title)}`,
    `Filters,${escapeCsv(filterLabel)}`,
    `Generated,${escapeCsv(new Date().toLocaleString('en-IN'))}`,
    '',
    BULK_HEADERS.join(','),
    ...buildBulkRows(records).map((row) => row.map(escapeCsv).join(',')),
  ];
  return lines.join('\n');
};

export const exportAttendanceExcel = async (employeeName, records, rangeLabel) => {
  const safeName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');
  await exportXlsx(
    `attendance_${safeName}_${Date.now()}.xlsx`,
    `Attendance Report — ${employeeName}`,
    `Period: ${rangeLabel}`,
    SINGLE_HEADERS,
    buildSingleRows(records),
  );
};

export const exportAttendancePdf = async (employeeName, records, rangeLabel) => {
  const safeName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');
  if (isWeb) {
    await savePdfOnWeb(
      `Attendance Report — ${employeeName}`,
      `Period: ${rangeLabel}`,
      SINGLE_HEADERS,
      buildSingleRows(records),
      `attendance_${safeName}_${Date.now()}.pdf`,
    );
    return;
  }
  const html = buildAttendanceHtml(employeeName, records, rangeLabel);
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf');
};

export const exportBulkAttendanceExcel = async (title, records, filterLabel) => {
  await exportXlsx(
    `attendance_bulk_${Date.now()}.xlsx`,
    title,
    `Filters: ${filterLabel}`,
    BULK_HEADERS,
    buildBulkRows(records),
  );
};

export const exportBulkAttendancePdf = async (title, records, filterLabel) => {
  if (isWeb) {
    await savePdfOnWeb(
      title,
      `Filters: ${filterLabel}`,
      BULK_HEADERS,
      buildBulkRows(records),
      `attendance_bulk_${Date.now()}.pdf`,
    );
    return;
  }
  const html = buildBulkAttendanceHtml(title, records, filterLabel);
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf');
};
