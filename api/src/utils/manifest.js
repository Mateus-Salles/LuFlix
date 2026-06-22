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
  return manifest[String(id)] || null;
}

function setMediaPath(type, id, mediaPath) {
  const manifest = getMediaManifest(type);
  manifest[String(id)] = mediaPath;
  saveMediaManifest(type, manifest);
}

module.exports = {
  getMediaManifest,
  saveMediaManifest,
  getMediaPath,
  setMediaPath
};
