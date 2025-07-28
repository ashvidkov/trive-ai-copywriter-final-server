const pool = require('./db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

async function loginUser(login, password) {
  const res = await pool.query('SELECT * FROM users WHERE login = $1', [login]);
  if (res.rows.length === 0) return { error: 'Пользователь не найден' };
  const user = res.rows[0];
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return { error: 'Неверный пароль' };
  const token = jwt.sign({ id: user.id, login: user.login, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  return {
    token,
    user: {
      id: user.id,
      login: user.login,
      email: user.email,
      role: user.role,
      created_at: user.created_at
    }
  };
}

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Недействительный токен' });
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      console.log(`❌ Доступ запрещен: пользователь ${req.user?.login || 'неизвестен'} (роль: ${req.user?.role || 'нет'}) пытался получить доступ`);
      return res.status(403).json({ error: 'Недостаточно прав' });
    }
    next();
  };
}

module.exports = { loginUser, authenticateJWT, authorizeRoles }; 