const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

function getManifestPath(type) {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
  return path.join(UPLOADS_DIR, `${type}_manifest.json`);
}

function getMediaManifest(type) {
  const filePath = getManifestPath(type);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data || '{}');
  } catch (err) {
    console.error(`Erro ao ler manifesto para ${type}:`, err.message);
    return {};
  }
}

function saveMediaManifest(type, manifestData) {
  const filePath = getManifestPath(type);
  try {
    fs.writeFileSync(filePath, JSON.stringify(manifestData, null, 2), 'utf8');
  } catch (err) {
    console.error(`Erro ao salvar manifesto para ${type}:`, err.message);
  }
}

function getMediaPath(type, id) {
  const manifest = getMediaManifest(type);
  const entry = manifest[String(id)];
  if (!entry) return null;
  if (typeof entry === 'object') return entry.media_path || null;
  return entry;
}

function setMediaPath(type, id, mediaPath) {
  setMediaEntry(type, id, mediaPath, null);
}

function getMediaEntry(type, id) {
  const manifest = getMediaManifest(type);
  const entry = manifest[String(id)];
  if (!entry) return { media_path: null, thumb_path: null };
  if (typeof entry === 'object') {
    return {
      media_path: entry.media_path || null,
      thumb_path: entry.thumb_path || null
    };
  }
  return { media_path: entry, thumb_path: null };
}

function setMediaEntry(type, id, mediaPath, thumbPath) {
  const manifest = getMediaManifest(type);
  const current = manifest[String(id)];
  let newEntry = {};
  if (current && typeof current === 'object') {
    newEntry = { ...current };
  } else if (current) {
    newEntry.media_path = current;
  }
  if (mediaPath !== undefined && mediaPath !== null) newEntry.media_path = mediaPath;
  if (thumbPath !== undefined && thumbPath !== null) newEntry.thumb_path = thumbPath;
  manifest[String(id)] = newEntry;
  saveMediaManifest(type, manifest);
}

module.exports = {
  getMediaManifest,
  saveMediaManifest,
  getMediaPath,
  setMediaPath,
  getMediaEntry,
  setMediaEntry
};
