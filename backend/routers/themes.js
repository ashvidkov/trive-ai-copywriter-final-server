const express = require('express');
const router = express.Router();
const pool = require('../services/db');

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
    const result = await pool.query(`
      SELECT t.id, t.name, COUNT(tt.text_id) AS count
      FROM themes t
      LEFT JOIN text_themes tt ON t.id = tt.theme_id
      GROUP BY t.id, t.name
      ORDER BY t.id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router; 