import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { AI_PRODUCT_LIMIT } from "../../shared/constants";
import { getGeminiKey, setGeminiKey } from "../services/gemini-config";

const router = Router();

function getApiKey(): string | null {
  return getGeminiKey();
}

router.post("/set-key", (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
    return res.status(400).json({ error: "API ключ не может быть пустым." });
  }
  setGeminiKey(apiKey.trim());
  res.json({ success: true });
});

router.get("/check-key", (_req, res) => {
  const key = getApiKey();
  res.json({ hasKey: !!key });
});

router.post("/analyze", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({
      error: "Ключ API Gemini отсутствует. Пожалуйста, добавьте GEMINI_API_KEY в .env или укажите ключ в настройках.",
    });
  }

  const { products, promptType, customPrompt } = req.body;
  if (!products || !Array.isArray(products) || products.length === 0) {
    return res.status(400).json({ error: "Список товаров пуст. Сначала выполните поиск или укажите SKU." });
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const subList = products.slice(0, AI_PRODUCT_LIMIT).map((p: any, idx: number) => ({
      no: idx + 1,
      id: p.id,
      brand: p.brand,
      name: p.name,
      price: p.priceDiscounted,
      walletPrice: p.priceWallet,
      rating: p.rating,
      reviews: p.feedbacks,
      stock: p.totalStock,
      promo: p.isPromo || "Нет",
      warehouses: p.stocksDetail,
      seller: p.supplier,
    }));

    let systemInstruction = "Вы — профессиональный аналитик маркетплейса Wildberries и коммерческий директор. Выдавайте глубокие, обоснованные аналитические записки на русском языке.";
    let promptText = "";

    if (promptType === "niche") {
      promptText = `
Проанализируй следующую выборку товаров с Wildberries (топ-${subList.length} товаров):
${JSON.stringify(subList, null, 2)}

Выполни детальный анализ ниши:
1. Концентрация брендов (кто доминирует, есть ли у монополистов слабые места)
2. Анализ спроса и запасов (соотношение отзывов/рейтинга и складских запасов, у каких товаров дефицит)
3. Оценка рекламной выдачи (насколько эффективны платные промо-места, судя по рейтингу и популярности)
4. Потенциал входа в нишу: Конкретный пошаговый вывод для нового продавца.
Выдавай структурированный, лаконичный ответ в Markdown. Использовать таблицы не нужно, делай упор на списки и проценты.
`;
    } else if (promptType === "pricing") {
      promptText = `
Проанализируй ценовой ландшафт по этой выборке:
${JSON.stringify(subList, null, 2)}

Сделай ценовое ревью:
1. Выдели ключевые ценовые сегменты (Бюджет, Средний, Премиум). Какая доля товаров в каждом сегменте?
2. Оцени влияние скидок WB Кошелька. Насколько сильно Кошелек срезает конечную цену для покупателей?
3. Дай рекомендации селлеру: Какую оптимальную цену установить для новинки в этой нише, чтобы не демпинговать, но оставаться конкурентоспособным? На какие триггеры скидок сделать упор?
Дай структурированный отчет в Markdown.
`;
    } else if (promptType === "reviews") {
      promptText = `
Проанализируй потребительский фидбек и качество выдачи:
${JSON.stringify(subList, null, 2)}

Исследуй доверие:
1. Средний рейтинг в нише. Какие бренды имеют худший рейтинг и почему их всё равно покупают (или не покупают)?
2. Товары с аномалиями: Опиши товары с высоким ценником и низким рейтингом, или наоборот, бестселлеры с огромными отзывами по скромной цене.
3. Чек-лист качества: Напиши практический чек-лист по качеству карточки (на основе рейтинга топ-игроков) для опережения конкурентов.
`;
    } else {
      promptText = `
Данные товаров Wildberries для свободного анализа:
${JSON.stringify(subList, null, 2)}

Пользовательский запрос для анализа:
"${customPrompt || "Сделай общий коммерческий вывод по этой нише товаров"}"
`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: { systemInstruction, temperature: 0.7 },
    });

    res.json({ success: true, text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/seo-optimize", async (req, res) => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return res.status(400).json({
      error: "Ключ API Gemini отсутствует. Пожалуйста, добавьте GEMINI_API_KEY в .env или укажите ключ в настройках.",
    });
  }

  const { name, brand, currentDescription, characteristics, requestType } = req.body;

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } },
    });

    const isSeo = requestType === "seo";
    const systemInstruction = "Вы — эксперт по копирайтингу для маркетплейсов и SEO-сервисов (MPSTATS, Hunter Sales). Вы отлично пишете тексты, богатые ключевыми словами, но легкие для чтения человеком.";

    const promptText = `
Товар: ${name} (Бренд: ${brand})
Действующее описание:
"${currentDescription || "Отсутствует"}"

Характеристики товара:
${JSON.stringify(characteristics || [], null, 2)}

Задание:
${isSeo ? `
Напиши оптимизированное SEO-описание для карточки товара на Wildberries.
Правила:
1. Органично встрой ключевые фразы, релевантные характеристикам (размеры, состав, типы применения, поводы покупки).
2. Раздели текст на логические блоки с красивыми заголовками.
3. Сделай текст читаемым, убери бессмысленный спам ключевых слов. Оставь только профессиональный коммерческий язык.
4. Добавь блок "Преимущества товара" в виде маркированного списка.
` : `
Напиши яркий, эмоциональный продающий текст для инстаграма/телеграма/карточки товара Wildberries, который цепляет взгляд покупателя с первой секунды!
Правила:
1. Выдели боли клиента и покажи, как наш товар их решает.
2. Используй короткие, сочные абзацы, интригующие вопросы.
3. Сформулируй классный закрывающий призыв к покупке ("Добавьте в корзину...").
4. Сохрани 5-7 ключевых технических характеристик в стильной выжимке.
`}

Напиши ответ красивым форматированием в Markdown без лишних вступлений вроде "Вот ваше описание:". Начни сразу с текста.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: { systemInstruction, temperature: 0.8 },
    });

    res.json({ success: true, text: response.text });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
