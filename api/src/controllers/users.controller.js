const pool = require("../db");

/**
 * POST /users/register
 * Chama: pr_register_user_and_device
 * Body: { name, email, password, device_token, device_type, device_name }
 */
async function registerUser(req, res) {
  const { name, email, password, device_token, device_type, device_name } =
    req.body;

  if (
    !name ||
    !email ||
    !password ||
    !device_token ||
    !device_type ||
    !device_name
  ) {
    return res
      .status(400)
      .json({
        error:
          "Campos obrigatórios: name, email, password, device_token, device_type, device_name.",
      });
  }

  const hasConnect = typeof pool.connect === "function";
  const client = hasConnect ? await pool.connect() : pool;
  const releaseClient = hasConnect;

  try {
    if (hasConnect) {
      await client.query("BEGIN");
    }

    await client.query(
      `CALL pr_register_user_and_device($1, $2, $3, $4, $5, $6, NULL)`,
      [name, email, password, device_token, device_type, device_name],
    );

    const result = await client.query(
      `SELECT currval(pg_get_serial_sequence('users', 'user_id')) AS user_id`,
    );

    if (hasConnect) {
      await client.query("COMMIT");
    }

    const user_id = result.rows[0]?.user_id ?? null;

    return res
      .status(201)
      .json({
        message: "Usuário e dispositivo cadastrados com sucesso.",
        user_id,
      });
  } catch (err) {
    if (hasConnect) {
      await client.query("ROLLBACK");
    }
    return res.status(500).json({ error: err.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

/**
 * POST /users/subscribe
 * Chama: pr_subscribe_user
 * Body: { user_id, plan_id, cpf, gateway_customer_id }
 */
async function subscribeUser(req, res) {
  const { user_id, plan_id, cpf, gateway_customer_id } = req.body;

  if (!user_id || !plan_id || !cpf || !gateway_customer_id) {
    return res
      .status(400)
      .json({
        error:
          "Campos obrigatórios: user_id, plan_id, cpf, gateway_customer_id.",
      });
  }

  const hasConnect = typeof pool.connect === "function";
  const client = hasConnect ? await pool.connect() : pool;
  const releaseClient = hasConnect;

  try {
    if (hasConnect) {
      await client.query("BEGIN");
    }

    await client.query(`CALL pr_subscribe_user($1, $2, $3, $4, NULL)`, [
      user_id,
      plan_id,
      cpf,
      gateway_customer_id,
    ]);

    const result = await client.query(
      `SELECT currval(pg_get_serial_sequence('subscriptions', 'subscription_id')) AS subscription_id`,
    );

    if (hasConnect) {
      await client.query("COMMIT");
    }

    const subscription_id = result.rows[0]?.subscription_id ?? null;

    return res
      .status(201)
      .json({ message: "Assinatura criada com sucesso.", subscription_id });
  } catch (err) {
    if (hasConnect) {
      await client.query("ROLLBACK");
    }
    return res.status(500).json({ error: err.message });
  } finally {
    if (releaseClient) {
      client.release();
    }
  }
}

module.exports = { registerUser, subscribeUser };
