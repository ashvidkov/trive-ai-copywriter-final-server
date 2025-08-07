const express = require('express');
const router = express.Router();
const pool = require('../services/db');
const { authenticateJWT, authorizeRoles } = require('../services/auth');

/**
 * @swagger
 * /api/themes:
 *   get:
 *     summary: Получить все темы с количеством статей
 *     tags:
 *       - Themes
 *     responses:
 *       200:
 *         description: Список тем с количеством статей
 */
router.get('/', async (req, res) => {
  try {
    // Проверяем структуру таблицы
    const columnsCheck = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'themes' ORDER BY ordinal_position
    `);
    
    const columnNames = columnsCheck.rows.map(r => r.column_name);
    const hasGptFields = columnNames.includes('system_prompt');
    
    let query;
    if (hasGptFields) {
      query = `
        SELECT 
          t.id, 
          t.name, 
          t.system_prompt,
          t.user_prompt,
          t.temperature,
          t.max_tokens,
          COUNT(tt.text_id) AS count
        FROM themes t
        LEFT JOIN text_themes tt ON t.id = tt.theme_id
        GROUP BY t.id, t.name, t.system_prompt, t.user_prompt, t.temperature, t.max_tokens
        ORDER BY t.id ASC
      `;
    } else {
      query = `
        SELECT t.id, t.name, COUNT(tt.text_id) AS count
        FROM themes t
        LEFT JOIN text_themes tt ON t.id = tt.theme_id
        GROUP BY t.id, t.name
        ORDER BY t.id ASC
      `;
    }
    
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (err) {
    console.error('Ошибка получения тем:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/themes/{id}/gpt:
 *   get:
 *     summary: Получить GPT параметры для конкретной темы
 *     tags:
 *       - Themes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: GPT параметры темы
 *       404:
 *         description: Тема не найдена
 */
router.get('/:id/gpt', async (req, res) => {
  const { id } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT 
        id,
        name,
        system_prompt,
        user_prompt,
        temperature,
        max_tokens
      FROM themes 
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Тема не найдена' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Ошибка получения GPT параметров:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * @swagger
 * /api/themes/{id}/gpt:
 *   put:
 *     summary: Обновить GPT параметры для темы (только для админов)
 *     tags:
 *       - Themes
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
 *               system_prompt:
 *                 type: string
 *               user_prompt:
 *                 type: string
 *               temperature:
 *                 type: number
 *                 minimum: 0.0
 *                 maximum: 1.0
 *               max_tokens:
 *                 type: integer
 *                 minimum: 300
 *                 maximum: 1500
 *     responses:
 *       200:
 *         description: GPT параметры обновлены
 *       400:
 *         description: Неверные параметры
 *       404:
 *         description: Тема не найдена
 */
router.put('/:id/gpt', authenticateJWT, authorizeRoles('admin'), async (req, res) => {
  const { id } = req.params;
  const { system_prompt, user_prompt, temperature, max_tokens } = req.body;
  
  // Валидация параметров
  if (!system_prompt || !user_prompt) {
    return res.status(400).json({ error: 'System prompt и user prompt обязательны' });
  }
  
  if (temperature < 0.0 || temperature > 1.0) {
    return res.status(400).json({ error: 'Temperature должна быть между 0.0 и 1.0' });
  }
  
  if (max_tokens < 300 || max_tokens > 1500) {
    return res.status(400).json({ error: 'Max tokens должен быть между 300 и 1500' });
  }
  
  try {
    // Проверяем, существует ли тема
    const themeCheck = await pool.query('SELECT id FROM themes WHERE id = $1', [id]);
    if (themeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Тема не найдена' });
    }
    
    // Обновляем GPT параметры
    const result = await pool.query(`
      UPDATE themes 
      SET 
        system_prompt = $1,
        user_prompt = $2,
        temperature = $3,
        max_tokens = $4
      WHERE id = $5
      RETURNING id, name, system_prompt, user_prompt, temperature, max_tokens
    `, [system_prompt, user_prompt, temperature, max_tokens, id]);
    
    res.json({
      message: 'GPT параметры обновлены успешно',
      theme: result.rows[0]
    });
  } catch (err) {
    console.error('Ошибка обновления GPT параметров:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 