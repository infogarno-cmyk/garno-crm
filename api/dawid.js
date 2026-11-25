// ─── DAWID · серверная функция Vercel: читает карточку лида и фото, возвращает параметры кухни ───
// POST /api/dawid  { lead:{notes,source,clientLang,term,name}, files:[{name,type,data(base64)}] }
// Заголовок Authorization: Bearer <токен входа в CRM> — проверяется в Supabase, чужим не ответит.
// Ключ Claude — только в переменных окружения Vercel: ANTHROPIC_API_KEY (в браузер не попадает).
// Цену здесь НЕ считаем: модель только описывает кухню, цену считает код CRM (src/dawid/engine.js).

const SB_URL = process.env.SUPABASE_URL || "https://bnyjwjuejrfalbubdbcv.supabase.co";
const SB_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_frwr6x08dbBL1tfFlkb9iw_-egAa2Cm";
const MODEL = process.env.DAWID_MODEL || "claude-sonnet-5-5";

const SYSTEM = `Ты — Dawid, помощник проектанта кухонь GARNO (кухни на заказ, Варшава).
Тебе дают карточку лида из CRM: строку заявки с сайта-калькулятора, переписку клиента с ботом Erika, заметки менеджера и фото/планы, которые прислал клиент.
Твоя задача — НЕ считать цену, а точно описать кухню для расстановки шкафов. Ответь ОДНИМ вызовом инструмента kitchen_params (обязательно, ровно один раз). Текстом не отвечай.

Как читать данные:
- Строка заявки: «Prosta / Narożna / W kształcie litery U / Z wyspą · 500 × 300 × 200 · материал · AGD». Числа — длины стен в см в этом порядке. Размеры бери у клиента: из заявки, переписки, плана. Если план явно противоречит заявке (например, клиент вписал размер из ванной), бери размеры с плана и добавь вопрос клиенту.
- Переписка с Erika: пожелания клиента (верхние шкафы только на одной стене, духовка с микроволновкой в колонне, холодильник, что на острове, подсветка).
- Фото пустой комнаты: выводы воды → мойка, решётки вентиляции / вывод под вытяжку → плита, окна → без верхних шкафов, мойка часто под окном. План застройщика: значки мойки и плиты показывают задуманные места.
- Фото-пример «хочу в таком стиле» — это пожелания (колонна с духовкой, подсветка, остров), а не размеры.
- Таблицы с ценами, бланки просчёта, коммерческие предложения на картинках ИГНОРИРУЙ — это работа менеджера, не данные клиента.

Стены и координаты (важно, по ним код ставит шкафы):
- shape "I": одна стена, center_cm — от левого края, если стоять лицом к стене.
- shape "L": стена 0 — от её свободного конца (x=0) к углу (x=len); стена 1 — от угла (x=0) к её свободному концу.
- shape "U": стена 0 — от свободного конца к углу со стеной 1; стена 1 (основание) — от угла со стеной 0 к углу со стеной 2; стена 2 — от угла со стеной 1 к свободному концу.
- shape "II": две параллельные стены, у каждой x от левого края.
- Барная стойка/полуостров, примыкающая к ряду, — это стена (например, третья сторона U). Отдельно стоящий остров — island.
- len_cm — длина ряда мебели вдоль стены. Окна — диапазоны x на стене.

Если чего-то нет в данных — ставь обычный вариант и запиши в assumptions:
холодильник встроенный в пенале, духовка под плитой, посудомойка 60, верхние шкафы на стенах без окон, подсветки нет.
fridge "freestanding" — только если клиент явно говорит об отдельностоящем холодильнике (side-by-side, обычный «wolnostojąca»).
oven "column_microwave" — если клиент хочет духовку и микроволновку в колонне; "column" — духовка в колонне без СВЧ.
countertop "stone" — если клиент хочет кварц/камень/конгломерат/спек; "wood" — дерево; "standard" — плита/ламинат/«płyta wiórowa»; иначе "unknown".
summary, assumptions, questions — по-русски, коротко. questions — что менеджеру уточнить у клиента.`;

