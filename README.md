# 💰 Budget Buddy V15

Современное семейное приложение для управления бюджетом с красивым glassmorphism дизайном и real-time синхронизацией.

![Budget Buddy](https://via.placeholder.com/800x400/1a1a2e/eee?text=Budget+Buddy+V15)

## ✨ Особенности

### 🎯 **Основной функционал**

- 📊 **Управление профилями** - отдельные балансы для каждого члена семьи
- 💸 **Операции** - доходы, расходы с категоризацией
- 📂 **Категории** - гибкая система категорий с эмодзи
- 💰 **Лимиты** - установка и отслеживание бюджетов по категориям
- 🎯 **Цели** - накопления и достижения
- ⚙️ **Настройки** - персонализация и управление

### 🎨 **Дизайн и UX**

- ✨ **Glassmorphism** - современный стеклянный эффект
- 📱 **Адаптивный дизайн** - отлично работает на всех устройствах
- 🌙 **Темная тема** - приятный для глаз интерфейс
- 🎵 **Звуковые эффекты** - аудио отклик на действия
- 💻📱📲 **Индикаторы устройств** - показывает с какого устройства пользователь онлайн

### 🔥 **Технические возможности**

- ⚡ **Real-time синхронизация** - мгновенные обновления между устройствами
- 🔐 **Firebase Auth** - безопасная аутентификация
- 📊 **Firestore Database** - надежное хранение данных
- 🔄 **Multi-currency** - поддержка разных валют (PLN, USD, UAH)
- 📈 **Аналитика** - прогресс-бары и цветовые индикаторы

## 🚀 Технологии

- **Frontend**: React 18, Vite, Tailwind CSS
- **Backend**: Firebase (Auth + Firestore)
- **Анимации**: Framer Motion
- **Иконки**: Lucide React
- **Аудио**: Web Audio API
- **Деплой**: GitHub Pages

## 📦 Установка

### Предварительные требования

- Node.js 18+
- npm или yarn
- Аккаунт Firebase

### Шаги установки

1. **Клонирование репозитория**

   ```bash
   git clone https://github.com/your-username/budget-buddy-v15.git
   cd budget-buddy-v15
   ```

2. **Установка зависимостей**

   ```bash
   npm install
   ```

3. **Настройка Firebase**

   - Создайте проект в [Firebase Console](https://console.firebase.google.com/)
   - Включите Authentication (Email/Password)
   - Создайте Firestore Database
   - Скопируйте конфигурацию в `src/firebase/firebaseConfig.js`

4. **Запуск в режиме разработки**

   ```bash
   npm run dev
   ```

5. **Сборка для продакшена**
   ```bash
   npm run build
   ```

## 🔧 Конфигурация Firebase

Создайте файл `src/firebase/firebaseConfig.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id",
};
```

## 🏗️ Структура проекта

```
src/
├── components/        # Переиспользуемые компоненты
│   ├── BalanceCard.jsx
│   ├── Modal.jsx
│   ├── Navbar.jsx
│   └── ...
├── pages/            # Страницы приложения
│   ├── Home.jsx      # Главная страница
│   ├── Categories.jsx # Управление категориями
│   ├── Limits.jsx    # Лимиты категорий
│   ├── Goals.jsx     # Цели и накопления
│   └── ...
├── context/          # React Context
│   └── BudgetProvider.jsx
├── firebase/         # Firebase конфигурация
│   ├── auth.jsx
│   └── firebaseConfig.js
├── hooks/           # Пользовательские хуки
│   ├── useDevice.js
│   ├── useSound.js
│   └── usePresence.js
└── styles/          # Стили
    └── index.css
```

## 🎮 Использование

### Начало работы

1. **Регистрация** - создайте аккаунт или войдите
2. **Создание бюджета** - создайте семейный бюджет или присоединитесь к существующему
3. **Добавление операций** - начните записывать доходы и расходы
4. **Установка лимитов** - задайте бюджеты для категорий

### Основные функции

- **👥 Профили** - управление членами семьи
- **💱 Операции** - добавление доходов и расходов
- **📊 Аналитика** - просмотр статистики и прогресса
- **⚙️ Настройки** - персонализация приложения

## 🎨 Кастомизация

### Звуковые эффекты

```javascript
// Включение/выключение звуков
const { playSound } = useSound();
playSound("success"); // 'success', 'error', 'coin', 'add', etc.
```

### Валюты

Поддерживаемые валюты: PLN, USD, UAH
Можно легко добавить новые в `BudgetProvider.jsx`

## 🤝 Вклад в проект

1. Fork репозитория
2. Создайте feature branch (`git checkout -b feature/amazing-feature`)
3. Commit изменения (`git commit -m 'Add amazing feature'`)
4. Push в branch (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект лицензирован под MIT License - смотрите файл [LICENSE](LICENSE) для деталей.

## 👨‍💻 Автор

**Артур** - [GitHub](https://github.com/your-username)

## 🙏 Благодарности

- Firebase за отличную платформу
- React команду за мощный фреймворк
- Tailwind CSS за удобные стили
- Framer Motion за плавные анимации

---

**⭐ Если проект понравился, поставьте звездочку!**
