-- ============================================================
-- USUARIOS, DISPOSITIVOS E ASSINATURAS
-- ============================================================

CREATE OR REPLACE PROCEDURE pr_register_user_and_device(
    p_name VARCHAR,
    p_email VARCHAR,
    p_password VARCHAR,
    p_device_token VARCHAR,
    p_device_type VARCHAR,
    p_device_name VARCHAR,
    OUT p_user_id INT
) LANGUAGE plpgsql AS $$
BEGIN
    INSERT INTO "users" (name, email, password)
    VALUES (p_name, p_email, p_password)
    RETURNING user_id INTO p_user_id;

    INSERT INTO "devices" (user_id, token, type, name, last_activity)
    VALUES (p_user_id, p_device_token, p_device_type, p_device_name, NOW());
END;
$$;

CREATE OR REPLACE PROCEDURE pr_subscribe_user(
    p_user_id INT,
    p_plan_id INT,
    p_cpf VARCHAR(11),
    p_gateway_customer_id VARCHAR,
    OUT p_subscription_id INT
) LANGUAGE plpgsql AS $$
DECLARE
    v_invoicing_id INT;
BEGIN
    SELECT invoicing_id
      INTO v_invoicing_id
      FROM "invoicing_data"
     WHERE user_id = p_user_id;

    IF v_invoicing_id IS NULL THEN
        INSERT INTO "invoicing_data" (user_id, cpf, gateway_customer_id)
        VALUES (p_user_id, p_cpf, p_gateway_customer_id);
    END IF;

    INSERT INTO "subscriptions" (user_id, plan_id, status, started_at, next_bill_at)
    VALUES (p_user_id, p_plan_id, 'active', NOW(), NOW() + INTERVAL '1 month')
    RETURNING subscription_id INTO p_subscription_id;
END;
$$;


-- ============================================================
-- PESSOAS
-- ============================================================

CREATE OR REPLACE PROCEDURE pr_insert_actors_array(
    p_actors movie_person[]
) LANGUAGE plpgsql AS $$
DECLARE
    v_actor movie_person;
BEGIN
    FOREACH v_actor IN ARRAY p_actors LOOP
        INSERT INTO "actors" (first_name, last_name, nationality, birth)
        VALUES (v_actor.first_name, v_actor.last_name, v_actor.nationality, v_actor.birth);
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION fn_insert_director(
    p_director movie_person
) RETURNS INT
LANGUAGE plpgsql AS $$
DECLARE
    v_director_id INT;
BEGIN
    INSERT INTO "directors" (first_name, last_name, nationality, birth)
    VALUES (p_director.first_name, p_director.last_name, p_director.nationality, p_director.birth)
    RETURNING director_id INTO v_director_id;

    RETURN v_director_id;
END;
$$;


-- ============================================================
-- CATALOGO
-- ============================================================

CREATE OR REPLACE PROCEDURE pr_insert_movie_or_serie(
    p_type VARCHAR(7),
    p_release_year INT,
    p_content_rating_id INT,
    p_directors_id INT[] DEFAULT NULL,
    p_number_rating INT DEFAULT 0,
    p_rating NUMERIC(2, 1) DEFAULT 0,
    p_serie_id INT DEFAULT NULL,
    p_duration INT DEFAULT NULL,

    p_movie_title VARCHAR(150) DEFAULT NULL,
    p_movie_synopsis TEXT DEFAULT NULL,

--     p_episode_number INT DEFAULT NULL,
    p_episode_title VARCHAR(150) DEFAULT NULL,
    p_episode_synopsis TEXT DEFAULT NULL,

    p_serie_title VARCHAR DEFAULT NULL,
    p_serie_synopsis TEXT DEFAULT NULL,

    p_season_number INT DEFAULT NULL
) LANGUAGE plpgsql AS $$
DECLARE
    v_type VARCHAR(7) := LOWER(p_type);
    v_movie_id INT;
    v_episode_id INT;
    v_serie_id INT;
    v_serie_name VARCHAR;
    v_season_id INT;
    v_episode_number INT;
