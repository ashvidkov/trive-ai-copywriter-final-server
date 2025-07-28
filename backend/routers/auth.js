const express = require('express');
const router = express.Router();
const { loginUser } = require('../services/auth');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход пользователя
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *                 example: admin1
 *               password:
 *                 type: string
 *                 example: adminpass123
 *     responses:
 *       200:
 *         description: Успешный вход. Возвращает JWT и данные пользователя.
 *       400:
 *         description: Не передан логин или пароль
 *       401:
 *         description: Неверные данные
 */

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { login, password } = req.body;
  if (!login || !password) return res.status(400).json({ error: 'Введите логин и пароль' });
  try {
    const result = await loginUser(login, password);
    if (result.error) return res.status(401).json({ error: result.error });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router; 