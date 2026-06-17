const name = document.querySelector("#name");
const email = document.querySelector("#email");
const password = document.querySelector("#password");
const user_id = document.querySelector("#subUserId");
const plan_id = document.querySelector("#planId");
const cpf = document.querySelector("#cpf");
const directorFirstName = document.querySelector("#directorFirstName");
const directorLastName = document.querySelector("#directorLastName");
const nacionalidade = document.querySelector("#nacionalidade");
const birth = document.querySelector("#birth");
const actorFirstName = document.querySelector("#actorFirstName");
const actorLastName = document.querySelector("#actorLastName");
const actorBirth = document.querySelector("#actorBirth");
const actorNacionalidade = document.querySelector("#actorNacionalidade");

const filmeTitulo = document.querySelector("#filmeTitulo");
const filmeAno = document.querySelector("#filmeAno");
const filmeSinopse = document.querySelector("#filmeSinopse");
const filmeDuracao = document.querySelector("#filmeDuracao");
const filmeRating = document.querySelector("#filmeRating");
const filmeNumberRating = document.querySelector("#filmeNumberRating");
const filmeDiretores = document.querySelector("#filmeDiretores");
const filmeClassificacao = document.querySelector("#filmeClassificacao");

const serieTitulo = document.querySelector("#serieTitulo");
const serieSinopse = document.querySelector("#serieSinopse");
const serieAno = document.querySelector("#serieAno");
const serieClassificacao = document.querySelector("#serieClassificacao");

const episodeAno = document.querySelector("#episodeAno");
const episodeClassificacao = document.querySelector("#episodeClassificacao");
const episodeDirectors = document.querySelector("#episodeDirectors");
const episodeDuracao = document.querySelector("#episodeDuracao");
const episodeTitulo = document.querySelector("#episodeTitulo");
const episodeSinopse = document.querySelector("#episodeSinopse");
const episodeSeasonNumber = document.querySelector("#episodeSeasonNumber");
const episodeSerieId = document.querySelector("#episodeSerieId");

const API = "http://localhost:3000/api/v1";

async function registerUser() {
  await fetch(`${API}/users/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: name.value,
      email: email.value,
      password: password.value,
      device_token: "web",
      device_type: "browser",
      device_name: "Chrome",
    }),
  });

  alert("Usuário cadastrado");
}

async function subscribe() {
  await fetch(`${API}/users/subscribe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: Number(subUserId.value),
      plan_id: Number(planId.value),
      cpf: cpf.value,
      gateway_customer_id: "web_customer",
    }),
  });
}

async function createDirector() {
  await fetch(`${API}/people/directors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      first_name: directorFirstName.value,
      last_name: directorLastName.value,
      nationality: nacionalidade.value,
      birth: birth.value,
    }),
  });
}

async function createActors() {
  await fetch(`${API}/people/actors`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      actors: [
        {
          first_name: actorFirstName.value,
          last_name: actorLastName.value,
          nationality: actorNacionalidade.value,
          birth: actorBirth.value,
        },
      ],
    }),
  });
}

async function createMovie() {
  const dirIds = filmeDiretores.value
    .trim()
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== "");

  body = {
    release_year: filmeAno.value,
    content_rating_id: filmeClassificacao.value,
    directors_id: dirIds,
    number_rating: filmeNumberRating.value,
    rating: filmeRating.value,
    duration: filmeDuracao.value,
    title: filmeTitulo.value,
    synopsis: filmeSinopse.value,
  };

  await fetch(`${API}/catalog/movies`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function createSerie() {
  body = {
    title: serieTitulo.value,
    synopsis: serieSinopse.value,
    content_rating_id: serieClassificacao.value,
    release_year: serieAno.value,
  };

  await fetch(`${API}/catalog/series`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function createEpisode() {
  const dirsId = episodeDirectors.value
    .trim()
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter((linha) => linha !== "");
  const serieId =
    episodeSerieId.value.trim() === "" ? null : episodeSerieId.value;
  body = {
    release_year: episodeAno.value,
    content_rating_id: episodeClassificacao.value,
    directors_id: dirsId,
    duration: episodeDuracao.value,
    episode_title: episodeTitulo.value,
    episode_synopsis: episodeSinopse.value,
    season_number: episodeSeasonNumber.value,
    serie_id: serieId,
  };

  await fetch(`${API}/catalog/episodes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

async function loadMovies() {
  const response = await fetch(`${API}/views/movies`);

  const data = await response.json();

  resultado.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

async function loadSeries() {
  const response = await fetch(`${API}/views/series`);

  const data = await response.json();

  resultado.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

async function loadSeasons() {
  const response = await fetch(`${API}/views/seasons`);

  const data = await response.json();

  resultado.innerHTML = `<pre>${JSON.stringify(data, null, 2)}</pre>`;
}

