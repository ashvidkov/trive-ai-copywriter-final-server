const express = require('express');
const router = express.Router();
const pool = require('../services/db');
const bcrypt = require('bcryptjs');
const { authenticateJWT, authorizeRoles } = require('../services/auth');

// Middleware для проверки роли администратора  
const requireAdmin = [authenticateJWT, authorizeRoles('admin')];

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Получить список всех пользователей (только для админа)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Список пользователей
 *       403:
 *         description: Недостаточно прав
 */

// GET /api/admin/users - получить всех пользователей
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, login, email, role, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения пользователей:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     summary: Создать нового пользователя (только для админа)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *                 example: newuser
 *               email:
 *                 type: string
 *                 example: newuser@example.com
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, editor, viewer]
 *                 example: editor
 *     responses:
 *       201:
 *         description: Пользователь создан успешно
 *       400:
 *         description: Недостаточно данных или пользователь уже существует
 */

// POST /api/admin/users - создать пользователя
router.post('/users', requireAdmin, async (req, res) => {
  console.log('🚀 Начинаем создание пользователя:', req.body);
  const { login, email, password, role } = req.body;

  if (!login || !email || !password || !role) {
    console.log('❌ Не все поля заполнены');
    return res.status(400).json({ error: 'Все поля обязательны' });
  }

  const validRoles = ['admin', 'moderator', 'editor', 'viewer'];
  if (!validRoles.includes(role)) {
    console.log('❌ Недопустимая роль:', role);
    return res.status(400).json({ error: 'Недопустимая роль' });
  }

  try {
    console.log('🔍 Проверяем существование пользователя...');
    // Проверяем, существует ли пользователь
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE login = $1 OR email = $2',
      [login, email]
    );
    console.log('✅ Проверка существования завершена, найдено записей:', existingUser.rows.length);

    if (existingUser.rows.length > 0) {
      console.log('❌ Пользователь уже существует');
      return res.status(400).json({ error: 'Пользователь с таким логином или email уже существует' });
    }

    console.log('🔐 Хэшируем пароль...');
    // Хэшируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Пароль захэширован');

    console.log('💾 Создаем пользователя в БД...');
    // Создаем пользователя с автоинкрементным ID
    result = await pool.query(
      'INSERT INTO users (login, email, password_hash, role, created_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING id, login, email, role, created_at',
      [login, email, hashedPassword, role]
    );
    console.log('✅ Пользователь создан успешно:', result.rows[0]);

    res.status(201).json({
      message: 'Пользователь создан успешно',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('❌ ДЕТАЛЬНАЯ ОШИБКА создания пользователя:');
    console.error('Сообщение:', err.message);
    console.error('Код ошибки:', err.code);
    console.error('Детали:', err.detail);
    console.error('Полный стек:', err.stack);
    res.status(500).json({ error: 'Ошибка сервера: ' + err.message });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Обновить пользователя (только для админа)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               login:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *                 description: Новый пароль (необязательно)
 *               role:
 *                 type: string
 *                 enum: [admin, moderator, editor, viewer]
 *     responses:
 *       200:
 *         description: Пользователь обновлен успешно
 *       404:
 *         description: Пользователь не найден
 */

// PUT /api/admin/users/:id - обновить пользователя
router.put('/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { login, email, password, role } = req.body;

  if (!login || !email || !role) {
    return res.status(400).json({ error: 'Логин, email и роль обязательны' });
  }

  const validRoles = ['admin', 'moderator', 'editor', 'viewer'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Недопустимая роль' });
  }

  try {
    // Проверяем, существует ли пользователь
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Проверяем уникальность логина и email (исключая текущего пользователя)
    const duplicateCheck = await pool.query(
      'SELECT id FROM users WHERE (login = $1 OR email = $2) AND id != $3',
      [login, email, id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь с таким логином или email уже существует' });
    }

    let query, params;

    if (password) {
      // Обновляем с новым паролем
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      query = 'UPDATE users SET login = $1, email = $2, password_hash = $3, role = $4 WHERE id = $5 RETURNING id, login, email, role, created_at';
      params = [login, email, hashedPassword, role, id];
    } else {
      // Обновляем без изменения пароля
      query = 'UPDATE users SET login = $1, email = $2, role = $3 WHERE id = $4 RETURNING id, login, email, role, created_at';
      params = [login, email, role, id];
    }

    const result = await pool.query(query, params);

    res.json({
      message: 'Пользователь обновлен успешно',
      user: result.rows[0]
    });
  } catch (err) {
    console.error('Ошибка обновления пользователя:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     summary: Удалить пользователя (только для админа)
 *     tags:
 *       - Admin
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Пользователь удален успешно
 *       404:
 *         description: Пользователь не найден
 *       403:
 *         description: Нельзя удалить самого себя
 */

// DELETE /api/admin/users/:id - удалить пользователя
router.delete('/users/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.id;

  // Запрещаем удаление самого себя
  if (parseInt(id) === currentUserId) {
    return res.status(403).json({ error: 'Нельзя удалить самого себя' });
  }

  try {
    // Проверяем, существует ли пользователь
    const existingUser = await pool.query('SELECT id FROM users WHERE id = $1', [id]);
    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    // Удаляем пользователя
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: 'Пользователь удален успешно' });
  } catch (err) {
    console.error('Ошибка удаления пользователя:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Настройки системы (заглушки для будущей реализации)
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    // Пока возвращаем заглушку с настройками по умолчанию
    const settings = {
      openai_api_key: process.env.OPENAI_API_KEY ? "****" + process.env.OPENAI_API_KEY.slice(-4) : "",
      system_name: "TRIVE AI Assistant",
      max_users: 100,
      auto_approve_articles: false,
      enable_notifications: true,
      backup_frequency: "daily"
    };
    res.json(settings);
  } catch (err) {
    console.error('Ошибка получения настроек:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.put('/settings', requireAdmin, async (req, res) => {
  try {
    // Пока просто возвращаем успех
    // В будущем здесь будет логика сохранения настроек в базу данных
    res.json({ message: 'Настройки сохранены успешно' });
  } catch (err) {
    console.error('Ошибка сохранения настроек:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Управление темами (для админов)
router.post('/themes', requireAdmin, async (req, res) => {
  const { name } = req.body;
  
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Название темы обязательно' });
  }

  try {
    // Проверяем, существует ли тема
    const existingTheme = await pool.query('SELECT id FROM themes WHERE name = $1', [name]);
    if (existingTheme.rows.length > 0) {
      return res.status(400).json({ error: 'Тема с таким названием уже существует' });
    }

    // Создаем тему
    const result = await pool.query(
      'INSERT INTO themes (name, created_at) VALUES ($1, NOW()) RETURNING *',
      [name]
    );

    res.status(201).json({
      message: 'Тема создана успешно',
      theme: result.rows[0]
    });
  } catch (err) {
    console.error('Ошибка создания темы:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

router.delete('/themes/:id', requireAdmin, async (req, res) => {
  const { id } = req.params;

  try {
    // Проверяем, существует ли тема
    const existingTheme = await pool.query('SELECT id FROM themes WHERE id = $1', [id]);
    if (existingTheme.rows.length === 0) {
      return res.status(404).json({ error: 'Тема не найдена' });
    }

    // Удаляем связи с текстами
    await pool.query('DELETE FROM text_themes WHERE theme_id = $1', [id]);
    
    // Удаляем тему
    await pool.query('DELETE FROM themes WHERE id = $1', [id]);

    res.json({ message: 'Тема удалена успешно' });
  } catch (err) {
    console.error('Ошибка удаления темы:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router; 