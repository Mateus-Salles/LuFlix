const API_BASE = "http://127.0.0.1:3000/api/v1";

const routes = {
  "": showMovies,
  "#movies": showMovies,
  "#series": showSeries,
  "#seasons": showSeasons,
  "#actions": showActions,
  "#actions/add-movie": showAddMoviePage,
  "#actions/add-serie": showAddSeriePage,
  "#actions/add-episode": showAddEpisodePage,
  "#actions/add-genre": showAddGenrePage,
  "#actions/add-cast": showAddCastPage,
  "#actions/add-directors": showAddDirectorsPage,
  "#actions/add-review": showAddReviewPage,
  "#actions/add-favorite": showAddFavoritePage,
  "#actions/remove-favorite": showRemoveFavoritePage,
  "#actions/add-history": showAddHistoryPage,
  "#actions/register-user": showRegisterUserPage,
  "#actions/subscribe-user": showSubscribeUserPage,
  "#actions/add-director-person": showAddDirectorPersonPage,
  "#actions/add-actors-person": showAddActorsPersonPage,
  "#actions/edit-movie": showEditMoviePage,
  "#actions/delete-movie": showDeleteMoviePage,
  "#actions/edit-serie": showEditSeriePage,
  "#actions/delete-serie": showDeleteSeriePage,
  "#actions/edit-episode": showEditEpisodePage,
  "#actions/delete-episode": showDeleteEpisodePage,
};

const app = document.getElementById("app");
const searchInput = document.getElementById("search");

window.addEventListener("hashchange", router);
searchInput.addEventListener("input", () => router());

function router() {
  const hash = location.hash || "#movies";
  const [route, query] = hash.split("?");
  const handler = routes[route] || showMovies;
  clearNavActive();
  handler(new URLSearchParams(query || ""));
}

function clearNavActive() {
  document.querySelectorAll(".main-nav a").forEach((link) => {
    link.classList.remove("active");
  });
}

function showMovies() {
  document.getElementById("nav-movies").classList.add("active");
  renderSection("Filmes", async () => {
    const query = buildQuery("movies");
    const res = await fetch(`${API_BASE}/views/movies${query}`);
    const data = await safeJson(res);
    return renderCards(data || [], "movies");
  });
}

function showSeries() {
  document.getElementById("nav-series").classList.add("active");
  renderSection("Séries", async () => {
    const query = buildQuery("series");
    const res = await fetch(`${API_BASE}/views/series${query}`);
    const data = await safeJson(res);
    return renderCards(data || [], "series");
  });
}

function showSeasons() {
  document.getElementById("nav-seasons").classList.add("active");
  renderSection("Temporadas", async () => {
    const query = buildQuery("seasons");
    const res = await fetch(`${API_BASE}/views/seasons${query}`);
    const data = await safeJson(res);
    return renderSeasonCards(data || []);
  });
}

function showActions() {
  document.getElementById("nav-actions").classList.add("active");
  renderSection("Ações", () => renderActionMenu());
}

function buildQuery(type) {
  const value = searchInput.value.trim();
  if (!value) return "";
  const param = type === "seasons" ? "serie_title" : "title";
  return `?${param}=${encodeURIComponent(value)}`;
}

function renderSection(title, renderContent) {
  app.innerHTML = "";
  const titleEl = document.createElement("h2");
  titleEl.className = "section-title";
  titleEl.textContent = title;
  const content = document.createElement("div");
  content.className = "page-content";
  content.innerHTML = '<div class="empty">Carregando...</div>';
  app.appendChild(titleEl);
  app.appendChild(content);

  Promise.resolve(renderContent())
    .then((result) => {
      content.innerHTML = "";
      if (result instanceof HTMLElement) content.appendChild(result);
      else if (Array.isArray(result))
        result.forEach((node) => content.appendChild(node));
      else content.innerHTML = String(result || "");
    })
    .catch((error) => {
      content.innerHTML = `<div class="empty">Erro: ${escapeHtml(error.message)}</div>`;
    });
}

