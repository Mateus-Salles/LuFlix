const API_BASE = "http://127.0.0.1:3000/api/v1";
const API_ORIGIN = "http://127.0.0.1:3000";
const USER_STORAGE_KEY = "luflix_current_user";

const routes = {
  "": showMovies,
  "#movies": showMovies,
  "#series": showSeries,
  "#series/view": showSeriesViewPage,
  "#episodes": () => { location.hash = "#series"; },
  "#seasons": () => { location.hash = "#series"; },
  "#actions": () => { location.hash = "#actions/add"; },
  "#actions/add": showActionsPage,
  "#actions/edit": showActionsPage,
  "#actions/delete": showActionsPage,
  "#actions/register-user": showRegisterUserPage,
  "#actions/login": showLoginPage,
  "#actions/subscribe-user": showSubscribeUserPage,
  "#actions/add-movie": () => { location.hash = "#actions/add"; },
  "#actions/add-serie": () => { location.hash = "#actions/add"; },
  "#actions/add-episode": () => { location.hash = "#actions/add"; },
  "#actions/add-genre": () => { location.hash = "#actions/add"; },
  "#actions/add-cast": () => { location.hash = "#actions/add"; },
  "#actions/add-directors": () => { location.hash = "#actions/add"; },
  "#actions/add-review": () => { location.hash = "#actions/add"; },
  "#actions/add-director-person": () => { location.hash = "#actions/add"; },
  "#actions/add-actors-person": () => { location.hash = "#actions/add"; },
  "#actions/edit-movie": () => { location.hash = "#actions/edit"; },
  "#actions/edit-movies": () => { location.hash = "#actions/edit"; },
  "#actions/delete-movie": () => { location.hash = "#actions/delete"; },
  "#actions/delete-movies": () => { location.hash = "#actions/delete"; },
  "#actions/edit-serie": () => { location.hash = "#actions/edit"; },
  "#actions/edit-series": () => { location.hash = "#actions/edit"; },
  "#actions/delete-serie": () => { location.hash = "#actions/delete"; },
  "#actions/delete-series": () => { location.hash = "#actions/delete"; },
  "#actions/edit-episode": () => { location.hash = "#actions/edit"; },
  "#actions/edit-episodes": () => { location.hash = "#actions/edit"; },
  "#actions/delete-episode": () => { location.hash = "#actions/delete"; },
  "#actions/delete-episodes": () => { location.hash = "#actions/delete"; },
  "#history": showHistory,
  "#favorites": showFavorites,
  "#watch": showWatchPage,
};

const app = document.getElementById("app");
const searchInput = document.getElementById("search");
let currentUser = loadSession();
let userFavorites = [];
let playerCleanup = null;

window.addEventListener("beforeunload", () => {
  if (playerCleanup) {
    playerCleanup();
  }
});

window.addEventListener("hashchange", router);
searchInput.addEventListener("input", () => router());

// dispositivo.js
function obterDadosDispositivo() {
  const parser = new UAParser();
  const result = parser.getResult();

  const tipo = result.device.type || 'desktop';
  const navegador = result.browser.name || 'Navegador Desconhecido';
  const sistemaOperacional = result.os.name || 'OS Desconhecido';

  return {
    tipo: tipo,
    nome: `${navegador} (${sistemaOperacional})`
  };
}

async function syncFavorites() {
  if (!currentUser) {
    userFavorites = [];
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/favorites/${currentUser.user_id}`);
    if (res.ok) {
      const json = await res.json();
      userFavorites = json.data || [];
    }
  } catch (err) {
    console.error("Erro ao sincronizar favoritos:", err);
  }
}

function isItemFavorited(id, type) {
  return userFavorites.some(fav => {
    if (type === "movies") return Number(fav.movie_id) === Number(id);
    if (type === "episodes") return Number(fav.episode_id) === Number(id);
    if (type === "series") return Number(fav.serie_id) === Number(id);
    return false;
  });
}

async function router() {
  if (playerCleanup) {
    playerCleanup();
    playerCleanup = null;
  }
  document.title = "LuFlix Admin";
  const hash = location.hash || "#movies";
  const [route, query] = hash.split("?");
  const handler = routes[route] || showMovies;

  // Toggle header and nav bar elements visibility for auth routes
  const header = document.querySelector(".site-header");
  const mainNav = document.querySelector(".main-nav");
  const searchWrap = document.querySelector(".search-wrap");
  const userStatus = document.getElementById("user-status");

  if (route === "#actions/login" || route === "#actions/register-user") {
    document.body.classList.add("auth-page-active");
    if (mainNav) mainNav.style.display = "none";
    if (searchWrap) searchWrap.style.display = "none";
    if (userStatus) userStatus.style.display = "none";
    if (header) {
      header.style.position = "absolute";
      header.style.background = "transparent";
      header.style.width = "100%";
      header.style.boxShadow = "none";
    }
  } else {
    document.body.classList.remove("auth-page-active");
    if (mainNav) mainNav.style.display = "";
    if (searchWrap) searchWrap.style.display = "";
    if (userStatus) userStatus.style.display = "";
    if (header) {
      header.style.position = "";
      header.style.background = "";
      header.style.width = "";
      header.style.boxShadow = "";
    }
  }

  updateUserStatus();
  clearNavActive();

  // Sincronizar favoritos se logado e lista local vazia
  if (currentUser && userFavorites.length === 0) {
    await syncFavorites();
  }

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
    return renderCards(data.data || [], "movies");
  });
}

function showSeries() {
  document.getElementById("nav-series").classList.add("active");
  renderSection("Séries", async () => {
    const query = buildQuery("series");
    const res = await fetch(`${API_BASE}/views/series${query}`);
    const data = await safeJson(res);
    return renderCards(data.data || [], "series");
  });
}

function isCompletelyViewed(watchedMinutes, watchedSeconds, totalDurationMinutes) {
  if (!totalDurationMinutes) return false;
  const watchedTotalSeconds = (watchedMinutes * 60) + watchedSeconds;
  const durationTotalSeconds = totalDurationMinutes * 60;
  // Completely viewed if they watched at least 95% or are within 30 seconds of the end
  return watchedTotalSeconds >= Math.min(durationTotalSeconds * 0.95, durationTotalSeconds - 30);
}

async function showHistory() {
  const navHistory = document.getElementById("nav-history");
  if (navHistory) navHistory.classList.add("active");

  if (!currentUser) {
    renderSection("Histórico de Visualização", renderNotLoggedIn);
    return;
  }

  renderSection("Histórico de Visualização", async () => {
    try {
      const res = await fetch(`${API_BASE}/history/${currentUser.user_id}`);
      const json = await safeJson(res);
      const items = json.data || [];

      if (items.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "Seu histórico de visualização está vazio.";
        return empty;
      }

      const grid = document.createElement("div");
      grid.className = "grid";

      items.forEach((item) => {
        const card = document.createElement("div");
        card.className = "card";

        // Calculate progress percentage
        const totalDurationMin = item.movie_duration || item.episode_duration || 0;
        const totalDurationSec = totalDurationMin * 60;
        const watchedSec = (item.watched_minutes * 60) + item.watched_seconds;
        const percentage = totalDurationSec ? Math.min(100, Math.round((watchedSec / totalDurationSec) * 100)) : 0;
        const isComp = isCompletelyViewed(item.watched_minutes, item.watched_seconds, totalDurationMin);

        // Thumbnail
        const thumb = document.createElement("div");
        thumb.className = "thumb";
        thumb.style.display = "flex";
        thumb.style.flexDirection = "column";
        const imagePath = item.thumb_path || (item.media_path && !item.media_path.endsWith('.m3u8') ? item.media_path : null);
        if (imagePath) {
          thumb.style.backgroundImage = `url(${API_ORIGIN}/${imagePath})`;
        }

        // Premium progress bar inside/below thumbnail
        const progressContainer = document.createElement("div");
        progressContainer.style.background = "rgba(255, 255, 255, 0.2)";
        progressContainer.style.height = "6px";
        progressContainer.style.width = "100%";
        progressContainer.style.marginTop = "auto"; // Push to bottom of thumb
        progressContainer.style.overflow = "hidden";
        progressContainer.style.position = "relative";

        const progressFill = document.createElement("div");
        progressFill.style.background = isComp ? "#2ecc71" : "var(--accent)"; // Green if complete, Red if partial
        progressFill.style.height = "100%";
        progressFill.style.width = `${percentage}%`;
        progressContainer.appendChild(progressFill);

        thumb.appendChild(progressContainer);

        // Metadata
        const meta = document.createElement("div");
        meta.className = "meta";

        const title = document.createElement("h3");
        title.className = "title";

        // Title formatting
        if (item.movie_id) {
          title.textContent = item.movie_title || "Filme";
        } else {
          title.textContent = `${item.serie_title || "Série"} - T${item.season_number}E${item.episode_number}: ${item.episode_title}`;
        }

        const subtitle = document.createElement("div");
        subtitle.className = "meta-row";

        if (isComp) {
          subtitle.innerHTML = `<span style="color: #2ecc71; font-weight: bold;">Completamente visto</span> • ${totalDurationMin} min`;
        } else {
          subtitle.innerHTML = `Parou em <span style="color: #ff9f43; font-weight: bold;">${item.watched_minutes}:${String(item.watched_seconds).padStart(2, '0')}</span> / ${totalDurationMin} min`;
        }

        meta.appendChild(title);
        meta.appendChild(subtitle);

        // Actions / Controls
        const controls = document.createElement("div");
        controls.className = "actions";

        const playBtn = makeBtn(isComp ? "Assistir de novo" : "Retomar");
        playBtn.classList.add("primary");
        playBtn.style.flex = "1";
        controls.appendChild(playBtn);

        meta.appendChild(controls);
        card.appendChild(thumb);
        card.appendChild(meta);

        // Entire card is clickable to play/resume
        card.onclick = () => {
          const type = item.movie_id ? "movies" : "episodes";
          const id = item.movie_id || item.episode_id;
          if (isComp) {
            location.hash = `#watch?type=${type}&id=${id}`;
          } else {
            const start = Math.max(0, watchedSec - 10);
            location.hash = `#watch?type=${type}&id=${id}&start=${start}`;
          }
        };

        grid.appendChild(card);
      });

      return grid;
    } catch (error) {
      console.error(error);
      const errEl = document.createElement("div");
      errEl.className = "empty";
      errEl.textContent = `Erro ao carregar histórico: ${error.message}`;
      return errEl;
    }
  });
}

async function showFavorites() {
  const navFavorites = document.getElementById("nav-favorites");
  if (navFavorites) navFavorites.classList.add("active");

  if (!currentUser) {
    renderSection("Favoritos", renderNotLoggedIn);
    return;
  }

  renderSection("Meus Favoritos", async () => {
    try {
      const res = await fetch(`${API_BASE}/favorites/details/${currentUser.user_id}`);
      const json = await safeJson(res);

      const movies = json.movies || [];
      const series = json.series || [];

      if (movies.length === 0 && series.length === 0) {
        const empty = document.createElement("div");
        empty.className = "empty";
        empty.textContent = "Você ainda não possui itens favoritados.";
        return empty;
      }

      const container = document.createElement("div");

      if (movies.length > 0) {
        const moviesTitle = document.createElement("h3");
        moviesTitle.className = "section-title";
        moviesTitle.style.borderBottom = "1px solid #333";
        moviesTitle.style.paddingBottom = "8px";
        moviesTitle.style.marginTop = "20px";
        moviesTitle.textContent = "Filmes Favoritos";
        container.appendChild(moviesTitle);

        const moviesGrid = renderCards(movies, "movies");
        container.appendChild(moviesGrid);
      }

      if (series.length > 0) {
        const seriesTitle = document.createElement("h3");
        seriesTitle.className = "section-title";
        seriesTitle.style.borderBottom = "1px solid #333";
        seriesTitle.style.paddingBottom = "8px";
        seriesTitle.style.marginTop = "40px";
        seriesTitle.textContent = "Séries Favoritas";
        container.appendChild(seriesTitle);

        const seriesGrid = renderCards(series, "series");
        container.appendChild(seriesGrid);
      }

      return container;
    } catch (error) {
      console.error(error);
      const errEl = document.createElement("div");
      errEl.className = "empty";
      errEl.textContent = `Erro ao carregar favoritos: ${error.message}`;
      return errEl;
    }
  });
}


