// Роутер для работы с таблицей texts
const express = require('express');
const router = express.Router();
const pool = require('../services/db');
const { authenticateJWT, authorizeRoles } = require('../services/auth');

// Получить все тексты с фильтрацией по теме и статусу
router.get('/', async (req, res) => {
  try {
    const { theme_id, status } = req.query;
    let query = `SELECT texts.* FROM texts`;
    const params = [];
    let where = [];
    if (theme_id) {
      query += ' JOIN text_themes ON texts.id = text_themes.text_id';
      where.push(`text_themes.theme_id = $${params.length + 1}`);
      params.push(theme_id);
    }
    if (status) {
      where.push(`texts.status = $${params.length + 1}`);
      params.push(status);
    }
    if (where.length > 0) {
      query += ' WHERE ' + where.join(' AND ');
    }
    query += ' ORDER BY texts.created_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Получить один текст по id с историей и тематиками
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM texts WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const text = result.rows[0];
    // История
    const histRes = await pool.query(
      'SELECT action, "user", time FROM public.text_history WHERE text_id = $1 ORDER BY time DESC',
      [id]
    );
    text.history = histRes.rows;
    // Тематики
    const themesRes = await pool.query(
      'SELECT t.id, t.name FROM public.themes t JOIN public.text_themes tt ON t.id = tt.theme_id WHERE tt.text_id = $1',
      [id]
    );
    text.themes = themesRes.rows;
    res.json(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Создать новый текст
router.post('/', authenticateJWT, authorizeRoles('admin', 'moderator', 'editor'), async (req, res) => {
  const client = await pool.connect();
  try {
    let { title, content, result, h1, meta_description, keywords, status, themeIds } = req.body;
    if (!status) status = 'draft';
    await client.query('BEGIN');
    const insert = await client.query(
      `INSERT INTO texts (title, content, result, h1, meta_description, keywords, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
      [title, content, result, h1, meta_description, keywords, status]
    );
    const newText = insert.rows[0];
    if (Array.isArray(themeIds)) {
      for (const themeId of themeIds) {
        await client.query('INSERT INTO text_themes (text_id, theme_id) VALUES ($1, $2)', [newText.id, themeId]);
      }
    }
    // Добавляем запись в историю
    await client.query(
      'INSERT INTO text_history (text_id, action, "user", time) VALUES ($1, $2, $3, NOW())',
      [newText.id, 'Новая статья создана в базе', req.user.login]
    );
    await client.query('COMMIT');
    res.status(201).json(newText);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Обновить текст по id
router.put('/:id', authenticateJWT, authorizeRoles('admin', 'moderator', 'editor'), async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { title, content, result, h1, meta_description, keywords, status, themeIds } = req.body;
    await client.query('BEGIN');
    const update = await client.query(
      `UPDATE texts SET title=$1, content=$2, result=$3, h1=$4, meta_description=$5, keywords=$6, status=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
      [title, content, result, h1, meta_description, keywords, status, id]
    );
    if (update.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Not found' });
    }
    if (Array.isArray(themeIds)) {
      await client.query('DELETE FROM text_themes WHERE text_id = $1', [id]);
      for (const themeId of themeIds) {
        await client.query('INSERT INTO text_themes (text_id, theme_id) VALUES ($1, $2)', [id, themeId]);
      }
    }
    await client.query(
      'INSERT INTO text_history (text_id, action, "user", time) VALUES ($1, $2, $3, NOW())',
      [id, 'сохранено как черновик', req.user.login]
    );
    await client.query('COMMIT');
    res.json(update.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Удалить текст по id (admin, moderator, editor)
router.delete('/:id', authenticateJWT, authorizeRoles('admin', 'moderator', 'editor'), async (req, res) => {
  const { id } = req.params;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Проверяем существование текста
    const checkResult = await client.query('SELECT * FROM texts WHERE id = $1', [id]);
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Текст не найден' });
    }
    
    const textToDelete = checkResult.rows[0];
    
    // Удаляем связанные записи (соблюдаем порядок для foreign key constraints)
    await client.query('DELETE FROM text_history WHERE text_id = $1', [id]);
    await client.query('DELETE FROM text_themes WHERE text_id = $1', [id]);
    await client.query('DELETE FROM texts WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    console.log(`✅ Текст "${textToDelete.title}" удален пользователем ${req.user.login}`);
    res.json({ message: 'Текст удалён', text: textToDelete });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Ошибка удаления текста:', { id, user: req.user?.login, error: err.message });
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Универсальный action-роут для статусов и истории
router.post('/:id/action', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  const user = req.user;
  

  const actionMap = {
    'Сохранить': {
      allowedRoles: ['admin', 'moderator', 'editor'],
      newStatus: 'draft',
      actionRu: 'сохранено как черновик',
    },
    'Согласовать': {
      allowedRoles: ['editor'],
      newStatus: 'review',
      actionRu: 'отправлено на согласование',
    },
    'На доработку': {
      allowedRoles: ['admin', 'moderator'],
      newStatus: 'draft',
      actionRu: 'отправлено на доработку',
    },
    'Удалить': {
      allowedRoles: ['admin', 'moderator', 'editor'],
      newStatus: 'deleted',
      actionRu: 'удалено',
    },
    // Добавлено для модератора/админа:
    'Согласовано модератором': {
      allowedRoles: ['admin', 'moderator'],
      newStatus: 'approved',
      actionRu: 'Статья согласована модератором',
    },
    'На доработку модератором': {
      allowedRoles: ['admin', 'moderator'],
      newStatus: 'draft',
      actionRu: 'Возврат на доработку от модератора',
    },
  };
  if (!actionMap[action]) {
    return res.status(400).json({ error: 'Недопустимое действие' });
  }
  if (!actionMap[action].allowedRoles.includes(user.role)) {
    return res.status(403).json({ error: 'Недостаточно прав для действия' });
  }
  const { newStatus, actionRu } = actionMap[action];
  console.log(`🔍 Action debug: action="${action}", newStatus="${newStatus}", userRole="${user.role}", userId=${id}`);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log(`📝 Executing UPDATE: SET status = '${newStatus}' WHERE id = ${id}`);
    const update = await client.query(
      'UPDATE texts SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [newStatus, id]
    );
    if (update.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Текст не найден' });
    }
    console.log(`✅ UPDATE successful: updated text id=${id} with status='${newStatus}'`);
    await client.query(
      'INSERT INTO text_history (text_id, action, "user", time) VALUES ($1, $2, $3, NOW())',
      [id, actionRu, user.login]
    );
    await client.query('COMMIT');
    console.log(`✅ Action completed: ${action} -> status=${newStatus}`);
    res.json({ message: 'Действие выполнено', status: newStatus, text: update.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`❌ Action error: ${action} failed - ${err.message}`);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

// Получить историю изменений по статье
router.get('/:id/history', authenticateJWT, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT id, text_id, action, "user", time FROM text_history WHERE text_id = $1 ORDER BY time ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 