const TOOL = {
  name: "kitchen_params",
  description: "Параметры кухни для автоматической расстановки шкафов в CRM",
  input_schema: {
    type: "object",
    properties: {
      summary: { type: "string", description: "2–4 предложения: что за кухня и что хочет клиент" },
      shape: { type: "string", enum: ["I", "L", "U", "II"] },
      walls: {
        type: "array", minItems: 1, maxItems: 3,
        items: {
          type: "object",
          properties: {
            len_cm: { type: "number" },
            windows: { type: "array", items: { type: "object", properties: { from_cm: { type: "number" }, to_cm: { type: "number" } }, required: ["from_cm", "to_cm"] } },
            uppers: { type: "boolean", description: "нужны ли верхние шкафы на этой стене" },
          },
          required: ["len_cm", "uppers"],
        },
      },
      island: {
        type: "object", description: "только если есть отдельно стоящий остров",
        properties: { len_cm: { type: "number" }, hob: { type: "boolean" }, sink: { type: "boolean" }, bar: { type: "boolean" } },
        required: ["len_cm"],
      },
      sink: { type: "object", properties: { wall: { type: "integer" }, center_cm: { type: "number" }, on_island: { type: "boolean" } }, required: ["wall"] },
      hob: { type: "object", properties: { wall: { type: "integer" }, center_cm: { type: "number" }, on_island: { type: "boolean" } }, required: ["wall"] },
      fridge: { type: "string", enum: ["built_in", "freestanding", "none"] },
      fridge_width_cm: { type: "number" },
      oven: { type: "string", enum: ["under_hob", "column", "column_microwave"] },
      pantry: { type: "boolean", description: "клиент хочет высокий шкаф-пенал для продуктов" },
      dishwasher_cm: { type: "integer", enum: [0, 45, 60] },
      tall_wall: { type: "integer", description: "на какой стене колонны (холодильник/духовка), если понятно" },
      tall_end: { type: "string", enum: ["start", "end"] },
      led: { type: "boolean", description: "клиент сам просит подсветку" },
      countertop: { type: "string", enum: ["standard", "stone", "wood", "unknown"] },
      assumptions: { type: "array", items: { type: "string" } },
      questions: { type: "array", items: { type: "string" } },
      confidence: { type: "string", enum: ["high", "medium", "low"] },
    },
    required: ["summary", "shape", "walls", "sink", "hob", "fridge", "oven", "dishwasher_cm", "countertop", "assumptions", "questions", "confidence"],
  },
};

const OK_TYPES = /^(image\/(jpeg|png|webp|gif)|application\/pdf)$/;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(503).json({ error: "NO_KEY", message: "В Vercel не задан ANTHROPIC_API_KEY" });

  // только для вошедших в CRM
  const tok = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!tok || tok === SB_KEY) return res.status(401).json({ error: "AUTH", message: "Нужен вход в CRM" });
  try {
    const u = await fetch(`${SB_URL}/auth/v1/user`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${tok}` } });
    if (!u.ok) return res.status(401).json({ error: "AUTH", message: "Сессия CRM недействительна — войдите заново" });
  } catch (e) { return res.status(502).json({ error: "AUTH_NET", message: "Не удалось проверить вход" }); }

  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  const lead = (body && body.lead) || {};
  const files = ((body && body.files) || []).filter(f => f && OK_TYPES.test(f.type || "") && typeof f.data === "string").slice(0, 8);

  const content = [];
  files.forEach((f, i) => {
    if (f.type === "application/pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.data } });
    else content.push({ type: "image", source: { type: "base64", media_type: f.type, data: f.data } });
    content.push({ type: "text", text: `↑ файл ${i + 1}: ${String(f.name || "").slice(0, 80)}` });
  });
  const txt = [
    `Заметки лида (заявка с сайта, переписка с Erika, заметки менеджера):\n${String(lead.notes || "—").slice(0, 8000)}`,
    `Источник: ${lead.source || "—"} · язык клиента: ${lead.clientLang || "—"} · срок: ${lead.term || "—"}`,
    files.length ? `Файлов от клиента: ${files.length} (выше).` : "Файлов нет — опирайся только на текст.",
    "Заполни kitchen_params.",
  ].join("\n\n");
  content.push({ type: "text", text: txt });

  const ac = new AbortController(); const t = setTimeout(() => ac.abort(), 55000);
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", signal: ac.signal,
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        // Claude Sonnet 5.5: принудительный tool_choice ("tool"/"any") и temperature запрещены,
        // мышление включено по умолчанию и входит в max_tokens → auto + явная просьба вызвать инструмент.
        model: MODEL, max_tokens: 16000, system: SYSTEM,
        output_config: { effort: process.env.DAWID_EFFORT || "medium" },
        tools: [TOOL], tool_choice: { type: "auto" },
        messages: [{ role: "user", content }],
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: "CLAUDE", message: (j.error && j.error.message) || `Claude HTTP ${r.status}` });
    const blocks = j.content || [];
    let input = (blocks.find(c => c.type === "tool_use" && c.name === "kitchen_params") || {}).input;
    if (!input) { // запасной путь: модель ответила текстом — ищем JSON в тексте
      const txt = blocks.filter(c => c.type === "text").map(c => c.text).join("\n");
      const m = txt.match(/\{[\s\S]*\}/); try { input = m ? JSON.parse(m[0]) : null; } catch (e) { input = null; }
      if (input && !input.walls) input = null;
    }
    if (!input) return res.status(502).json({ error: "CLAUDE_EMPTY", message: `Claude не вернул параметры (stop: ${j.stop_reason || "?"})` });
    return res.status(200).json({ params: input, model: j.model || MODEL, usage: j.usage || null, files: files.map(f => f.name) });
  } catch (e) {
    return res.status(504).json({ error: e.name === "AbortError" ? "TIMEOUT" : "NET", message: e.name === "AbortError" ? "Claude думал дольше 55 с — попробуйте ещё раз" : String(e.message || e) });
  } finally { clearTimeout(t); }
};
