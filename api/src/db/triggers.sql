CREATE OR REPLACE FUNCTION fn_update_review_movie_or_episode()
RETURNS trigger AS $$
DECLARE
    v_avg_review NUMERIC;
    v_count_review INT;
    v_sum_review INT;
    v_initial_rating NUMERIC(2,1);
    v_initial_number_rating INT;
BEGIN
    IF NEW.movie_id IS NOT NULL THEN
        SELECT COUNT(review_id), SUM(rating) INTO v_count_review, v_sum_review FROM "reviews" WHERE movie_id = NEW.movie_id;
        SELECT initial_number_rating, initial_rating INTO v_initial_number_rating, v_initial_rating FROM "movies" WHERE movie_id = NEW.movie_id;

        v_sum_review := v_sum_review + (v_initial_number_rating * v_initial_rating);
        v_count_review := v_count_review + v_initial_number_rating;

        v_avg_review := (v_sum_review / v_count_review::NUMERIC);

        UPDATE "movies" SET rating = v_avg_review WHERE movie_id = NEW.movie_id;
    ELSIF NEW.episode_id IS NOT NULL THEN
        SELECT COUNT(episode_id), SUM(rating) INTO v_count_review, v_sum_review FROM "reviews" WHERE episode_id = NEW.episode_id;
        SELECT initial_number_rating, initial_rating INTO v_initial_number_rating, v_initial_rating FROM "episodes" WHERE episode_id = NEW.episode_id;

        v_sum_review := v_sum_review + (v_initial_number_rating * v_initial_rating);
        v_count_review := v_count_review + v_initial_number_rating;

        v_avg_review := v_sum_review / v_count_review;

        UPDATE "episodes" SET rating = v_avg_review WHERE episode_id = NEW.episode_id;

        SELECT ROUND(SUM(ep.rating) / COUNT(ep.season_id), 1) INTO v_avg_review FROM "seasons" sea JOIN "episodes" ep ON ep.season_id = sea.season_id;

        UPDATE "seasons" SET rating = v_avg_review WHERE season_id = (SELECT season_id FROM "episodes" WHERE episode_id = NEW.episode_id LIMIT 1);

        SELECT ROUND(SUM(sea.rating) / COUNT(sea.season_id), 1) INTO v_avg_review FROM "series" ser JOIN "seasons" sea ON sea.serie_id = ser.serie_id;
        UPDATE "series" SET rating = v_avg_review WHERE serie_id = (SELECT sea.serie_id FROM "episodes" ep JOIN "seasons" sea ON ep.season_id = sea.season_id WHERE ep.episode_id = NEW.episode_id LIMIT 1);
    ELSE
        RAISE EXCEPTION 'Invalid movie or episode id';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_update_review_season_and_serie()
RETURNS trigger AS $$
DECLARE
    v_avg_review NUMERIC;
    v_season_id INT;
    v_serie_id INT;
BEGIN
    SELECT season_id INTO v_season_id FROM "episodes" WHERE episode_id = NEW.episode_id;
    
    IF v_season_id IS NOT NULL THEN
        SELECT ROUND(AVG(rating), 1) INTO v_avg_review 
        FROM "episodes" 
        WHERE season_id = v_season_id;
        
        UPDATE "seasons" SET rating = v_avg_review WHERE season_id = v_season_id;
        
        SELECT serie_id INTO v_serie_id FROM "seasons" WHERE season_id = v_season_id;
        
        IF v_serie_id IS NOT NULL THEN
            SELECT ROUND(AVG(rating), 1) INTO v_avg_review 
            FROM "seasons" 
            WHERE serie_id = v_serie_id;
            
            UPDATE "series" SET rating = v_avg_review WHERE serie_id = v_serie_id;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


CREATE TRIGGER trg_update_review_season_and_serie
AFTER UPDATE ON "episodes"
FOR EACH ROW WHEN (OLD.rating IS DISTINCT FROM NEW.rating)
EXECUTE PROCEDURE fn_update_review_season_and_serie();


CREATE TRIGGER trg_update_review_movie_or_episode
AFTER INSERT OR UPDATE ON "reviews"
FOR EACH ROW
EXECUTE PROCEDURE fn_update_review_movie_or_episode();