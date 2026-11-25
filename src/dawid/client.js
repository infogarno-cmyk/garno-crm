// ─── DAWID · браузерная часть: собрать файлы лида и спросить /api/dawid ───────
// Файлы лида лежат в закрытом хранилище Supabase; CRM уже умеет их скачивать (leadFileUrl).
// Фото уменьшаем до 1568 px (так их видит Claude), PDF — до 2,5 МБ. Весь запрос — не больше ~3,8 МБ
// (у Vercel лимит 4,5 МБ на тело запроса).

const MAX_IMG = 1568, JPEG_Q = 0.82, MAX_PDF = 2.5e6, MAX_TOTAL = 3.8e6, MAX_FILES = 6;

const isImg = f => /^image\/(jpeg|png|webp|gif)$/i.test(f.type || "") || /\.(jpe?g|png|webp|gif)$/i.test(f.name || "");
const isPdf = f => /pdf/i.test(f.type || "") || /\.pdf$/i.test(f.name || "");

// какие файлы отдаём: фото и PDF клиента. Не отдаём наброски просчёта и то, что загрузили уже в момент «Просчёт готов»
// (обычно это бланк менеджера с ценами — Dawid должен считать сам, а не списывать).
export function pickLeadFiles(lead) {
  const ready = lead && lead.quoteReadyAt ? +lead.quoteReadyAt - 10 * 60000 : Infinity;
  return (lead.files || [])
    .filter(f => f && f.path && (isImg(f) || isPdf(f)))
    .filter(f => !/^szkic_/i.test(f.name || ""))
    .filter(f => !(f.at && +f.at >= ready))
    .sort((a, b) => (+a.at || 0) - (+b.at || 0))
    .slice(0, MAX_FILES);
}

const toB64 = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(",")[1] || ""); r.onerror = rej; r.readAsDataURL(blob); });

async function shrinkImage(blob) {
  try {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, MAX_IMG / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height); g.drawImage(bmp, 0, 0, c.width, c.height);
    const out = await new Promise(r => c.toBlob(r, "image/jpeg", JPEG_Q));
    return out || blob;
  } catch { return null; } // HEIC и прочее, что браузер не открывает, — пропускаем
}

export async function collectFiles(lead, leadFileUrl, onStep) {
  const picked = pickLeadFiles(lead); const out = []; let total = 0; const skipped = [];
  for (const f of picked) {
    try {
      onStep && onStep(`файл ${out.length + 1}/${picked.length}`);
      const url = await leadFileUrl(f.path); const blob = await (await fetch(url)).blob();
      let type, data;
      if (isPdf(f)) { if (blob.size > MAX_PDF) { skipped.push(f.name); continue; } type = "application/pdf"; data = await toB64(blob); }
      else { const small = await shrinkImage(blob); if (!small) { skipped.push(f.name); continue; } type = "image/jpeg"; data = await toB64(small); }
      if (total + data.length > MAX_TOTAL) { skipped.push(f.name); continue; }
      total += data.length; out.push({ name: f.name || "plik", type, data });
    } catch { skipped.push(f.name); }
  }
  return { files: out, skipped };
}

// auth — строка «Bearer <token>» из CRM (SB_HDR.Authorization)
export async function askDawid({ lead, leadFileUrl, auth, onStep, term }) {
  onStep && onStep("собираю фото и планы");
  const { files, skipped } = await collectFiles(lead, leadFileUrl, onStep);
  onStep && onStep(files.length ? `Dawid смотрит ${files.length} файл(ов) и заявку` : "Dawid читает заявку");
  let r;
  try {
    r = await fetch("/api/dawid", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth || "" },
      body: JSON.stringify({ lead: { notes: lead.notes || "", source: lead.source || "", clientLang: lead.clientLang || "", term: term || "" }, files }),
    });
  } catch (e) { const er = new Error("Нет связи с сервером Dawid"); er.code = "NET"; throw er; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const er = new Error(j.message || `Сервер Dawid: HTTP ${r.status}`); er.code = j.error || (r.status === 404 ? "NO_API" : "HTTP"); throw er; }
  return { params: j.params, model: j.model, files: j.files || files.map(f => f.name), skipped };
}