BEGIN
    IF v_type NOT IN ('movie', 'serie', 'episode') THEN
        RAISE EXCEPTION 'Tipo inválido. Use ''movie'', ''serie'' ou ''episode''.';
    END IF;

    IF v_type = 'movie' THEN
        IF p_directors_id IS NULL OR CARDINALITY(p_directors_id) = 0 THEN
            RAISE EXCEPTION 'Para inserir um filme, os diretores (directors_id) é obrigatório.';
        ELSIF p_movie_title IS NULL THEN
            RAISE EXCEPTION 'Para inserir um filme, o título (movie_title) é obrigatório.';
        ELSIF p_movie_synopsis IS NULL THEN
            RAISE EXCEPTION 'Para inserir um filme, a sinopse (movie_synopsis) é obrigatória.';
        ELSIF p_duration IS NULL THEN
            RAISE EXCEPTION 'Para inserir um filme, a duração (duration) é obrigatória.';
        END IF;

        INSERT INTO "movies" (
            content_rating_id,
            title,
            release_year,
            initial_number_rating,
            initial_rating,
            rating,
            synopsis,
            duration
        )
        VALUES (
            p_content_rating_id,
            p_movie_title,
            p_release_year,
            p_number_rating,
            p_rating,
            p_rating,
            p_movie_synopsis,
            p_duration
        ) RETURNING movie_id INTO v_movie_id;

--         INSERT INTO "directors_movies" (director_id, movie_id)
--         SELECT director_id, v_movie_id FROM UNNEST(p_directors_id) AS director_data(director_id)
--         ON CONFLICT DO NOTHING;

        PERFORM fn_insert_content_directors(
            p_content_type => 'movie',
            p_content_id => v_movie_id,
            p_directors_ids => p_directors_id
        );

        RAISE NOTICE 'Filme "%" inserido com sucesso.', p_movie_title;
        RETURN;
    END IF;

    IF v_type = 'serie' THEN
        IF p_serie_title IS NULL THEN
            RAISE EXCEPTION 'Para inserir uma série, o título (serie_title) é obrigatório.';
        ELSIF p_serie_synopsis IS NULL THEN
            RAISE EXCEPTION 'Para inserir uma série, a sinopse (serie_synopsis) é obrigatória.';
        END IF;

        INSERT INTO "series" (content_rating_id, title, release_year, rating, synopsis)
        VALUES (p_content_rating_id, p_serie_title, p_release_year, p_rating, p_serie_synopsis);

        RAISE NOTICE 'Série "%" inserida com sucesso.', p_serie_title;
        RETURN;
    END IF;

--     IF p_episode_number IS NULL THEN
--         RAISE EXCEPTION 'Para inserir um episódio, o número do episódio (episode_number) é obrigatório.';
    IF p_episode_title IS NULL THEN
        RAISE EXCEPTION 'Para inserir um episódio, o título do episódio (episode_title) é obrigatório.';
    ELSIF p_episode_synopsis IS NULL THEN
        RAISE EXCEPTION 'Para inserir um episódio, a sinopse do episódio (episode_synopsis) é obrigatória.';
    ELSIF p_directors_id IS NULL OR CARDINALITY(p_directors_id) = 0 THEN
        RAISE EXCEPTION 'Para inserir um episódio, os diretores do episódio (directors_id) é obrigatório.';
    ELSIF p_duration IS NULL THEN
        RAISE EXCEPTION 'Para inserir um episódio, a duração do episódio (duration) é obrigatória.';
    END IF;

    SELECT serie_id
      INTO v_serie_id
      FROM "series"
     WHERE serie_id = p_serie_id;

    IF v_serie_id IS NULL THEN
        IF p_serie_title IS NULL THEN
            RAISE EXCEPTION 'Para inserir uma série, o título (serie_title) é obrigatório.';
        ELSIF p_serie_synopsis IS NULL THEN
            RAISE EXCEPTION 'Para inserir uma série, a sinopse (serie_synopsis) é obrigatória.';
        END IF;

        INSERT INTO "series" (content_rating_id, title, release_year, rating, synopsis)
        VALUES (p_content_rating_id, p_serie_title, p_release_year, p_rating, p_serie_synopsis)
        RETURNING serie_id INTO v_serie_id;

        RAISE NOTICE 'Série "%" criada com sucesso.', p_serie_title;
    END IF;

    SELECT season_id
      INTO v_season_id
      FROM "seasons"
     WHERE serie_id = v_serie_id
       AND season_number = p_season_number;

    IF v_season_id IS NULL THEN
        IF p_season_number IS NULL THEN
            RAISE EXCEPTION 'Para inserir uma temporada, o número da temporada (season_number) é obrigatório.';
        END IF;

        INSERT INTO "seasons" (serie_id, season_number, release_year, rating)
        VALUES (v_serie_id, p_season_number, p_release_year, p_rating)
        RETURNING season_id INTO v_season_id;

        SELECT title
          INTO v_serie_name
          FROM "series"
         WHERE serie_id = v_serie_id;

        RAISE NOTICE 'Temporada % da série "%" criada com sucesso.', p_season_number, v_serie_name;
    END IF;

    SELECT (COUNT(*) + 1) INTO v_episode_number FROM "episodes" WHERE season_id = v_season_id;

    INSERT INTO "episodes" (
        season_id,
        title,
        episode_number,
        duration,
        initial_number_rating,
        initial_rating,
        rating,
        synopsis
    ) VALUES (
        v_season_id,
        p_episode_title,
        v_episode_number,
        p_duration,
        p_number_rating,
        p_rating,
        p_rating,
        p_episode_synopsis
    ) RETURNING episode_id INTO v_episode_id;