async function showSeriesViewPage(params) {
  const id = getQueryParam(params, "id");
  if (!id) {
    app.innerHTML = `<div class="empty">Nenhuma série selecionada.</div>`;
    return;
  }

  // Save the series ID in sessionStorage for the HLS player back button
  sessionStorage.setItem("last_viewed_series_id", id);

  // Activate series nav link
  const navSeries = document.getElementById("nav-series");
  if (navSeries) navSeries.classList.add("active");

  renderSection("Carregando...", async () => {
    try {
      // 1. Fetch series details
      const seriesRes = await fetch(`${API_BASE}/views/series?id=${id}`);
      const seriesData = await safeJson(seriesRes);
      const series = (seriesData.data || [])[0];

      if (!series) {
        return `<div class="empty">Série não encontrada.</div>`;
      }

      // 2. Fetch seasons to get season list
      const seasonsRes = await fetch(`${API_BASE}/views/seasons?serie_title=${encodeURIComponent(series.title)}`);
      const seasonsData = await safeJson(seasonsRes);
      const seasonsList = seasonsData.data || [];

      // Extract unique sorted season numbers
      let seasonNumbers = [...new Set(seasonsList.map(s => Number(s.season_number)))];
      seasonNumbers.sort((a, b) => a - b);

      // Default to season 1 as required
      if (!seasonNumbers.includes(1)) {
        seasonNumbers.unshift(1);
      }

      // Container for the view
      const detailContainer = document.createElement("div");
      detailContainer.className = "watch-container"; // reusable style for detailed view

      // Back Button
      const backBtn = document.createElement("button");
      backBtn.className = "back-link";
      backBtn.innerHTML = `&larr; Voltar para Séries`;
      backBtn.onclick = () => {
        location.hash = "#series";
      };
      detailContainer.appendChild(backBtn);

      // Series Info Card (premium styling similar to watch-info)
      const infoSection = document.createElement("div");
      infoSection.className = "watch-info";
      infoSection.style.marginBottom = "24px";

      const titleEl = document.createElement("h2");
      titleEl.className = "watch-title";
      titleEl.textContent = series.title;
      infoSection.appendChild(titleEl);

      const metaRow = document.createElement("div");
      metaRow.className = "watch-meta";

      const ratingSpan = document.createElement("span");
      ratingSpan.textContent = `★ ${series.nota || "0.0"}`;
      metaRow.appendChild(ratingSpan);

      const yearSpan = document.createElement("span");
      yearSpan.textContent = series.ano_lancamento || "";
      metaRow.appendChild(yearSpan);

      const ratingTextSpan = document.createElement("span");
      ratingTextSpan.textContent = series.classificacao || "Livre";
      metaRow.appendChild(ratingTextSpan);

      const seasonsCountSpan = document.createElement("span");
      seasonsCountSpan.textContent = `${series.temporadas || 0} temporada(s)`;
      metaRow.appendChild(seasonsCountSpan);

      infoSection.appendChild(metaRow);

      const synopsisEl = document.createElement("p");
      synopsisEl.className = "watch-synopsis";
      synopsisEl.textContent = series.sinopse || "Sem sinopse disponível.";
      infoSection.appendChild(synopsisEl);

      detailContainer.appendChild(infoSection);

      // Section for season selection
      const controlRow = document.createElement("div");
      controlRow.style.display = "flex";
      controlRow.style.alignItems = "center";
      controlRow.style.gap = "12px";
      controlRow.style.marginBottom = "24px";
      controlRow.style.background = "var(--panel)";
      controlRow.style.padding = "16px";
      controlRow.style.borderRadius = "8px";
      controlRow.style.border = "1px solid #2a2a2a";

      const selectLabel = document.createElement("label");
      selectLabel.setAttribute("for", "season-select");
      selectLabel.style.fontWeight = "600";
      selectLabel.style.color = "var(--muted)";
      selectLabel.style.fontSize = "15px";
      selectLabel.textContent = "Selecione a Temporada:";
      controlRow.appendChild(selectLabel);

      const selectEl = document.createElement("select");
      selectEl.id = "season-select";
      selectEl.style.background = "#222";
      selectEl.style.border = "1px solid #333";
      selectEl.style.padding = "8px 16px";
      selectEl.style.borderRadius = "4px";
      selectEl.style.color = "#fff";
      selectEl.style.fontSize = "14px";
      selectEl.style.fontWeight = "600";
      selectEl.style.cursor = "pointer";
      selectEl.style.outline = "none";
      selectEl.style.minWidth = "120px";

      seasonNumbers.forEach(num => {
        const opt = document.createElement("option");
        opt.value = num;
        opt.textContent = `Temporada ${num}`;
        selectEl.appendChild(opt);
      });

      // Default value to Season 1
      selectEl.value = 1;
      controlRow.appendChild(selectEl);
      detailContainer.appendChild(controlRow);

      // Episodes List Grid Container
      const episodesGridContainer = document.createElement("div");
      detailContainer.appendChild(episodesGridContainer);

      // Load episodes function
      const loadEpisodesForSeason = async (seasonNum) => {
        episodesGridContainer.innerHTML = '<div class="empty">Carregando episódios...</div>';
        try {
          const episodesRes = await fetch(`${API_BASE}/views/episodes?serie_id=${series.serie_id}&season_number=${seasonNum}`);
          const episodesData = await safeJson(episodesRes);
          const episodes = episodesData.data || [];

          episodesGridContainer.innerHTML = "";
          const cardsNode = renderCards(episodes, "episodes");
          episodesGridContainer.appendChild(cardsNode);
        } catch (err) {
          episodesGridContainer.innerHTML = `<div class="empty">Erro ao carregar episódios: ${escapeHtml(err.message)}</div>`;
        }
      };

      // Load Season 1 by default
      loadEpisodesForSeason(1);

      // On select change, reload episodes
      selectEl.addEventListener("change", () => {
        loadEpisodesForSeason(selectEl.value);
      });

      document.title = `${series.title} - LuFlix`;
      return detailContainer;
    } catch (err) {
      console.error(err);
      return `<div class="empty">Erro ao carregar os detalhes da série: ${escapeHtml(err.message)}</div>`;
    }
  });
}



async function showActionsPage(params) {
  // Activate actions nav link
  const navActions = document.getElementById("nav-actions");
  if (navActions) navActions.classList.add("active");

  if (!currentUser) {
    renderSection("Ações", renderNotLoggedIn);
    return;
  }

  const hash = location.hash || "#actions/add";
  const mode = hash.split("?")[0].split("/")[1] || "add"; // "add", "edit", "delete"

  const modeTitles = {
    add: "Adicionar Conteúdo",
    edit: "Editar Conteúdo",
    delete: "Excluir Conteúdo"
  };

  renderSection(modeTitles[mode] || "Ações", async () => {
    const container = document.createElement("div");
    container.className = "form";

    // Mode tabs to easily switch
    const tabsContainer = document.createElement("div");
    tabsContainer.style.display = "flex";
    tabsContainer.style.gap = "8px";
    tabsContainer.style.marginBottom = "20px";

    ["add", "edit", "delete"].forEach(m => {
      const tabBtn = makeBtn(m === "add" ? "Adicionar" : m === "edit" ? "Editar" : "Deletar");
      if (m === mode) {
        tabBtn.classList.add("primary");
      }
      tabBtn.onclick = () => {
        location.hash = `#actions/${m}`;
      };
      tabsContainer.appendChild(tabBtn);
    });
    container.appendChild(tabsContainer);

    // Type Select dropdown
    const typeLabel = document.createElement("label");
    typeLabel.textContent = "Selecione o Tipo de Item:";
    container.appendChild(typeLabel);

    const typeSelect = document.createElement("select");
    typeSelect.id = "actions-type-select";
    typeSelect.innerHTML = `
      <option value="">-- Escolha um tipo --</option>
      <option value="movie">Filme</option>
      <option value="episode">Episódio</option>
      <option value="cast">Elenco (Atores/Diretores)</option>
    `;
    container.appendChild(typeSelect);

    const formWrapper = document.createElement("div");
    formWrapper.style.marginTop = "20px";
    container.appendChild(formWrapper);

    typeSelect.onchange = async () => {
      formWrapper.innerHTML = '<div class="empty">Carregando formulário...</div>';
      const val = typeSelect.value;
      if (!val) {
        formWrapper.innerHTML = "";
        return;
      }

      try {
        if (mode === "add") {
          await renderAddForm(val, formWrapper);
        } else if (mode === "edit") {
          await renderEditForm(val, formWrapper);
        } else if (mode === "delete") {
          await renderDeleteForm(val, formWrapper);
        }
      } catch (err) {
        formWrapper.innerHTML = `<div class="empty" style="color:var(--accent)">Erro: ${escapeHtml(err.message)}</div>`;
      }
    };

    return container;
  });
}

