INSERT INTO "content_rating" (description, minimum_age) VALUES
('Livre para todos os publicos.', 0),
('Nao recomendado para menores de 10 anos.', 10),
('Nao recomendado para menores de 12 anos.', 12),
('Nao recomendado para menores de 14 anos.', 14),
('Nao recomendado para menores de 16 anos.', 16),
('Nao recomendado para menores de 18 anos.', 18)
ON CONFLICT (description) DO NOTHING;

INSERT INTO "genres" (name) VALUES
('Acao'),
('Comedia'),
('Drama'),
('Ficcao cientifica'),
('Suspense'),
('Documentario')
ON CONFLICT (name) DO NOTHING;

INSERT INTO "plans" (name, value, screens) VALUES
('Basico', 19.90, 1),
('Padrao', 29.90, 2),
('Premium', 39.90, 4),
('Familia', 49.90, 6)
ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
    v_user_ana INT;
    v_user_bruno INT;
    v_user_clara INT;
    v_user_diego INT;

    v_plan_basico INT;
    v_plan_padrao INT;
    v_plan_premium INT;
    v_plan_familia INT;

    v_subscription_id INT;

    v_rating_livre INT;
    v_rating_12 INT;
    v_rating_14 INT;
    v_rating_16 INT;

    v_genre_acao INT;
    v_genre_comedia INT;
    v_genre_drama INT;
    v_genre_ficcao INT;
    v_genre_suspense INT;
    v_genre_documentario INT;

    v_director_helena INT;
    v_director_marcos INT;
    v_director_lucia INT;
    v_director_rafael INT;

    v_actor_bianca INT;
    v_actor_caio INT;
    v_actor_elisa INT;
    v_actor_felipe INT;
    v_actor_gabriela INT;
    v_actor_henrique INT;

    v_movie_aurora INT;
    v_movie_noites INT;
    v_movie_pacto INT;
    v_movie_risos INT;

    v_serie_fronteiras INT;
    v_serie_bairro INT;
    v_serie_codigo INT;

    v_episode_origem INT;
    v_episode_sinal INT;
    v_episode_festa INT;
    v_episode_falha INT;

    v_arcane_directors INT[];
    v_arcane_serie_id INT;
