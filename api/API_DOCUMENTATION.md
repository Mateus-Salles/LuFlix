# LuFlix API Documentation

## Visão Geral

A API LuFlix é uma API REST construída com Node.js, Express e PostgreSQL.
O ponto de entrada é `src/server.js`, que inicializa o banco de dados e sobe o servidor.
O app principal fica em `src/app.js`, onde as rotas são registradas e o middleware geral é configurado.

- Prefixo base: `/api/v1`
- Health check: `GET /health`

## Configuração e Inicialização

### Dependências

- `express`
- `pg`
- `dotenv`
- `multer`
- `jest` (dev)
- `supertest` (dev)
- `nodemon` (dev)

### Scripts

- `npm start` — inicia a API com Node.
- `npm run dev` — inicia a API com Nodemon para desenvolvimento.
- `npm test` — executa a suíte de testes com Jest.
- `npm run test:watch` — executa Jest em modo watch.

### Variáveis de ambiente

O projeto usa um arquivo `.env` com as seguintes variáveis (exemplo em `.env.example`):

```env
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=luflix
```

### Conexão com o banco

O módulo `src/db/index.js` cria um pool PostgreSQL com `pg.Pool` usando as variáveis de ambiente.
O servidor testa a conexão com `SELECT 1` antes de subir.

## Estrutura do Projeto

- `src/app.js` — configura o Express, JSON parser, rotas e handlers de erro.
- `src/server.js` — inicia o servidor e valida a conexão com o banco.
- `src/db/index.js` — configura o pool do PostgreSQL.
- `src/routes/` — define as rotas agrupadas por domínio.
- `src/middleware/upload.js` — gerencia upload de mídia com `multer`.
- `src/controllers/` — contém a lógica de cada endpoint.
- `src/__tests__/` — contém os testes automatizados da API.

## Middleware de Upload

A API usa `src/middleware/upload.js` para:

- criar as pastas `uploads/movies` e `uploads/episodes` automaticamente;
- aceitar apenas arquivos com `mimetype` iniciando em `video/`;
- receber o arquivo no campo `media`.

Para os endpoints de filmes e episódios, o envio do arquivo é obrigatório.

## Rotas Principais

### Users

#### `POST /api/v1/users/register`

- Controlador: `registerUser` em `src/controllers/users.controller.js`
- Payload esperado:
  - `name`
  - `email`
  - `password`
  - `device_token`
  - `device_type`
  - `device_name`
- Função: cadastra usuário e dispositivo, chamando `pr_register_user_and_device`.
- Resposta retorna `user_id` quando o banco retorna o valor.

#### `POST /api/v1/users/subscribe`

- Controlador: `subscribeUser` em `src/controllers/users.controller.js`
- Payload esperado:
  - `user_id`
  - `plan_id`
  - `cpf`
  - `gateway_customer_id`
- Função: cria assinatura de usuário com `pr_subscribe_user`.
- Resposta retorna `subscription_id` quando o banco retorna o valor.

### People

#### `POST /api/v1/people/directors`

- Controlador: `insertDirector` em `src/controllers/people.controller.js`
- Payload esperado:
  - `first_name`
  - `last_name`
  - `nationality`
  - `birth` (opcional)
- Chama `fn_insert_director` com um composite type `movie_person`.
- Retorna `director_id` do novo diretor.

#### `POST /api/v1/people/actors`

- Controlador: `insertActors` em `src/controllers/people.controller.js`
- Payload esperado:
  - `actors`: array de objetos com `first_name`, `last_name`, `nationality`, `birth`
- Chama `pr_insert_actors_array` com um array de composite types.

### Catalog

#### `POST /api/v1/catalog/movies`

- Controlador: `insertMovie` em `src/controllers/catalog.controller.js`
- Payload esperado (form fields via `multipart/form-data`):
  - `release_year`
  - `content_rating_id`
  - `directors_id[]`
  - `number_rating` (opcional, default `0`)
  - `rating` (opcional, default `0`)
  - `title`
  - `synopsis`
  - `duration`
  - `media` (arquivo de vídeo obrigatório)
- O upload de mídia é obrigatório.
- Chama `pr_insert_movie_or_serie(type='movie')`.
- Resposta inclui `media_path` quando o arquivo é salvo.

#### `POST /api/v1/catalog/series`

- Controlador: `insertSerie` em `src/controllers/catalog.controller.js`
- Payload esperado (JSON):
  - `release_year`
  - `content_rating_id`
  - `rating` (opcional, default `0`)
  - `title`
  - `synopsis`
- Chama `pr_insert_movie_or_serie(type='serie')`.

#### `POST /api/v1/catalog/episodes`

- Controlador: `insertEpisode` em `src/controllers/catalog.controller.js`
- Payload esperado (form fields via `multipart/form-data`):
  - `release_year`
  - `content_rating_id`
  - `directors_id[]`
  - `number_rating` (opcional, default `0`)
  - `rating` (opcional, default `0`)
  - `serie_id` (opcional)
  - `duration`
  - `episode_title`
  - `episode_synopsis`
  - `serie_title` (opcional)
  - `serie_synopsis` (opcional)
  - `season_number`
  - `media` (arquivo de vídeo obrigatório)
- O upload de mídia é obrigatório.
- Se `serie_id` não for informado, `serie_title` e `serie_synopsis` também são obrigatórios.
- Chama `pr_insert_movie_or_serie(type='episode')`.
- Resposta inclui `media_path` quando o arquivo é salvo.

