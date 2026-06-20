CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS "users" (
    user_id SERIAL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_user PRIMARY KEY (user_id),
    CONSTRAINT uq_user_email UNIQUE (email)
);

CREATE TABLE IF NOT EXISTS "devices" (
    device_id SERIAL,
    user_id INT NOT NULL,
    token VARCHAR,
    type VARCHAR,
    name VARCHAR,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at DATE DEFAULT CURRENT_DATE,
    updated_at DATE DEFAULT CURRENT_DATE,

    CONSTRAINT pk_device PRIMARY KEY (device_id),
    CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT uq_device_token UNIQUE (token)
);

CREATE TABLE IF NOT EXISTS "invoicing_data" (
    invoicing_id SERIAL,
    user_id INT NOT NULL,
    cpf VARCHAR(11) NOT NULL,
    gateway_customer_id VARCHAR NOT NULL,
    created_at DATE DEFAULT CURRENT_DATE,
    updated_at DATE DEFAULT CURRENT_DATE,

    CONSTRAINT pk_invoicing_data PRIMARY KEY (invoicing_id),
    CONSTRAINT fk_invoicing_data_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT uq_invoicing_data_cpf UNIQUE (cpf),
    CONSTRAINT uq_invoicing_data_gateway_customer_id UNIQUE (gateway_customer_id)
);

CREATE TABLE IF NOT EXISTS "plans" (
    plan_id SERIAL,
    name VARCHAR(50) NOT NULL,
    value NUMERIC(10,2) NOT NULL,
    screens INT NOT NULL,

    CONSTRAINT pk_plan PRIMARY KEY (plan_id),
    CONSTRAINT uq_plan_name UNIQUE (name),
    CONSTRAINT ck_plan_value CHECK (value >= 0),
    CONSTRAINT ck_plan_screens CHECK (screens > 0)
);

CREATE TABLE IF NOT EXISTS "subscriptions" (
    subscription_id SERIAL,
    user_id INT NOT NULL,
    plan_id INT NOT NULL,
    status VARCHAR(10) NOT NULL,
    started_at TIMESTAMP NOT NULL,
    next_bill_at TIMESTAMP NOT NULL,
    canceled_at TIMESTAMP,
    created_at DATE DEFAULT CURRENT_DATE,
    updated_at DATE DEFAULT CURRENT_DATE,

    CONSTRAINT pk_subscription PRIMARY KEY (subscription_id),
    CONSTRAINT fk_subscription_user FOREIGN KEY (user_id) REFERENCES users(user_id),
    CONSTRAINT fk_subscription_plan FOREIGN KEY (plan_id) REFERENCES plans(plan_id),
    CONSTRAINT uq_subscription_user_plan UNIQUE (user_id, plan_id),
    CONSTRAINT ck_subscription_status CHECK (status IN ('active', 'canceled', 'past_due'))
);

CREATE TABLE IF NOT EXISTS "content_rating" (
    rating_id SERIAL,
    description VARCHAR(40) NOT NULL,
    minimum_age INT NOT NULL,

    CONSTRAINT pk_content_rating PRIMARY KEY (rating_id),
    CONSTRAINT uq_content_rating_description UNIQUE (description),
    CONSTRAINT ck_content_rating_minimum_age CHECK (minimum_age >= 0)
);