BEGIN
    SELECT plan_id INTO v_plan_basico FROM "plans" WHERE name = 'Basico';
    SELECT plan_id INTO v_plan_padrao FROM "plans" WHERE name = 'Padrao';
    SELECT plan_id INTO v_plan_premium FROM "plans" WHERE name = 'Premium';
    SELECT plan_id INTO v_plan_familia FROM "plans" WHERE name = 'Familia';

    SELECT rating_id INTO v_rating_livre FROM "content_rating" WHERE minimum_age = 0;
    SELECT rating_id INTO v_rating_12 FROM "content_rating" WHERE minimum_age = 12;
    SELECT rating_id INTO v_rating_14 FROM "content_rating" WHERE minimum_age = 14;
    SELECT rating_id INTO v_rating_16 FROM "content_rating" WHERE minimum_age = 16;

    SELECT genre_id INTO v_genre_acao FROM "genres" WHERE name = 'Acao';
    SELECT genre_id INTO v_genre_comedia FROM "genres" WHERE name = 'Comedia';
    SELECT genre_id INTO v_genre_drama FROM "genres" WHERE name = 'Drama';
    SELECT genre_id INTO v_genre_ficcao FROM "genres" WHERE name = 'Ficcao cientifica';
    SELECT genre_id INTO v_genre_suspense FROM "genres" WHERE name = 'Suspense';
    SELECT genre_id INTO v_genre_documentario FROM "genres" WHERE name = 'Documentario';

    CALL pr_register_user_and_device('Ana Silva', 'ana.silva@luflix.com', 'hash_ana_123', 'tok_ana_tv_001', 'smart_tv', 'TV da sala', v_user_ana);
    CALL pr_register_user_and_device('Bruno Costa', 'bruno.costa@luflix.com', 'hash_bruno_123', 'tok_bruno_phone_001', 'mobile', 'Celular do Bruno', v_user_bruno);
    CALL pr_register_user_and_device('Clara Nunes', 'clara.nunes@luflix.com', 'hash_clara_123', 'tok_clara_web_001', 'browser', 'Notebook da Clara', v_user_clara);
    CALL pr_register_user_and_device('Diego Rocha', 'diego.rocha@luflix.com', 'hash_diego_123', 'tok_diego_tablet_001', 'tablet', 'Tablet do Diego', v_user_diego);

    CALL pr_subscribe_user(v_user_ana, v_plan_premium, '12345678901', 'cus_ana_silva', v_subscription_id);
    CALL pr_subscribe_user(v_user_bruno, v_plan_padrao, '23456789012', 'cus_bruno_costa', v_subscription_id);
    CALL pr_subscribe_user(v_user_clara, v_plan_basico, '34567890123', 'cus_clara_nunes', v_subscription_id);
    CALL pr_subscribe_user(v_user_diego, v_plan_familia, '45678901234', 'cus_diego_rocha', v_subscription_id);

    v_director_helena := fn_insert_director(ROW('Helena', 'Matos', 'Brasileira', DATE '1978-04-12')::movie_person);
    v_director_marcos := fn_insert_director(ROW('Marcos', 'Almeida', 'Brasileira', DATE '1982-09-25')::movie_person);
    v_director_lucia := fn_insert_director(ROW('Lucia', 'Fernandes', 'Portuguesa', DATE '1971-02-18')::movie_person);
    v_director_rafael := fn_insert_director(ROW('Rafael', 'Torres', 'Argentina', DATE '1986-11-03')::movie_person);

    CALL pr_insert_actors_array(ARRAY[
        ROW('Bianca', 'Moura', 'Brasileira', DATE '1990-01-14')::movie_person,
        ROW('Caio', 'Ribeiro', 'Brasileira', DATE '1988-06-30')::movie_person,
        ROW('Elisa', 'Vargas', 'Chilena', DATE '1993-03-09')::movie_person,
        ROW('Felipe', 'Duarte', 'Brasileira', DATE '1984-12-21')::movie_person,
        ROW('Gabriela', 'Lima', 'Portuguesa', DATE '1991-07-17')::movie_person,
        ROW('Henrique', 'Barros', 'Brasileira', DATE '1979-10-05')::movie_person
    ]);

    SELECT actor_id INTO v_actor_bianca FROM "actors" WHERE first_name = 'Bianca' AND last_name = 'Moura' AND birth = DATE '1990-01-14';
    SELECT actor_id INTO v_actor_caio FROM "actors" WHERE first_name = 'Caio' AND last_name = 'Ribeiro' AND birth = DATE '1988-06-30';
    SELECT actor_id INTO v_actor_elisa FROM "actors" WHERE first_name = 'Elisa' AND last_name = 'Vargas' AND birth = DATE '1993-03-09';
    SELECT actor_id INTO v_actor_felipe FROM "actors" WHERE first_name = 'Felipe' AND last_name = 'Duarte' AND birth = DATE '1984-12-21';
    SELECT actor_id INTO v_actor_gabriela FROM "actors" WHERE first_name = 'Gabriela' AND last_name = 'Lima' AND birth = DATE '1991-07-17';
    SELECT actor_id INTO v_actor_henrique FROM "actors" WHERE first_name = 'Henrique' AND last_name = 'Barros' AND birth = DATE '1979-10-05';

    CALL pr_insert_movie_or_serie(
        p_type => 'movie',
        p_release_year => 2021,
        p_content_rating_id => v_rating_12,
        p_directors_id => ARRAY[v_director_helena, v_director_lucia]::INT[],
        p_number_rating => 240,
        p_rating => 4.4,
        p_duration => 118,
        p_movie_title => 'Aurora de Neon',
        p_movie_synopsis => 'Uma engenheira descobre uma cidade escondida alimentada por uma tecnologia experimental.'
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'movie',
        p_release_year => 2019,
        p_content_rating_id => v_rating_14,
        p_directors_id => ARRAY[v_director_rafael, v_director_marcos]::INT[],
        p_number_rating => 180,
        p_rating => 4.1,
        p_duration => 104,
        p_movie_title => 'Noites de Vidro',
        p_movie_synopsis => 'Um investigador revisita um caso antigo quando novas pistas surgem em uma metropole chuvosa.'
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'movie',
        p_release_year => 2022,
        p_content_rating_id => v_rating_16,
        p_directors_id => ARRAY[v_director_lucia]::INT[],
        p_number_rating => 315,
        p_rating => 4.7,
        p_duration => 132,
        p_movie_title => 'O Pacto do Vale',
        p_movie_synopsis => 'Familias rivais precisam cooperar quando uma ameaca antiga retorna ao vale.'
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'movie',
        p_release_year => 2020,
        p_content_rating_id => v_rating_livre,
        p_directors_id => ARRAY[v_director_rafael, v_director_lucia]::INT[],
        p_number_rating => 96,
        p_rating => 3.9,
        p_duration => 92,
        p_movie_title => 'Risos em Serie',
        p_movie_synopsis => 'Quatro amigos tentam salvar um pequeno teatro de bairro antes da noite de estreia.'
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'serie',
        p_release_year => 2023,
        p_content_rating_id => v_rating_12,
        p_rating => 4.5,
        p_serie_title => 'Fronteiras do Amanhecer',
        p_serie_synopsis => 'Exploradores mapeiam uma regiao desconhecida enquanto lidam com disputas politicas.'
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'serie',
        p_release_year => 2021,
        p_content_rating_id => v_rating_livre,
        p_rating => 4.0,
        p_serie_title => 'Bairro em Cena',
        p_serie_synopsis => 'Moradores de um bairro criativo transformam problemas cotidianos em espetaculos comunitarios.'
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'serie',
        p_release_year => 2024,
        p_content_rating_id => v_rating_14,
        p_rating => 4.6,
        p_serie_title => 'Codigo Prisma',
        p_serie_synopsis => 'Uma equipe de analistas descobre mensagens ocultas em sistemas criticos da cidade.'
    );

    SELECT movie_id INTO v_movie_aurora FROM "movies" WHERE title = 'Aurora de Neon';
    SELECT movie_id INTO v_movie_noites FROM "movies" WHERE title = 'Noites de Vidro';
    SELECT movie_id INTO v_movie_pacto FROM "movies" WHERE title = 'O Pacto do Vale';
    SELECT movie_id INTO v_movie_risos FROM "movies" WHERE title = 'Risos em Serie';

    SELECT serie_id INTO v_serie_fronteiras FROM "series" WHERE title = 'Fronteiras do Amanhecer';
    SELECT serie_id INTO v_serie_bairro FROM "series" WHERE title = 'Bairro em Cena';
    SELECT serie_id INTO v_serie_codigo FROM "series" WHERE title = 'Codigo Prisma';

    CALL pr_insert_movie_or_serie(
        p_type => 'episode',
        p_release_year => 2023,
        p_content_rating_id => v_rating_12,
        p_directors_id => ARRAY[v_director_helena, v_director_lucia]::INT[],
        p_number_rating => 120,
        p_rating => 4.3,
        p_serie_id => v_serie_fronteiras,
        p_duration => 48,
        p_episode_title => 'A Origem da Rota',
        p_episode_synopsis => 'A equipe inicia a travessia e encontra o primeiro marco da nova fronteira.',
        p_season_number => 1
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'episode',
        p_release_year => 2023,
        p_content_rating_id => v_rating_12,
        p_directors_id => ARRAY[v_director_marcos]::INT[],
        p_number_rating => 110,
        p_rating => 4.2,
        p_serie_id => v_serie_fronteiras,
        p_duration => 51,
        p_episode_title => 'O Sinal no Horizonte',
        p_episode_synopsis => 'Um sinal distante divide a equipe entre avancar ou retornar.',
        p_season_number => 1
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'episode',
        p_release_year => 2021,
        p_content_rating_id => v_rating_livre,
        p_directors_id => ARRAY[v_director_rafael]::INT[],
        p_number_rating => 85,
        p_rating => 3.8,
        p_serie_id => v_serie_bairro,
        p_duration => 29,
        p_episode_title => 'Festa na Praca',
        p_episode_synopsis => 'Os vizinhos organizam uma festa para financiar a reforma do teatro local.',
        p_season_number => 1
    );

    CALL pr_insert_movie_or_serie(
        p_type => 'episode',
        p_release_year => 2024,
        p_content_rating_id => v_rating_14,
        p_directors_id => ARRAY[v_director_lucia, v_director_rafael]::INT[],
        p_number_rating => 140,
        p_rating => 4.6,
        p_serie_id => v_serie_codigo,
        p_duration => 44,
        p_episode_title => 'Falha de Espelho',
        p_episode_synopsis => 'Uma anomalia nos dados aponta para uma invasao maior do que a equipe imaginava.',
        p_season_number => 1
    );

    SELECT episode_id INTO v_episode_origem
    FROM "episodes" e
    JOIN "seasons" s ON s.season_id = e.season_id
    WHERE s.serie_id = v_serie_fronteiras AND e.episode_number = 1;

    SELECT episode_id INTO v_episode_sinal
    FROM "episodes" e
    JOIN "seasons" s ON s.season_id = e.season_id
    WHERE s.serie_id = v_serie_fronteiras AND e.episode_number = 2;

    SELECT episode_id INTO v_episode_festa
    FROM "episodes" e
    JOIN "seasons" s ON s.season_id = e.season_id
    WHERE s.serie_id = v_serie_bairro AND e.episode_number = 1;

    SELECT episode_id INTO v_episode_falha
    FROM "episodes" e
    JOIN "seasons" s ON s.season_id = e.season_id
    WHERE s.serie_id = v_serie_codigo AND e.episode_number = 1;

    PERFORM fn_insert_content_genres('movie', v_movie_aurora, ARRAY[v_genre_ficcao, v_genre_acao]::INT[]);
    PERFORM fn_insert_content_genres('movie', v_movie_noites, ARRAY[v_genre_suspense, v_genre_drama]::INT[]);
    PERFORM fn_insert_content_genres('movie', v_movie_pacto, ARRAY[v_genre_drama, v_genre_acao]::INT[]);
    PERFORM fn_insert_content_genres('movie', v_movie_risos, ARRAY[v_genre_comedia, v_genre_drama]::INT[]);