#### `POST /api/v1/catalog/genres`

- Controlador: `insertContentGenres` em `src/controllers/catalog.controller.js`
- Payload esperado (JSON):
  - `content_type` (`movie` ou `serie`)
  - `content_id`
  - `genre_ids` (array)
- Chama `fn_insert_content_genres`.

#### `POST /api/v1/catalog/cast`

- Controlador: `insertContentCast` em `src/controllers/catalog.controller.js`
- Payload esperado (JSON):
  - `content_type` (`movie` ou `episode`)
  - `content_id`
  - `actor_ids` (array)
  - `character_names` (array)
- Chama `fn_insert_content_cast`.

#### `POST /api/v1/catalog/directors`

- Controlador: `insertContentDirectors` em `src/controllers/catalog.controller.js`
- Payload esperado (JSON):
  - `content_type` (`movie`, `episode`)
  - `content_id`
  - `directors_ids` (array)
- Chama `fn_insert_content_directors`.

### Reviews

#### `POST /api/v1/reviews`

- Controlador: `insertReview` em `src/controllers/reviews.controller.js`
- Payload esperado (JSON):
  - `user_id`
  - `rating`
  - `comment` (opcional)
  - `movie_id` ou `episode_id` (exatamente um)
- Chama `pr_insert_review`.

### Favorites

#### `POST /api/v1/favorites`

- Controlador: `addFavorite` em `src/controllers/favorites.controller.js`
- Payload esperado (JSON):
  - `user_id`
  - `movie_id`, `episode_id` ou `serie_id` (exatamente um)
- Chama `pr_add_favorite`.

#### `DELETE /api/v1/favorites`

- Controlador: `removeFavorite` em `src/controllers/favorites.controller.js`
- Payload esperado (JSON):
  - `user_id`
  - `movie_id`, `episode_id` ou `serie_id` (exatamente um)
- Chama `pr_remove_favorite`.

### Watch History

#### `POST /api/v1/history`

- Controlador: `addToWatchHistory` em `src/controllers/history.controller.js`
- Payload esperado (JSON):
  - `user_id`
  - `movie_id` ou `episode_id` (exatamente um)
  - `watched_minutes`
  - `watched_seconds`
- Chama `pr_add_to_watch_history`.

### Views

#### `GET /api/v1/views/movies`

- Controlador: `getMovies` em `src/controllers/views.controller.js`
- Query params opcionais:
  - `title` (busca parcial)
  - `rating_min`
  - `rating_max`
  - `release_year`
- Retorna dados de `vw_show_movies_data`.

#### `GET /api/v1/views/series`

- Controlador: `getSeries` em `src/controllers/views.controller.js`
- Query params opcionais:
  - `title` (busca parcial)
  - `rating_min`
  - `rating_max`
  - `release_year`
- Retorna dados de `vw_show_series_data`.

#### `GET /api/v1/views/seasons`

- Controlador: `getSeasons` em `src/controllers/views.controller.js`
- Query params opcionais:
  - `serie_title` (busca parcial)
- Retorna dados de `vw_show_seasons_data`.

## Comportamento comum

- `src/app.js` usa `express.json()` para JSON e registra handlers de rota 404 e erro 500.
- Rotas não encontradas retornam `404` com `{ error: 'Rota não encontrada.' }`.
- Erros de validação retornam `400` com mensagens explícitas.
- Falhas de banco retornam `500` com `error: err.message`.
- Upload de mídia para filmes e episódios usa o campo `media` e aceita apenas `video/*`.

## Dependências de banco

A API depende de stored procedures e functions no PostgreSQL:

- `pr_register_user_and_device`
- `pr_subscribe_user`
- `pr_insert_movie_or_serie`
- `fn_insert_director`
- `pr_insert_actors_array`
- `fn_insert_review`
- `pr_add_favorite`
- `pr_remove_favorite`
- `pr_add_to_watch_history`
- `fn_insert_content_genres`
- `fn_insert_content_cast`
- `fn_insert_content_directors`
- Views: `vw_show_movies_data`, `vw_show_series_data`, `vw_show_seasons_data`

> Observação: a lógica SQL dessas procedures/functions não está presente no código fonte Node.js e deve ser definida no banco PostgreSQL.

## Testes automatizados

A API inclui testes com Jest e Supertest em `src/__tests__/`.

Comandos:

```bash
npm test
npm run test:watch
```

## Como rodar

1. Copie `.env.example` para `.env`.
2. Ajuste as credenciais do PostgreSQL.
3. Instale dependências:

```bash
npm install
```

4. Inicie a API:

```bash
npm start
```

Ou para desenvolvimento automático:

```bash
npm run dev
```

## Endpoints rápidos

- `GET /health`
- `POST /api/v1/users/register`
- `POST /api/v1/users/subscribe`
- `POST /api/v1/people/directors`
- `POST /api/v1/people/actors`
- `POST /api/v1/catalog/movies`
- `POST /api/v1/catalog/series`
- `POST /api/v1/catalog/episodes`
- `POST /api/v1/catalog/genres`
- `POST /api/v1/catalog/cast`
- `POST /api/v1/catalog/directors`
- `POST /api/v1/reviews`
- `POST /api/v1/favorites`
- `DELETE /api/v1/favorites`
- `POST /api/v1/history`
- `GET /api/v1/views/movies`
- `GET /api/v1/views/series`
- `GET /api/v1/views/seasons`