CREATE TABLE IF NOT EXISTS "genres" (
    genre_id SERIAL,
    name VARCHAR(50) NOT NULL,

    CONSTRAINT pk_genre PRIMARY KEY (genre_id),
    CONSTRAINT uq_genre_name UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS "directors" (
    director_id SERIAL,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    birth DATE,

    CONSTRAINT pk_director PRIMARY KEY (director_id)
);

CREATE TABLE IF NOT EXISTS "actors" (
    actor_id SERIAL,
    first_name VARCHAR(30) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nationality VARCHAR(50) NOT NULL,
    birth DATE NOT NULL,

    CONSTRAINT pk_actor PRIMARY KEY (actor_id)
);

CREATE TABLE IF NOT EXISTS "movies" (
    movie_id SERIAL,
    content_rating_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    release_year INT NOT NULL,
    initial_number_rating INT DEFAULT 0,
    initial_rating NUMERIC(2,1) DEFAULT 0,
    rating NUMERIC(2,1) NOT NULL,
    synopsis TEXT NOT NULL,
    duration INT NOT NULL,

    CONSTRAINT pk_movie PRIMARY KEY (movie_id),
    CONSTRAINT fk_movie_content_rating FOREIGN KEY (content_rating_id) REFERENCES content_rating(rating_id),
    CONSTRAINT ck_movie_rating CHECK (rating BETWEEN 0 AND 5),
    CONSTRAINT ck_movie_duration CHECK (duration >= 0),
    CONSTRAINT ck_movie_initial_rating_number CHECK (initial_rating = 0 AND initial_number_rating = 0 OR initial_rating > 0 AND initial_number_rating > 0),
    CONSTRAINT uq_movie_title UNIQUE (title)
);

CREATE TABLE IF NOT EXISTS "series" (
    serie_id SERIAL,
    content_rating_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    release_year INT NOT NULL,
    rating NUMERIC(2,1) DEFAULT 0,
    synopsis TEXT,
    is_finished BOOLEAN DEFAULT FALSE,

    CONSTRAINT pk_serie PRIMARY KEY (serie_id),
    CONSTRAINT fk_serie_content_rating FOREIGN KEY (content_rating_id) REFERENCES "content_rating"(rating_id),
    CONSTRAINT ck_serie_rating CHECK (rating BETWEEN 0 AND 5),
    CONSTRAINT uq_serie_title UNIQUE (title)
);

CREATE TABLE IF NOT EXISTS "seasons" (
    season_id SERIAL,
    serie_id INT NOT NULL,
    season_number INT NOT NULL,
    release_year INT NOT NULL,
    rating NUMERIC(2,1) DEFAULT 0,

    CONSTRAINT pk_season PRIMARY KEY (season_id),
    CONSTRAINT fk_season_serie FOREIGN KEY (serie_id) REFERENCES "series"(serie_id),
    CONSTRAINT ck_season_number CHECK (season_number > 0),
    CONSTRAINT uq_serie_season UNIQUE (serie_id, season_number)
);

CREATE TABLE IF NOT EXISTS "episodes" (
    episode_id SERIAL,
    season_id INT NOT NULL,
    title VARCHAR(150) NOT NULL,
    episode_number INT NOT NULL,
    initial_number_rating INT DEFAULT 0,
    initial_rating NUMERIC(2,1) DEFAULT 0,
    rating NUMERIC(2,1) NOT NULL,
    duration INT,
    synopsis TEXT,

    CONSTRAINT pk_episode PRIMARY KEY (episode_id),
    CONSTRAINT fk_episode_season FOREIGN KEY (season_id) REFERENCES "seasons"(season_id) ON DELETE CASCADE,
    CONSTRAINT ck_episode_number CHECK (episode_number > 0),
    CONSTRAINT ck_episode_duration CHECK (duration > 0),
    CONSTRAINT ck_episode_initial_rating_number CHECK (initial_rating = 0 AND initial_number_rating = 0 OR initial_rating > 0 AND initial_number_rating > 0),
    CONSTRAINT uq_season_episode UNIQUE (season_id, episode_number)
);

CREATE TABLE IF NOT EXISTS "directors_movies" (
    director_id INT,
    movie_id INT,

    CONSTRAINT pk_directors_movies PRIMARY KEY (director_id, movie_id)
);

CREATE TABLE IF NOT EXISTS "directors_episodes" (
    director_id INT,
    episode_id INT,

    CONSTRAINT pk_directors_episodes PRIMARY KEY (director_id, episode_id)
);

CREATE TABLE IF NOT EXISTS "movie_genres" (
    movie_id INT,
    genre_id INT,

    CONSTRAINT pk_movie_genre PRIMARY KEY (movie_id, genre_id),
    CONSTRAINT fk_movie_genres_movie FOREIGN KEY (movie_id) REFERENCES "movies"(movie_id),
    CONSTRAINT fk_movie_genres_genre FOREIGN KEY (genre_id) REFERENCES "genres"(genre_id)
);

CREATE TABLE IF NOT EXISTS "serie_genres" (
    serie_id INT,
    genre_id INT,

    CONSTRAINT pk_serie_genre PRIMARY KEY (serie_id, genre_id),
    CONSTRAINT fk_serie_genres_serie FOREIGN KEY (serie_id) REFERENCES "series"(serie_id),
    CONSTRAINT fk_serie_genres_genre FOREIGN KEY (genre_id) REFERENCES "genres"(genre_id)
);

CREATE TABLE IF NOT EXISTS "movie_cast" (
    movie_id INT,
    actor_id INT,
    character_name VARCHAR(100),

    CONSTRAINT pk_movie_actor PRIMARY KEY (movie_id, actor_id),
    CONSTRAINT fk_movie_cast_movie FOREIGN KEY (movie_id) REFERENCES "movies"(movie_id),
    CONSTRAINT fk_movie_cast_actor FOREIGN KEY (actor_id) REFERENCES "actors"(actor_id)
);

CREATE TABLE IF NOT EXISTS "episode_cast" (
    episode_id INT,
    actor_id INT,
    character_name VARCHAR(100),

    CONSTRAINT pk_episode_cast PRIMARY KEY (episode_id, actor_id),
    CONSTRAINT fk_episode_cast_episode FOREIGN KEY (episode_id) REFERENCES "episodes"(episode_id),
    CONSTRAINT fk_episode_cast_actor FOREIGN KEY (actor_id) REFERENCES "actors"(actor_id)
);

CREATE TABLE IF NOT EXISTS "reviews" (
    review_id SERIAL,
    movie_id INT,
    episode_id INT,
    user_id INT NOT NULL,
    rating INT NOT NULL,
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_review PRIMARY KEY (review_id),
    CONSTRAINT fk_review_movie FOREIGN KEY (movie_id) REFERENCES "movies"(movie_id),
    CONSTRAINT fk_review_episode FOREIGN KEY (episode_id) REFERENCES "episodes"(episode_id),
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES "users"(user_id),
    CONSTRAINT ck_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_review_movie_or_episode CHECK (movie_id IS NOT NULL OR episode_id IS NOT NULL AND NOT (movie_id IS NOT NULL AND episode_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS "favorites" (
    favorite_id SERIAL,
    user_id INT NOT NULL,
    movie_id INT,
    episode_id INT,
    serie_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_favorite PRIMARY KEY (favorite_id),
    CONSTRAINT fk_favorite_user FOREIGN KEY (user_id) REFERENCES "users"(user_id),
    CONSTRAINT fk_favorite_movie FOREIGN KEY (movie_id) REFERENCES "movies"(movie_id),
    CONSTRAINT fk_favorite_serie FOREIGN KEY (serie_id) REFERENCES "series"(serie_id),
    CONSTRAINT uq_favorite_user_movie UNIQUE (user_id, movie_id, episode_id, serie_id),
    CONSTRAINT ck_favorite_movie_or_episode_or_serie CHECK ((movie_id IS NOT NULL AND episode_id IS NULL AND serie_id IS NULL) OR (movie_id IS NULL AND episode_id IS NOT NULL AND serie_id IS NULL) OR (movie_id IS NULL AND episode_id IS NULL AND serie_id IS NOT NULL))
);

CREATE TABLE IF NOT EXISTS "watch_history" (
    history_id SERIAL,
    user_id INT NOT NULL,
    movie_id INT,
    episode_id INT,
    watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    watched_minutes INT NOT NULL,
    watched_seconds INT NOT NULL,

    CONSTRAINT pk_watch_history PRIMARY KEY (history_id),
    CONSTRAINT fk_watch_history_user FOREIGN KEY (user_id) REFERENCES "users"(user_id),
    CONSTRAINT fk_watch_history_movie FOREIGN KEY (movie_id) REFERENCES "movies"(movie_id),
    CONSTRAINT fk_watch_history_episode FOREIGN KEY (episode_id) REFERENCES "episodes"(episode_id),
    CONSTRAINT ck_watch_history_movie_or_episode CHECK (movie_id IS NOT NULL OR episode_id IS NOT NULL AND NOT (movie_id IS NOT NULL AND episode_id IS NOT NULL))
);

-- USERS
-- Índice para busca por email (login)
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);

-- DEVICES
-- Índice para busca de dispositivos por usuário
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);
-- Índice para busca por token (autenticação)
CREATE INDEX IF NOT EXISTS idx_devices_token ON devices (token);
-- Índice para ordenação por última atividade
CREATE INDEX IF NOT EXISTS idx_devices_last_activity ON devices (last_activity DESC);

-- INVOICING_DATA
-- Índice para busca por usuário
CREATE INDEX IF NOT EXISTS idx_invoicing_data_user_id ON invoicing_data (user_id);
-- Índice para busca por CPF
CREATE INDEX IF NOT EXISTS idx_invoicing_data_cpf ON invoicing_data (cpf);

-- SUBSCRIPTIONS
-- Índice para busca de assinaturas ativas por usuário
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_status ON subscriptions (user_id, status);
-- Índice para busca de assinaturas que precisam ser renovadas
CREATE INDEX IF NOT EXISTS idx_subscriptions_next_bill ON subscriptions (next_bill_at) WHERE status = 'active';
-- Índice para análise por plano
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_id ON subscriptions (plan_id);

-- MOVIES
-- Índice para filtro por classificação indicativa
CREATE INDEX IF NOT EXISTS idx_movies_content_rating_id ON movies (content_rating_id);
-- Índice para ordenação por avaliação
CREATE INDEX IF NOT EXISTS idx_movies_rating ON movies (rating DESC);
-- Índice para busca por ano de lançamento
CREATE INDEX IF NOT EXISTS idx_movies_release_year ON movies (release_year DESC);
-- Índice de texto completo para busca por título
CREATE INDEX IF NOT EXISTS idx_movies_title_trgm ON movies USING gin (title gin_trgm_ops);

-- SERIES
-- Índice para filtro por classificação indicativa
CREATE INDEX IF NOT EXISTS idx_series_content_rating_id ON series (content_rating_id);
-- Índice para ordenação por avaliação
CREATE INDEX IF NOT EXISTS idx_series_rating ON series (rating DESC);
-- Índice para busca por ano de lançamento
CREATE INDEX IF NOT EXISTS idx_series_release_year ON series (release_year DESC);
-- Índice para filtro de séries finalizadas/em andamento
CREATE INDEX IF NOT EXISTS idx_series_is_finished ON series (is_finished);
-- Índice de texto completo para busca por título
CREATE INDEX IF NOT EXISTS idx_series_title_trgm ON series USING gin (title gin_trgm_ops);

-- SEASONS
-- Índice para busca de temporadas por série
CREATE INDEX IF NOT EXISTS idx_seasons_serie_id ON seasons (serie_id, season_number);
-- Índice para ordenação por avaliação
CREATE INDEX IF NOT EXISTS idx_seasons_rating ON seasons (rating DESC);

-- EPISODES
-- Índice para busca de episódios por temporada
CREATE INDEX IF NOT EXISTS idx_episodes_season_id ON episodes (season_id, episode_number);
-- Índice para ordenação por avaliação
CREATE INDEX IF NOT EXISTS idx_episodes_rating ON episodes (rating DESC);

-- MOVIE_GENRES
-- Índice para busca de filmes por gênero
CREATE INDEX IF NOT EXISTS idx_movie_genres_genre_id ON movie_genres (genre_id);

-- SERIE_GENRES
-- Índice para busca de séries por gênero
CREATE INDEX IF NOT EXISTS idx_serie_genres_genre_id ON serie_genres (genre_id);

-- MOVIE_CAST
-- Índice para busca de filmes por ator
CREATE INDEX IF NOT EXISTS idx_movie_cast_actor_id ON movie_cast (actor_id);

-- SERIE_CAST
-- Índice para busca de séries por ator
CREATE INDEX IF NOT EXISTS idx_serie_cast_actor_id ON episode_cast (actor_id);

-- REVIEWS
-- Índice para busca de reviews por filme
CREATE INDEX IF NOT EXISTS idx_reviews_movie_id ON reviews (movie_id);
-- Índice para busca de reviews por episódio
CREATE INDEX IF NOT EXISTS idx_reviews_episode_id ON reviews (episode_id);
-- Índice para busca de reviews por usuário
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews (user_id);
-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews (created_at DESC);

-- FAVORITES
-- Índice para busca de favoritos por usuário
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites (user_id);
-- Índice para busca por filme
CREATE INDEX IF NOT EXISTS idx_favorites_movie_id ON favorites (movie_id) WHERE movie_id IS NOT NULL;
-- Índice para busca por série
CREATE INDEX IF NOT EXISTS idx_favorites_serie_id ON favorites (serie_id) WHERE serie_id IS NOT NULL;
-- Índice para ordenação por data
CREATE INDEX IF NOT EXISTS idx_favorites_created_at ON favorites (created_at DESC);

-- WATCH_HISTORY
-- Índice para busca do histórico por usuário (ordenado por data)
CREATE INDEX IF NOT EXISTS idx_watch_history_user_created ON watch_history (user_id, watched_at DESC);
-- Índice para análise de filmes mais assistidos
CREATE INDEX IF NOT EXISTS idx_watch_history_movie_id ON watch_history (movie_id) WHERE movie_id IS NOT NULL;
-- Índice para análise de episódios mais assistidos
CREATE INDEX IF NOT EXISTS idx_watch_history_episode_id ON watch_history (episode_id) WHERE episode_id IS NOT NULL;

-- DROP INDEX IF EXISTS idx_users_email;
-- DROP INDEX IF EXISTS idx_devices_user_id;
-- DROP INDEX IF EXISTS idx_devices_token;
-- DROP INDEX IF EXISTS idx_devices_last_activity;
-- DROP INDEX IF EXISTS idx_invoicing_data_user_id;
-- DROP INDEX IF EXISTS idx_invoicing_data_cpf;
-- DROP INDEX IF EXISTS idx_subscriptions_user_status;
-- DROP INDEX IF EXISTS idx_subscriptions_next_bill;
-- DROP INDEX IF EXISTS idx_subscriptions_plan_id;
-- DROP INDEX IF EXISTS idx_movies_director_id;
-- DROP INDEX IF EXISTS idx_movies_content_rating_id;
-- DROP INDEX IF EXISTS idx_movies_rating;
-- DROP INDEX IF EXISTS idx_movies_release_year;
-- DROP INDEX IF EXISTS idx_movies_title_trgm;
-- DROP INDEX IF EXISTS idx_series_content_rating_id;
-- DROP INDEX IF EXISTS idx_series_rating;
-- DROP INDEX IF EXISTS idx_series_release_year;
-- DROP INDEX IF EXISTS idx_series_is_finished;
-- DROP INDEX IF EXISTS idx_series_title_trgm;
-- DROP INDEX IF EXISTS idx_seasons_serie_id;
-- DROP INDEX IF EXISTS idx_seasons_rating;
-- DROP INDEX IF EXISTS idx_episodes_season_id;
-- DROP INDEX IF EXISTS idx_episodes_director_id;
-- DROP INDEX IF EXISTS idx_episodes_rating;
-- DROP INDEX IF EXISTS idx_movie_genres_genre_id;
-- DROP INDEX IF EXISTS idx_serie_genres_genre_id;
-- DROP INDEX IF EXISTS idx_movie_cast_actor_id;
-- DROP INDEX IF EXISTS idx_serie_cast_actor_id;
-- DROP INDEX IF EXISTS idx_reviews_movie_id;
-- DROP INDEX IF EXISTS idx_reviews_episode_id;
-- DROP INDEX IF EXISTS idx_reviews_user_id;
-- DROP INDEX IF EXISTS idx_reviews_created_at;
-- DROP INDEX IF EXISTS idx_favorites_user_id;
-- DROP INDEX IF EXISTS idx_favorites_movie_id;
-- DROP INDEX IF EXISTS idx_favorites_serie_id;
-- DROP INDEX IF EXISTS idx_favorites_created_at;
-- DROP INDEX IF EXISTS idx_watch_history_user_created;
-- DROP INDEX IF EXISTS idx_watch_history_movie_id;
-- DROP INDEX IF EXISTS idx_watch_history_episode_id;
--
-- DROP TABLE IF EXISTS "users" CASCADE;
-- DROP TABLE IF EXISTS "devices" CASCADE;
-- DROP TABLE IF EXISTS "invoicing_data" CASCADE;
-- DROP TABLE IF EXISTS "subscriptions" CASCADE;
-- DROP TABLE IF EXISTS "content_rating" CASCADE;
-- DROP TABLE IF EXISTS "genres" CASCADE;
-- DROP TABLE IF EXISTS "directors" CASCADE;
-- DROP TABLE IF EXISTS "actors" CASCADE;
-- DROP TABLE IF EXISTS "movies" CASCADE;
-- DROP TABLE IF EXISTS "series" CASCADE;
-- DROP TABLE IF EXISTS "seasons" CASCADE;
-- DROP TABLE IF EXISTS "episodes" CASCADE;
-- DROP TABLE IF EXISTS "movie_genres" CASCADE;
-- DROP TABLE IF EXISTS "serie_genres" CASCADE;
-- DROP TABLE IF EXISTS "movie_cast" CASCADE;
-- DROP TABLE IF EXISTS "episode_cast" CASCADE;
-- DROP TABLE IF EXISTS "reviews" CASCADE;
-- DROP TABLE IF EXISTS "favorites" CASCADE;
-- DROP TABLE IF EXISTS "watch_history" CASCADE;
-- DROP TABLE IF EXISTS "plans";