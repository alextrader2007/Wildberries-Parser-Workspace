# 🛒 Wildberries Parser — умный парсер маркетплейса

Мощный full-stack инструмент для поиска, анализа и экспорта товаров Wildberries с AI-помощником на базе Gemini. Поддерживает поиск по ключевым словам и по артикулам (SKU), детальную информацию по складам, расчёт цен с WB Wallet и генерацию отчётов Excel с изображениями.

## Архитектура

```
┌─────────────────────────────────────────────────────┐
│                    React SPA (Vite)                   │
│  App ─→ ConfigPanel, MetricCards, ProductsTable,     │
│         AiAssistant, ExportSection, ProductImage…     │
│                  ║  fetch() /api/*                    │
├─────────────────────────────────────────────────────┤
│              Express Backend (server.ts)              │
│  Routes: browser-search, parse-skus, parse-details,  │
│          export-excel, gemini, basket-info, stores    │
│  Services: search, details, payment, warehouse        │
│  Utils: basket, currency, fetch                       │
│                  ║  execSync                         │
├─────────────────────────────────────────────────────┤
│          Python Selenium (scripts/)                   │
│  search_wb.py — undetected Chrome CDP fetch          │
│  get_wbaas_token.py — извлечение x_wbaas_token       │
└─────────────────────────────────────────────────────┘
```

### Два режима работы

| Режим | Как работает |
|-------|-------------|
| **Поиск по ключевым словам** | Express запускает Python-скрипт `search_wb.py` → Chrome (SeleniumBase UC) проходит Qrator → через CDP выполняет fetch к внутреннему API Wildberries → результаты возвращаются в React → браузер догружает цены/остатки через CORS-прокси |
| **Парсинг по артикулам (SKU)** | Прямой запрос к API карточек WB (`search.wb.ru/cards/v4/detail`) через браузерные CORS-прокси с объединением остатков по регионам |

## Возможности

- 🔍 **Поиск по ключевым словам** — до 10 страниц (~1000 товаров), Chrome автоматически проходит Qrator
- 🔢 **Парсинг списка SKU** — вставьте артикулы, получите полные карточки
- 🏪 **Остатки по складам** — детальная раскладка по каждому складу (Москва, Гродно, СПБ и др.)
- 💰 **Цены с WB Wallet** — автоматический расчёт скидки WB Wallet для каждого товара
- 📊 **Excel-отчёт с изображениями** — xlsx-файл с главным листом (автофильтр, все товары) и отдельными листами на каждый товар (фото, характеристики, описание)
- 🤖 **AI-ассистент (Gemini)** — анализ ниши, ценовой анализ, анализ отзывов, SEO-оптимизация описаний. Ответы можно сохранить в **Word (.doc)** одной кнопкой
- 🖼️ **Умная загрузка изображений** — при ошибке автоматически перебирает корзины WB CDN (basket-01…99) через HEAD-запросы

## Быстрый старт (рекомендуемый способ)

### Автоматическая установка и запуск

Скопируйте проект на свой ПК и просто запустите `start.bat` — он сделает всё сам:

1. **Проверит Node.js** — если не установлен или версия ниже 20 — скачает с `nodejs.org` и установит автоматически
2. **Установит npm-зависимости** — `npm install` (если `node_modules` отсутствует)
3. **Проверит Python** — если не установлен или версия ниже 3.10 — скачает с `python.org` и установит автоматически
4. **Установит seleniumbase** — `pip install seleniumbase` для работы Chrome-поиска
5. **Запустит сервер** и откроет браузер на `http://localhost:3000`

```
start.bat  ← просто дважды кликнуть
```

Никаких ручных установок Node.js, Python или команд в терминале — батник сам скачает нужные версии, установит их тихо (в фоне) и запустит приложение.

> ⚠️ Требуется интернет для скачивания зависимостей при первом запуске.

### Ручная установка

```bash
# 1. Установка зависимостей
npm install

# 2. Python-зависимости (требуется Python 3.10+)
pip install seleniumbase

# 3. Настройка Gemini API ключа (опционально, для AI-функций)
#    В интерфейсе: кнопка "Установить API ключ" в панели AI-ассистента
#    Или вручную создать .gemini-config.json: { "apiKey": "AIza..." }

# 4. Запуск
npm run dev
```

