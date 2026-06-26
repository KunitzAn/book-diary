z# 📚 book-diary

Личный читательский дневник в виде Telegram Mini App: полка книг, заметки, цитаты,
герои, ИИ-саммари и рекомендации. Авторизация через Telegram, данные привязаны к пользователю.

---

## 🧱 Стек

**Backend**
- Node.js + Fastify + TypeScript
- Prisma ORM + PostgreSQL
- JWT-авторизация (через Telegram Login)
- Валидация через встроенные JSON Schema Fastify
- Загрузка файлов через `@fastify/multipart`, отдача через `@fastify/static`
- Интеграция с Google Gemini через прокси на платформе Chatium
- Docker / docker-compose
- nginx (reverse-proxy) + Cloudflare (DNS, HTTPS, Origin Certificate)

**Frontend**
- Vue 3 + TypeScript + Vite + Tailwind
- Cloudflare Pages

---

## 🗂 Структура репозитория

```
book-diary/
├── README.md
│
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── generated/prisma/       ← сгенерированный Prisma Client
│   │   ├── lib/
│   │   │   ├── prisma.ts
│   │   │   └── gemini.ts           ← модуль вызовов Gemini (через прокси, с retry)
│   │   ├── middleware/
│   │   │   └── auth.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── books.ts            ← CRUD книг + загрузка обложки
│   │   │   ├── characters.ts
│   │   │   ├── quotes.ts
│   │   │   └── ai.ts               ← ИИ-эндпоинты (саммари, герои, рекомендации)
│   │   ├── types/
│   │   │   └── fastify.d.ts
│   │   └── server.ts
│   ├── uploads/covers/             ← загруженные обложки (не в git)
│   ├── .env                        ← секреты, не в git
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── prisma.config.ts
│   └── package.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── api/books.ts
    │   ├── components/
    │   │   ├── AddBookModal.vue
    │   │   └── InlineField.vue
    │   ├── lib/api.ts
    │   ├── pages/
    │   │   ├── BookDetail.vue
    │   │   ├── Login.vue
    │   │   └── Shelf.vue
    │   ├── router/index.ts
    │   ├── types/
    │   ├── App.vue
    │   ├── main.ts
    │   └── style.css
    ├── .env.development
    ├── .env.production
    ├── tailwind.config.js
    ├── vite.config.ts
    └── package.json
```

---

## 🗄 Модель данных

- **User** — `id`, `telegramId`, `username`, `createdAt`
- **Book** — `id`, `userId`, `title`, `author`, `genre`, `year`,
  `status` (enum: `WANT` / `READING` / `READ`), `rating` (1–10),
  `coverUrl`, `notes`, `summary`, `createdAt`, `updatedAt`
- **Quote** — `id`, `bookId`, `text`, `chapter`
- **Character** — `id`, `bookId`, `name`, `description`

Связи: `User → Books → Quotes / Characters`, каскадное удаление.

---

## 🔐 Авторизация

1. Вход через Telegram Login Widget → `POST /auth/telegram`
2. Бэк проверяет подпись (hash через токен бота), находит/создаёт `User` по `telegramId`
3. Выдаётся JWT, фронт хранит его в `localStorage` и шлёт в заголовке:
   `Authorization: Bearer <token>`
4. Все защищённые роуты используют `authMiddleware` (хук `onRequest`),
   `userId` берётся из токена — данные одного юзера недоступны другим.

---

## 📡 API

Все эндпоинты ниже требуют заголовок `Authorization: Bearer <token>`.

### Auth
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/auth/telegram` | Логин через Telegram, выдаёт JWT |

### Books
| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/books` | Список моих книг. Фильтры: `?status=`, `?genre=`. Сортировка: `?sort=date\|rating\|author` |
| GET | `/books/:id` | Одна книга со связями (`quotes`, `characters`) |
| POST | `/books` | Создать книгу (`title`, `author` обязательны) |
| PATCH | `/books/:id` | Частичное редактирование |
| DELETE | `/books/:id` | Удалить книгу |
| POST | `/books/:id/cover` | Загрузить обложку (multipart, до 5 МБ, jpg/png/webp) |

