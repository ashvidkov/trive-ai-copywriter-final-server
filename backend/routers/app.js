// Основной файл Express backend
const express = require('express');
const cors = require('cors');
const textsRouter = require('./routers/texts');
const authRouter = require('./routers/auth');
const themesRouter = require('./routers/themes');
const adminRouter = require('./routers/admin');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/texts', textsRouter);
app.use('/api/auth', authRouter);
app.use('/api/themes', themesRouter);
app.use('/api/admin', adminRouter);

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TRIVE API',
      version: '1.0.0',
    },
  },
  apis: ['./routers/*.js'], // путь к вашим роутам
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Backend API запущен на http://localhost:${PORT}`);
}); 