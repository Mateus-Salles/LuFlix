const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadRoot = path.resolve(__dirname, "../../uploads");
const movieUploadDir = path.join(uploadRoot, "movies");
const episodeUploadDir = path.join(uploadRoot, "episodes");
const chunkUploadDir = path.join(uploadRoot, "chunks");

const seriesUploadDir = path.join(uploadRoot, "series");

for (const dir of [uploadRoot, movieUploadDir, episodeUploadDir, chunkUploadDir, seriesUploadDir]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function storageForFolder(folder) {
  return multer.diskStorage({
    destination: (_req, file, cb) => {
      if (file.fieldname === "serie_thumb") {
        return cb(null, seriesUploadDir);
      }
      cb(null, folder);
    },
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
  if (file.fieldname === "media" && !file.mimetype.startsWith("video/")) {
    return cb(new Error("Apenas arquivos de vídeo são permitidos para mídia."), false);
  }
  if ((file.fieldname === "thumb" || file.fieldname === "serie_thumb") && !file.mimetype.startsWith("image/")) {
    return cb(new Error("Apenas arquivos de imagem são permitidos para miniaturas."), false);
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
}).fields([
  { name: "media", maxCount: 1 },
  { name: "thumb", maxCount: 1 }
]);

const uploadEpisode = multer({
  storage: storageForFolder(episodeUploadDir),
  fileFilter: mediaFileFilter,
}).fields([
  { name: "media", maxCount: 1 },
  { name: "thumb", maxCount: 1 },
  { name: "serie_thumb", maxCount: 1 }
]);

const uploadChunk = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, chunkUploadDir),
    filename: (req, file, cb) => {
      const { uploadId, chunkIndex } = req.body;
      cb(null, `${uploadId}_${chunkIndex}`);
    },
  }),
}).single("media");

module.exports = {
  uploadMovie,
  uploadEpisode,
  uploadChunk,
  optionalUpload,
};
