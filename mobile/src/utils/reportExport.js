import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { formatCoords } from './coordinates';
import { isWeb } from './platform';

const SINGLE_SELFIE_COLS = [4, 7];
const BULK_SELFIE_COLS = [6, 9];
const SELFIE_CELL_SIZE = 96;
const SELFIE_PDF_SIZE = 88;

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

const selfieImgHtml = (src) => `
  <img
    src="${escapeHtml(src)}"
    alt="Selfie"
    style="
      width:${SELFIE_CELL_SIZE}px;
      height:${SELFIE_CELL_SIZE}px;
      object-fit:contain;
      object-position:center;
      background:#f8fafc;
      border:1px solid #d9d9d9;
      border-radius:6px;
      display:block;
    "
  />
`;

const buildTableHtml = (headers, rows, options = {}) => {
  const { selfieColumns = [], renderSelfieImages = false, imageMap = null } = options;

  const renderCell = (cell, colIndex, rowIndex) => {
    if (renderSelfieImages && selfieColumns.includes(colIndex)) {
      const mapped = imageMap?.[`${rowIndex}:${colIndex}`];
      const src = mapped || (isSelfieUrl(cell) ? cell : null);
      if (src) {
        return `<td style="text-align:center;vertical-align:middle;height:${SELFIE_CELL_SIZE + 16}px;">${selfieImgHtml(src)}</td>`;
      }
      return '<td style="text-align:center;">--</td>';
    }
    return `<td>${escapeHtml(cell)}</td>`;
  };

  const head = headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('');
  const body = rows.length
    ? rows.map((row, rowIndex) => `<tr>${row.map((c, index) => renderCell(c, index, rowIndex)).join('')}</tr>`).join('')
    : `<tr><td colspan="${headers.length}">No records found</td></tr>`;

  return `
    <table border="1" cellpadding="8" cellspacing="0" style="border-collapse:collapse;width:100%;font-size:11px;">
      <thead>
        <tr style="background:#1a237e;color:#fff;font-weight:bold;">${head}</tr>
      </thead>
      <tbody>${body}</tbody>
    </table>
  `;
};

const buildAttendanceHtml = (employeeName, records, rangeLabel, imageMap = null) => `
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
        imageMap,
      })}
    </body>
  </html>
`;

const buildBulkAttendanceHtml = (title, records, filterLabel, imageMap = null) => `
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
        imageMap,
      })}
    </body>
  </html>
`;

const buildExcelHtml = (title, subtitle, headers, rows, selfieColumns = [], imageMap = null) => `
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
      <style>
        td, th { vertical-align: middle; }
        img { width: ${SELFIE_CELL_SIZE}px; height: ${SELFIE_CELL_SIZE}px; object-fit: contain; }
      </style>
    </head>
    <body>
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(subtitle)} | Generated: ${escapeHtml(new Date().toLocaleString('en-IN'))}</p>
      ${buildTableHtml(headers, rows, {
        selfieColumns,
        renderSelfieImages: true,
        imageMap,
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

const getImageTypeFromDataUrl = (dataUrl) => {
  const match = /^data:image\/(png|jpeg|jpg|webp);/i.exec(dataUrl || '');
  if (!match) return 'JPEG';
  if (match[1].toLowerCase() === 'png') return 'PNG';
  if (match[1].toLowerCase() === 'webp') return 'WEBP';
  return 'JPEG';
};

const loadImageMetaFromDataUrl = (dataUrl) =>
  new Promise((resolve) => {
    if (!dataUrl || typeof Image === 'undefined') {
      resolve({ dataUrl, width: SELFIE_PDF_SIZE, height: SELFIE_PDF_SIZE });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({
        dataUrl,
        width: img.naturalWidth || SELFIE_PDF_SIZE,
        height: img.naturalHeight || SELFIE_PDF_SIZE,
      });
    };
    img.onerror = () => {
      resolve({ dataUrl, width: SELFIE_PDF_SIZE, height: SELFIE_PDF_SIZE });
    };
    img.src = dataUrl;
  });

const fetchImageDataUrlOnWeb = async (url) => {
  if (!isSelfieUrl(url)) return null;
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    // Fallback: use original URL if CORS blocks binary fetch (HTML/Excel img tags may still load).
    return null;
  }
};

const loadSelfieImageMapOnWeb = async (rows, selfieColumns = []) => {
  const map = {};
  const jobs = [];

  rows.forEach((row, rowIndex) => {
    selfieColumns.forEach((colIndex) => {
      const selfie = row[colIndex];
      if (!isSelfieUrl(selfie)) return;
      jobs.push(
        fetchImageDataUrlOnWeb(selfie).then(async (dataUrl) => {
          if (!dataUrl) return;
          map[`${rowIndex}:${colIndex}`] = await loadImageMetaFromDataUrl(dataUrl);
        })
      );
    });
  });

  await Promise.all(jobs);
  return map;
};

const fitContain = (srcW, srcH, maxW, maxH) => {
  const ratio = Math.min(maxW / Math.max(srcW, 1), maxH / Math.max(srcH, 1));
  return {
    width: Math.max(8, srcW * ratio),
    height: Math.max(8, srcH * ratio),
  };
};

const fallbackPdfDownloadOnWeb = (title, subtitle, headers, rows, filename, selfieColumns = [], imageMap = null) => {
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
          imageMap: Object.fromEntries(
            Object.entries(imageMap || {}).map(([key, value]) => [key, value.dataUrl || value])
          ),
        })}
      </body>
    </html>
  `;
  downloadOnWeb(html, filename.replace(/\.pdf$/i, '.html'), 'text/html;charset=utf-8');
};