### Quotes
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/books/:id/quotes` | Добавить цитату (`text` обязателен, `chapter` опц.) |
| PATCH | `/quotes/:id` | Редактировать цитату |
| DELETE | `/quotes/:id` | Удалить цитату |

### Characters
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/books/:id/characters` | Добавить героя (`name` обязателен, `description` опц.) |
| PATCH | `/characters/:id` | Редактировать героя |
| DELETE | `/characters/:id` | Удалить героя |

### AI (Gemini)
| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/books/:id/generate-summary` | Сгенерировать саммари книги, сохранить в `book.summary` |
| POST | `/books/:id/generate-characters` | Сгенерировать главных героев, перезаписать в `Character` |
| POST | `/ai/similar` | На вход `bookIds[]` → 5 похожих книг |
| GET | `/ai/author-books/:bookId` | Другие книги того же автора, которых нет на полке |
| POST | `/ai/what-next` | Анализ всей полки → 5 рекомендаций |

**Коды ответов:** `200/201` — успех, `204` — удалено,
`400` — ошибка валидации, `401` — нет/невалидный токен,
`404` — не найдено или чужой ресурс, `413` — файл слишком большой.

---

## 🤖 ИИ-фичи (Gemini)

Все запросы к Gemini идут **только через бэк** (`src/lib/gemini.ts`), ключ/секрет на фронте не используется.

- Запросы идут через **прокси на платформе Chatium**, а не напрямую в Google API.
- Модуль `gemini.ts` экспортирует:
  - `generateText(prompt)` — обычный текстовый ответ
  - `generateJSON<T>(prompt)` — парсинг JSON-ответа (с очисткой markdown-обёрток)
- Встроен **retry при 503** (`UNAVAILABLE`): до 5 попыток с нарастающей задержкой,
  т.к. модель часто отвечает «high demand».

---

## ✅ Валидация

Через встроенные JSON Schema Fastify (без доп. зависимостей):
- `title` / `author` — обязательны, непустые
- `rating` — целое 1–10
- `status` — только `WANT` / `READING` / `READ`
- `year` — целое число
- `quote.text`, `character.name` — обязательны
- `params.id` — приводится к `integer` (невалидный → `400`)
- загрузка обложки — только jpg/png/webp, лимит 5 МБ

---

## ⚙️ Переменные окружения (backend/.env)

```
DATABASE_URL=postgresql://user:password@db:5432/bookdiary
JWT_SECRET=<секрет для подписи токенов>
TELEGRAM_BOT_TOKEN=<токен бота из BotFather>
GEMINI_API_KEY=                          # больше не используется напрямую, оставлен пустым
GEMINI_PROXY_SECRET=<секрет для прокси Gemini на Chatium>
```

---

## 🌐 Прод

```
Интернет → Cloudflare (HTTPS) → nginx (:443) → Fastify (:3000) → PostgreSQL
```

- API: `https://api.kunitcan.online`
- Фронт: `https://kunitcan.online`
- Порт 3000 закрыт от внешнего мира (`127.0.0.1:3000:3000`), доступ только через nginx.

### Накат изменений / миграций на проде
```bash
cd /opt/booklib/book-diary/backend
git pull origin main
docker compose up -d --build app
docker compose exec app npx prisma migrate deploy
```

---

## 💻 Локальная разработка

### Backend
```bash
cd backend
npm install
npx prisma migrate dev
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # дев-сервер с hot-reload (Vite)
npm run build        # сборка для прода (vue-tsc + vite build)
```

### Рекомендуемое окружение
- VS Code + расширение **Vue (Official / Volar)** (Vetur отключить)
- Vue.js devtools для браузера
- Для типов `.vue` в TS используется `vue-tsc` вместо `tsc`
```