async function renderAddForm(type, parent) {
  parent.innerHTML = "";

  let genresList = [];
  try {
    const genresRes = await fetch(`${API_BASE}/catalog/genres`);
    const genresJson = await safeJson(genresRes);
    genresList = genresJson.data || [];
  } catch (err) {
    console.error("Erro ao carregar gêneros:", err);
  }
  const genreOptions = genresList.map(g => ({ value: g.genre_id, label: g.name }));

  if (type === "movie") {
    const fields = [
      { id: "title", label: "Título", placeholder: "Nome do filme" },
      { id: "release_year", label: "Ano de lançamento", type: "number" },
      { id: "duration", label: "Duração (min)", type: "number" },
      {
        id: "content_rating",
        type: "select",
        label: "Classificação Indicativa",
        options: [
          { value: 1, label: "Livre para todos os públicos." },
          { value: 2, label: "Não recomendado para menores de 10 anos." },
          { value: 3, label: "Não recomendado para menores de 12 anos." },
          { value: 4, label: "Não recomendado para menores de 14 anos." },
          { value: 5, label: "Não recomendado para menores de 16 anos." },
          { value: 6, label: "Não recomendado para menores de 18 anos." }
        ]
      },
      { id: "directors", label: "IDs de diretores (vírgula)", placeholder: "1,2" },
      { id: "actors", label: "IDs de atores (vírgula)", placeholder: "1,2" },
      {
        id: "genres",
        type: "checkbox-group",
        label: "Gêneros",
        options: genreOptions
      },
      { id: "synopsis", label: "Sinopse", type: "textarea" },
      { id: "media", label: "Arquivo de mídia (Vídeo)", type: "file", accept: "video/*" },
      { id: "thumb", label: "Imagem de Miniatura (Opcional)", type: "file", accept: "image/*" }
    ];
    const form = renderForm("Cadastrar Novo Filme", fields, "Enviar filme", async (inputs, feedback) => {
      const title = inputs.title.value.trim();
      const release_year = inputs.release_year.value.trim();
      const duration = inputs.duration.value.trim();
      const content_rating_id = inputs.content_rating.value;
      const directors = inputs.directors.value.split(",").map(v => v.trim()).filter(Boolean);
      const actors = inputs.actors.value.split(",").map(v => v.trim()).filter(Boolean);
      const genres = inputs.genres.value;
      const synopsis = inputs.synopsis.value.trim();
      const media = inputs.media.files[0];
      const thumbFile = inputs.thumb.files[0];

      if (!title || !release_year || !duration || directors.length === 0 || !media || !synopsis) {
        throw new Error("Preencha todos os campos obrigatórios e envie o arquivo de mídia.");
      }

      feedback.textContent = "Iniciando upload fatiado...";
      const media_path = await uploadFileInChunks(media, "movies", (percentage) => {
        feedback.textContent = percentage === 100 ? "Processando compressão HEVC..." : `Enviando vídeo (${percentage}%)...`;
      });

      const formData = new FormData();
      formData.append("title", title);
      formData.append("release_year", release_year);
      formData.append("duration", duration);
      formData.append("content_rating_id", content_rating_id);
      formData.append("synopsis", synopsis);
      formData.append("media_path", media_path);
      directors.forEach(id => formData.append("directors_id[]", id));
      actors.forEach(id => formData.append("actors_id[]", id));
      genres.forEach(id => formData.append("genres_id[]", id));

      const lastExtractedThumb = sessionStorage.getItem("last_extracted_thumb");
      if (lastExtractedThumb) {
        formData.append("extracted_thumb_path", lastExtractedThumb);
        sessionStorage.removeItem("last_extracted_thumb");
      }

      if (thumbFile) {
        formData.append("thumb", thumbFile);
      }

      const res = await fetch(`${API_BASE}/catalog/movies`, {
        method: "POST",
        body: formData
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || res.statusText);
      return json.message || "Filme cadastrado com sucesso.";
    });
    parent.appendChild(form);
  } else if (type === "episode") {
    const formNode = document.createElement("div");
    formNode.className = "form";

    const titleEl = document.createElement("h3");
    titleEl.textContent = "Cadastrar novo episódio";
    formNode.appendChild(titleEl);

    const createLabel = (text) => {
      const lbl = document.createElement("label");
      lbl.textContent = text;
      return lbl;
    };

    formNode.appendChild(createLabel("ID da série existente (opcional)"));
    const serieIdInput = document.createElement("input");
    serieIdInput.type = "number";
    serieIdInput.id = "ep-serie-id";
    serieIdInput.placeholder = "Deixe vazio para cadastrar uma nova série junto";
    formNode.appendChild(serieIdInput);

    const seriesFieldsContainer = document.createElement("div");
    seriesFieldsContainer.id = "series-fields-container";
    seriesFieldsContainer.style.marginTop = "15px";
    seriesFieldsContainer.style.padding = "15px";
    seriesFieldsContainer.style.border = "1px dashed var(--accent)";
    seriesFieldsContainer.style.borderRadius = "6px";
    seriesFieldsContainer.style.background = "rgba(229, 9, 20, 0.05)";

    const seriesSecTitle = document.createElement("h4");
    seriesSecTitle.textContent = "Dados da Nova Série";
    seriesSecTitle.style.margin = "0 0 10px 0";
    seriesSecTitle.style.color = "var(--accent)";
    seriesFieldsContainer.appendChild(seriesSecTitle);

    seriesFieldsContainer.appendChild(createLabel("Título da Série"));
    const serieTitleInput = document.createElement("input");
    serieTitleInput.type = "text";
    serieTitleInput.id = "ep-serie-title";
    serieTitleInput.placeholder = "Nome da nova série";
    seriesFieldsContainer.appendChild(serieTitleInput);

    seriesFieldsContainer.appendChild(createLabel("Sinopse da Série"));
    const serieSynopsisInput = document.createElement("textarea");
    serieSynopsisInput.id = "ep-serie-synopsis";
    serieSynopsisInput.placeholder = "Sinopse da nova série";
    seriesFieldsContainer.appendChild(serieSynopsisInput);

    seriesFieldsContainer.appendChild(createLabel("Imagem de Miniatura da Série (Obrigatória)"));
    const serieThumbInput = document.createElement("input");
    serieThumbInput.type = "file";
    serieThumbInput.id = "ep-serie-thumb";
    serieThumbInput.accept = "image/*";
    seriesFieldsContainer.appendChild(serieThumbInput);

    seriesFieldsContainer.appendChild(createLabel("Gêneros da Série"));
    const serieGenresContainer = document.createElement("div");
    serieGenresContainer.style.display = "flex";
    serieGenresContainer.style.flexWrap = "wrap";
    serieGenresContainer.style.gap = "10px";
    serieGenresContainer.style.margin = "10px 0 15px 0";

    genreOptions.forEach(option => {
      const wrap = document.createElement("label");
      wrap.style.display = "inline-flex";
      wrap.style.alignItems = "center";
      wrap.style.gap = "6px";
      wrap.style.cursor = "pointer";
      wrap.style.fontWeight = "normal";
      wrap.style.background = "rgba(255, 255, 255, 0.05)";
      wrap.style.padding = "6px 12px";
      wrap.style.borderRadius = "4px";
      wrap.style.border = "1px solid rgba(255, 255, 255, 0.1)";

      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.value = option.value;
      chk.className = "serie-genre-checkbox";

      wrap.appendChild(chk);
      wrap.appendChild(document.createTextNode(option.label));
      serieGenresContainer.appendChild(wrap);
    });
    seriesFieldsContainer.appendChild(serieGenresContainer);

    formNode.appendChild(seriesFieldsContainer);

    const toggleSeriesFields = () => {
      const hasSerieId = serieIdInput.value.trim() !== "";
      seriesFieldsContainer.style.display = hasSerieId ? "none" : "block";
    };
    serieIdInput.addEventListener("input", toggleSeriesFields);
    toggleSeriesFields();

    formNode.appendChild(createLabel("Número da temporada"));
    const seasonNumberInput = document.createElement("input");
    seasonNumberInput.type = "number";
    seasonNumberInput.id = "ep-season-number";
    seasonNumberInput.placeholder = "Ex: 1";
    formNode.appendChild(seasonNumberInput);

    formNode.appendChild(createLabel("Título do episódio"));
    const episodeTitleInput = document.createElement("input");
    episodeTitleInput.type = "text";
    episodeTitleInput.id = "ep-title";
    episodeTitleInput.placeholder = "Nome do episódio";
    formNode.appendChild(episodeTitleInput);

    formNode.appendChild(createLabel("Sinopse do episódio"));
    const episodeSynopsisInput = document.createElement("textarea");
    episodeSynopsisInput.id = "ep-synopsis";
    episodeSynopsisInput.placeholder = "O que acontece neste episódio";
    formNode.appendChild(episodeSynopsisInput);

    formNode.appendChild(createLabel("Ano de lançamento"));
    const releaseYearInput = document.createElement("input");
    releaseYearInput.type = "number";
    releaseYearInput.id = "ep-release-year";
    releaseYearInput.placeholder = "Ex: 2024";
    formNode.appendChild(releaseYearInput);

    formNode.appendChild(createLabel("Duração (min)"));
    const durationInput = document.createElement("input");
    durationInput.type = "number";
    durationInput.id = "ep-duration";
    durationInput.placeholder = "Ex: 45";
    durationInput.value = "45";
    formNode.appendChild(durationInput);

    formNode.appendChild(createLabel("Classificação Indicativa"));
    const contentRatingSelect = document.createElement("select");
    contentRatingSelect.id = "ep-content-rating";
    [
      { value: 1, label: "Livre para todos os públicos." },
      { value: 2, label: "Não recomendado para menores de 10 anos." },
      { value: 3, label: "Não recomendado para menores de 12 anos." },
      { value: 4, label: "Não recomendado para menores de 14 anos." },
      { value: 5, label: "Não recomendado para menores de 16 anos." },
      { value: 6, label: "Não recomendado para menores de 18 anos." }
    ].forEach(opt => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label;
      contentRatingSelect.appendChild(option);
    });
    formNode.appendChild(contentRatingSelect);

    formNode.appendChild(createLabel("IDs de diretores (vírgula)"));
    const directorsInput = document.createElement("input");
    directorsInput.type = "text";
    directorsInput.id = "ep-directors";
    directorsInput.placeholder = "Ex: 1,2";
    formNode.appendChild(directorsInput);

    formNode.appendChild(createLabel("IDs de atores (vírgula)"));
    const actorsInput = document.createElement("input");
    actorsInput.type = "text";
    actorsInput.id = "ep-actors";
    actorsInput.placeholder = "Ex: 1,2";
    formNode.appendChild(actorsInput);

    formNode.appendChild(createLabel("Arquivo de mídia (Vídeo)"));
    const mediaInput = document.createElement("input");
    mediaInput.type = "file";
    mediaInput.id = "ep-media";
    mediaInput.accept = "video/*";
    formNode.appendChild(mediaInput);

    formNode.appendChild(createLabel("Imagem de Miniatura do Episódio (Opcional)"));
    const epThumbInput = document.createElement("input");
    epThumbInput.type = "file";
    epThumbInput.id = "ep-thumb";
    epThumbInput.accept = "image/*";
    formNode.appendChild(epThumbInput);

    const actions = document.createElement("div");
    actions.className = "actions";
    const submit = document.createElement("button");
    submit.className = "btn primary";
    submit.type = "button";
    submit.textContent = "Enviar episódio";
    actions.appendChild(submit);
    formNode.appendChild(actions);

    const feedback = document.createElement("div");
    feedback.className = "form-feedback";
    formNode.appendChild(feedback);

    submit.addEventListener("click", async () => {
      submit.disabled = true;
      feedback.textContent = "Enviando...";
      try {
        const serieId = serieIdInput.value.trim();
        const season_number = seasonNumberInput.value.trim();
        const episode_title = episodeTitleInput.value.trim();
        const episode_synopsis = episodeSynopsisInput.value.trim();
        const release_year = releaseYearInput.value.trim();
        const duration = durationInput.value.trim();
        const content_rating_id = contentRatingSelect.value;
        const directors = directorsInput.value.split(",").map((v) => v.trim()).filter(Boolean);
        const actors = actorsInput.value.split(",").map((v) => v.trim()).filter(Boolean);
        const media = mediaInput.files[0];
        const epThumbFile = epThumbInput.files[0];
        const serieThumbFile = serieThumbInput.files[0];

        if (!season_number || !episode_title || !episode_synopsis || !release_year || !duration || directors.length === 0 || !media) {
          throw new Error("Preencha todos os campos obrigatórios do episódio e envie o vídeo.");
        }

        let serie_title = null;
        let serie_synopsis = null;
        let selectedGenres = [];

        if (!serieId) {
          serie_title = serieTitleInput.value.trim();
          serie_synopsis = serieSynopsisInput.value.trim();
          selectedGenres = Array.from(serieGenresContainer.querySelectorAll(".serie-genre-checkbox:checked")).map(chk => chk.value);
          if (!serie_title || !serie_synopsis) {
            throw new Error("Para cadastrar uma nova série, preencha o título e sinopse da série.");
          }
          if (!serieThumbFile) {
            throw new Error("Para cadastrar uma nova série, o arquivo de miniatura da série é obrigatório.");
          }
        }

        feedback.textContent = "Iniciando upload fatiado...";
        const media_path = await uploadFileInChunks(media, "episodes", (percentage) => {
          feedback.textContent = percentage === 100 ? "Processando compressão HEVC..." : `Enviando vídeo (${percentage}%)...`;
        });

        feedback.textContent = "Salvando informações do episódio...";

        const formData = new FormData();
        formData.append("release_year", release_year);
        formData.append("content_rating_id", content_rating_id);
        formData.append("season_number", season_number);
        formData.append("episode_title", episode_title);
        formData.append("episode_synopsis", episode_synopsis);
        formData.append("duration", duration);
        formData.append("media_path", media_path);
        directors.forEach(id => formData.append("directors_id[]", id));
        actors.forEach(id => formData.append("actors_id[]", id));

        if (serieId) {
          formData.append("serie_id", serieId);
        } else {
          formData.append("serie_title", serie_title);
          formData.append("serie_synopsis", serie_synopsis);
          if (serieThumbFile) {
            formData.append("serie_thumb", serieThumbFile);
          }
          selectedGenres.forEach(id => formData.append("genres_id[]", id));
        }

        const lastExtractedThumb = sessionStorage.getItem("last_extracted_thumb");
        if (lastExtractedThumb) {
          formData.append("extracted_thumb_path", lastExtractedThumb);
          sessionStorage.removeItem("last_extracted_thumb");
        }

        if (epThumbFile) {
          formData.append("thumb", epThumbFile);
        }

        const res = await fetch(`${API_BASE}/catalog/episodes`, {
          method: "POST",
          body: formData
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        feedback.textContent = json.message || "Episódio cadastrado.";
      } catch (error) {
        feedback.textContent = `Erro: ${escapeHtml(error.message)}`;
      } finally {
        submit.disabled = false;
      }
    });

    parent.appendChild(formNode);
  } else if (type === "cast") {
    const castTypeContainer = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = "Tipo de Elenco:";
    castTypeContainer.appendChild(label);

    const castTypeSelect = document.createElement("select");
    castTypeSelect.innerHTML = `
      <option value="">-- Escolha um tipo --</option>
      <option value="director">Diretor</option>
      <option value="actor">Ator</option>
    `;
    castTypeContainer.appendChild(castTypeSelect);

    const fieldsContainer = document.createElement("div");
    fieldsContainer.style.marginTop = "20px";
    castTypeContainer.appendChild(fieldsContainer);

    castTypeSelect.onchange = () => {
      fieldsContainer.innerHTML = "";
      const val = castTypeSelect.value;
      if (!val) return;

      const title = val === "director" ? "Cadastrar Diretor" : "Cadastrar Ator";
      const form = renderForm(
        title,
        [
          { id: "first_name", label: "Primeiro Nome" },
          { id: "last_name", label: "Sobrenome" },
          { id: "nationality", label: "Nacionalidade" },
          { id: "birth", label: "Data de Nascimento", type: "date" }
        ],
        "Cadastrar",
        async (inputs) => {
          const body = {
            first_name: inputs.first_name.value.trim(),
            last_name: inputs.last_name.value.trim(),
            nationality: inputs.nationality.value.trim(),
            birth: inputs.birth.value.trim() || null
          };

          if (!body.first_name || !body.last_name || !body.nationality) {
            throw new Error("Preencha primeiro nome, sobrenome e nacionalidade.");
          }

          if (val === "director") {
            const res = await fetch(`${API_BASE}/people/directors`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || res.statusText);
            return json.message || "Diretor cadastrado com sucesso.";
          } else {
            const res = await fetch(`${API_BASE}/people/actors`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ actors: [body] })
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || res.statusText);
            return json.message || "Ator cadastrado com sucesso.";
          }
        }
      );
      fieldsContainer.appendChild(form);
    };

    parent.appendChild(castTypeContainer);
  }
}