function renderCards(items = [], type) {
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nenhum item encontrado.";
    return empty;
  }
  const grid = document.createElement("div");
  grid.className = "grid";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    if (item.media_path)
      thumb.style.backgroundImage = `url(/${item.media_path})`;
    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("h3");
    title.className = "title";
    title.textContent = getItemTitle(item, type);
    const subtitle = document.createElement("div");
    subtitle.className = "meta-row";
    subtitle.textContent = getItemSubtitle(item, type);
    const controls = document.createElement("div");
    controls.className = "actions";

    if (type !== "seasons") {
      const editBtn = makeBtn("Editar");
      editBtn.onclick = () => {
        location.hash = `#actions/edit-${type}?id=${getItemId(item, type)}`;
      };
      const deleteBtn = makeBtn("Excluir");
      deleteBtn.classList.add("primary");
      deleteBtn.onclick = () => {
        location.hash = `#actions/delete-${type}?id=${getItemId(item, type)}`;
      };
      controls.appendChild(editBtn);
      controls.appendChild(deleteBtn);
    }

    meta.appendChild(title);
    meta.appendChild(subtitle);
    meta.appendChild(controls);
    card.appendChild(thumb);
    card.appendChild(meta);
    grid.appendChild(card);
  });

  return grid;
}

function renderSeasonCards(items = []) {
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nenhum item encontrado.";
    return empty;
  }
  const grid = document.createElement("div");
  grid.className = "grid";

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "card";
    const meta = document.createElement("div");
    meta.className = "meta";
    const title = document.createElement("h3");
    title.className = "title";
    title.textContent = `${item.serie_title || "Série"} - Temporada ${item.season_number || "?"}`;
    const subtitle = document.createElement("div");
    subtitle.className = "meta-row";
    subtitle.textContent = `${item.numero_episodios || 0} episódio(s)`;
    meta.appendChild(title);
    meta.appendChild(subtitle);
    card.appendChild(document.createElement("div"));
    card.appendChild(meta);
    grid.appendChild(card);
  });

  return grid;
}

function makeBtn(text) {
  const btn = document.createElement("button");
  btn.className = "btn";
  btn.type = "button";
  btn.textContent = text;
  return btn;
}

function getItemTitle(item, type) {
  if (type === "movies")
    return item.titulo || item.movie_title || item.title || "Filme";
  if (type === "series") return item.title || item.serie_title || "Série";
  return item.episode_title || item.title || "Episódio";
}

function getItemSubtitle(item, type) {
  if (type === "movies" || type === "series")
    return `${item.ano_lancamento || ""} • ${item.nota || ""}`;
  return `${item.release_year || ""} • ${item.rating || ""}`;
}

function getItemId(item, type) {
  if (type === "movies") return item.id_filme || item.movie_id || item.id;
  if (type === "series") return item.serie_id || item.id;
  return item.episode_id || item.id;
}

function renderActionMenu() {
  const menu = document.createElement("div");
  menu.className = "action-grid";
  const actions = [
    { label: "Adicionar Filme", hash: "#actions/add-movie" },
    { label: "Adicionar Série", hash: "#actions/add-serie" },
    { label: "Adicionar Episódio", hash: "#actions/add-episode" },
    { label: "Adicionar Gênero", hash: "#actions/add-genre" },
    { label: "Adicionar Elenco", hash: "#actions/add-cast" },
    { label: "Adicionar Diretores", hash: "#actions/add-directors" },
    { label: "Adicionar Review", hash: "#actions/add-review" },
    { label: "Adicionar Favorito", hash: "#actions/add-favorite" },
    { label: "Remover Favorito", hash: "#actions/remove-favorite" },
    { label: "Adicionar Histórico", hash: "#actions/add-history" },
    { label: "Registrar Usuário", hash: "#actions/register-user" },
    { label: "Assinar Usuário", hash: "#actions/subscribe-user" },
    { label: "Cadastrar Diretor", hash: "#actions/add-director-person" },
    { label: "Cadastrar Atores", hash: "#actions/add-actors-person" },
    { label: "Editar Filme", hash: "#actions/edit-movie" },
    { label: "Excluir Filme", hash: "#actions/delete-movie" },
    { label: "Editar Série", hash: "#actions/edit-serie" },
    { label: "Excluir Série", hash: "#actions/delete-serie" },
    { label: "Editar Episódio", hash: "#actions/edit-episode" },
    { label: "Excluir Episódio", hash: "#actions/delete-episode" },
  ];

  actions.forEach((action) => {
    const card = document.createElement("div");
    card.className = "action-card";
    const button = document.createElement("button");
    button.className = "btn btn-block";
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", () => {
      location.hash = action.hash;
    });
    card.appendChild(button);
    menu.appendChild(card);
  });

  return menu;
}

