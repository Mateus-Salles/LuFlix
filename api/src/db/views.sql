CREATE OR REPLACE VIEW vw_show_movies_data AS
SELECT
    mv.movie_id AS id_filme,
    mv.title AS titulo,
    cr.description AS classificacao_indicativa,
    mv.release_year AS ano_lancamento,
    mv.rating AS nota,
    mv.synopsis AS sinopse,
    mv.duration AS duracao
FROM "movies" mv JOIN "content_rating" cr ON mv.content_rating_id = cr.rating_id;

CREATE OR REPLACE VIEW vw_show_seasons_data AS
SELECT
    sea.season_id,
    ser.title AS serie_title,
    sea.season_number,
    COUNT(ep.*) AS numero_episodios
FROM "seasons" sea JOIN "episodes" ep ON sea.season_id = ep.season_id JOIN "series" ser ON sea.serie_id = ser.serie_id GROUP BY sea.season_id, ser.title, sea.season_number;

CREATE OR REPLACE VIEW vw_show_series_data AS
SELECT
    ser.serie_id,
    ser.title,
    COUNT(sea.*) AS temporadas,
    (SELECT SUM(vw.numero_episodios)
FROM vw_show_seasons_data vw WHERE vw.serie_title = ser.title) AS numero_episodios, cr.description AS classificacao, ser.release_year AS ano_lancamento, ser.rating AS nota, ser.synopsis AS sinopse FROM "series" ser JOIN "seasons" sea ON ser.serie_id = sea.serie_id JOIN "content_rating" cr ON ser.content_rating_id = cr.rating_id GROUP BY ser.serie_id, ser.title, cr.description;

select * from vw_show_movies_data;
select * from "episodes";
select * from directors;
select * from vw_show_seasons_data;
select * from vw_show_series_data;