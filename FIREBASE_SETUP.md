# Firebase Setup Instructions

## 1. Установка Firebase CLI

```bash
npm install -g firebase-tools
```

## 2. Инициализация проекта

```bash
firebase login
firebase init
```

Выберите:

- ✅ Firestore
- ✅ Hosting (опционально)

## 3. Настройка правил безопасности

Правила находятся в файле `firestore.rules`. Для развертывания:

```bash
firebase deploy --only firestore:rules
```

## 4. Правила безопасности

### Текущие правила:

- **Бюджеты**: Доступ только участникам (проверка через `members` поле)
- **Подколлекции**: Наследуют права от родительского бюджета
- **Создание**: Только владелец может создать бюджет

### Для разработки:

Если нужны более открытые правила для тестирования, раскомментируйте:

```javascript
match /{document=**} {
  allow read, write: if request.auth != null;
}
```

## 5. Структура данных

### Бюджет (`/budgets/{budgetId}`)

```javascript
{
  owner: "user_uid",
  members: {
    "user_uid1": true,
    "user_uid2": true
  },
  code: "ABC123",
  currency: "PLN",
  createdAt: timestamp
}
```

### Профиль (`/budgets/{budgetId}/profiles/{profileId}`)

```javascript
{
  name: "User Name",
  userId: "user_uid",
  online: true,
  lastSeen: timestamp,
  createdAt: timestamp
}
```

### Операция (`/budgets/{budgetId}/operations/{operationId}`)

```javascript
{
  amount: 100,
  category: "category_id",
  type: "income" | "expense",
  description: "Description",
  date: timestamp,
  profileId: "profile_id"
}
```

## 6. Развертывание

```bash
# Только правила
firebase deploy --only firestore:rules

# Все (правила + хостинг)
firebase deploy

# Проверка правил
firebase firestore:rules:get
```

## 7. Безопасность

⚠️ **Важно**:

- Никогда не используйте `allow read, write: if true;` в продакшене
- Всегда проверяйте `request.auth != null`
- Ограничивайте доступ по участникам бюджета
- Тестируйте правила перед развертыванием