const savePdfOnWeb = async (title, subtitle, headers, rows, filename, selfieColumns = []) => {
  let imageMap = {};
  try {
    const [{ jsPDF }, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    imageMap = await loadSelfieImageMapOnWeb(rows, selfieColumns);
    const bodyRows = rows.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (selfieColumns.includes(colIndex)) {
          return imageMap[`${rowIndex}:${colIndex}`] ? '' : '--';
        }
        return cell;
      })
    );

    const autoTableFn = autoTableModule.default || autoTableModule.autoTable;
    if (!jsPDF || !autoTableFn) {
      throw new Error('PDF library not available');
    }

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'a4',
    });
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFontSize(14);
    doc.setTextColor(26, 35, 126);
    doc.text(title, 28, 34, { maxWidth: pageWidth - 56 });

    doc.setFontSize(9);
    doc.setTextColor(102, 102, 102);
    doc.text(`${subtitle} | Generated: ${new Date().toLocaleString('en-IN')}`, 28, 50, { maxWidth: pageWidth - 56 });

    const columnStyles = {};
    selfieColumns.forEach((colIndex) => {
      columnStyles[colIndex] = {
        cellWidth: SELFIE_PDF_SIZE + 16,
        minCellHeight: SELFIE_PDF_SIZE + 16,
      };
    });

    autoTableFn(doc, {
      head: [headers],
      body: bodyRows.length ? bodyRows : [['No records found']],
      startY: 62,
      styles: {
        fontSize: 7,
        cellPadding: 5,
        overflow: 'linebreak',
        valign: 'middle',
        minCellHeight: 22,
      },
      headStyles: { fillColor: [26, 35, 126], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { left: 28, right: 28 },
      columnStyles,
      didParseCell: (hookData) => {
        if (hookData.section !== 'body') return;
        if (!selfieColumns.includes(hookData.column.index)) return;
        hookData.cell.styles.minCellHeight = SELFIE_PDF_SIZE + 16;
      },
      didDrawCell: (hookData) => {
        if (hookData.section !== 'body') return;
        const key = `${hookData.row.index}:${hookData.column.index}`;
        const imageMeta = imageMap[key];
        if (!imageMeta?.dataUrl) return;

        const padding = 4;
        const maxW = Math.max(12, hookData.cell.width - padding * 2);
        const maxH = Math.max(12, hookData.cell.height - padding * 2);
        const fitted = fitContain(imageMeta.width, imageMeta.height, maxW, maxH);
        const x = hookData.cell.x + (hookData.cell.width - fitted.width) / 2;
        const y = hookData.cell.y + (hookData.cell.height - fitted.height) / 2;

        try {
          doc.addImage(
            imageMeta.dataUrl,
            getImageTypeFromDataUrl(imageMeta.dataUrl),
            x,
            y,
            fitted.width,
            fitted.height
          );
        } catch {
          // Keep export resilient if one image cannot be rendered.
        }
      },
    });

    doc.save(filename);
  } catch (err) {
    fallbackPdfDownloadOnWeb(title, subtitle, headers, rows, filename, selfieColumns, imageMap);
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

const exportExcelWithPhotosOnWeb = async (filename, title, subtitle, headers, rows, selfieColumns = []) => {
  const imageMapRaw = await loadSelfieImageMapOnWeb(rows, selfieColumns);
  const imageMap = Object.fromEntries(
    Object.entries(imageMapRaw).map(([key, value]) => [key, value.dataUrl || value])
  );

  // HTML Excel keeps full selfie photos visible when opened in Excel / Sheets.
  const html = buildExcelHtml(title, subtitle, headers, rows, selfieColumns, imageMap);
  const safeName = filename.replace(/\.xlsx$/i, '.xls');
  downloadOnWeb(html, safeName, 'application/vnd.ms-excel;charset=utf-8');
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
  if (isWeb) {
    await exportExcelWithPhotosOnWeb(filename, title, subtitle, headers, rows, selfieColumns);
    return;
  }

  try {
    // Native: share HTML Excel with image tags so selfies can render.
    await writeNativeExcelHtml(filename, title, subtitle, headers, rows, selfieColumns);
  } catch {
    const { XLSX, workbook } = await createWorkbook(title, subtitle, headers, rows);
    const xlsxBase64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
    const path = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(path, xlsxBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await shareFile(path, XLSX_MIME);
  }
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
