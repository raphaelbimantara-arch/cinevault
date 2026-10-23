const SHEET_NAME = 'Movies';
const ACTORS_SHEET_NAME = 'Actors';
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
  'uncensored',
];
const ACTOR_HEADERS = ['name', 'alias', 'dob', 'photoUrl', 'favorite', 'reviewed'];

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

    if (payload.action === 'load') {
      return jsonResponse({ movies: readMovies(getOrCreateSheet(spreadsheet, SHEET_NAME, HEADERS)) });
    }
    if (payload.action === 'loadActors') {
      return jsonResponse({ actors: readActors(getOrCreateSheet(spreadsheet, ACTORS_SHEET_NAME, ACTOR_HEADERS)) });
    }
    if (payload.action === 'saveActor') {
      validateActor(payload.actor);
      withScriptLock(function () {
        saveActor(getOrCreateSheet(spreadsheet, ACTORS_SHEET_NAME, ACTOR_HEADERS), payload.actor, payload.oldName);
      });
      return jsonResponse({ ok: true });
    }
    if (payload.action === 'deleteActors') {
      if (!Array.isArray(payload.names) || payload.names.some((name) => typeof name !== 'string')) {
        return jsonResponse({ error: 'Actor names must be an array of strings.' });
      }
      withScriptLock(function () {
        deleteActors(getOrCreateSheet(spreadsheet, ACTORS_SHEET_NAME, ACTOR_HEADERS), payload.names);
      });
      return jsonResponse({ ok: true });
    }
    if (payload.action === 'saveActors') {
      if (!Array.isArray(payload.actors) || payload.actors.length > 5000) {
        return jsonResponse({ error: 'Actors must be an array with no more than 5000 entries.' });
      }
      payload.actors.forEach(validateActor);
      withScriptLock(function () {
        writeActors(getOrCreateSheet(spreadsheet, ACTORS_SHEET_NAME, ACTOR_HEADERS), payload.actors);
      });
      return jsonResponse({ ok: true, count: payload.actors.length });
    }
    if (payload.action !== 'save' || !Array.isArray(payload.movies)) {
      return jsonResponse({ error: 'Unsupported catalog action or invalid movies.' });
    }
    if (payload.movies.length > 5000) {
      return jsonResponse({ error: 'The catalog exceeds the 5000 movie limit.' });
    }

    withScriptLock(function () {
      const sheet = getOrCreateSheet(spreadsheet, SHEET_NAME, HEADERS);
      const rows = payload.movies.map(toRow);
      sheet.clearContents();
      sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
      if (rows.length > 0) {
        const range = sheet.getRange(2, 1, rows.length, HEADERS.length);
        range.setNumberFormat('@');
        range.setValues(rows);
      }
    });

    return jsonResponse({ ok: true, count: payload.movies.length });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: error.message || 'Unexpected Apps Script error.' });
  }
}

function withScriptLock(callback) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    callback();
  } finally {
    lock.releaseLock();
  }
}

function getOrCreateSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  } else {
    const lastColumn = sheet.getLastColumn();
    const existingHeaders = new Set(
      sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0]
        .map((header) => String(header).trim().toLowerCase())
    );
    const missingHeaders = headers.filter((header) => !existingHeaders.has(header.toLowerCase()));
    if (missingHeaders.length > 0) {
      sheet.getRange(1, lastColumn + 1, 1, missingHeaders.length).setValues([missingHeaders]);
    }
  }
  return sheet;
}

function readActors(sheet) {
  if (sheet.getLastRow() < 2) return [];
  const values = sheet.getRange(1, 1, sheet.getLastRow(), ACTOR_HEADERS.length).getDisplayValues();
  const headers = values[0];
  return values.slice(1).filter((row) => row[0]).map((row) => {
    const actor = {};
    headers.forEach((header, index) => {
      actor[header] = row[index] || '';
    });
    return {
      name: actor.name,
      alias: actor.alias || undefined,
      dob: actor.dob || '',
      photoUrl: actor.photoUrl || '',
      favorite: String(actor.favorite || '').toLowerCase() === 'true',
      reviewed: String(actor.reviewed || '').toLowerCase() === 'true',
    };
  });
}

function validateActor(actor) {
  if (!actor || typeof actor.name !== 'string' || !actor.name.trim()) {
    throw new Error('Every actor must have a name.');
  }
  if (actor.name.length > 200 || String(actor.alias || '').length > 2000 ||
      String(actor.dob || '').length > 100 || String(actor.photoUrl || '').length > 2000) {
    throw new Error('Actor profile fields exceed the allowed length.');
  }
}

function actorToRow(actor) {
  return [
    actor.name.trim(),
    String(actor.alias || ''),
    String(actor.dob || ''),
    String(actor.photoUrl || ''),
    String(actor.favorite === true),
    String(actor.reviewed === true),
  ];
}

function writeActors(sheet, actors) {
  const rows = actors.map(actorToRow);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, ACTOR_HEADERS.length).setValues([ACTOR_HEADERS]);
  if (rows.length > 0) {
    const range = sheet.getRange(2, 1, rows.length, ACTOR_HEADERS.length);
    range.setNumberFormat('@');
    range.setValues(rows);
  }
}

function saveActor(sheet, actor, oldName) {
  const existing = readActors(sheet);
  const oldKey = String(oldName || actor.name).trim().toLowerCase();
  const newKey = actor.name.trim().toLowerCase();
  const remaining = existing.filter((item) => {
    const key = item.name.trim().toLowerCase();
    return key !== oldKey && key !== newKey;
  });
  remaining.push(actor);
  writeActors(sheet, remaining);
}

function deleteActors(sheet, names) {
  const deleted = new Set(names.map((name) => name.trim().toLowerCase()));
  writeActors(sheet, readActors(sheet).filter((actor) => !deleted.has(actor.name.trim().toLowerCase())));
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
      uncensored: String(record.uncensored || '').toLowerCase() === 'true',
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
    String(movie.uncensored === true),
  ];
}

function jsonResponse(value) {
  return ContentService
    .createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}