--     INSERT INTO "directors_episodes" (director_id, episode_id)
--     SELECT director_id, v_episode_id FROM UNNEST(p_directors_id) AS director_data(director_id)
--     ON CONFLICT DO NOTHING;

    PERFORM fn_insert_content_directors(
        p_content_type => 'episode',
        p_content_id => v_episode_id,
        p_directors_ids => p_directors_id
    );

    RAISE NOTICE 'Episódio % "%" da temporada % inserido com sucesso.',
        v_episode_number,
        p_episode_title,
        p_season_number;
END;
$$;


-- ============================================================
-- GENEROS E ELENCO
-- ============================================================

CREATE OR REPLACE FUNCTION fn_insert_content_genres(
    p_content_type VARCHAR,
    p_content_id INT,
    p_genre_ids INT[]
) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_content_type VARCHAR := LOWER(p_content_type);
BEGIN
    IF v_content_type NOT IN ('movie', 'serie') THEN
        RAISE EXCEPTION 'Tipo inválido. Use ''movie'' ou ''serie''.';
    END IF;

    IF p_content_id IS NULL THEN
        RAISE EXCEPTION 'O id do conteúdo é obrigatório.';
    END IF;

    IF p_genre_ids IS NULL OR CARDINALITY(p_genre_ids) = 0 THEN
        RAISE EXCEPTION 'Informe pelo menos um gênero.';
    END IF;

    IF v_content_type = 'movie' THEN
        INSERT INTO "movie_genres" (movie_id, genre_id)
        SELECT p_content_id, genre_id
          FROM UNNEST(p_genre_ids) AS genre_data(genre_id)
        ON CONFLICT DO NOTHING;
    ELSE
        INSERT INTO "serie_genres" (serie_id, genre_id)
        SELECT p_content_id, genre_id
          FROM UNNEST(p_genre_ids) AS genre_data(genre_id)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fn_insert_content_cast(
    p_content_type VARCHAR,
    p_content_id INT,
    p_actor_ids INT[],
    p_character_names VARCHAR[]
) RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
    v_content_type VARCHAR := LOWER(p_content_type);