async function renderEditForm(type, parent) {
  parent.innerHTML = "";

  if (type === "movie") {
    const movies = await fetchItems("movies");
    let genresList = [];
    try {
      const genresRes = await fetch(`${API_BASE}/catalog/genres`);
      const genresJson = await safeJson(genresRes);
      genresList = genresJson.data || [];
    } catch (err) {
      console.error("Erro ao carregar gêneros:", err);
    }
    const genreOptions = genresList.map(g => ({ value: g.genre_id, label: g.name }));

    const select = document.createElement("select");
    select.innerHTML = '<option value="">-- Selecione o Filme para editar --</option>';
    movies.forEach(m => {
      const opt = document.createElement("option");
      opt.value = getItemId(m, "movies");
      opt.textContent = `${getItemTitle(m, "movies")} (${m.ano_lancamento || "n/a"})`;
      select.appendChild(opt);
    });
    parent.appendChild(select);

    const formWrapper = document.createElement("div");
    formWrapper.style.marginTop = "20px";
    parent.appendChild(formWrapper);

    select.onchange = async () => {
      formWrapper.innerHTML = "";
      const id = select.value;
      if (!id) return;

      const movie = movies.find(m => String(getItemId(m, "movies")) === String(id));
      if (!movie) return;

      const form = renderForm(
        "Editar Filme",
        [
          { id: "title", label: "Título", value: movie.titulo || movie.title },
          { id: "release_year", label: "Ano de lançamento", type: "number", value: movie.ano_lancamento },
          { id: "duration", label: "Duração (min)", type: "number", value: movie.duracao },
          { id: "directors", label: "IDs de diretores (vírgula)", value: movie.directors_id || "" },
          { id: "actors", label: "IDs de atores (vírgula)", value: movie.actors_id || "" },
          {
            id: "genres",
            type: "checkbox-group",
            label: "Gêneros",
            options: genreOptions,
            value: movie.genres_id || ""
          },
          { id: "synopsis", label: "Sinopse", type: "textarea", value: movie.sinopse },
          { id: "media", label: "Mídia (opcional, HLS)", type: "file", accept: "video/*" }
        ],
        "Salvar Alterações",
        async (inputs, feedback) => {
          const payload = {};
          if (inputs.title.value) payload.title = inputs.title.value.trim();
          if (inputs.release_year.value) payload.release_year = inputs.release_year.value;
          if (inputs.duration.value) payload.duration = inputs.duration.value;
          if (inputs.directors.value !== undefined) {
            payload.directors_id = inputs.directors.value.split(",").map(v => v.trim()).filter(Boolean);
          }
          if (inputs.actors.value !== undefined) {
            payload.actors_id = inputs.actors.value.split(",").map(v => v.trim()).filter(Boolean);
          }
          if (inputs.genres.value !== undefined) {
            payload.genres_id = inputs.genres.value;
          }
          if (inputs.synopsis.value) payload.synopsis = inputs.synopsis.value.trim();

          if (inputs.media.files[0]) {
            feedback.textContent = "Iniciando upload fatiado...";
            payload.media_path = await uploadFileInChunks(inputs.media.files[0], "movies", (percentage) => {
              feedback.textContent = percentage === 100 ? "Processando compressão HEVC..." : `Enviando vídeo (${percentage}%)...`;
            });
          }

          if (Object.keys(payload).length === 0) {
            throw new Error("Informe pelo menos um campo para atualizar.");
          }

          const res = await fetch(`${API_BASE}/catalog/movies/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || res.statusText);
          return json.message || "Filme atualizado com sucesso.";
        }
      );
      formWrapper.appendChild(form);
    };
  } else if (type === "episode") {
    const episodes = await fetchItems("episodes");
    const select = document.createElement("select");
    select.innerHTML = '<option value="">-- Selecione o Episódio para editar --</option>';
    episodes.forEach(ep => {
      const opt = document.createElement("option");
      opt.value = getItemId(ep, "episodes");
      opt.textContent = `${ep.serie_title || "Série"} - T${ep.season_number}E${ep.episode_number} - ${getItemTitle(ep, "episodes")}`;
      select.appendChild(opt);
    });
    parent.appendChild(select);

    const formWrapper = document.createElement("div");
    formWrapper.style.marginTop = "20px";
    parent.appendChild(formWrapper);

    select.onchange = () => {
      formWrapper.innerHTML = "";
      const id = select.value;
      if (!id) return;

      const ep = episodes.find(e => String(getItemId(e, "episodes")) === String(id));
      if (!ep) return;

      const form = renderForm(
        "Editar Episódio",
        [
          { id: "episode_title", label: "Título", value: ep.episode_title || ep.title },
          { id: "episode_number", label: "Número do episódio", type: "number", value: ep.episode_number },
          { id: "duration", label: "Duração (min)", type: "number", value: ep.duration },
          { id: "directors", label: "IDs de diretores (vírgula)", value: ep.directors_id || "" },
          { id: "actors", label: "IDs de atores (vírgula)", value: ep.actors_id || "" },
          { id: "synopsis", label: "Sinopse", type: "textarea", value: ep.synopsis },
          { id: "rating", label: "Nota", type: "number", value: ep.rating },
          { id: "media", label: "Mídia (opcional, HLS)", type: "file", accept: "video/*" }
        ],
        "Salvar Alterações",
        async (inputs, feedback) => {
          const payload = {};
          if (inputs.episode_title.value) payload.title = inputs.episode_title.value.trim();
          if (inputs.episode_number.value) payload.episode_number = inputs.episode_number.value;
          if (inputs.duration.value) payload.duration = inputs.duration.value;
          if (inputs.directors.value !== undefined) {
            payload.directors_id = inputs.directors.value.split(",").map(v => v.trim()).filter(Boolean);
          }
          if (inputs.actors.value !== undefined) {
            payload.actors_id = inputs.actors.value.split(",").map(v => v.trim()).filter(Boolean);
          }
          if (inputs.synopsis.value) payload.synopsis = inputs.synopsis.value.trim();
          if (inputs.rating.value) payload.rating = inputs.rating.value;

          if (inputs.media.files[0]) {
            feedback.textContent = "Iniciando upload fatiado...";
            payload.media_path = await uploadFileInChunks(inputs.media.files[0], "episodes", (percentage) => {
              feedback.textContent = percentage === 100 ? "Processando compressão HEVC..." : `Enviando vídeo (${percentage}%)...`;
            });
          }

          if (Object.keys(payload).length === 0) {
            throw new Error("Informe pelo menos um campo para atualizar.");
          }

          const res = await fetch(`${API_BASE}/catalog/episodes/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || res.statusText);
          return json.message || "Episódio atualizado com sucesso.";
        }
      );
      formWrapper.appendChild(form);
    };
  } else if (type === "cast") {
    const castTypeContainer = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = "Tipo de Elenco:";
    castTypeContainer.appendChild(label);

    const castTypeSelect = document.createElement("select");
    castTypeSelect.innerHTML = `
      <option value="">-- Escolha um tipo --</option>
      <option value="director">Diretor</option>
      <option value="actor">Ator</option>
    `;
    castTypeContainer.appendChild(castTypeSelect);

    const editWrapper = document.createElement("div");
    editWrapper.style.marginTop = "20px";
    castTypeContainer.appendChild(editWrapper);

    castTypeSelect.onchange = async () => {
      editWrapper.innerHTML = '<div class="empty">Carregando listagem...</div>';
      const val = castTypeSelect.value;
      if (!val) {
        editWrapper.innerHTML = "";
        return;
      }

      let people = [];
      const endpoint = val === "director" ? "directors" : "actors";
      const res = await fetch(`${API_BASE}/people/${endpoint}`);
      const json = await safeJson(res);
      people = json.data || [];

      editWrapper.innerHTML = "";
      const selectPerson = document.createElement("select");
      selectPerson.innerHTML = `<option value="">-- Selecione o ${val === "director" ? "Diretor" : "Ator"} --</option>`;
      people.forEach(p => {
        const idVal = val === "director" ? p.director_id : p.actor_id;
        const opt = document.createElement("option");
        opt.value = idVal;
        opt.textContent = `${p.first_name} ${p.last_name} (${p.nationality})`;
        selectPerson.appendChild(opt);
      });
      editWrapper.appendChild(selectPerson);

      const formWrapper = document.createElement("div");
      formWrapper.style.marginTop = "20px";
      editWrapper.appendChild(formWrapper);

      selectPerson.onchange = () => {
        formWrapper.innerHTML = "";
        const id = selectPerson.value;
        if (!id) return;

        const person = people.find(p => String(val === "director" ? p.director_id : p.actor_id) === String(id));
        if (!person) return;

        const formattedBirth = person.birth ? person.birth.split("T")[0] : "";

        const form = renderForm(
          `Editar ${val === "director" ? "Diretor" : "Ator"}`,
          [
            { id: "first_name", label: "Primeiro Nome", value: person.first_name },
            { id: "last_name", label: "Sobrenome", value: person.last_name },
            { id: "nationality", label: "Nacionalidade", value: person.nationality },
            { id: "birth", label: "Data de Nascimento", type: "date", value: formattedBirth }
          ],
          "Salvar Alterações",
          async (inputs) => {
            const body = {
              first_name: inputs.first_name.value.trim(),
              last_name: inputs.last_name.value.trim(),
              nationality: inputs.nationality.value.trim(),
              birth: inputs.birth.value.trim() || null
            };

            if (!body.first_name || !body.last_name || !body.nationality) {
              throw new Error("Preencha primeiro nome, sobrenome e nacionalidade.");
            }

            const res = await fetch(`${API_BASE}/people/${endpoint}/${id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body)
            });
            const resJson = await res.json();
            if (!res.ok) throw new Error(resJson.error || res.statusText);
            return resJson.message || "Dados atualizados com sucesso.";
          }
        );
        formWrapper.appendChild(form);
      };
    };

    parent.appendChild(castTypeContainer);
  }
}

async function renderDeleteForm(type, parent) {
  parent.innerHTML = "";

  if (type === "movie") {
    const movies = await fetchItems("movies");
    const select = document.createElement("select");
    select.innerHTML = '<option value="">-- Selecione o Filme para deletar --</option>';
    movies.forEach(m => {
      const opt = document.createElement("option");
      opt.value = getItemId(m, "movies");
      opt.textContent = `${getItemTitle(m, "movies")} (${m.ano_lancamento || "n/a"})`;
      select.appendChild(opt);
    });
    parent.appendChild(select);

    const infoWrapper = document.createElement("div");
    infoWrapper.style.marginTop = "20px";
    parent.appendChild(infoWrapper);

    select.onchange = () => {
      infoWrapper.innerHTML = "";
      const id = select.value;
      if (!id) return;

      const movie = movies.find(m => String(getItemId(m, "movies")) === String(id));
      if (!movie) return;

      infoWrapper.innerHTML = `
        <div style="background:rgba(229,9,20,0.05); padding:20px; border-radius:8px; border:1px solid var(--accent); margin-bottom:20px;">
          <h4 style="color:var(--accent); margin:0 0 10px 0;">Confirmação de Exclusão</h4>
          <p><strong>Título:</strong> ${movie.titulo || movie.title}</p>
          <p><strong>Ano:</strong> ${movie.ano_lancamento}</p>
          <p><strong>Sinopse:</strong> ${movie.sinopse}</p>
        </div>
      `;

      const delBtn = makeBtn("Confirmar Exclusão");
      delBtn.classList.add("primary");
      delBtn.addEventListener("click", async () => {
        if (!confirm("Tem certeza que deseja excluir este filme permanentemente?")) return;
        delBtn.disabled = true;
        try {
          const res = await fetch(`${API_BASE}/catalog/movies/${id}`, { method: "DELETE" });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || res.statusText);
          alert(json.message || "Filme excluído.");
          location.reload();
        } catch (err) {
          alert(`Erro: ${err.message}`);
          delBtn.disabled = false;
        }
      });
      infoWrapper.appendChild(delBtn);
    };
  } else if (type === "episode") {
    const episodes = await fetchItems("episodes");
    const select = document.createElement("select");
    select.innerHTML = '<option value="">-- Selecione o Episódio para deletar --</option>';
    episodes.forEach(ep => {
      const opt = document.createElement("option");
      opt.value = getItemId(ep, "episodes");
      opt.textContent = `${ep.serie_title || "Série"} - T${ep.season_number}E${ep.episode_number} - ${getItemTitle(ep, "episodes")}`;
      select.appendChild(opt);
    });
    parent.appendChild(select);

    const infoWrapper = document.createElement("div");
    infoWrapper.style.marginTop = "20px";
    parent.appendChild(infoWrapper);

    select.onchange = () => {
      infoWrapper.innerHTML = "";
      const id = select.value;
      if (!id) return;

      const ep = episodes.find(e => String(getItemId(e, "episodes")) === String(id));
      if (!ep) return;

      infoWrapper.innerHTML = `
        <div style="background:rgba(229,9,20,0.05); padding:20px; border-radius:8px; border:1px solid var(--accent); margin-bottom:20px;">
          <h4 style="color:var(--accent); margin:0 0 10px 0;">Confirmação de Exclusão</h4>
          <p><strong>Título:</strong> ${ep.episode_title || ep.title}</p>
          <p><strong>Série:</strong> ${ep.serie_title}</p>
          <p><strong>Temporada:</strong> ${ep.season_number} | <strong>Episódio:</strong> ${ep.episode_number}</p>
          <p><strong>Sinopse:</strong> ${ep.synopsis}</p>
        </div>
      `;

      const delBtn = makeBtn("Confirmar Exclusão");
      delBtn.classList.add("primary");
      delBtn.addEventListener("click", async () => {
        if (!confirm("Tem certeza que deseja excluir este episódio permanentemente?")) return;
        delBtn.disabled = true;
        try {
          const res = await fetch(`${API_BASE}/catalog/episodes/${id}`, { method: "DELETE" });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || res.statusText);
          alert(json.message || "Episódio excluído.");
          location.reload();
        } catch (err) {
          alert(`Erro: ${err.message}`);
          delBtn.disabled = false;
        }
      });
      infoWrapper.appendChild(delBtn);
    };
  } else if (type === "cast") {
    const castTypeContainer = document.createElement("div");
    const label = document.createElement("label");
    label.textContent = "Tipo de Elenco:";
    castTypeContainer.appendChild(label);

    const castTypeSelect = document.createElement("select");
    castTypeSelect.innerHTML = `
      <option value="">-- Escolha um tipo --</option>
      <option value="director">Diretor</option>
      <option value="actor">Ator</option>
    `;
    castTypeContainer.appendChild(castTypeSelect);

    const deleteWrapper = document.createElement("div");
    deleteWrapper.style.marginTop = "20px";
    castTypeContainer.appendChild(deleteWrapper);

    castTypeSelect.onchange = async () => {
      deleteWrapper.innerHTML = '<div class="empty">Carregando listagem...</div>';
      const val = castTypeSelect.value;
      if (!val) {
        deleteWrapper.innerHTML = "";
        return;
      }

      let people = [];
      const endpoint = val === "director" ? "directors" : "actors";
      const res = await fetch(`${API_BASE}/people/${endpoint}`);
      const json = await safeJson(res);
      people = json.data || [];

      deleteWrapper.innerHTML = "";
      const selectPerson = document.createElement("select");
      selectPerson.innerHTML = `<option value="">-- Selecione o ${val === "director" ? "Diretor" : "Ator"} --</option>`;
      people.forEach(p => {
        const idVal = val === "director" ? p.director_id : p.actor_id;
        const opt = document.createElement("option");
        opt.value = idVal;
        opt.textContent = `${p.first_name} ${p.last_name} (${p.nationality})`;
        selectPerson.appendChild(opt);
      });
      deleteWrapper.appendChild(selectPerson);

      const infoWrapper = document.createElement("div");
      infoWrapper.style.marginTop = "20px";
      deleteWrapper.appendChild(infoWrapper);

      selectPerson.onchange = () => {
        infoWrapper.innerHTML = "";
        const id = selectPerson.value;
        if (!id) return;

        const person = people.find(p => String(val === "director" ? p.director_id : p.actor_id) === String(id));
        if (!person) return;

        infoWrapper.innerHTML = `
          <div style="background:rgba(229,9,20,0.05); padding:20px; border-radius:8px; border:1px solid var(--accent); margin-bottom:20px;">
            <h4 style="color:var(--accent); margin:0 0 10px 0;">Confirmação de Exclusão</h4>
            <p><strong>Nome:</strong> ${person.first_name} ${person.last_name}</p>
            <p><strong>Nacionalidade:</strong> ${person.nationality}</p>
            <p><strong>Nascimento:</strong> ${person.birth ? person.birth.split("T")[0] : "n/a"}</p>
          </div>
        `;

        const delBtn = makeBtn("Confirmar Exclusão");
        delBtn.classList.add("primary");
        delBtn.addEventListener("click", async () => {
          if (!confirm(`Tem certeza que deseja excluir este ${val === "director" ? "diretor" : "ator"}?`)) return;
          delBtn.disabled = true;
          try {
            const res = await fetch(`${API_BASE}/people/${endpoint}/${id}`, { method: "DELETE" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || res.statusText);
            alert(json.message || "Excluído com sucesso.");
            location.reload();
          } catch (err) {
            alert(`Erro: ${err.message}`);
            delBtn.disabled = false;
          }
        });
        infoWrapper.appendChild(delBtn);
      };
    };

    parent.appendChild(castTypeContainer);
  }
}

function buildQuery(type) {
  const value = searchInput.value.trim();
  if (!value) return "";
  const param = type === "seasons" ? "serie_title" : "title";
  return `?${param}=${encodeURIComponent(value)}`;
}

function requireLoginContent(renderContent) {
  if (!currentUser) {
    return renderNotLoggedIn();
  }
  return renderContent();
}

function renderNotLoggedIn() {
  const container = document.createElement("div");
  container.className = "form";
  const titleEl = document.createElement("h3");
  titleEl.textContent = "Acesso restrito";
  container.appendChild(titleEl);
  const message = document.createElement("p");
  message.textContent = "Você precisa estar logado para executar esta ação.";
  container.appendChild(message);
  const loginBtn = makeBtn("Entrar");
  loginBtn.addEventListener("click", () => {
    location.hash = "#actions/login";
  });
  container.appendChild(loginBtn);
  return container;
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
    const imagePath = item.thumb_path || (item.media_path && !item.media_path.endsWith('.m3u8') ? item.media_path : null);
    if (imagePath)
      thumb.style.backgroundImage = `url(${API_ORIGIN}/${imagePath})`;
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
      if (type === "movies" || type === "episodes") {
        const watchBtn = makeBtn("Assistir");
        watchBtn.classList.add("primary");
        watchBtn.onclick = (event) => {
          event.stopPropagation();
          location.hash = `#watch?type=${type}&id=${getItemId(item, type)}`;
        };
        controls.appendChild(watchBtn);
      } else if (type === "series") {
        const watchBtn = makeBtn("Ver Episódios");
        watchBtn.classList.add("primary");
        watchBtn.onclick = (event) => {
          event.stopPropagation();
          location.hash = `#series/view?id=${getItemId(item, type)}`;
        };
        controls.appendChild(watchBtn);
      }
      const editBtn = makeBtn("Editar");
      editBtn.onclick = () => {
        location.hash = `#actions/edit-${type}?id=${getItemId(item, type)}`;
      };
      const deleteBtn = makeBtn("Excluir");
      deleteBtn.onclick = () => {
        location.hash = `#actions/delete-${type}?id=${getItemId(item, type)}`;
      };
      controls.appendChild(editBtn);
      controls.appendChild(deleteBtn);
    }

    if (type === "movies" || type === "series") {
      const itemId = getItemId(item, type);
      const isFav = isItemFavorited(itemId, type);
      const favoriteBtn = makeBtn(isFav ? "★ Favoritado" : "☆ Favoritar");
      if (isFav) {
        favoriteBtn.classList.add("favorited");
      }
      favoriteBtn.onclick = async (event) => {
        event.stopPropagation();
        if (!currentUser) {
          location.hash = "#actions/login";
          return;
        }
        favoriteBtn.disabled = true;
        try {
          const result = await addFavoriteToItem(item, type);
          await syncFavorites();
          const nowFav = isItemFavorited(itemId, type);
          favoriteBtn.textContent = nowFav ? "★ Favoritado" : "☆ Favoritar";
          if (nowFav) {
            favoriteBtn.classList.add("favorited");
          } else {
            favoriteBtn.classList.remove("favorited");
          }
          alert(result.message);
        } catch (error) {
          alert(error.message || "Erro ao atualizar favoritos.");
        } finally {
          favoriteBtn.disabled = false;
        }
      };
      controls.appendChild(favoriteBtn);
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
    currentUser ? { label: "Logout", hash: "#actions/logout" } : { label: "Login", hash: "#actions/login" },
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
      if (action.hash === "#actions/logout") {
        clearSession();
        router();
        return;
      }
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
    } else if (field.type === "checkbox-group") {
      const container = document.createElement("div");
      container.style.display = "flex";
      container.style.flexWrap = "wrap";
      container.style.gap = "10px";
      container.style.margin = "10px 0";

      (field.options || []).forEach((option) => {
        const wrap = document.createElement("label");
        wrap.style.display = "inline-flex";
        wrap.style.alignItems = "center";
        wrap.style.gap = "6px";
        wrap.style.cursor = "pointer";
        wrap.style.fontWeight = "normal";
        wrap.style.background = "rgba(255, 255, 255, 0.05)";
        wrap.style.padding = "6px 12px";
        wrap.style.borderRadius = "4px";
        wrap.style.border = "1px solid rgba(255, 255, 255, 0.1)";

        const chk = document.createElement("input");
        chk.type = "checkbox";
        chk.value = option.value;
        wrap.appendChild(chk);
        wrap.appendChild(document.createTextNode(option.label));
        container.appendChild(wrap);
      });

      Object.defineProperty(container, "value", {
        get: () => {
          return Array.from(container.querySelectorAll("input[type=checkbox]:checked")).map(chk => chk.value);
        },
        set: (val) => {
          const vals = val ? (Array.isArray(val) ? val.map(String) : String(val).split(",").map(v => v.trim())) : [];
          container.querySelectorAll("input[type=checkbox]").forEach(chk => {
            chk.checked = vals.includes(String(chk.value));
          });
        },
        configurable: true
      });

      input = container;
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
      const message = await onSubmit(inputs, feedback);
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

async function uploadFileInChunks(file, type, progressCallback) {
  const chunkSize = 10 * 1024 * 1024; // 10MB pedaços
  const totalChunks = Math.ceil(file.size / chunkSize);
  const uploadId = "up_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunkBlob = file.slice(start, end);

    const formData = new FormData();
    formData.append("uploadId", uploadId);
    formData.append("chunkIndex", i);
    formData.append("totalChunks", totalChunks);
    formData.append("filename", file.name);
    formData.append("type", type);
    formData.append("media", chunkBlob, file.name);

    let attempt = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempt < maxAttempts && !success) {
      try {
        const res = await fetch(`${API_BASE}/catalog/upload-chunk`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Erro HTTP ${res.status}`);
        }

        const data = await res.json();
        success = true;

        if (i === totalChunks - 1 && data.status === "completed") {
          if (data.extracted_thumb_path) {
            sessionStorage.setItem("last_extracted_thumb", data.extracted_thumb_path);
          } else {
            sessionStorage.removeItem("last_extracted_thumb");
          }
          return data.media_path;
        }
      } catch (err) {
        attempt++;
        console.error(`Tentativa ${attempt} falhou para a fatia ${i}:`, err);
        if (attempt >= maxAttempts) {
          throw new Error(`Falha ao enviar a fatia ${i} após ${maxAttempts} tentativas. Detalhe: ${err.message}`);
        }
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (progressCallback) {
      const percentage = Math.round(((i + 1) / totalChunks) * 100);
      progressCallback(percentage);
    }
  }
}

function addFavoriteToItem(item, type) {
  const body = { user_id: currentUser.user_id };
  if (type === "movies") {
    body.movie_id = getItemId(item, type);
  } else if (type === "episodes") {
    body.episode_id = getItemId(item, type);
  } else if (type === "series") {
    body.serie_id = getItemId(item, type);
  }
  return fetch(`${API_BASE}/favorites`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
    .then(({ ok, json }) => {
      if (!ok) throw new Error(json.error || res.statusText || "Erro ao favoritar.");
      return json;
    });
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(USER_STORAGE_KEY)) || null;
  } catch {
    return null;
  }
}

async function saveSession(user) {
  currentUser = user;
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  updateUserStatus();
  await syncFavorites();
}

function clearSession() {
  currentUser = null;
  userFavorites = [];
  localStorage.removeItem(USER_STORAGE_KEY);
  updateUserStatus();
}

function updateUserStatus() {
  const statusEl = document.getElementById("user-status");
  if (!statusEl) return;
  if (currentUser) {
    statusEl.innerHTML = `
      <span>Logado como ${escapeHtml(currentUser.name || currentUser.email || "Usuário")} (#${currentUser.user_id})</span>
      <button type="button" id="logout-btn">Sair</button>
    `;
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        clearSession();
        location.hash = "#actions/login";
      });
    }
  } else {
    statusEl.innerHTML = `
      <span>Não autenticado</span>
      <button type="button" id="login-status-btn">Entrar</button>
    `;
    const loginBtn = document.getElementById("login-status-btn");
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        location.hash = "#actions/login";
      });
    }
  }
}

async function showAddMoviePage() {
  renderSection("Adicionar Filme", () =>
    requireLoginContent(() =>
      renderForm(
        "Cadastrar novo filme",
        [
          { id: "title", label: "Título", placeholder: "Nome do filme" },
          { id: "release_year", label: "Ano de lançamento", type: "number" },
          { id: "duration", label: "Duração (min)", type: "number" },
          {
            id: "content_rating",
            type: "select",
            label: "Classificação Indicativa",
            options: [
              { value: 1, label: "Livre para todos os públicos." },
              { value: 2, label: "Não recomendado para menores de 10 anos." },
              { value: 3, label: "Não recomendado para menores de 12 anos." },
              { value: 4, label: "Não recomendado para menores de 14 anos." },
              { value: 5, label: "Não recomendado para menores de 16 anos." },
              { value: 6, label: "Não recomendado para menores de 18 anos." }
            ]
          },
          {
            id: "directors",
            label: "IDs de diretores (vírgula)",
            placeholder: "1,2",
          },
          {
            id: "actors",
            label: "IDs de atores (vírgula)",
            placeholder: "1,2",
          },
          {
            id: "synopsis",
            label: "Sinopse",
            type: "textarea"
          },
          {
            id: "media",
            label: "Arquivo de mídia",
            type: "file",
            accept: "video/*",
          },
        ],
        "Enviar filme",
        async (inputs, feedback) => {
          const title = inputs.title.value.trim();
          const release_year = inputs.release_year.value.trim();
          const duration = inputs.duration.value.trim();
          const content_rating_id = inputs.content_rating ? inputs.content_rating.value : "1";
          const directors = inputs.directors.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          const actors = inputs.actors.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          const synopsis = inputs.synopsis.value.trim()
          const media = inputs.media.files[0];

          if (
            !title ||
            !release_year ||
            !duration ||
            directors.length === 0 ||
            !media ||
            !synopsis
          ) {
            throw new Error(
              "Preencha todos os campos obrigatórios e envie mídia.",
            );
          }

          feedback.textContent = "Iniciando upload fatiado...";
          const media_path = await uploadFileInChunks(media, "movies", (percentage) => {
            if (percentage === 100) {
              feedback.textContent = "Processando compressão HEVC (H.265)... Isso pode levar alguns segundos...";
            } else {
              feedback.textContent = `Enviando vídeo em fatias (${percentage}%)...`;
            }
          });

          feedback.textContent = "Salvando informações do filme...";
          const res = await fetch(`${API_BASE}/catalog/movies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title,
              release_year,
              duration,
              content_rating_id,
              directors_id: directors,
              actors_id: actors,
              synopsis,
              media_path,
            }),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || res.statusText);
          return json.message || "Filme cadastrado.";
        }),
    )
  );
}

async function showAddSeriePage() {
  renderSection("Adicionar Série", () =>
    requireLoginContent(() =>
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
    ));
}

async function showAddEpisodePage() {
  renderSection("Adicionar Episódio", () =>
    requireLoginContent(() => {
      const form = document.createElement("div");
      form.className = "form";

      const titleEl = document.createElement("h3");
      titleEl.textContent = "Cadastrar novo episódio";
      form.appendChild(titleEl);

      const createLabel = (text) => {
        const lbl = document.createElement("label");
        lbl.textContent = text;
        return lbl;
      };

      // 1. ID da série
      form.appendChild(createLabel("ID da série existente (opcional)"));
      const serieIdInput = document.createElement("input");
      serieIdInput.type = "number";
      serieIdInput.id = "ep-serie-id";
      serieIdInput.placeholder = "Deixe vazio para cadastrar uma nova série junto";
      form.appendChild(serieIdInput);

      // Container de campos da nova série (exibido apenas se ID estiver vazio)
      const seriesFieldsContainer = document.createElement("div");
      seriesFieldsContainer.id = "series-fields-container";
      seriesFieldsContainer.style.marginTop = "15px";
      seriesFieldsContainer.style.padding = "15px";
      seriesFieldsContainer.style.border = "1px dashed var(--accent)";
      seriesFieldsContainer.style.borderRadius = "6px";
      seriesFieldsContainer.style.background = "rgba(229, 9, 20, 0.05)";

      const seriesSecTitle = document.createElement("h4");
      seriesSecTitle.textContent = "Dados da Nova Série";
      seriesSecTitle.style.margin = "0 0 10px 0";
      seriesSecTitle.style.color = "var(--accent)";
      seriesFieldsContainer.appendChild(seriesSecTitle);

      seriesFieldsContainer.appendChild(createLabel("Título da Série"));
      const serieTitleInput = document.createElement("input");
      serieTitleInput.type = "text";
      serieTitleInput.id = "ep-serie-title";
      serieTitleInput.placeholder = "Nome da nova série";
      seriesFieldsContainer.appendChild(serieTitleInput);

      seriesFieldsContainer.appendChild(createLabel("Sinopse da Série"));
      const serieSynopsisInput = document.createElement("textarea");
      serieSynopsisInput.id = "ep-serie-synopsis";
      serieSynopsisInput.placeholder = "Sinopse da nova série";
      seriesFieldsContainer.appendChild(serieSynopsisInput);

      form.appendChild(seriesFieldsContainer);

      // Função para ocultar/exibir os campos da série
      const toggleSeriesFields = () => {
        const hasSerieId = serieIdInput.value.trim() !== "";
        if (hasSerieId) {
          seriesFieldsContainer.style.display = "none";
        } else {
          seriesFieldsContainer.style.display = "block";
        }
      };
      serieIdInput.addEventListener("input", toggleSeriesFields);
      // Roda a verificação inicial
      toggleSeriesFields();

      // 3. Número da temporada
      form.appendChild(createLabel("Número da temporada"));
      const seasonNumberInput = document.createElement("input");
      seasonNumberInput.type = "number";
      seasonNumberInput.id = "ep-season-number";
      seasonNumberInput.placeholder = "Ex: 1";
      form.appendChild(seasonNumberInput);

      // 4. Título do episódio
      form.appendChild(createLabel("Título do episódio"));
      const episodeTitleInput = document.createElement("input");
      episodeTitleInput.type = "text";
      episodeTitleInput.id = "ep-title";
      episodeTitleInput.placeholder = "Nome do episódio";
      form.appendChild(episodeTitleInput);

      // 5. Sinopse do episódio
      form.appendChild(createLabel("Sinopse do episódio"));
      const episodeSynopsisInput = document.createElement("textarea");
      episodeSynopsisInput.id = "ep-synopsis";
      episodeSynopsisInput.placeholder = "O que acontece neste episódio";
      form.appendChild(episodeSynopsisInput);

      // 6. Ano de lançamento
      form.appendChild(createLabel("Ano de lançamento"));
      const releaseYearInput = document.createElement("input");
      releaseYearInput.type = "number";
      releaseYearInput.id = "ep-release-year";
      releaseYearInput.placeholder = "Ex: 2024";
      form.appendChild(releaseYearInput);

      // 7. Duração
      form.appendChild(createLabel("Duração (min)"));
      const durationInput = document.createElement("input");
      durationInput.type = "number";
      durationInput.id = "ep-duration";
      durationInput.placeholder = "Ex: 45";
      durationInput.value = "45";
      form.appendChild(durationInput);

      // 8. Classificação Indicativa
      form.appendChild(createLabel("Classificação Indicativa"));
      const contentRatingSelect = document.createElement("select");
      contentRatingSelect.id = "ep-content-rating";
      const ratingOptions = [
        { value: 1, label: "Livre para todos os públicos." },
        { value: 2, label: "Não recomendado para menores de 10 anos." },
        { value: 3, label: "Não recomendado para menores de 12 anos." },
        { value: 4, label: "Não recomendado para menores de 14 anos." },
        { value: 5, label: "Não recomendado para menores de 16 anos." },
        { value: 6, label: "Não recomendado para menores de 18 anos." }
      ];
      ratingOptions.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        contentRatingSelect.appendChild(option);
      });
      form.appendChild(contentRatingSelect);

      // 9. Diretores
      form.appendChild(createLabel("IDs de diretores (vírgula)"));
      const directorsInput = document.createElement("input");
      directorsInput.type = "text";
      directorsInput.id = "ep-directors";
      directorsInput.placeholder = "Ex: 1,2";
      form.appendChild(directorsInput);

      // 9.5 Atores
      form.appendChild(createLabel("IDs de atores (vírgula)"));
      const actorsInput = document.createElement("input");
      actorsInput.type = "text";
      actorsInput.id = "ep-actors";
      actorsInput.placeholder = "Ex: 1,2";
      form.appendChild(actorsInput);

      // 10. Arquivo de mídia
      form.appendChild(createLabel("Arquivo de mídia"));
      const mediaInput = document.createElement("input");
      mediaInput.type = "file";
      mediaInput.id = "ep-media";
      mediaInput.accept = "video/*";
      form.appendChild(mediaInput);

      const actions = document.createElement("div");
      actions.className = "actions";
      const submit = document.createElement("button");
      submit.className = "btn primary";
      submit.type = "button";
      submit.textContent = "Enviar episódio";
      actions.appendChild(submit);
      form.appendChild(actions);

      const feedback = document.createElement("div");
      feedback.className = "form-feedback";
      form.appendChild(feedback);

      submit.addEventListener("click", async () => {
        submit.disabled = true;
        feedback.textContent = "Enviando...";

        try {
          const serieId = serieIdInput.value.trim();
          const season_number = seasonNumberInput.value.trim();
          const episode_title = episodeTitleInput.value.trim();
          const episode_synopsis = episodeSynopsisInput.value.trim();
          const release_year = releaseYearInput.value.trim();
          const duration = durationInput.value.trim();
          const content_rating_id = contentRatingSelect.value;
          const directors = directorsInput.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          const actors = actorsInput.value
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
          const media = mediaInput.files[0];

          if (!season_number || !episode_title || !episode_synopsis || !release_year || !duration || directors.length === 0 || !media) {
            throw new Error("Preencha todos os campos obrigatórios do episódio e envie o vídeo.");
          }

          let serie_title = null;
          let serie_synopsis = null;

          if (!serieId) {
            serie_title = serieTitleInput.value.trim();
            serie_synopsis = serieSynopsisInput.value.trim();
            if (!serie_title || !serie_synopsis) {
              throw new Error("Para cadastrar uma nova série, preencha o título e sinopse da série.");
            }
          }

          feedback.textContent = "Iniciando upload fatiado...";
          const media_path = await uploadFileInChunks(media, "episodes", (percentage) => {
            if (percentage === 100) {
              feedback.textContent = "Processando compressão HEVC (H.265)... Isso pode levar alguns segundos...";
            } else {
              feedback.textContent = `Enviando vídeo em fatias (${percentage}%)...`;
            }
          });

          feedback.textContent = "Salvando informações do episódio...";
          const payload = {
            release_year,
            content_rating_id,
            season_number,
            episode_title,
            episode_synopsis,
            duration,
            directors_id: directors,
            actors_id: actors,
            media_path,
          };

          if (serieId) {
            payload.serie_id = serieId;
          } else {
            payload.serie_title = serie_title;
            payload.serie_synopsis = serie_synopsis;
          }

          const res = await fetch(`${API_BASE}/catalog/episodes`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || res.statusText);
          feedback.textContent = json.message || "Episódio cadastrado.";
        } catch (error) {
          feedback.textContent = `Erro: ${escapeHtml(error.message)}`;
        } finally {
          submit.disabled = false;
        }
      });

      return form;
    })
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
/*
async function showAddFavoritePage() {
  renderSection("Adicionar Favorito", () =>
    requireLoginContent(() =>
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
    requireLoginContent(() =>
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
*/
function renderAuthPage(contentNode) {
  app.innerHTML = "";

  // Background overlay with film collage layout
  const overlay = document.createElement("div");
  overlay.className = "auth-bg-overlay";
  app.appendChild(overlay);

  // Centered auth container
  const container = document.createElement("div");
  container.className = "auth-container";
  container.appendChild(contentNode);

  app.appendChild(container);
}

async function showRegisterUserPage() {
  const card = document.createElement("div");
  card.className = "auth-card";

  const h1 = document.createElement("h1");
  h1.textContent = "Criar Conta";
  card.appendChild(h1);

  const errorAlert = document.createElement("div");
  errorAlert.className = "auth-error-msg hidden";
  card.appendChild(errorAlert);

  const form = document.createElement("form");
  form.onsubmit = (e) => e.preventDefault();

  // Name
  const nameGroup = document.createElement("div");
  nameGroup.className = "auth-form-group";
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.id = "reg-name";
  nameInput.className = "auth-input";
  nameInput.placeholder = " ";
  nameInput.required = true;
  const nameLabel = document.createElement("label");
  nameLabel.htmlFor = "reg-name";
  nameLabel.textContent = "Nome Completo";
  nameGroup.appendChild(nameInput);
  nameGroup.appendChild(nameLabel);
  form.appendChild(nameGroup);

  // Email
  const emailGroup = document.createElement("div");
  emailGroup.className = "auth-form-group";
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.id = "reg-email";
  emailInput.className = "auth-input";
  emailInput.placeholder = " ";
  emailInput.required = true;
  const emailLabel = document.createElement("label");
  emailLabel.htmlFor = "reg-email";
  emailLabel.textContent = "Email";
  emailGroup.appendChild(emailInput);
  emailGroup.appendChild(emailLabel);
  form.appendChild(emailGroup);

  // Password
  const passGroup = document.createElement("div");
  passGroup.className = "auth-form-group";
  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.id = "reg-password";
  passInput.className = "auth-input";
  passInput.placeholder = " ";
  passInput.required = true;
  const passLabel = document.createElement("label");
  passLabel.htmlFor = "reg-password";
  passLabel.textContent = "Senha";
  passGroup.appendChild(passInput);
  passGroup.appendChild(passLabel);
  form.appendChild(passGroup);

  // Collapsible toggle for advanced device settings
  const advToggle = document.createElement("button");
  advToggle.type = "button";
  advToggle.className = "auth-advanced-toggle";
  advToggle.innerHTML = `Configurações de Dispositivo <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;
  form.appendChild(advToggle);

  const advFields = document.createElement("div");
  advFields.className = "auth-advanced-fields";

  const dados = obterDadosDispositivo();

  // Pre-generate unique device details
  const generatedToken = "tok_" + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
  let userDeviceName = "Navegador Web";
  if (navigator.userAgent.includes("Windows")) userDeviceName = "PC Windows";
  else if (navigator.userAgent.includes("Mac")) userDeviceName = "Macbook OS X";
  else if (navigator.userAgent.includes("Android")) userDeviceName = "Smartphone Android";
  else if (navigator.userAgent.includes("iPhone")) userDeviceName = "iPhone Apple";
  /*
    // Device Token input
    const tokenGroup = document.createElement("div");
    tokenGroup.className = "auth-form-group";
    const tokenInput = document.createElement("input");
    tokenInput.type = "text";
    tokenInput.id = "reg-device-token";
    tokenInput.className = "auth-input";
    tokenInput.placeholder = " ";
    tokenInput.value = generatedToken;
    tokenInput.required = true;
    const tokenLabel = document.createElement("label");
    tokenLabel.htmlFor = "reg-device-token";
    tokenLabel.textContent = "Token do Dispositivo";
    tokenGroup.appendChild(tokenInput);
    tokenGroup.appendChild(tokenLabel);
    advFields.appendChild(tokenGroup);
  
    // Device Type input
    const typeGroup = document.createElement("div");
    typeGroup.className = "auth-form-group";
    const typeInput = document.createElement("input");
    typeInput.type = "text";
    typeInput.id = "reg-device-type";
    typeInput.className = "auth-input";
    typeInput.placeholder = " ";
    typeInput.value = "browser";
    typeInput.required = true;
    const typeLabel = document.createElement("label");
    typeLabel.htmlFor = "reg-device-type";
    typeLabel.textContent = "Tipo de Dispositivo";
    typeGroup.appendChild(typeInput);
    typeGroup.appendChild(typeLabel);
    advFields.appendChild(typeGroup);
  
    // Device Name input
    const devNameGroup = document.createElement("div");
    devNameGroup.className = "auth-form-group";
    const devNameInput = document.createElement("input");
    devNameInput.type = "text";
    devNameInput.id = "reg-device-name";
    devNameInput.className = "auth-input";
    devNameInput.placeholder = " ";
    devNameInput.value = userDeviceName;
    devNameInput.required = true;
    const devNameLabel = document.createElement("label");
    devNameLabel.htmlFor = "reg-device-name";
    devNameLabel.textContent = "Nome do Dispositivo";
    devNameGroup.appendChild(devNameInput);
    devNameGroup.appendChild(devNameLabel);
    advFields.appendChild(devNameGroup);*/

  form.appendChild(advFields);

  // Toggle toggle open click logic
  advToggle.addEventListener("click", () => {
    advToggle.classList.toggle("open");
    advFields.classList.toggle("open");
  });

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "auth-btn";
  submitBtn.textContent = "Registrar-se";
  form.appendChild(submitBtn);

  card.appendChild(form);

  const switchDiv = document.createElement("div");
  switchDiv.className = "auth-switch";
  switchDiv.innerHTML = `Já tem uma conta LuFlix? <a href="#actions/login">Entrar agora</a>.`;
  card.appendChild(switchDiv);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    errorAlert.classList.add("hidden");
    errorAlert.textContent = "";

    const body = {
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      password: passInput.value.trim(),
      device_token: generatedToken,
      device_type: dados.tipo,
      device_name: dados.nome
    };

    try {
      const res = await fetch(`${API_BASE}/users/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao registrar.");

      saveSession({
        user_id: json.user_id,
        name: body.name,
        email: body.email,
        device_token: body.device_token,
        device_type: body.device_type,
        device_name: body.device_name,
      });

      location.hash = "#movies";
    } catch (err) {
      errorAlert.textContent = err.message;
      errorAlert.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
    }
  });

  renderAuthPage(card);
}

