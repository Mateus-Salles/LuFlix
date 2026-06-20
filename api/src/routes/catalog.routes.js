const { Router } = require("express");
const {
  insertMovie,
  insertSerie,
  insertEpisode,
  insertContentGenres,
  insertContentCast,
  insertContentDirectors,
  updateMovie,
  deleteMovie,
  updateSerie,
  deleteSerie,
  updateEpisode,
  deleteEpisode,
} = require("../controllers/catalog.controller");
const {
  uploadMovie,
  uploadEpisode,
  optionalUpload,
} = require("../middleware/upload");

const router = Router();

// Conteúdo
router.post("/movies", uploadMovie, insertMovie);
router.post("/series", insertSerie);
router.post("/episodes", uploadEpisode, insertEpisode);

// Atualização e exclusão
// Keep old endpoints (body-based)
router.put("/movies", optionalUpload(uploadMovie), updateMovie);
router.delete("/movies", deleteMovie);

router.put("/series", updateSerie);
router.delete("/series", deleteSerie);

router.put("/episodes", optionalUpload(uploadEpisode), updateEpisode);
router.delete("/episodes", deleteEpisode);

// RESTful id-based endpoints
router.put("/movies/:id", optionalUpload(uploadMovie), updateMovie);
router.delete("/movies/:id", deleteMovie);

router.put("/series/:id", updateSerie);
router.delete("/series/:id", deleteSerie);

router.put("/episodes/:id", optionalUpload(uploadEpisode), updateEpisode);
router.delete("/episodes/:id", deleteEpisode);

// Metadados
router.post("/genres", insertContentGenres);
router.post("/cast", insertContentCast);
router.post("/directors", insertContentDirectors);

module.exports = router;