function renderForm(title, fields, submitLabel, onSubmit) {
  const form = document.createElement("div");
  form.className = "form";
  const titleEl = document.createElement("h3");
  titleEl.textContent = title;
  form.appendChild(titleEl);
  const inputs = {};

  fields.forEach((field) => {
    const label = document.createElement("label");
    label.textContent = field.label;
    form.appendChild(label);
    let input;
    if (field.type === "textarea") {
      input = document.createElement("textarea");
    } else if (field.type === "select") {
      input = document.createElement("select");
      field.options.forEach((option) => {
        const opt = document.createElement("option");
        opt.value = option.value;
        opt.textContent = option.label;
        input.appendChild(opt);
      });
    } else {
      input = document.createElement("input");
      input.type = field.type || "text";
    }
    input.id = field.id;
    if (field.placeholder) input.placeholder = field.placeholder;
    if (field.accept) input.accept = field.accept;
    if (field.multiple) input.multiple = true;
    if (field.value !== undefined) input.value = field.value;
    form.appendChild(input);
    inputs[field.id] = input;
  });

  const actions = document.createElement("div");
  actions.className = "actions";
  const submit = document.createElement("button");
  submit.className = "btn primary";
  submit.type = "button";
  submit.textContent = submitLabel;
  actions.appendChild(submit);
  form.appendChild(actions);

  const feedback = document.createElement("div");
  feedback.className = "form-feedback";
  form.appendChild(feedback);

  submit.addEventListener("click", async () => {
    submit.disabled = true;
    feedback.textContent = "Enviando...";
    try {
      const message = await onSubmit(inputs);
      feedback.textContent = message || "Concluído com sucesso.";
    } catch (error) {
      feedback.textContent = `Erro: ${escapeHtml(error.message)}`;
    } finally {
      submit.disabled = false;
    }
  });

  return form;
}

function getQueryParam(params, name) {
  return params.get(name) || "";
}

