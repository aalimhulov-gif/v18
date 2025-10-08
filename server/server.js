const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());

// Статические файлы из папки docs (результат сборки Vite)
app.use(express.static(path.join(__dirname, '../docs')));

// API routes (если понадобятся в будущем)
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Budget App Server is running',
    timestamp: new Date().toISOString()
  });
});

// Catch-all handler: отправляем index.html для всех маршрутов (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../docs/index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`🚀 Budget App Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${path.join(__dirname, '../docs')}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 Server shutting down...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('📴 Server shutting down...');
  process.exit(0);
});