async function showLoginPage() {
  const card = document.createElement("div");
  card.className = "auth-card";

  const h1 = document.createElement("h1");
  h1.textContent = "Entrar";
  card.appendChild(h1);

  const errorAlert = document.createElement("div");
  errorAlert.className = "auth-error-msg hidden";
  card.appendChild(errorAlert);

  const form = document.createElement("form");
  form.onsubmit = (e) => e.preventDefault();

  // Email
  const emailGroup = document.createElement("div");
  emailGroup.className = "auth-form-group";
  const emailInput = document.createElement("input");
  emailInput.type = "email";
  emailInput.id = "auth-email";
  emailInput.className = "auth-input";
  emailInput.placeholder = " ";
  emailInput.required = true;
  const emailLabel = document.createElement("label");
  emailLabel.htmlFor = "auth-email";
  emailLabel.textContent = "Email";
  emailGroup.appendChild(emailInput);
  emailGroup.appendChild(emailLabel);
  form.appendChild(emailGroup);

  // Password
  const passGroup = document.createElement("div");
  passGroup.className = "auth-form-group";
  const passInput = document.createElement("input");
  passInput.type = "password";
  passInput.id = "auth-password";
  passInput.className = "auth-input";
  passInput.placeholder = " ";
  passInput.required = true;
  const passLabel = document.createElement("label");
  passLabel.htmlFor = "auth-password";
  passLabel.textContent = "Senha";
  passGroup.appendChild(passInput);
  passGroup.appendChild(passLabel);
  form.appendChild(passGroup);

  const submitBtn = document.createElement("button");
  submitBtn.type = "submit";
  submitBtn.className = "auth-btn";
  submitBtn.textContent = "Entrar";
  form.appendChild(submitBtn);

  card.appendChild(form);

  const switchDiv = document.createElement("div");
  switchDiv.className = "auth-switch";
  switchDiv.innerHTML = `Novo por aqui? <a href="#actions/register-user">Assine agora</a>.`;
  card.appendChild(switchDiv);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    submitBtn.disabled = true;
    errorAlert.classList.add("hidden");
    errorAlert.textContent = "";

    const email = emailInput.value.trim();
    const password = passInput.value.trim();

    try {
      const res = await fetch(`${API_BASE}/users/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Email ou senha incorretos.");

      saveSession({
        user_id: json.user_id,
        name: json.name || email,
        email: email,
      });

      location.hash = "#movies";
    } catch (err) {
      errorAlert.textContent = err.message;
      errorAlert.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
    }
  });

  renderAuthPage(card);
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
  if (!currentUser) {
    renderSection("Editar Filme", renderNotLoggedIn);
    return;
  }
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
        { id: "directors", label: "IDs de diretores (vírgula)", placeholder: "Ex: 1,2" },
        { id: "actors", label: "IDs de atores (vírgula)", placeholder: "Ex: 1,2" },
        { id: "synopsis", label: "Sinopse", type: "textarea" },
        {
          id: "media",
          label: "Mídia (opcional)",
          type: "file",
          accept: "video/*",
        },
      ],
      "Salvar alterações",
      async (inputs, feedback) => {
        const movieId = inputs.movie_id.value;
        if (!movieId) throw new Error("Selecione um filme.");

        const payload = {};
        if (inputs.title.value) payload.title = inputs.title.value.trim();
        if (inputs.release_year.value) payload.release_year = inputs.release_year.value;
        if (inputs.duration.value) payload.duration = inputs.duration.value;
        if (inputs.directors.value) {
          payload.directors_id = inputs.directors.value.split(",").map(v => v.trim()).filter(Boolean);
        }
        if (inputs.actors.value) {
          payload.actors_id = inputs.actors.value.split(",").map(v => v.trim()).filter(Boolean);
        }
        if (inputs.synopsis.value) payload.synopsis = inputs.synopsis.value.trim();

        if (inputs.media.files[0]) {
          feedback.textContent = "Iniciando upload fatiado...";
          payload.media_path = await uploadFileInChunks(inputs.media.files[0], "movies", (percentage) => {
            if (percentage === 100) {
              feedback.textContent = "Processando compressão HEVC (H.265)... Isso pode levar alguns segundos...";
            } else {
              feedback.textContent = `Enviando vídeo em fatias (${percentage}%)...`;
            }
          });
        }

        if (Object.keys(payload).length === 0) {
          throw new Error("Informe pelo menos um campo para atualizar.");
        }

        feedback.textContent = "Salvando alterações do filme...";
        const res = await fetch(`${API_BASE}/catalog/movies/${movieId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Filme atualizado.";
      },
    ),
  );
}

