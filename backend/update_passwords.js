const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config();

// Создаем подключение к базе данных
const pool = new Pool({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

async function updatePasswords() {
  try {
    console.log('Начинаем обновление паролей...');
    
    // Список пользователей с их паролями
    const users = [
      { email: 'admin1@example.com', password: 'adminpass123' },
      { email: 'editor42@example.com', password: 'editorpass456' },
      { email: 'mod@example.com', password: 'modpass789' },
      { email: 'viewer@example.com', password: 'guestpass000' }
    ];

    for (const user of users) {
      // Хэшируем пароль
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(user.password, saltRounds);
      
      // Обновляем пароль в базе
      const query = 'UPDATE users SET password_hash = $1 WHERE email = $2';
      await pool.query(query, [hashedPassword, user.email]);
      
      console.log(`✅ Обновлен пароль для ${user.email}`);
    }
    
    console.log('🎉 Все пароли успешно обновлены!');
    
  } catch (error) {
    console.error('❌ Ошибка при обновлении паролей:', error);
  } finally {
    await pool.end();
  }
}

// Запускаем обновление
updatePasswords(); 