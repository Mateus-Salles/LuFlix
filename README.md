# 🎬 LuFlix API

API REST em Node.js + Express para o banco de dados LuFlix (PostgreSQL).

---

## ⚙️ Configuração

```bash
# 1. Instale as dependências
npm install

# 2. Crie o arquivo de ambiente
cp .env.example .env
# Edite .env com suas credenciais do PostgreSQL

# 3. Inicie o servidor
npm run dev   # com nodemon (desenvolvimento)
npm start     # produção
```

---

## 📌 Base URL

```
http://localhost:3000/api/v1
```

---

## 👤 Usuários

### `POST /users/register`
Registra um usuário e seu dispositivo.

```json
{
  "name": "Ana Silva",
  "email": "ana@luflix.com",
  "password": "hash_seguro",
  "device_token": "tok_001",
  "device_type": "smart_tv",
  "device_name": "TV da sala"
}
```

---

### `POST /users/subscribe`
Assina um plano para um usuário.

```json
{
  "user_id": 1,
  "plan_id": 3,
  "cpf": "12345678901",
  "gateway_customer_id": "cus_ana_001"
}
```

---

## 🎭 Pessoas

### `POST /people/directors`
Cadastra um único diretor.

```json
{
  "first_name": "Helena",
  "last_name": "Matos",
  "nationality": "Brasileira",
  "birth": "1978-04-12"
}
```

**Resposta:** `{ "director_id": 1 }`

---

### `POST /people/actors`
Cadastra um array de atores.

```json
{
  "actors": [
    { "first_name": "Bianca", "last_name": "Moura", "nationality": "Brasileira", "birth": "1990-01-14" },
    { "first_name": "Caio",   "last_name": "Ribeiro","nationality": "Brasileira", "birth": "1988-06-30" }
  ]
}
```

---

## 🎬 Catálogo

### `POST /catalog/movies`
Insere um filme.

```json
{
  "release_year": 2021,
  "content_rating_id": 3,
  "directors_id": [1, 2],
  "number_rating": 240,
  "rating": 4.4,
  "duration": 118,
  "title": "Aurora de Neon",
  "synopsis": "Uma engenheira descobre uma cidade escondida..."
}
```

---

### `POST /catalog/series`
Insere uma série.

```json
{
  "release_year": 2024,
  "content_rating_id": 4,
  "rating": 4.6,
  "title": "Codigo Prisma",
  "synopsis": "Uma equipe de analistas descobre mensagens ocultas..."
}
```

---

### `POST /catalog/episodes`
Insere um episódio (cria série/temporada automaticamente se necessário).

```json
{
  "release_year": 2024,
  "content_rating_id": 4,
  "directors_id": [3],
  "duration": 44,
  "episode_title": "Falha de Espelho",
  "episode_synopsis": "Uma anomalia nos dados...",
  "season_number": 1,
  "serie_id": 3
}
```

> Se `serie_id` não for informado, envie também `serie_title` e `serie_synopsis` para criar a série.

---

### `POST /catalog/genres`
Vincula gêneros a um filme ou série.

```json
{
  "content_type": "movie",
  "content_id": 1,
  "genre_ids": [4, 1]
}
```

---

### `POST /catalog/cast`
Vincula elenco a um filme ou episódio.

```json
{
  "content_type": "movie",
  "content_id": 1,
  "actor_ids": [1, 2],
  "character_names": ["Lia", "Natan"]
}
```

---

### `POST /catalog/directors`
Vincula diretores a um filme ou episódio já existente.

```json
{
  "content_type": "episode",
  "content_id": 5,
  "directors_ids": [2, 4]
}
```

---

## ⭐ Reviews

### `POST /reviews`
Cria uma review para um filme ou episódio (apenas um por vez).

```json
{
  "user_id": 1,
  "rating": 5,
  "comment": "Visual incrível e história bem conduzida!",
  "movie_id": 1
}
```

---

## ❤️ Favoritos

### `POST /favorites`
Adiciona um item aos favoritos do usuário.

```json
{ "user_id": 1, "movie_id": 2 }
```

---

### `DELETE /favorites`
Remove um item dos favoritos do usuário.

```json
{ "user_id": 1, "movie_id": 2 }
```

---

## 📺 Histórico de Visualização

### `POST /history`
Registra ou atualiza o progresso de visualização.

```json
{
  "user_id": 1,
  "episode_id": 4,
  "watched_minutes": 38,
  "watched_seconds": 45
}
```

---

## 🔍 Views (Consultas)

### `GET /views/movies`
Lista filmes com dados da view `vw_show_movies_data`.

| Query param   | Tipo   | Descrição                  |
|---------------|--------|----------------------------|
| `title`       | string | Busca parcial no título    |
| `rating_min`  | number | Nota mínima                |
| `rating_max`  | number | Nota máxima                |
| `release_year`| number | Ano de lançamento exato    |

**Exemplo:** `GET /api/v1/views/movies?title=aurora&rating_min=4`

---

### `GET /views/series`
Lista séries com dados da view `vw_show_series_data`.

Mesmos query params de `/views/movies`.

---

### `GET /views/seasons`
Lista temporadas com dados da view `vw_show_seasons_data`.

| Query param   | Tipo   | Descrição                       |
|---------------|--------|---------------------------------|
| `serie_title` | string | Busca parcial no título da série|

**Exemplo:** `GET /api/v1/views/seasons?serie_title=arcane`

## Como Executar o Frontend Localmente

Navegue até a pasta do seu frontend no terminal e escolha uma das opções abaixo para iniciar o servidor:

```bash
# Opção 1: Usando Python
python3 -m http.server 5500

# OU

# Opção 2: Usando live-server (Node/NPM)
npm install -g live-server
live-server --port=5500