Откройте `http://localhost:3000`.

> ⚠️ При первом поиске откроется окно Chrome — это SeleniumBase проходит Qrator-защиту Wildberries. После появления куки `x_wbaas_token` (≈15-20 с) поиск выполняется автоматически.

## API Endpoints

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/browser-search` | Поиск по ключевым словам (через Selenium Chrome) |
| POST | `/api/parse-skus` | Парсинг товаров по артикулам |
| POST | `/api/parse-details` | Получение описаний и характеристик |
| POST | `/api/export-excel` | Генерация Excel-файла |
| POST | `/api/basket-info` | Определение корзины CDN для изображений |
| POST | `/api/gemini/analyze` | AI-анализ (ниша/цены/отзывы) |
| POST | `/api/gemini/seo-optimize` | SEO-оптимизация описания |
| POST | `/api/gemini/set-key` | Сохранение Gemini API ключа |
| GET | `/api/gemini/check-key` | Проверка наличия ключа |
| GET | `/api/stores` | Справочник складов WB |
| GET | `/api/wbaas-token` | Получение x_wbaas_token |

## Технологии

**Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide React, react-markdown, motion

**Backend:** Express 4, TypeScript, tsx, exceljs, sharp, @google/genai, https-proxy-agent

**Python:** seleniumbase (undetected-chromedriver), Chrome DevTools Protocol (CDP)

## Структура проекта

```
src/
├── components/         # React-компоненты
│   ├── AiAssistant.tsx       # AI-ассистент с Gemini
│   ├── ConfigPanel.tsx       # Выбор региона/валюты
│   ├── ExportSection.tsx     # Экспорт в Excel/CSV
│   ├── GeminiKeyModal.tsx    # Модальное окно ввода API ключа
│   ├── MetricCards.tsx       # Карточки сводной статистики
│   ├── ProductImage.tsx      # Компонент изображения с fallback
│   ├── ProductMetadataDrawer.tsx  # Детальная информация о товаре
│   └── ProductsTable.tsx     # Таблица товаров с фильтрами
├── server/
│   ├── routes/          # Express route handlers
│   ├── services/        # Бизнес-логика (search, details, payment, warehouse, gemini-config)
│   └── utils/           # Утилиты (basket, currency, fetchWithTimeout)
├── shared/
│   ├── basket.ts        # Функции работы с корзинами WB CDN
│   ├── constants.ts     # Общие константы
│   └── word.ts          # Экспорт в Word (.doc)
├── App.tsx              # Корневой компонент
├── main.tsx             # Точка входа
├── types.ts             # Типы клиента
└── index.css            # Tailwind + кастомные стили
scripts/
├── search_wb.py         # Поиск через Selenium + CDP
└── get_wbaas_token.py   # Извлечение x_wbaas_token
start.bat                # Автоматическая установка и запуск (рекомендуется)
```

## Важные особенности

- **Qrator-защита:** Прямые запросы с сервера возвращают 498. Все прямые запросы к API Wildberries выполняются либо через Chrome (Selenium + CDP), либо через браузерные CORS-прокси.
- **Изображения:** Сервер возвращает basket-номер через `/api/basket-info`. Если корзина не угадана статически, `ProductImage` перебирает basket-01…99 через HEAD-запросы (wbbasket.ru разрешает CORS).
- **Excel:** Формируется на сервере с помощью `exceljs` + `sharp`. Каждый товар — отдельный лист с изображением (webp → png), характеристиками и описанием.
- **Word-экспорт:** Любой ответ Gemini AI (анализ, SEO-текст) можно сохранить в `.doc` одной кнопкой — Word-совместимый HTML с форматированием.
- **Gemini API ключ:** Можно задать через UI (сохраняется в `.gemini-config.json`) или через переменную окружения `GEMINI_API_KEY`.

## Требования

При использовании `start.bat` — ничего, батник сам скачает Node.js 20+ и Python 3.10+ при необходимости. Нужен только интернет при первом запуске.

При ручной установке:
- Node.js 20+
- Python 3.10+
- Google Chrome (устанавливается автоматически через seleniumbase)
- Gemini API ключ (опционально, для AI-функций)
