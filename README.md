# GarnoCRM — Инструкция по деплою

## Что нужно (бесплатно)
- Аккаунт на **GitHub** (github.com)
- Аккаунт на **Vercel** (vercel.com) — войти через GitHub
- Аккаунт на **JSONBin.io** (jsonbin.io) — для базы данных

---

## Шаг 1 — Загрузить код на GitHub

1. Зайти на [github.com](https://github.com) → **New repository**
2. Назвать: `garno-crm` → Create repository
3. Нажать **uploading an existing file**
4. Загрузить ВСЕ файлы из этой папки:
   ```
   package.json
   vite.config.js
   index.html
   src/
     main.jsx
     App.jsx
   ```
5. Нажать **Commit changes**

---

## Шаг 2 — Задеплоить на Vercel

1. Зайти на [vercel.com](https://vercel.com) → **Add New Project**
2. Выбрать репозиторий `garno-crm`
3. Framework Preset: **Vite** (выберется автоматически)
4. Нажать **Deploy** → через 1-2 минуты сайт готов
5. Получите URL вида: `garno-crm.vercel.app`

---

## Шаг 3 — Настроить базу данных (один раз)

При первом открытии сайта появится экран настройки:

1. Зайти на [jsonbin.io](https://jsonbin.io) → Sign Up (бесплатно)
2. В меню слева: **API Keys** → скопировать **Master Key** (`$2a$10$...`)
3. Вставить в поле на сайте → нажать **Подключить**

CRM автоматически создаст базу данных.

---

## Шаг 4 — Раздать доступ команде

Просто отправить всем 4 менеджерам ссылку на сайт.

**Каждый менеджер на своём ПК:**
1. Открывает `garno-crm.vercel.app`
2. Идёт на jsonbin.io → API Keys → копирует тот же Master Key
3. Вводит его при первом входе

> ⚠️ Важно: все 4 менеджера должны использовать **один и тот же Master Key** от одного аккаунта JSONBin. Тогда они будут работать с одной базой данных.

---

## При обновлении кода

Когда я (Claude) обновляю код:
1. Скачать новый `App.jsx`
2. Заменить файл в GitHub (drag & drop)
3. Vercel автоматически задеплоит новую версию за 1 минуту
4. Данные **не пропадут** — они в JSONBin, не в коде

---

## Структура файлов

```
garno-crm/
├── package.json        ← зависимости
├── vite.config.js      ← настройки Vite
├── index.html          ← точка входа
└── src/
    ├── main.jsx        ← React рендер
    └── App.jsx         ← весь код CRM
```
