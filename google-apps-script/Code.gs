const SHEET_NAME = 'Movies';
const HEADERS = [
  'id',
  'title',
  'genre',
  'studio',
  'year',
  'minutes',
  'size',
  'sizeBytes',
  'resolution',
  'posterUrl',
  'backdropUrl',
  'actors',
  'addedDate',
  'favorite',
  'reviewed',
];

function doPost(event) {
  try {
    const payload = JSON.parse(event.postData.contents);
    const properties = PropertiesService.getScriptProperties();
    const expectedToken = properties.getProperty('CINEVAULT_SHARED_SECRET');
    const spreadsheetId = properties.getProperty('SPREADSHEET_ID');

    if (!expectedToken || !spreadsheetId) {
      throw new Error('Apps Script properties are not configured.');
    }
    if (payload.token !== expectedToken) {
      return jsonResponse({ error: 'Access key is incorrect.' });
    }

    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheet = getOrCreateSheet(spreadsheet);

    if (payload.action === 'load') {
      return jsonResponse({ movies: readMovies(sheet) });
    }
    if (payload.action !== 'save' || !Array.isArray(payload.movies)) {
      return jsonResponse({ error: 'Unsupported catalog action or invalid movies.' });
    }
    if (payload.movies.length > 5000) {
      return jsonResponse({ error: 'The catalog exceeds the 5000 movie limit.' });
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(30000);
    try {
      const rows = payload.movies.map(toRow);
      sheet.clearContents();
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      if (rows.length > 0) {
        const range = sheet.getRange(2, 1, rows.length, HEADERS.length);
        range.setNumberFormat('@');
        range.setValues(rows);
      }
    } finally {
      lock.releaseLock();
    }

    return jsonResponse({ ok: true, count: payload.movies.length });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error.message || 'Unexpected Apps Script error.' });
  }
}

function getOrCreateSheet(spreadsheet) {
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }
  return sheet;
}

function readMovies(sheet) {
  if (sheet.getLastRow() < 2) return [];

  const values = sheet.getRange(1, 1, sheet.getLastRow(), HEADERS.length).getDisplayValues();
  const headers = values[0];
  return values.slice(1).filter((row) => row[0]).map((row) => {
    const record = {};
    headers.forEach((header, index) => {
      record[header] = row[index] || '';
    });

    let actors = [];
    try {
      actors = JSON.parse(record.actors || '[]');
    } catch {
      actors = String(record.actors || '').split(/[|,;]/).map((name) => name.trim()).filter(Boolean);
    }

    return {
      id: record.id,
      title: record.title,
      genre: record.genre,
      studio: record.studio,
      year: Number(record.year) || 0,
      minutes: Number(record.minutes) || 0,
      size: record.size,
      sizeBytes: Number(record.sizeBytes) || undefined,
      resolution: record.resolution || undefined,
      posterUrl: record.posterUrl,
      backdropUrl: record.backdropUrl || undefined,
      actors,
      addedDate: record.addedDate || undefined,
      favorite: String(record.favorite || '').toLowerCase() === 'true',
      reviewed: String(record.reviewed || '').toLowerCase() === 'true',
    };
  });
}

function toRow(movie) {
  if (!movie || typeof movie.id !== 'string' || !movie.id || typeof movie.title !== 'string') {
    throw new Error('Every movie must have an ID and title.');
  }

  return [
    movie.id,
    movie.title,
    String(movie.genre || ''),
    String(movie.studio || ''),
    String(movie.year || ''),
    String(movie.minutes || ''),
    String(movie.size || ''),
    String(movie.sizeBytes || ''),
    String(movie.resolution || ''),
    String(movie.posterUrl || ''),
    String(movie.backdropUrl || ''),
    JSON.stringify(Array.isArray(movie.actors) ? movie.actors : []),
    String(movie.addedDate || ''),
    String(movie.favorite === true),
    String(movie.reviewed === true),
  ];
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
