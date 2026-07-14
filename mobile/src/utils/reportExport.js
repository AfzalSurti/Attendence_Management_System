import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { formatCoords } from './coordinates';
import { isWeb } from './platform';

const SINGLE_SELFIE_COLS = [4, 7];
const BULK_SELFIE_COLS = [6, 9];

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

const isSelfieUrl = (url) => typeof url === 'string' && /^https?:\/\//i.test(url);
const selfieUrl = (url) => (isSelfieUrl(url) ? url : '--');

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

const buildTableHtml = (headers, rows, options = {}) => {
  const { selfieColumns = [], renderSelfieImages = false } = options;

  const renderCell = (cell, colIndex) => {
    if (renderSelfieImages && selfieColumns.includes(colIndex) && isSelfieUrl(cell)) {
      return `<td><img src="${escapeHtml(cell)}" alt="Selfie" style="width:64px;height:64px;object-fit:cover;border-radius:6px;border:1px solid #d9d9d9;" /></td>`;
    }
    return `<td>${escapeHtml(cell)}</td>`;
  };

  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows.length
    ? rows.map((row) => `<tr>${row.map((c, index) => renderCell(c, index)).join('')}</tr>`).join('')
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
      ${buildTableHtml(SINGLE_HEADERS, buildSingleRows(records), {
        selfieColumns: SINGLE_SELFIE_COLS,
        renderSelfieImages: true,
      })}
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
      ${buildTableHtml(BULK_HEADERS, buildBulkRows(records), {
        selfieColumns: BULK_SELFIE_COLS,
        renderSelfieImages: true,
      })}
    </body>
  </html>
`;

const buildExcelHtml = (title, subtitle, headers, rows, selfieColumns = []) => `
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
      ${buildTableHtml(headers, rows, {
        selfieColumns,
        renderSelfieImages: true,
      })}
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

const fallbackPdfDownloadOnWeb = (title, subtitle, headers, rows, filename, selfieColumns = []) => {
  const html = `
    <html>
      <head><meta charset="utf-8" /></head>
      <body style="font-family:Arial,sans-serif;padding:24px;color:#222;">
        <h1 style="color:#1a237e;font-size:20px;margin-bottom:4px;">${escapeHtml(title)}</h1>
        <p style="color:#666;font-size:12px;margin-bottom:20px;">
          ${escapeHtml(subtitle)} | Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}
        </p>
        ${buildTableHtml(headers, rows, {
          selfieColumns,
          renderSelfieImages: true,
        })}
      </body>
    </html>
  `;
  downloadOnWeb(html, filename.replace(/\.pdf$/i, '.html'), 'text/html;charset=utf-8');
};

const getImageTypeFromDataUrl = (dataUrl) => {
  const match = /^data:image\/(png|jpeg|jpg|webp);/i.exec(dataUrl || '');
  if (!match) return 'JPEG';
  if (match[1].toLowerCase() === 'png') return 'PNG';
  if (match[1].toLowerCase() === 'webp') return 'WEBP';
  return 'JPEG';
};

const fetchImageDataUrlOnWeb = async (url) => {
  if (!isSelfieUrl(url)) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const loadPdfImageMapOnWeb = async (rows, selfieColumns = []) => {
  const map = {};
  const jobs = [];

  rows.forEach((row, rowIndex) => {
    selfieColumns.forEach((colIndex) => {
      const selfie = row[colIndex];
      if (isSelfieUrl(selfie)) {
        jobs.push(
          fetchImageDataUrlOnWeb(selfie).then((dataUrl) => {
            if (dataUrl) {
              map[`${rowIndex}:${colIndex}`] = dataUrl;
            }
          })
        );
      }
    });
  });

  await Promise.all(jobs);
  return map;
};

const savePdfOnWeb = async (title, subtitle, headers, rows, filename, selfieColumns = []) => {
  try {
    // Dynamic import keeps web build stable in Expo and avoids module init issues.
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const imageMap = await loadPdfImageMapOnWeb(rows, selfieColumns);
    const bodyRows = rows.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (selfieColumns.includes(colIndex)) {
          return imageMap[`${rowIndex}:${colIndex}`] ? 'Selfie' : '--';
        }
        return cell;
      })
    );

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
      body: bodyRows.length ? bodyRows : [['No records found']],
      startY: 72,
      styles: { fontSize: 7, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 40, right: 40 },
      didDrawCell: (hookData) => {
        if (hookData.section !== 'body') return;
        const key = `${hookData.row.index}:${hookData.column.index}`;
        const imageDataUrl = imageMap[key];
        if (!imageDataUrl) return;

        const padding = 2;
        const imageWidth = Math.max(12, hookData.cell.width - padding * 2);
        const imageHeight = Math.max(12, hookData.cell.height - padding * 2);

        try {
          doc.addImage(
            imageDataUrl,
            getImageTypeFromDataUrl(imageDataUrl),
            hookData.cell.x + padding,
            hookData.cell.y + padding,
            imageWidth,
            imageHeight
          );
        } catch {
          // Keep export resilient if one image cannot be rendered.
        }
      },
    });

    doc.save(filename);
  } catch (err) {
    // Fallback ensures user still gets export instead of silent failure.
    fallbackPdfDownloadOnWeb(title, subtitle, headers, rows, filename, selfieColumns);
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

const createWorkbook = async (title, subtitle, headers, rows, selfieColumns = []) => {
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

  if (selfieColumns.length) {
    rows.forEach((row, rowIndex) => {
      selfieColumns.forEach((colIndex) => {
        const value = row[colIndex];
        if (!isSelfieUrl(value)) return;
        const cellRef = XLSX.utils.encode_cell({ c: colIndex, r: rowIndex + 5 });
        sheet[cellRef] = {
          t: 'str',
          f: `IMAGE("${value.replace(/"/g, '""')}")`,
        };
      });
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance');
  return { XLSX, workbook };
};

const writeNativeExcelHtml = async (filename, title, subtitle, headers, rows, selfieColumns = []) => {
  const safeName = filename.replace(/\.xlsx$/i, '.xls');
  const html = buildExcelHtml(title, subtitle, headers, rows, selfieColumns);
  const path = `${FileSystem.cacheDirectory}${safeName}`;
  const utf8Encoding = FileSystem.EncodingType?.UTF8 || 'utf8';
  await FileSystem.writeAsStringAsync(path, html, { encoding: utf8Encoding });
  await shareFile(path, 'application/vnd.ms-excel');
};

const exportXlsx = async (filename, title, subtitle, headers, rows, selfieColumns = []) => {
  if (!isWeb) {
    try {
      const { XLSX, workbook } = await createWorkbook(title, subtitle, headers, rows, selfieColumns);
      const xlsxBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, xlsxBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await shareFile(path, XLSX_MIME);
      return;
    } catch {
      await writeNativeExcelHtml(filename, title, subtitle, headers, rows, selfieColumns);
      return;
    }
  }

  const { XLSX, workbook } = await createWorkbook(title, subtitle, headers, rows, selfieColumns);

  if (isWeb) {
    const xlsxArray = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadBinaryOnWeb(xlsxArray, filename, XLSX_MIME);
    return;
  }
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
    SINGLE_SELFIE_COLS,
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
      SINGLE_SELFIE_COLS,
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
    BULK_SELFIE_COLS,
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
      BULK_SELFIE_COLS,
    );
    return;
  }
  const html = buildBulkAttendanceHtml(title, records, filterLabel);
  const { uri } = await Print.printToFileAsync({ html });
  await shareFile(uri, 'application/pdf');
};