BEGIN
    IF v_content_type NOT IN ('movie', 'episode') THEN
        RAISE EXCEPTION 'Tipo inválido. Use ''movie'' ou ''episode''.';
    END IF;

    IF p_content_id IS NULL THEN
        RAISE EXCEPTION 'O id do conteúdo é obrigatório.';
    END IF;

    IF p_actor_ids IS NULL OR CARDINALITY(p_actor_ids) = 0 THEN
        RAISE EXCEPTION 'Informe pelo menos um ator.';
    END IF;

    IF p_character_names IS NULL OR CARDINALITY(p_character_names) = 0 THEN
        RAISE EXCEPTION 'Informe pelo menos um personagem.';
    END IF;

    IF CARDINALITY(p_actor_ids) <> CARDINALITY(p_character_names) THEN
        RAISE EXCEPTION 'Os arrays de atores e personagens devem ter o mesmo tamanho.';
    END IF;

    IF v_content_type = 'movie' THEN
        INSERT INTO "movie_cast" (movie_id, actor_id, character_name)
        SELECT p_content_id, actor_id, character_name
          FROM UNNEST(p_actor_ids, p_character_names) AS cast_data(actor_id, character_name)
        ON CONFLICT DO NOTHING;
    ELSE
        INSERT INTO "episode_cast" (episode_id, actor_id, character_name)
        SELECT p_content_id, actor_id, character_name
          FROM UNNEST(p_actor_ids, p_character_names) AS cast_data(actor_id, character_name)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;

CREATE OR REPLACE FUNCTION fn_insert_content_directors(
    p_content_type VARCHAR,
    p_content_id INT,
    p_directors_ids INT[]
) RETURNS VOID
    LANGUAGE plpgsql AS $$
DECLARE
    v_content_type VARCHAR := LOWER(p_content_type);
BEGIN
    IF v_content_type NOT IN ('movie', 'episode') THEN
        RAISE EXCEPTION 'Tipo inválido. Use ''movie'' ou ''episode''.';
    END IF;

    IF p_content_id IS NULL THEN
        RAISE EXCEPTION 'O id do conteúdo é obrigatório.';
    END IF;

    IF p_directors_ids IS NULL OR CARDINALITY(p_directors_ids) = 0 THEN
        RAISE EXCEPTION 'Informe pelo menos um diretor.';
    END IF;

    IF v_content_type = 'movie' THEN
        INSERT INTO "directors_movies" (director_id, movie_id)
        SELECT director_id, p_content_id
        FROM UNNEST(p_directors_ids) AS directors_data(director_id)
        ON CONFLICT DO NOTHING;
    ELSE
        INSERT INTO "directors_episodes" (director_id, episode_id)
        SELECT director_id, p_content_id
        FROM UNNEST(p_directors_ids) AS directors_data(director_id)
        ON CONFLICT DO NOTHING;
    END IF;
END;
$$;


-- ============================================================
-- REVIEWS
-- ============================================================

CREATE OR REPLACE PROCEDURE pr_insert_review(
    p_user_id INT,
    p_rating INT,
    p_comment TEXT,
    p_movie_id INT DEFAULT NULL,
    p_episode_id INT DEFAULT NULL
) LANGUAGE plpgsql AS $$
BEGIN
    IF p_episode_id IS NOT NULL AND p_movie_id IS NOT NULL THEN
        RAISE EXCEPTION 'Foram fornecidos os campos movie_id e episode_id. Apenas um dos dois deve ser fornecido.';
    ELSIF p_episode_id IS NULL AND p_movie_id IS NULL THEN
        RAISE EXCEPTION 'Não foram fornecidos nenhum dos campos movie_id e episode_id. Um dos dois deve ser fornecido.';
    END IF;

    INSERT INTO "reviews" (user_id, movie_id, episode_id, rating, comment)
    VALUES (p_user_id, p_movie_id, p_episode_id, p_rating, p_comment);
END;
$$;


-- ============================================================
-- FAVORITOS
-- ============================================================

