# 📚 book-diary

Личный читательский дневник в виде Telegram Mini App: полка книг, заметки, цитаты,
герои, ИИ-саммари и рекомендации. Авторизация через Telegram, данные привязаны к пользователю.

> Статус: в разработке. Бэкенд (база + auth + CRUD) готов и работает в проде.

---

## 🧱 Стек

**Backend**
- Node.js + Fastify + TypeScript
- Prisma ORM + PostgreSQL
- JWT-авторизация (через Telegram Login)
- Валидация через встроенные JSON Schema Fastify
- Docker / docker-compose
- nginx (reverse-proxy) + Cloudflare (DNS, HTTPS, Origin Certificate)

**Frontend** *(в работе)*
- Vue 3 + TypeScript + Vite + Tailwind
- Cloudflare Pages

---

## 🗂 Структура репозитория
book-diary/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma        # модели: User, Book, Quote, Character
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.ts         # singleton Prisma Client
│   │   ├── middleware/
│   │   │   └── auth.ts           # проверка JWT, кладёт request.user
│   │   ├── routes/
│   │   │   ├── books.ts          # CRUD книг
│   │   │   ├── quotes.ts         # CRUD цитат
│   │   │   └── characters.ts     # CRUD героев
│   │   └── server.ts             # точка входа, регистрация роутов
│   ├── docker-compose.yml
│   └── Dockerfile
└── frontend/                     # (в работе)

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
Authorization: Bearer <token>
4. Все роуты книг защищены `authMiddleware` (хук `onRequest`),
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

**Коды ответов:** `200/201` — успех, `204` — удалено,
`400` — ошибка валидации, `401` — нет/невалидный токен, `404` — не найдено или чужой ресурс.

---

## ✅ Валидация

Через встроенные JSON Schema Fastify (без доп. зависимостей):
- `title` / `author` — обязательны, непустые
- `rating` — целое 1–10
- `status` — только `WANT` / `READING` / `READ`
- `year` — целое число
- `quote.text`, `character.name` — обязательны
- `params.id` — приводится к `integer` (невалидный → `400`)

---

## Переменные окружения (.env)
DATABASE_URL=postgresql://user:password@db:5432/bookdiary
JWT_SECRET=<секрет для подписи токенов>
TELEGRAM_BOT_TOKEN=<токен бота из BotFather>

## 🌐 Прод
Интернет → Cloudflare (HTTPS) → nginx (:443) → Fastify (:3000) → PostgreSQL
API: https://api.kunitcan.online
Порт 3000 закрыт от внешнего мира (127.0.0.1:3000:3000), доступ только через nginx.

## Накат миграций на проде
```bash
cd /opt/booklib/book-diary/backend
git pull origin main
docker compose up -d --build app
docker compose exec app npx prisma migrate deploy
```