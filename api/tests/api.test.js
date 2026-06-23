const request = require('supertest');
const app = require('../src/app');
const pool = require('../src/db');

describe('LuFlix API - Integration Test Suite', () => {
  let testUserId;
  let testSerieId;
  let testSubscriptionId;
  const testEmail = `test_jest_${Date.now()}@luflix.com`;

  // Limpeza de dados gerados após a execução de todos os testes
  afterAll(async () => {
    try {
      // 1. Limpar favoritos criados nos testes
      if (testUserId) {
        await pool.query('DELETE FROM "favorites" WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM "reviews" WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM "watch_history" WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM "subscriptions" WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM "invoicing_data" WHERE user_id = $1', [testUserId]);
        await pool.query('DELETE FROM "devices" WHERE user_id = $1', [testUserId]);
      }

      // 2. Limpar série de teste criada
      if (testSerieId) {
        await pool.query('DELETE FROM "seasons" WHERE serie_id = $1', [testSerieId]);
        await pool.query('DELETE FROM "series" WHERE serie_id = $1', [testSerieId]);
      }

      // 3. Deletar o usuário de teste
      if (testUserId) {
        await pool.query('DELETE FROM "users" WHERE user_id = $1', [testUserId]);
      }
    } catch (err) {
      console.error('Erro no cleanup do teste:', err);
    } finally {
      // Importante: Fechar a conexão com o banco para o Jest finalizar sem travar
      await pool.end();
    }
  });

  // ── Healthcheck Rota
  test('GET /health deve retornar status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });

  // ── Usuários (Cadastro, Login e Assinaturas)
  test('POST /api/v1/users/register deve registrar um novo usuário e dispositivo', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({
        name: 'Jest Test User',
        email: testEmail,
        password: 'password123',
        device_token: `tok_jest_${Date.now()}`,
        device_type: 'browser',
        device_name: 'Jest Agent'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('user_id');
    testUserId = Number(res.body.user_id);
  });

  test('POST /api/v1/users/register deve falhar com campos faltando', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({
        name: 'Failing Registration'
      });
    expect(res.statusCode).toEqual(400);
  });

  test('POST /api/v1/users/login deve autenticar com credenciais corretas', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: testEmail,
        password: 'password123'
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('user_id', testUserId);
    expect(res.body).toHaveProperty('name', 'Jest Test User');
  });

  test('POST /api/v1/users/login deve rejeitar senha incorreta', async () => {
    const res = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: testEmail,
        password: 'wrong_password'
      });

    expect(res.statusCode).toEqual(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/v1/users/subscribe deve assinar um plano', async () => {
    // Pegar um ID de plano válido da tabela plans (ou criar se vazio)
    const plansResult = await pool.query('SELECT plan_id FROM "plans" LIMIT 1');
    let planId = plansResult.rows[0]?.plan_id;

    if (!planId) {
      const insPlan = await pool.query(
        'INSERT INTO "plans" (name, value, screens) VALUES ($1, $2, $3) RETURNING plan_id',
        [`Plan Test ${Date.now()}`, 29.90, 2]
      );
      planId = insPlan.rows[0].plan_id;
    }

    const res = await request(app)
      .post('/api/v1/users/subscribe')
      .send({
        user_id: testUserId,
        plan_id: planId,
        cpf: '98765432109',
        gateway_customer_id: 'cus_jest_123'
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('subscription_id');
    testSubscriptionId = res.body.subscription_id;
  });

  // ── Catálogo (Séries)
  test('POST /api/v1/catalog/series deve cadastrar uma nova série', async () => {
    const res = await request(app)
      .post('/api/v1/catalog/series')
      .send({
        title: `Jest Test Series ${Date.now()}`,
        release_year: 2026,
        rating: 4.5,
        synopsis: 'Uma série criada por testes automatizados do Jest.',
        content_rating_id: 1
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('message');

    // Buscar o ID da série inserida
    const result = await pool.query('SELECT currval(pg_get_serial_sequence(\'series\', \'serie_id\')) AS id');
    testSerieId = Number(result.rows[0].id);
  });

  test('PUT /api/v1/catalog/series/:id deve atualizar uma série existente', async () => {
    const res = await request(app)
      .put(`/api/v1/catalog/series/${testSerieId}`)
      .send({
        title: `Updated Jest Series ${Date.now()}`,
        release_year: 2027,
        rating: 4.8,
        synopsis: 'Sinopse atualizada pelos testes.'
      });

    expect(res.statusCode).toEqual(200);
  });

  // ── Reviews
  test('POST /api/v1/reviews deve cadastrar uma review para a série/conteúdo', async () => {
    // Para review precisamos de uma série (ou temporada/episódio)
    // No DDL a review referencia um filme ou episódio, então vamos inserir um filme de teste temporário no DB
    const moviesResult = await pool.query('SELECT movie_id FROM "movies" LIMIT 1');
    const movieId = moviesResult.rows[0]?.movie_id;

    if (movieId) {
      const res = await request(app)
        .post('/api/v1/reviews')
        .send({
          user_id: testUserId,
          rating: 5,
          comment: 'Muito boa essa produção!',
          movie_id: movieId
        });

      expect(res.statusCode).toEqual(201);
    }
  });

  // ── Alternância de Favoritos (Nosso toggle customizado)
  test('POST /api/v1/favorites deve ADICIONAR o favorito quando não existe (toggle on)', async () => {
    const res = await request(app)
      .post('/api/v1/favorites')
      .send({
        user_id: testUserId,
        serie_id: testSerieId
      });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('action', 'added');
    expect(res.body).toHaveProperty('message', 'Favorito adicionado com sucesso.');

    // Validar se está no banco
    const dbCheck = await pool.query('SELECT 1 FROM "favorites" WHERE user_id = $1 AND serie_id = $2', [testUserId, testSerieId]);
    expect(dbCheck.rows.length).toEqual(1);
  });

  test('POST /api/v1/favorites de novo deve REMOVER o favorito existente (toggle off)', async () => {
    const res = await request(app)
      .post('/api/v1/favorites')
      .send({
        user_id: testUserId,
        serie_id: testSerieId
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('action', 'removed');
    expect(res.body).toHaveProperty('message', 'Favorito removido com sucesso.');

    // Validar se saiu do banco
    const dbCheck = await pool.query('SELECT 1 FROM "favorites" WHERE user_id = $1 AND serie_id = $2', [testUserId, testSerieId]);
    expect(dbCheck.rows.length).toEqual(0);
  });

  test('DELETE /api/v1/favorites deve remover diretamente o favorito', async () => {
    // 1. Adicionar primeiro
    await request(app)
      .post('/api/v1/favorites')
      .send({
        user_id: testUserId,
        serie_id: testSerieId
      });

    // 2. Deletar diretamente
    const res = await request(app)
      .delete('/api/v1/favorites')
      .send({
        user_id: testUserId,
        serie_id: testSerieId
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message', 'Favorito removido com sucesso.');

    // Validar se saiu do banco
    const dbCheck = await pool.query('SELECT 1 FROM "favorites" WHERE user_id = $1 AND serie_id = $2', [testUserId, testSerieId]);
    expect(dbCheck.rows.length).toEqual(0);
  });

  test('GET /api/v1/favorites/:user_id deve retornar a lista de favoritos do usuário', async () => {
    // 1. Adicionar favorito
    await request(app)
      .post('/api/v1/favorites')
      .send({
        user_id: testUserId,
        serie_id: testSerieId
      });

    // 2. Chamar GET
    const res = await request(app).get(`/api/v1/favorites/${testUserId}`);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('data');
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(Number(res.body.data[0].serie_id)).toEqual(testSerieId);
  });


  // ── Histórico de Visualização
  test('POST /api/v1/history deve registrar progresso no histórico', async () => {
    const moviesResult = await pool.query('SELECT movie_id FROM "movies" LIMIT 1');
    const movieId = moviesResult.rows[0]?.movie_id;

    if (movieId) {
      const res = await request(app)
        .post('/api/v1/history')
        .send({
          user_id: testUserId,
          movie_id: movieId,
          watched_minutes: 15,
          watched_seconds: 40
        });

      expect(res.statusCode).toEqual(200);
    }
  });
});