async function showAddMoviePage() {
  renderSection("Adicionar Filme", () =>
    renderForm(
      "Cadastrar novo filme",
      [
        { id: "title", label: "Título", placeholder: "Nome do filme" },
        { id: "release_year", label: "Ano de lançamento", type: "number" },
        { id: "duration", label: "Duração (min)", type: "number" },
        {
          id: "directors",
          label: "IDs de diretores (vírgula)",
          placeholder: "1,2",
        },
        {
          id: "media",
          label: "Arquivo de mídia",
          type: "file",
          accept: "video/*",
        },
      ],
      "Enviar filme",
      async (inputs) => {
        const title = inputs.title.value.trim();
        const release_year = inputs.release_year.value.trim();
        const duration = inputs.duration.value.trim();
        const directors = inputs.directors.value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        const media = inputs.media.files[0];

        if (
          !title ||
          !release_year ||
          !duration ||
          directors.length === 0 ||
          !media
        ) {
          throw new Error(
            "Preencha todos os campos obrigatórios e envie mídia.",
          );
        }

        const body = new FormData();
        body.append("title", title);
        body.append("release_year", release_year);
        body.append("duration", duration);
        body.append("content_rating_id", "1");
        directors.forEach((id) => body.append("directors_id", id));
        body.append("media", media);

        console.log(body);

        const res = await fetch(`${API_BASE}/catalog/movies`, {
          method: "POST",
          body,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Filme cadastrado.";
      },
    ),
  );
}

async function showAddSeriePage() {
  renderSection("Adicionar Série", () =>
    renderForm(
      "Cadastrar nova série",
      [
        { id: "title", label: "Título", placeholder: "Nome da série" },
        { id: "release_year", label: "Ano de lançamento", type: "number" },
        { id: "rating", label: "Nota", type: "number" },
        { id: "synopsis", label: "Sinopse", type: "textarea" },
      ],
      "Enviar série",
      async (inputs) => {
        const body = {
          title: inputs.title.value.trim(),
          release_year: Number(inputs.release_year.value),
          rating: Number(inputs.rating.value) || 0,
          synopsis: inputs.synopsis.value.trim(),
          content_rating_id: 1,
        };

        if (!body.title || !body.release_year || !body.synopsis) {
          throw new Error("Preencha título, ano e sinopse.");
        }

        const res = await fetch(`${API_BASE}/catalog/series`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Série cadastrada.";
      },
    ),
  );
}

async function showAddEpisodePage() {
  renderSection("Adicionar Episódio", () =>
    renderForm(
      "Cadastrar novo episódio",
      [
        {
          id: "serie_id",
          label: "ID da série existente (opcional)",
          type: "number",
        },
        { id: "season_number", label: "Número da temporada", type: "number" },
        { id: "episode_title", label: "Título do episódio" },
        { id: "episode_synopsis", label: "Sinopse", type: "textarea" },
        {
          id: "directors",
          label: "IDs de diretores (vírgula)",
          placeholder: "1,2",
        },
        {
          id: "media",
          label: "Arquivo de mídia",
          type: "file",
          accept: "video/*",
        },
      ],
      "Enviar episódio",
      async (inputs) => {
        const season_number = inputs.season_number.value.trim();
        const directors = inputs.directors.value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        const media = inputs.media.files[0];

        if (
          !season_number ||
          !inputs.episode_title.value.trim() ||
          !inputs.episode_synopsis.value.trim() ||
          directors.length === 0 ||
          !media
        ) {
          throw new Error(
            "Preencha todos os campos obrigatórios e envie mídia.",
          );
        }

        const body = new FormData();
        body.append("season_number", season_number);
        body.append("episode_title", inputs.episode_title.value.trim());
        body.append("episode_synopsis", inputs.episode_synopsis.value.trim());
        body.append("duration", "45");
        body.append("content_rating_id", "1");
        if (inputs.serie_id.value.trim())
          body.append("serie_id", inputs.serie_id.value.trim());
        directors.forEach((id) => body.append("directors_id", id));
        body.append("media", media);

        const res = await fetch(`${API_BASE}/catalog/episodes`, {
          method: "POST",
          body,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Episódio cadastrado.";
      },
    ),
  );
}

async function showAddGenrePage() {
  renderSection("Adicionar Gênero", () =>
    renderForm(
      "Vincular gênero a conteúdo",
      [
        {
          id: "content_type",
          label: "Tipo de conteúdo",
          type: "select",
          options: [
            { value: "movie", label: "Filme" },
            { value: "serie", label: "Série" },
          ],
        },
        { id: "content_id", label: "ID do conteúdo", type: "number" },
        {
          id: "genre_ids",
          label: "IDs de gênero (vírgula)",
          placeholder: "1,2",
        },
      ],
      "Vincular gênero",
      async (inputs) => {
        const genre_ids = inputs.genre_ids.value
          .split(",")
          .map((v) => Number(v.trim()))
          .filter(Boolean);
        if (!inputs.content_id.value || genre_ids.length === 0) {
          throw new Error("Preencha conteúdo e gêneros.");
        }
        const body = {
          content_type: inputs.content_type.value,
          content_id: Number(inputs.content_id.value),
          genre_ids,
        };
        const res = await fetch(`${API_BASE}/catalog/genres`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Gênero vinculado.";
      },
    ),
  );
}

async function showAddCastPage() {
  renderSection("Adicionar Elenco", () =>
    renderForm(
      "Vincular elenco a conteúdo",
      [
        {
          id: "content_type",
          label: "Tipo de conteúdo",
          type: "select",
          options: [
            { value: "movie", label: "Filme" },
            { value: "episode", label: "Episódio" },
          ],
        },
        { id: "content_id", label: "ID do conteúdo", type: "number" },
        {
          id: "actor_ids",
          label: "IDs de atores (vírgula)",
          placeholder: "1,2",
        },
        {
          id: "character_names",
          label: "Nomes dos personagens (vírgula)",
          placeholder: "Hero, Villain",
        },
      ],
      "Vincular elenco",
      async (inputs) => {
        const actor_ids = inputs.actor_ids.value
          .split(",")
          .map((v) => Number(v.trim()))
          .filter(Boolean);
        const character_names = inputs.character_names.value
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);
        if (
          !inputs.content_id.value ||
          actor_ids.length === 0 ||
          character_names.length === 0
        ) {
          throw new Error("Preencha conteúdo, atores e personagens.");
        }
        if (actor_ids.length !== character_names.length) {
          throw new Error(
            "actor_ids e character_names precisam ter o mesmo tamanho.",
          );
        }
        const body = {
          content_type: inputs.content_type.value,
          content_id: Number(inputs.content_id.value),
          actor_ids,
          character_names,
        };
        const res = await fetch(`${API_BASE}/catalog/cast`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Elenco vinculado.";
      },
    ),
  );
}

async function showAddDirectorsPage() {
  renderSection("Adicionar Diretores", () =>
    renderForm(
      "Vincular diretores a conteúdo",
      [
        {
          id: "content_type",
          label: "Tipo de conteúdo",
          type: "select",
          options: [
            { value: "movie", label: "Filme" },
            { value: "episode", label: "Episódio" },
          ],
        },
        { id: "content_id", label: "ID do conteúdo", type: "number" },
        {
          id: "directors_ids",
          label: "IDs de diretores (vírgula)",
          placeholder: "1,2",
        },
      ],
      "Vincular diretores",
      async (inputs) => {
        const directors_ids = inputs.directors_ids.value
          .split(",")
          .map((v) => Number(v.trim()))
          .filter(Boolean);
        if (!inputs.content_id.value || directors_ids.length === 0) {
          throw new Error("Preencha conteúdo e diretores.");
        }
        const body = {
          content_type: inputs.content_type.value,
          content_id: Number(inputs.content_id.value),
          directors_ids,
        };
        const res = await fetch(`${API_BASE}/catalog/directors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Diretores vinculados.";
      },
    ),
  );
}

async function showAddReviewPage() {
  renderSection("Adicionar Review", () =>
    renderForm(
      "Cadastrar review",
      [
        { id: "user_id", label: "ID do usuário", type: "number" },
        { id: "rating", label: "Nota", type: "number" },
        { id: "comment", label: "Comentário", type: "textarea" },
        { id: "movie_id", label: "ID do filme (opcional)", type: "number" },
        {
          id: "episode_id",
          label: "ID do episódio (opcional)",
          type: "number",
        },
      ],
      "Enviar review",
      async (inputs) => {
        const body = {
          user_id: Number(inputs.user_id.value),
          rating: Number(inputs.rating.value),
          comment: inputs.comment.value.trim() || null,
          movie_id: inputs.movie_id.value
            ? Number(inputs.movie_id.value)
            : null,
          episode_id: inputs.episode_id.value
            ? Number(inputs.episode_id.value)
            : null,
        };
        if (!body.user_id || !body.rating) {
          throw new Error("Preencha user_id e rating.");
        }
        if (!body.movie_id && !body.episode_id) {
          throw new Error("Informe movie_id ou episode_id.");
        }
        const res = await fetch(`${API_BASE}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Review cadastrada.";
      },
    ),
  );
}

async function showAddFavoritePage() {
  renderSection("Adicionar Favorito", () =>
    renderForm(
      "Adicionar favorito",
      [
        { id: "user_id", label: "ID do usuário", type: "number" },
        { id: "movie_id", label: "ID do filme (opcional)", type: "number" },
        {
          id: "episode_id",
          label: "ID do episódio (opcional)",
          type: "number",
        },
        { id: "serie_id", label: "ID da série (opcional)", type: "number" },
      ],
      "Adicionar",
      async (inputs) => {
        const body = {
          user_id: Number(inputs.user_id.value),
          movie_id: inputs.movie_id.value
            ? Number(inputs.movie_id.value)
            : null,
          episode_id: inputs.episode_id.value
            ? Number(inputs.episode_id.value)
            : null,
          serie_id: inputs.serie_id.value
            ? Number(inputs.serie_id.value)
            : null,
        };
        if (
          !body.user_id ||
          (!body.movie_id && !body.episode_id && !body.serie_id)
        ) {
          throw new Error("Preencha user_id e um dos IDs de conteúdo.");
        }
        const res = await fetch(`${API_BASE}/favorites`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Favorito adicionado.";
      },
    ),
  );
}

async function showRemoveFavoritePage() {
  renderSection("Remover Favorito", () =>
    renderForm(
      "Remover favorito",
      [
        { id: "user_id", label: "ID do usuário", type: "number" },
        { id: "movie_id", label: "ID do filme (opcional)", type: "number" },
        {
          id: "episode_id",
          label: "ID do episódio (opcional)",
          type: "number",
        },
        { id: "serie_id", label: "ID da série (opcional)", type: "number" },
      ],
      "Remover",
      async (inputs) => {
        const body = {
          user_id: Number(inputs.user_id.value),
          movie_id: inputs.movie_id.value
            ? Number(inputs.movie_id.value)
            : null,
          episode_id: inputs.episode_id.value
            ? Number(inputs.episode_id.value)
            : null,
          serie_id: inputs.serie_id.value
            ? Number(inputs.serie_id.value)
            : null,
        };
        if (
          !body.user_id ||
          (!body.movie_id && !body.episode_id && !body.serie_id)
        ) {
          throw new Error("Preencha user_id e um dos IDs de conteúdo.");
        }
        const res = await fetch(`${API_BASE}/favorites`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Favorito removido.";
      },
    ),
  );
}

async function showAddHistoryPage() {
  renderSection("Adicionar Histórico", () =>
    renderForm(
      "Atualizar histórico de exibição",
      [
        { id: "user_id", label: "ID do usuário", type: "number" },
        { id: "movie_id", label: "ID do filme (opcional)", type: "number" },
        {
          id: "episode_id",
          label: "ID do episódio (opcional)",
          type: "number",
        },
        { id: "watched_minutes", label: "Minutos vistos", type: "number" },
        { id: "watched_seconds", label: "Segundos vistos", type: "number" },
      ],
      "Enviar histórico",
      async (inputs) => {
        const body = {
          user_id: Number(inputs.user_id.value),
          movie_id: inputs.movie_id.value
            ? Number(inputs.movie_id.value)
            : null,
          episode_id: inputs.episode_id.value
            ? Number(inputs.episode_id.value)
            : null,
          watched_minutes: Number(inputs.watched_minutes.value),
          watched_seconds: Number(inputs.watched_seconds.value),
        };
        if (
          !body.user_id ||
          Number.isNaN(body.watched_minutes) ||
          Number.isNaN(body.watched_seconds)
        ) {
          throw new Error(
            "Preencha user_id, watched_minutes e watched_seconds.",
          );
        }
        if (!body.movie_id && !body.episode_id) {
          throw new Error("Informe movie_id ou episode_id.");
        }
        const res = await fetch(`${API_BASE}/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Histórico criado.";
      },
    ),
  );
}

async function showRegisterUserPage() {
  renderSection("Registrar Usuário", () =>
    renderForm(
      "Cadastrar usuário e dispositivo",
      [
        { id: "name", label: "Nome" },
        { id: "email", label: "Email", type: "text" },
        { id: "password", label: "Senha", type: "text" },
        { id: "device_token", label: "Device Token" },
        { id: "device_type", label: "Tipo de dispositivo" },
        { id: "device_name", label: "Nome do dispositivo" },
      ],
      "Registrar",
      async (inputs) => {
        const body = {
          name: inputs.name.value.trim(),
          email: inputs.email.value.trim(),
          password: inputs.password.value.trim(),
          device_token: inputs.device_token.value.trim(),
          device_type: inputs.device_type.value.trim(),
          device_name: inputs.device_name.value.trim(),
        };

        if (
          !body.name ||
          !body.email ||
          !body.password ||
          !body.device_token ||
          !body.device_type ||
          !body.device_name
        ) {
          throw new Error("Preencha todos os campos do usuário.");
        }
        const res = await fetch(`${API_BASE}/users/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return `Usuário criado com ID ${json.user_id}`;
      },
    ),
  );
}

async function showSubscribeUserPage() {
  renderSection("Assinar Usuário", () =>
    renderForm(
      "Criar assinatura",
      [
        { id: "user_id", label: "ID do usuário", type: "number" },
        { id: "plan_id", label: "ID do plano", type: "number" },
        { id: "cpf", label: "CPF" },
        { id: "gateway_customer_id", label: "Gateway Customer ID" },
      ],
      "Assinar",
      async (inputs) => {
        const body = {
          user_id: Number(inputs.user_id.value),
          plan_id: Number(inputs.plan_id.value),
          cpf: inputs.cpf.value.trim(),
          gateway_customer_id: inputs.gateway_customer_id.value.trim(),
        };
        if (
          !body.user_id ||
          !body.plan_id ||
          !body.cpf ||
          !body.gateway_customer_id
        ) {
          throw new Error("Preencha todos os campos da assinatura.");
        }
        const res = await fetch(`${API_BASE}/users/subscribe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return `Assinatura criada.`;
      },
    ),
  );
}

async function showAddDirectorPersonPage() {
  renderSection("Cadastrar Diretor", () =>
    renderForm(
      "Cadastrar diretor",
      [
        { id: "first_name", label: "Primeiro nome" },
        { id: "last_name", label: "Sobrenome" },
        { id: "nationality", label: "Nacionalidade" },
        { id: "birth", label: "Data de nascimento", placeholder: "YYYY-MM-DD" },
      ],
      "Cadastrar",
      async (inputs) => {
        const body = {
          first_name: inputs.first_name.value.trim(),
          last_name: inputs.last_name.value.trim(),
          nationality: inputs.nationality.value.trim(),
          birth: inputs.birth.value.trim() || null,
        };
        if (!body.first_name || !body.last_name || !body.nationality) {
          throw new Error("Preencha primeiro nome, sobrenome e nacionalidade.");
        }
        const res = await fetch(`${API_BASE}/people/directors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return `Diretor criado.`;
      },
    ),
  );
}

async function showAddActorsPersonPage() {
  renderSection("Cadastrar Atores", () =>
    renderForm(
      "Cadastrar múltiplos atores",
      [
        {
          id: "actors",
          label: "JSON de atores",
          type: "textarea",
          placeholder:
            '[{"first_name":"Ana","last_name":"Souza","nationality":"Brasileira","birth":"1990-01-01"}]',
        },
      ],
      "Cadastrar atores",
      async (inputs) => {
        let actors;
        try {
          actors = JSON.parse(inputs.actors.value);
        } catch (error) {
          throw new Error("JSON inválido para atores.");
        }
        if (!Array.isArray(actors) || actors.length === 0) {
          throw new Error("Informe um array de atores.");
        }
        const res = await fetch(`${API_BASE}/people/actors`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ actors }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Atores cadastrados.";
      },
    ),
  );
}

async function showEditMoviePage(params) {
  const id = getQueryParam(params, "id");
  const movies = await fetchItems("movies");
  renderSection("Editar Filme", () =>
    renderForm(
      "Editar filme existente",
      [
        {
          id: "movie_id",
          label: "Filme",
          type: "select",
          options: movies.map((movie) => ({
            value: getItemId(movie, "movies"),
            label: `${getItemTitle(movie, "movies")} (${movie.ano_lancamento || "n/a"})`,
          })),
          value: id,
        },
        { id: "title", label: "Título" },
        { id: "release_year", label: "Ano de lançamento", type: "number" },
        { id: "duration", label: "Duração", type: "number" },
        { id: "synopsis", label: "Sinopse", type: "textarea" },
        {
          id: "media",
          label: "Mídia (opcional)",
          type: "file",
          accept: "video/*",
        },
      ],
      "Salvar alterações",
      async (inputs) => {
        const movieId = inputs.movie_id.value;
        if (!movieId) throw new Error("Selecione um filme.");
        const body = new FormData();
        if (inputs.title.value) body.append("title", inputs.title.value.trim());
        if (inputs.release_year.value)
          body.append("release_year", inputs.release_year.value);
        if (inputs.duration.value)
          body.append("duration", inputs.duration.value);
        if (inputs.synopsis.value)
          body.append("synopsis", inputs.synopsis.value.trim());
        if (inputs.media.files[0]) body.append("media", inputs.media.files[0]);
        const res = await fetch(`${API_BASE}/catalog/movies/${movieId}`, {
          method: "PUT",
          body,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Filme atualizado.";
      },
    ),
  );
}

async function showDeleteMoviePage(params) {
  const id = getQueryParam(params, "id");
  const movies = await fetchItems("movies");
  renderSection("Excluir Filme", () =>
    renderForm(
      "Excluir filme",
      [
        {
          id: "movie_id",
          label: "Filme",
          type: "select",
          options: movies.map((movie) => ({
            value: getItemId(movie, "movies"),
            label: `${getItemTitle(movie, "movies")} (${movie.ano_lancamento || "n/a"})`,
          })),
          value: id,
        },
      ],
      "Excluir",
      async (inputs) => {
        const movieId = inputs.movie_id.value;
        if (!movieId) throw new Error("Selecione um filme.");
        const res = await fetch(`${API_BASE}/catalog/movies/${movieId}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Filme excluído.";
      },
    ),
  );
}

async function showEditSeriePage(params) {
  const id = getQueryParam(params, "id");
  const series = await fetchItems("series");
  renderSection("Editar Série", () =>
    renderForm(
      "Editar série existente",
      [
        {
          id: "serie_id",
          label: "Série",
          type: "select",
          options: series.map((serie) => ({
            value: getItemId(serie, "series"),
            label: `${getItemTitle(serie, "series")} (${serie.ano_lancamento || "n/a"})`,
          })),
          value: id,
        },
        { id: "title", label: "Título" },
        { id: "release_year", label: "Ano de lançamento", type: "number" },
        { id: "rating", label: "Nota", type: "number" },
        { id: "synopsis", label: "Sinopse", type: "textarea" },
      ],
      "Salvar alterações",
      async (inputs) => {
        const serieId = inputs.serie_id.value;
        if (!serieId) throw new Error("Selecione uma série.");
        const body = {};
        if (inputs.title.value) body.title = inputs.title.value.trim();
        if (inputs.release_year.value)
          body.release_year = Number(inputs.release_year.value);
        if (inputs.rating.value) body.rating = Number(inputs.rating.value);
        if (inputs.synopsis.value) body.synopsis = inputs.synopsis.value.trim();
        if (!Object.keys(body).length)
          throw new Error("Informe pelo menos um campo para atualizar.");
        const res = await fetch(`${API_BASE}/catalog/series/${serieId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Série atualizada.";
      },
    ),
  );
}

async function showDeleteSeriePage(params) {
  const id = getQueryParam(params, "id");
  const series = await fetchItems("series");
  renderSection("Excluir Série", () =>
    renderForm(
      "Excluir série",
      [
        {
          id: "serie_id",
          label: "Série",
          type: "select",
          options: series.map((serie) => ({
            value: getItemId(serie, "series"),
            label: `${getItemTitle(serie, "series")} (${serie.ano_lancamento || "n/a"})`,
          })),
          value: id,
        },
      ],
      "Excluir",
      async (inputs) => {
        const serieId = inputs.serie_id.value;
        if (!serieId) throw new Error("Selecione uma série.");
        const res = await fetch(`${API_BASE}/catalog/series/${serieId}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Série excluída.";
      },
    ),
  );
}

async function showEditEpisodePage(params) {
  const id = getQueryParam(params, "id");
  renderSection("Editar Episódio", () =>
    renderForm(
      "Editar episódio",
      [
        {
          id: "episode_id",
          label: "ID do episódio",
          type: "number",
          value: id,
        },
        { id: "episode_title", label: "Título" },
        { id: "episode_number", label: "Número do episódio", type: "number" },
        { id: "duration", label: "Duração", type: "number" },
        { id: "synopsis", label: "Sinopse", type: "textarea" },
        { id: "rating", label: "Nota", type: "number" },
        {
          id: "media",
          label: "Mídia (opcional)",
          type: "file",
          accept: "video/*",
        },
      ],
      "Salvar alterações",
      async (inputs) => {
        const episodeId = inputs.episode_id.value;
        if (!episodeId) throw new Error("Informe o ID do episódio.");
        const form = new FormData();
        if (inputs.episode_title.value)
          form.append("episode_title", inputs.episode_title.value.trim());
        if (inputs.episode_number.value)
          form.append("episode_number", inputs.episode_number.value);
        if (inputs.duration.value)
          form.append("duration", inputs.duration.value);
        if (inputs.synopsis.value)
          form.append("episode_synopsis", inputs.synopsis.value.trim());
        if (inputs.rating.value) form.append("rating", inputs.rating.value);
        if (inputs.media.files[0]) form.append("media", inputs.media.files[0]);
        const res = await fetch(`${API_BASE}/catalog/episodes/${episodeId}`, {
          method: "PUT",
          body: form,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Episódio atualizado.";
      },
    ),
  );
}

async function showDeleteEpisodePage(params) {
  const id = getQueryParam(params, "id");
  renderSection("Excluir Episódio", () =>
    renderForm(
      "Excluir episódio",
      [
        {
          id: "episode_id",
          label: "ID do episódio",
          type: "number",
          value: id,
        },
      ],
      "Excluir",
      async (inputs) => {
        const episodeId = inputs.episode_id.value;
        if (!episodeId) throw new Error("Informe o ID do episódio.");
        const res = await fetch(`${API_BASE}/catalog/episodes/${episodeId}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Episódio excluído.";
      },
    ),
  );
}

async function fetchItems(type) {
  const res = await fetch(`${API_BASE}/views/${type}`);
  const data = await safeJson(res);
  return Array.isArray(data) ? data : [];
}

async function safeJson(res) {
  try {
    const json = await res.json();
    if (!res.ok)
      throw new Error(json.error || res.statusText || "Erro desconhecido");
    return json;
  } catch (error) {
    return [];
  }
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

router();