--     INSERT INTO "movie_genres" (movie_id, genre_id) VALUES
--     (v_movie_aurora, v_genre_ficcao),
--     (v_movie_aurora, v_genre_acao),
--     (v_movie_noites, v_genre_suspense),
--     (v_movie_noites, v_genre_drama),
--     (v_movie_pacto, v_genre_drama),
--     (v_movie_pacto, v_genre_acao),
--     (v_movie_risos, v_genre_comedia),
--     (v_movie_risos, v_genre_drama)
--     ON CONFLICT DO NOTHING;

    PERFORM fn_insert_content_genres('serie', v_serie_fronteiras, ARRAY[v_genre_ficcao, v_genre_acao]::INT[]);
    PERFORM fn_insert_content_genres('serie', v_serie_bairro, ARRAY[v_genre_comedia, v_genre_drama]::INT[]);
    PERFORM fn_insert_content_genres('serie', v_serie_codigo, ARRAY[v_genre_suspense, v_genre_ficcao]::INT[]);

--     INSERT INTO "serie_genres" (serie_id, genre_id) VALUES
--     (v_serie_fronteiras, v_genre_ficcao),
--     (v_serie_fronteiras, v_genre_acao),
--     (v_serie_bairro, v_genre_comedia),
--     (v_serie_bairro, v_genre_drama),
--     (v_serie_codigo, v_genre_suspense),
--     (v_serie_codigo, v_genre_ficcao)
--     ON CONFLICT DO NOTHING;

    PERFORM fn_insert_content_cast('movie', v_movie_aurora, ARRAY[v_actor_bianca, v_actor_caio]::INT[], ARRAY['Lia', 'Natan']::VARCHAR[]);
    PERFORM fn_insert_content_cast('movie', v_movie_noites, ARRAY[v_actor_felipe, v_actor_elisa]::INT[], ARRAY['Inspetor Mauro', 'Teresa']::VARCHAR[]);
    PERFORM fn_insert_content_cast('movie', v_movie_pacto, ARRAY[v_actor_gabriela, v_actor_henrique]::INT[], ARRAY['Clara Vale', 'Augusto']::VARCHAR[]);
    PERFORM fn_insert_content_cast('movie', v_movie_risos, ARRAY[v_actor_caio, v_actor_bianca]::INT[], ARRAY['Tito', 'Mara']::VARCHAR[]);

    PERFORM fn_insert_content_cast('episode', v_serie_fronteiras, ARRAY[v_actor_elisa, v_actor_henrique]::INT[], ARRAY['Irene', 'Saul']::VARCHAR[]);
    PERFORM fn_insert_content_cast('episode', v_serie_bairro, ARRAY[v_actor_bianca, v_actor_caio]::INT[], ARRAY['Nina', 'Beto']::VARCHAR[]);
    PERFORM fn_insert_content_cast('episode', v_serie_codigo, ARRAY[v_actor_gabriela, v_actor_felipe]::INT[], ARRAY['Maya', 'Otavio']::VARCHAR[]);

    CALL pr_insert_review(v_user_ana, 5, 'Visual excelente e historia bem conduzida.', v_movie_aurora, NULL);
    CALL pr_insert_review(v_user_bruno, 4, 'Suspense consistente do inicio ao fim.', v_movie_noites, NULL);
    CALL pr_insert_review(v_user_clara, 4, 'Episodio leve e muito divertido.', NULL, v_episode_festa);
    CALL pr_insert_review(v_user_diego, 5, 'A premissa da serie ficou forte ja no primeiro episodio.', NULL, v_episode_falha);

    CALL pr_add_favorite(v_user_ana, v_movie_aurora, NULL, NULL);
    CALL pr_add_favorite(v_user_bruno, v_movie_noites, NULL, NULL);
    CALL pr_add_favorite(v_user_clara, NULL, NULL, v_serie_bairro);
    CALL pr_add_favorite(v_user_diego, NULL, v_episode_falha, NULL);

    BEGIN
        CALL pr_add_to_watch_history(v_user_ana, v_movie_aurora, NULL, 118, 0);
        CALL pr_add_to_watch_history(v_user_bruno, v_movie_noites, NULL, 87, 30);
        CALL pr_add_to_watch_history(v_user_clara, NULL, v_episode_festa, 29, 0);
        CALL pr_add_to_watch_history(v_user_diego, NULL, v_episode_falha, 44, 0);
    EXCEPTION
        WHEN invalid_column_reference THEN
            INSERT INTO "watch_history" (user_id, movie_id, episode_id, watched_at, watched_minutes, watched_seconds) VALUES
            (v_user_ana, v_movie_aurora, NULL, NOW() - INTERVAL '4 days', 118, 0),
            (v_user_bruno, v_movie_noites, NULL, NOW() - INTERVAL '3 days', 87, 30),
            (v_user_clara, NULL, v_episode_festa, NOW() - INTERVAL '2 days', 29, 0),
            (v_user_diego, NULL, v_episode_falha, NOW() - INTERVAL '1 day', 44, 0);
    END;

    WITH inserted_rows AS (
        INSERT INTO "directors" (first_name, last_name, nationality, birth)
            VALUES ('Pascal', 'Charrue', 'France', NULL),
                   ('Arnaud', 'Delord', 'France', NULL) RETURNING director_id
    )
    SELECT ARRAY_AGG(director_id) INTO v_arcane_directors FROM inserted_rows;

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => v_arcane_directors,
            p_duration => 43,
            p_episode_title => 'Entrando na brincadeira',
            p_episode_synopsis => 'Após um roubo na luxuosa cidade de Piltover, as irmãs órfãs Vi e Powder se metem em confusão nas ruas subterrâneas de Zaun.',
            p_serie_title => 'Arcane',
            p_serie_synopsis => 'Em meio ao conflito entre as cidades-gêmeas de Piltover e Zaun, duas irmãs lutam em lados opostos de uma guerra entre tecnologias mágicas e convicções incompatíveis.',
            p_season_number => 1
         );

    SELECT serie_id INTO v_arcane_serie_id FROM "series" WHERE title = 'Arcane';

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 40,
            p_episode_title => 'Alguns mistérios não devem ser desvendados',
            p_episode_synopsis => 'Contrariando os conselhos de seu mentor, o inventor Jayce tenta aliar magia e ciência. O criminoso Silco testa uma substância poderosa.',
            p_season_number => 1,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 44,
            p_episode_title => 'A violência é essencial para a mudança',
            p_episode_synopsis => 'Um confronto épico entre antigos rivais tem um desfecho fatídico para Zaun. Jayce e Viktor arriscam tudo em nome da pesquisa.',
            p_season_number => 1,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 40,
            p_episode_title => 'Feliz Dia do Progresso!',
            p_episode_synopsis => 'Com Piltover prosperando, Jayce e Viktor avaliam o próximo passo. Uma conhecida ressurge de Zaun para provocar o caos.',
            p_season_number => 1,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 40,
            p_episode_title => 'Todos querem ser meus inimigos',
            p_episode_synopsis => 'Caitlyn, a defensora rebelde, vai à Subferia para encontrar Silco. Tentando acabar com a corrupção em Piltover, Jayce se torna um alvo.',
            p_season_number => 1,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 42,
            p_episode_title => 'Quando as paredes desabam',
            p_episode_synopsis => 'Um jovem enfraquece o próprio mentor no conselho. Perseguida pelas autoridades, Jinx deve encarar o passado.',
            p_season_number => 1,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 40,
            p_episode_title => 'O garoto salvador',
            p_episode_synopsis => 'Caitlyn e Vi encontram um aliado nas ruas de Zaun e partem para a briga com uma inimiga em comum. Viktor toma uma decisão extrema.',
            p_season_number => 1,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 40,
            p_episode_title => 'Água e óleo',
            p_episode_synopsis => 'Mel, a herdeira renegada, e sua mãe trocam técnicas de combate. Caitlyn e Vi formam uma aliança improvável. Jinx passa por uma mudança radical.',
            p_season_number => 1,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 41,
            p_episode_title => 'O monstro que você criou',
            p_episode_synopsis => 'Com a guerra cada vez mais próxima, os líderes de Piltover e Zaun chegam a um ultimato. Mas um impasse fatídico muda as duas cidades para sempre.',
            p_season_number => 1,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 40,
            p_episode_title => 'O peso da coroa',
            p_episode_synopsis => 'Vi e Caitlyn não sabem bem como reagir a uma terrível tragédia que aumenta as tensões entre as cidades gêmeas.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 39,
            p_episode_title => 'Ver tudo queimar',
            p_episode_synopsis => 'Piltover está pronta para a guerra, e a Subferia avalia suas opções. Jinx se mantém discreta e planeja sua próxima jogada. Uma conversa decisiva acontece.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 40,
            p_episode_title => 'Finalmente acertou o nome',
            p_episode_synopsis => 'Caitlyn intensifica sua busca por Jinx. Ambessa aceita um encontro decisivo. Mudanças em Zaun levam a uma descoberta chocante.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 39,
            p_episode_title => 'Pinte a cidade de azul',
            p_episode_synopsis => 'Com rumores do retorno de Jinx, Ambessa busca seu alvo com ainda mais entusiasmo. Disfarçadas, Jinx e Sevika entram no covil do inimigo.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 42,
            p_episode_title => 'Bolhas na mão e pés no chão',
            p_episode_synopsis => 'Vi acorda com uma surpresa. Um reencontro perturbador não é o que parece. Caitlyn descobre a origem de Cintila.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 39,
            p_episode_title => 'A mensagem oculta no padrão',
            p_episode_synopsis => 'A cura vem de um rosto familiar em um lugar desconhecido. Uma traição chocante ameaça mudar inúmeras vidas.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 41,
            p_episode_title => 'Fingir que é a primeira vez',
            p_episode_synopsis => 'Um momento de escuridão, um momento de luz. E uma visão do que poderia ter acontecido.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 40,
            p_episode_title => 'Matar é um ciclo',
            p_episode_synopsis => 'A chegada de uma tempestade gera uma série de transformações. Mas uma faísca de rebelião ainda queima.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );

    CALL pr_insert_movie_or_serie(
            p_type => 'episode',
            p_release_year => 2021,
            p_content_rating_id => 5,
            p_directors_id => ARRAY[5,6]::INT[],
            p_duration => 50,
            p_episode_title => 'A terra sob suas unhas',
            p_episode_synopsis => 'Magia. Ciência. Poder. Vingança. Destinos se chocam em um capítulo final épico, dando início a uma guerra total.',
            p_season_number => 2,
            p_serie_id => v_arcane_serie_id
         );
END;
$$;