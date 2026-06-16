const pool = require('../db');

/**
 * POST /users/register
 * Chama: pr_register_user_and_device
 * Body: { name, email, password, device_token, device_type, device_name }
 */
async function registerUser(req, res) {
  const { name, email, password, device_token, device_type, device_name } = req.body;

  if (!name || !email || !password || !device_token || !device_type || !device_name) {
    return res.status(400).json({ error: 'Campos obrigatórios: name, email, password, device_token, device_type, device_name.' });
  }

  try {
    const result = await pool.query(
      `CALL pr_register_user_and_device($1, $2, $3, $4, $5, $6, NULL)`,
      [name, email, password, device_token, device_type, device_name]
    );

    // O OUT param fica na primeira linha do resultado
    const user_id = result.rows[0]?.p_user_id ?? null;

    return res.status(201).json({ message: 'Usuário e dispositivo cadastrados com sucesso.', user_id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
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
    return res.status(400).json({ error: 'Campos obrigatórios: user_id, plan_id, cpf, gateway_customer_id.' });
  }

  try {
    const result = await pool.query(
      `CALL pr_subscribe_user($1, $2, $3, $4, NULL)`,
      [user_id, plan_id, cpf, gateway_customer_id]
    );

    const subscription_id = result.rows[0]?.p_subscription_id ?? null;

    return res.status(201).json({ message: 'Assinatura criada com sucesso.', subscription_id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { registerUser, subscribeUser };