async function showDeleteMoviePage(params) {
  if (!currentUser) {
    renderSection("Excluir Filme", renderNotLoggedIn);
    return;
  }
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
  if (!currentUser) {
    renderSection("Editar Série", renderNotLoggedIn);
    return;
  }
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
  if (!currentUser) {
    renderSection("Excluir Série", renderNotLoggedIn);
    return;
  }
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
  if (!currentUser) {
    renderSection("Editar Episódio", renderNotLoggedIn);
    return;
  }
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
        { id: "directors", label: "IDs de diretores (vírgula)", placeholder: "Ex: 1,2" },
        { id: "actors", label: "IDs de atores (vírgula)", placeholder: "Ex: 1,2" },
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
      async (inputs, feedback) => {
        const episodeId = inputs.episode_id.value;
        if (!episodeId) throw new Error("Informe o ID do episódio.");

        const payload = {};
        if (inputs.episode_title.value) payload.title = inputs.episode_title.value.trim();
        if (inputs.episode_number.value) payload.episode_number = inputs.episode_number.value;
        if (inputs.duration.value) payload.duration = inputs.duration.value;
        if (inputs.directors.value) {
          payload.directors_id = inputs.directors.value.split(",").map(v => v.trim()).filter(Boolean);
        }
        if (inputs.actors.value) {
          payload.actors_id = inputs.actors.value.split(",").map(v => v.trim()).filter(Boolean);
        }
        if (inputs.synopsis.value) payload.synopsis = inputs.synopsis.value.trim();
        if (inputs.rating.value) payload.rating = inputs.rating.value;

        if (inputs.media.files[0]) {
          feedback.textContent = "Iniciando upload fatiado...";
          payload.media_path = await uploadFileInChunks(inputs.media.files[0], "episodes", (percentage) => {
            if (percentage === 100) {
              feedback.textContent = "Processando compressão HEVC (H.265)... Isso pode levar alguns segundos...";
            } else {
              feedback.textContent = `Enviando vídeo em fatias (${percentage}%)...`;
            }
          });
        }

        if (Object.keys(payload).length === 0) {
          throw new Error("Informe pelo menos um campo para atualizar.");
        }

        feedback.textContent = "Salvando alterações do episódio...";
        const res = await fetch(`${API_BASE}/catalog/episodes/${episodeId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || res.statusText);
        return json.message || "Episódio atualizado.";
      },
    ),
  );
}

async function showDeleteEpisodePage(params) {
  if (!currentUser) {
    renderSection("Excluir Episódio", renderNotLoggedIn);
    return;
  }
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
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.data)) return data.data;
  return [];
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

async function showWatchPage(params) {
  if (!currentUser) {
    renderSection("Assistir", renderNotLoggedIn);
    return;
  }

  const type = getQueryParam(params, "type"); // 'movies' or 'episodes'
  const id = getQueryParam(params, "id");

  if (!type || !id) {
    app.innerHTML = `<div class="empty">Parâmetros inválidos para reprodução.</div>`;
    return;
  }

  const lastSeriesId = sessionStorage.getItem("last_viewed_series_id");
  const backHash = type === "movies" ? "#movies" : (lastSeriesId ? `#series/view?id=${lastSeriesId}` : "#series");
  const backLabel = type === "movies" ? "Filmes" : "Série";

  renderSection("Carregando Player...", async () => {
    try {
      const res = await fetch(`${API_BASE}/views/${type}?id=${id}`);
      const data = await safeJson(res);
      const items = data.data || [];
      const item = items[0];

      if (!item) {
        return `<div class="empty">Item não encontrado.</div>`;
      }

      const title = getItemTitle(item, type);
      const mediaPath = item.media_path;

      const watchContainer = document.createElement("div");
      watchContainer.className = "watch-container";

      const backBtn = document.createElement("button");
      backBtn.className = "back-link";
      backBtn.innerHTML = `&larr; Voltar para ${backLabel}`;
      backBtn.onclick = () => {
        location.hash = backHash;
      };
      watchContainer.appendChild(backBtn);

      let start = getQueryParam(params, "start");
      const videoWrapper = document.createElement("div");
      videoWrapper.className = "video-wrapper";

      if (!mediaPath) {
        videoWrapper.innerHTML = `
          <div class="empty" style="height: 100%; display: flex; align-items: center; justify-content: center; text-align: center; flex-direction: column;">
            <p style="font-size: 1.2rem; font-weight: bold; margin-bottom: 10px;">Vídeo Indisponível</p>
            <p style="color: var(--muted); font-size: 0.95rem;">Este título não possui um arquivo de vídeo associado.</p>
          </div>
        `;
      } else {
        const video = document.createElement("video");
        video.id = "hls-video-player";
        video.className = "video-player";
        video.controls = true;
        video.autoplay = true;

        // Apply start time once metadata or play starts
        let hasSought = false;
        const applyStartTime = () => {
          if (start && !hasSought) {
            hasSought = true;
            video.currentTime = Number(start);
          }
        };

        video.addEventListener("loadedmetadata", applyStartTime);
        video.addEventListener("play", applyStartTime);

        // Progress tracking logic
        let lastSavedTime = 0;
        let saveIntervalId = null;

        const saveProgress = async () => {
          const currentTime = video.currentTime;
          if (Math.abs(currentTime - lastSavedTime) < 1 && currentTime !== video.duration && currentTime !== 0) {
            return;
          }

          const minutes = Math.floor(currentTime / 60);
          const seconds = Math.floor(currentTime % 60);

          try {
            await fetch(`${API_BASE}/history`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: currentUser.user_id,
                movie_id: type === "movies" ? Number(id) : null,
                episode_id: type === "episodes" ? Number(id) : null,
                watched_minutes: minutes,
                watched_seconds: seconds
              })
            });
            lastSavedTime = currentTime;
          } catch (err) {
            console.error("Erro ao salvar progresso de exibição:", err);
          }
        };

        let hasStarted = false;
        video.addEventListener("play", () => {
          if (!hasStarted) {
            hasStarted = true;
            saveProgress();
          }
          if (!saveIntervalId) {
            saveIntervalId = setInterval(saveProgress, 5000);
          }
        });

        video.addEventListener("pause", () => {
          if (saveIntervalId) {
            clearInterval(saveIntervalId);
            saveIntervalId = null;
          }
          saveProgress();
        });

        video.addEventListener("ended", () => {
          if (saveIntervalId) {
            clearInterval(saveIntervalId);
            saveIntervalId = null;
          }
          saveProgress();
        });

        playerCleanup = () => {
          if (saveIntervalId) {
            clearInterval(saveIntervalId);
            saveIntervalId = null;
          }
          saveProgress();
        };

        videoWrapper.appendChild(video);

        const videoSrc = `${API_ORIGIN}/${mediaPath}`;

        setTimeout(() => {
          const player = document.getElementById("hls-video-player");
          if (!player) return;

          if (Hls.isSupported()) {
            const hls = new Hls({
              xhrSetup: function (xhr, url) {
                // Toda vez que o player for buscar um pedaço do vídeo, ele injeta o bypass do Ngrok
                xhr.setRequestHeader('ngrok-skip-browser-warning', 'true');
              }
            });
            hls.loadSource(videoSrc);
            hls.attachMedia(player);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              player.play().catch(err => {
                console.log("Autoplay bloqueado pelo navegador, aguardando clique do usuário:", err.message);
              });
            });
            hls.on(Hls.Events.ERROR, function (event, data) {
              if (data.fatal) {
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.log("Erro fatal de rede HLS, tentando recuperar...");
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.log("Erro fatal de mídia HLS, tentando recuperar...");
                    hls.recoverMediaError();
                    break;
                  default:
                    console.log("Erro fatal HLS irrecuperável:", data);
                    break;
                }
              }
            });
          } else if (player.canPlayType("application/vnd.apple.mpegurl")) {
            player.src = videoSrc;
            player.addEventListener("loadedmetadata", () => {
              player.play().catch(err => {
                console.log("Autoplay bloqueado pelo navegador:", err.message);
              });
            });
          }
        }, 100);
      }

      watchContainer.appendChild(videoWrapper);

      const infoSection = document.createElement("div");
      infoSection.className = "watch-info";

      const titleEl = document.createElement("h2");
      titleEl.className = "watch-title";
      titleEl.textContent = title;
      infoSection.appendChild(titleEl);

      const metaRow = document.createElement("div");
      metaRow.className = "watch-meta";

      const yearSpan = document.createElement("span");
      yearSpan.textContent = type === "movies" ? (item.ano_lancamento || "") : (item.release_year || "");
      metaRow.appendChild(yearSpan);

      const ratingSpan = document.createElement("span");
      ratingSpan.textContent = `★ ${type === "movies" ? (item.nota || "0.0") : (item.rating || "0.0")}`;
      metaRow.appendChild(ratingSpan);

      const durationSpan = document.createElement("span");
      const durationVal = type === "movies" ? (item.duracao || "") : (item.duration || "");
      durationSpan.textContent = durationVal ? `${durationVal} min` : "";
      metaRow.appendChild(durationSpan);

      if (type === "episodes") {
        const episodeInfo = document.createElement("span");
        episodeInfo.style.color = "var(--accent)";
        episodeInfo.style.fontWeight = "bold";
        episodeInfo.textContent = `${item.serie_title || ""} - T${item.season_number}E${item.episode_number}`;
        metaRow.appendChild(episodeInfo);
      }

      infoSection.appendChild(metaRow);

      const synopsisEl = document.createElement("p");
      synopsisEl.className = "watch-synopsis";
      synopsisEl.textContent = type === "movies" ? (item.sinopse || "Sem sinopse disponível.") : (item.synopsis || "Sem sinopse disponível.");
      infoSection.appendChild(synopsisEl);

      watchContainer.appendChild(infoSection);

      // Seção de review do usuário
      const reviewSection = document.createElement("div");
      reviewSection.className = "review-section-container";

      const reviewBox = document.createElement("div");
      reviewBox.className = "review-box";
      reviewBox.style.marginTop = "0";

      const starsTitle = document.createElement("h3");
      starsTitle.style.margin = "0 0 12px 0";
      starsTitle.style.fontSize = "16px";
      starsTitle.style.color = "#fff";
      starsTitle.textContent = "Sua Avaliação:";
      reviewBox.appendChild(starsTitle);

      const starsContainer = document.createElement("div");
      starsContainer.className = "stars-container";

      let selectedRating = 0;
      const stars = [];
      for (let i = 1; i <= 5; i++) {
        const star = document.createElement("span");
        star.className = "star";
        star.innerHTML = "&#9734;"; // ☆
        star.dataset.value = i;

        star.addEventListener("mouseover", () => {
          highlightStars(i);
        });

        star.addEventListener("mouseout", () => {
          highlightStars(selectedRating);
        });

        star.addEventListener("click", () => {
          selectedRating = i;
          highlightStars(selectedRating);
        });

        starsContainer.appendChild(star);
        stars.push(star);
      }

      function highlightStars(count) {
        stars.forEach((s, idx) => {
          if (idx < count) {
            s.innerHTML = "&#9733;"; // ★
            s.classList.add("lit");
          } else {
            s.innerHTML = "&#9734;"; // ☆
            s.classList.remove("lit");
          }
        });
      }
      reviewBox.appendChild(starsContainer);

      const descLabel = document.createElement("label");
      descLabel.className = "review-label";
      descLabel.innerHTML = 'Descrição <span style="color: var(--muted); font-weight: normal; font-size: 13px;">(Opcional)</span>';
      reviewBox.appendChild(descLabel);

      const descTextarea = document.createElement("textarea");
      descTextarea.className = "review-textarea";
      descTextarea.placeholder = "Escreva sua avaliação (opcional)...";
      reviewBox.appendChild(descTextarea);

      const submitBtn = document.createElement("button");
      submitBtn.className = "btn primary";
      submitBtn.textContent = "Enviar Review";

      submitBtn.onclick = async () => {
        if (selectedRating === 0) {
          alert("Por favor, selecione uma nota de 1 a 5 estrelas.");
          return;
        }

        const body = {
          user_id: currentUser.user_id,
          rating: selectedRating,
          comment: descTextarea.value.trim() || null,
          movie_id: type === "movies" ? Number(id) : null,
          episode_id: type === "episodes" ? Number(id) : null,
        };

        submitBtn.disabled = true;
        try {
          const res = await fetch(`${API_BASE}/reviews`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error || res.statusText || "Erro ao salvar review.");
          }

          alert(json.message || "Review cadastrada com sucesso!");
          selectedRating = 0;
          highlightStars(0);
          descTextarea.value = "";
          loadReviews(1);
        } catch (error) {
          alert(error.message);
        } finally {
          submitBtn.disabled = false;
        }
      };

      reviewBox.appendChild(submitBtn);
      reviewSection.appendChild(reviewBox);

      // Seção de lista de reviews abaixo
      const reviewsListContainer = document.createElement("div");
      reviewsListContainer.className = "reviews-list-container";

      const reviewsTitle = document.createElement("h3");
      reviewsTitle.className = "reviews-list-title";
      reviewsTitle.textContent = "Avaliações dos Usuários";
      reviewsListContainer.appendChild(reviewsTitle);

      const reviewsGrid = document.createElement("div");
      reviewsGrid.className = "reviews-grid";
      reviewsListContainer.appendChild(reviewsGrid);

      const paginationContainer = document.createElement("div");
      paginationContainer.className = "reviews-pagination";
      reviewsListContainer.appendChild(paginationContainer);

      reviewSection.appendChild(reviewsListContainer);

      let currentPage = 1;
      const reviewsLimit = 10;

      async function loadReviews(page) {
        reviewsGrid.innerHTML = '<div class="empty">Carregando avaliações...</div>';
        paginationContainer.innerHTML = "";

        const queryParam = type === "movies" ? `movie_id=${id}` : `episode_id=${id}`;

        try {
          const res = await fetch(`${API_BASE}/reviews?${queryParam}&page=${page}&limit=${reviewsLimit}`);
          if (!res.ok) throw new Error("Erro ao buscar reviews.");

          const json = await res.json();
          const reviews = json.data || [];
          const total = json.total || 0;

          reviewsGrid.innerHTML = "";

          if (reviews.length === 0) {
            reviewsGrid.innerHTML = '<div class="empty" style="padding: 15px 0;">Este título ainda não possui avaliações.</div>';
            return;
          }

          reviews.forEach(rev => {
            const revCard = document.createElement("div");
            revCard.className = "review-card";

            const revHeader = document.createElement("div");
            revHeader.className = "review-card-header";

            const revUser = document.createElement("span");
            revUser.className = "review-card-user";
            revUser.textContent = rev.user_name || "Usuário Anônimo";
            revHeader.appendChild(revUser);

            // Stars for rating in static format
            const revStars = document.createElement("div");
            revStars.className = "review-card-stars";
            for (let s = 1; s <= 5; s++) {
              const starSpan = document.createElement("span");
              starSpan.className = "star-static";
              starSpan.innerHTML = s <= rev.rating ? "&#9733;" : "&#9734;";
              if (s <= rev.rating) {
                starSpan.classList.add("lit");
              }
              revStars.appendChild(starSpan);
            }
            revHeader.appendChild(revStars);

            revCard.appendChild(revHeader);

            if (rev.comment) {
              const revComment = document.createElement("p");
              revComment.className = "review-card-comment";
              revComment.textContent = rev.comment;
              revCard.appendChild(revComment);
            }

            reviewsGrid.appendChild(revCard);
          });

          // Render pagination controls
          const totalPages = Math.ceil(total / reviewsLimit);
          if (totalPages > 1) {
            currentPage = page;

            // Previous Page button
            const prevBtn = document.createElement("button");
            prevBtn.className = "btn pagination-btn";
            prevBtn.innerHTML = "&larr; Anterior";
            prevBtn.disabled = currentPage === 1;
            prevBtn.onclick = () => loadReviews(currentPage - 1);
            paginationContainer.appendChild(prevBtn);

            // Page indicator
            const pageIndicator = document.createElement("span");
            pageIndicator.className = "pagination-indicator";
            pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
            paginationContainer.appendChild(pageIndicator);

            // Next Page button
            const nextBtn = document.createElement("button");
            nextBtn.className = "btn pagination-btn";
            nextBtn.innerHTML = "Próxima &rarr;";
            nextBtn.disabled = currentPage === totalPages;
            nextBtn.onclick = () => loadReviews(currentPage + 1);
            paginationContainer.appendChild(nextBtn);
          }

        } catch (err) {
          reviewsGrid.innerHTML = `<div class="empty" style="color: var(--accent);">Erro ao carregar avaliações: ${err.message}</div>`;
        }
      }

      // Load initial reviews
      loadReviews(1);

      watchContainer.appendChild(reviewSection);

      document.title = `${title} - LuFlix`;

      return watchContainer;
    } catch (err) {
      console.error(err);
      return `<div class="empty">Erro ao carregar o vídeo: ${escapeHtml(err.message)}</div>`;
    }
  });
}

router();
