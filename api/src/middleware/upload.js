const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.resolve(__dirname, "../../uploads");
const movieUploadDir = path.join(uploadRoot, "movies");
const episodeUploadDir = path.join(uploadRoot, "episodes");

for (const dir of [uploadRoot, movieUploadDir, episodeUploadDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function storageForFolder(folder) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, folder),
    filename: (_req, file, cb) => {
      const timestamp = Date.now();
      const safeName = file.originalname
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_.-]/g, "");
      cb(null, `${timestamp}-${safeName}`);
    },
  });
}

function mediaFileFilter(req, file, cb) {
  if (!file.mimetype.startsWith("video/")) {
    return cb(new Error("Apenas arquivos de vídeo são permitidos."), false);
  }
  cb(null, true);
}

function optionalUpload(uploadMiddleware) {
  return (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      return uploadMiddleware(req, res, next);
    }
    next();
  };
}

const uploadMovie = multer({
  storage: storageForFolder(movieUploadDir),
  fileFilter: mediaFileFilter,
}).single("media");

const uploadEpisode = multer({
  storage: storageForFolder(episodeUploadDir),
  fileFilter: mediaFileFilter,
}).single("media");

module.exports = {
  uploadMovie,
  uploadEpisode,
  optionalUpload,
};