CREATE OR REPLACE PROCEDURE pr_add_favorite(
    p_user_id INT,
    p_movie_id INT DEFAULT NULL,
    p_episode_id INT DEFAULT NULL,
    p_serie_id INT DEFAULT NULL
) LANGUAGE plpgsql AS $$
BEGIN
    IF (p_movie_id IS NOT NULL AND p_episode_id IS NOT NULL) OR
       (p_movie_id IS NOT NULL AND p_serie_id IS NOT NULL) OR
       (p_episode_id IS NOT NULL AND p_serie_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Apenas um dos campos (movie_id, episode_id ou serie_id) deve ser fornecido.';
    END IF;

    IF p_movie_id IS NULL AND p_episode_id IS NULL AND p_serie_id IS NULL THEN
        RAISE EXCEPTION 'Um dos campos (movie_id, episode_id ou serie_id) deve ser fornecido.';
    END IF;

    INSERT INTO "favorites" (user_id, movie_id, episode_id, serie_id, created_at)
    VALUES (p_user_id, p_movie_id, p_episode_id, p_serie_id, NOW())
    ON CONFLICT DO NOTHING;

    RAISE NOTICE 'Favorito adicionado com sucesso para o usuário %.', p_user_id;
END;
$$;

CREATE OR REPLACE PROCEDURE pr_remove_favorite(
    p_user_id INT,
    p_movie_id INT DEFAULT NULL,
    p_episode_id INT DEFAULT NULL,
    p_serie_id INT DEFAULT NULL
) LANGUAGE plpgsql AS $$
DECLARE
    v_deleted_count INT;
BEGIN
    IF (p_movie_id IS NOT NULL AND p_episode_id IS NOT NULL) OR
       (p_movie_id IS NOT NULL AND p_serie_id IS NOT NULL) OR
       (p_episode_id IS NOT NULL AND p_serie_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Apenas um dos campos (movie_id, episode_id ou serie_id) deve ser fornecido.';
    END IF;

    IF p_movie_id IS NULL AND p_episode_id IS NULL AND p_serie_id IS NULL THEN
        RAISE EXCEPTION 'Um dos campos (movie_id, episode_id ou serie_id) deve ser fornecido.';
    END IF;

    DELETE FROM "favorites"
     WHERE user_id = p_user_id
       AND (movie_id = p_movie_id OR (movie_id IS NULL AND p_movie_id IS NULL))
       AND (episode_id = p_episode_id OR (episode_id IS NULL AND p_episode_id IS NULL))
       AND (serie_id = p_serie_id OR (serie_id IS NULL AND p_serie_id IS NULL));

    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    IF v_deleted_count > 0 THEN
        RAISE NOTICE 'Favorito removido com sucesso para o usuário %.', p_user_id;
    ELSE
        RAISE NOTICE 'Nenhum favorito encontrado para remover.';
    END IF;
END;
$$;


-- ============================================================
-- HISTORICO DE VISUALIZACAO
-- ============================================================

CREATE OR REPLACE PROCEDURE pr_add_to_watch_history(
    p_user_id INT,
    p_movie_id INT DEFAULT NULL,
    p_episode_id INT DEFAULT NULL,
    p_watched_duration_minutes INT DEFAULT NULL,
    p_watched_duration_seconds INT DEFAULT NULL
) LANGUAGE plpgsql AS $$
DECLARE
    v_watched_at TIMESTAMP = NOW();
BEGIN
    IF p_movie_id IS NOT NULL AND p_episode_id IS NOT NULL THEN
        RAISE EXCEPTION 'Apenas um dos campos (movie_id ou episode_id) deve ser fornecido.';
    END IF;

    IF p_movie_id IS NULL AND p_episode_id IS NULL THEN
        RAISE EXCEPTION 'Um dos campos (movie_id ou episode_id) deve ser fornecido.';
    END IF;

    INSERT INTO "watch_history" (
        user_id,
        movie_id,
        episode_id,
        watched_at,
        watched_minutes,
        watched_seconds
    ) VALUES (
        p_user_id,
        p_movie_id,
        p_episode_id,
        v_watched_at,
        p_watched_duration_minutes,
        p_watched_duration_seconds
    )
    ON CONFLICT (user_id, movie_id, episode_id)
    DO UPDATE SET
        watched_at = v_watched_at,
        watched_minutes = COALESCE(EXCLUDED.watched_minutes, watch_history.watched_minutes),
        watched_seconds = COALESCE(EXCLUDED.watched_seconds, watch_history.watched_seconds);

    RAISE NOTICE 'Histórico de visualização adicionado/atualizado com sucesso para o usuário %.', p_user_id;
END;
$$;
