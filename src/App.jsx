import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const FB_TOKEN = Deno.env.get("FB_ACCESS_TOKEN")!
const FB_TOKEN_CZ = Deno.env.get("FB_ACCESS_TOKEN_CZ") || FB_TOKEN  // System User token for CZ BM account
const FB_ACCOUNT_1 = Deno.env.get("FB_ACCOUNT_PL")!
const FB_ACCOUNT_2 = Deno.env.get("FB_ACCOUNT_PLUA")!
const FB_ACCOUNT_CZ = Deno.env.get("FB_ACCOUNT_CZ")!

// Region is decided by campaign NAME, not by account — a campaign can live in any BM's account.
// D{15.09}CZ/...  →  CZ ;  I{10.09}UAPL/... → PL ;  UACZ → CZ ;  UA → PL
// Регион по имени кампании. GEO берём строго из головы имени — сразу после «}».
// Раньше искали "CZ" по всей строке, и польская кампания с «(cz)» или «kuchnia-cz»
// в середине названия уезжала в чешский регион вместе со своим спендом.
// Поиск по всей строке оставлен только как запасной вариант — для имён без скобки.
function nameRegion(name: string): string {
  const n = (name || "").replace(/\\/g, "").toUpperCase()
  const i = n.indexOf("}")
  if (i >= 0) {
    const a = n.substring(i + 1, i + 7)   // PL / PLUA / CZ / CZUA / UA / UACZ
    if (a.startsWith("CZ")) return "CZ"
    if (a.startsWith("UACZ")) return "CZ"
    if (a.startsWith("PL")) return "PL"
    if (a.startsWith("UAPL")) return "PL"
    if (a.startsWith("UA")) return "PL"    // UA без префикса — украинская связка польского региона
  }
  return n.includes("CZ") ? "CZ" : "PL"
}

// ── Регион по КАБИНЕТУ ──
// Кабинеты чистые: польский содержит только PL и PLUA, чешский — только CZ и CZUA.
// Кабинет не ошибается, а имя пишется руками: в чешском кабинете находились кампании
// с опечаткой «PL» в голове, и их спенд уезжал в Польшу. Поэтому решает кабинет,
// а имя — только запасной вариант, если кабинет почему-то неизвестен.
const ACC_REGION: Record<string, string> = (() => {
  const m: Record<string, string> = {}
  const put = (id: string | undefined, reg: string) => { if (id) m[String(id).replace(/^act_/, "").trim()] = reg }
  put(Deno.env.get("FB_ACCOUNT_PL"), "PL")
  put(Deno.env.get("FB_ACCOUNT_PLUA"), "PL")
  put(Deno.env.get("FB_ACCOUNT_CZ"), "CZ")
  // Подтверждённые кабинеты. Перекрывают env: однажды там уже был дубль,
  // когда чешский кабинет числился сразу под двумя переменными.
  m["365036380705019"] = "PL"   // DIMA SOC — PL, PLUA
  m["277964906875809"] = "CZ"   // чешский — CZ, CZUA
  // Явная настройка перекрывает всё: ACCOUNT_REGIONS=111:PL,222:CZ
  for (const pair of (Deno.env.get("ACCOUNT_REGIONS") || "").split(",")) {
    const [id, reg] = pair.split(":").map(x => (x || "").trim())
    if (id && (reg === "PL" || reg === "CZ")) m[id.replace(/^act_/, "")] = reg
  }
  return m
})()
function regionOf(accId: string, name: string): string {
  return ACC_REGION[String(accId || "").replace(/^act_/, "")] || nameRegion(name)
}
// Each ad account paired with the ONE token that has access to it.
// Deduped by account id — the same account is configured under more than one env var
// (FB_ACCOUNT_2 === FB_ACCOUNT_CZ), and without this every campaign in it gets counted twice.
function accountTokenPairs(): [string, string][] {
  const seen = new Set<string>()
  const out: [string, string][] = []
  for (const [acc, tok] of [[FB_ACCOUNT_CZ, FB_TOKEN_CZ], [FB_ACCOUNT_1, FB_TOKEN], [FB_ACCOUNT_2, FB_TOKEN]] as [string, string][]) {
    if (!acc || seen.has(acc)) continue
    seen.add(acc)
    out.push([acc, tok])
  }
  return out
}
// Which token to try FIRST for a given region (best guess) — a campaign's real account
// can differ from what its name implies, so single-object calls always fall back to the other token too.
function tokenForRegion(region: string): string {
  return region === "CZ" ? FB_TOKEN_CZ : FB_TOKEN
}
function otherToken(token: string): string { return token === FB_TOKEN_CZ ? FB_TOKEN : FB_TOKEN_CZ }
// Try a Graph API call with the region-guessed token; if Meta refuses (wrong account/BM), retry with the other token.
// Meta всегда присылает code и error_subcode — именно по ним видно, что произошло:
// 190 — токен недействителен, 17/2446079 — лимит пользователя, 4 — лимит приложения,
// 200/10/272 — не хватает прав. Без них остаётся только гадать по тексту.
function fbErr(e: any): string {
  if (!e) return "неизвестная ошибка"
  const c = e.code, sc = e.error_subcode
  const hint = c === 190 ? " — токен недействителен, перевыпусти"
    : (c === 17 || sc === 2446079) ? " — лимит запросов пользователя, снимается сам"
    : c === 4 ? " — лимит запросов приложения, снимается сам"
    : (c === 200 || c === 10 || c === 272) ? " — нет прав ads_read на этот кабинет"
    : c === 100 ? " — неверные параметры запроса"
    : ""
  return `${e.message || e.type || "ошибка"} [code ${c ?? "?"}${sc ? "/" + sc : ""}]${hint}`
}

async function fbFetchWithFallback(urlFor: (token: string) => string, region: string, init?: RequestInit): Promise<any> {
  const t1 = tokenForRegion(region)
  const r1 = await fetch(urlFor(t1), init)
  noteUsage(r1.headers)
  let j = await r1.json()
  if (j.error && FB_TOKEN_CZ !== FB_TOKEN) {
    const t2 = otherToken(t1)
    const j2 = await (await fetch(urlFor(t2), init)).json()
    if (!j2.error) return j2
  }
  return j
}

// Meta в каждом ответе сообщает, насколько заполнены её корзины лимитов.
// Запоминаем худшую и отдаём клиенту — чтобы CRM тормозила сама, до блокировки,
// а не узнавала о лимите из отказа.
let LAST_USAGE: any = null
function noteUsage(h: Headers) {
  try {
    const raw = h.get("x-business-use-case-usage")
    if (!raw) return
    const o = JSON.parse(raw)
    for (const v of Object.values(o)) for (const u of (Array.isArray(v) ? v : [v]) as any[]) {
      const worst = Math.max(u.call_count || 0, u.total_cputime || 0, u.total_time || 0)
      if (!LAST_USAGE || worst > LAST_USAGE.pct)
        LAST_USAGE = { pct: worst, type: u.type || "—", wait_min: u.estimated_time_to_regain_access || 0 }
    }
  } catch { /* заголовка нет или он не разобрался */ }
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const json = (data: unknown, status = 200) => {
  // к каждому ответу прикладываем заполнение корзины — по нему CRM тормозит заранее
  const body: any = (data && typeof data === "object" && !Array.isArray(data)) ? { ...data as any } : data
  if (body && typeof body === "object" && LAST_USAGE) body.usage = LAST_USAGE
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } })
}

// ── Общий кеш ответов Meta ──
// Раньше кеш жил в браузере, в sessionStorage: у каждой вкладки, телефона, Telegram-браузера
// и каждого баера — свой, и после перезагрузки пустой. Пять открытий CRM за час = пять полных
// походов в Meta. Теперь ответ хранится в базе и один на всех: первый запрос идёт в Meta,
// остальные в течение TTL получают сохранённый.
const CACHE_URL = Deno.env.get("JDL_SUPABASE_URL") || Deno.env.get("SUPABASE_URL") || ""
const CACHE_KEY = Deno.env.get("JDL_SUPABASE_SERVICE_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
const MIN = 60000
const CACHE_TTL: Record<string, number> = {
  reconcile: 10 * MIN, get_bulk_insights: 10 * MIN, get_campaign_insights: 10 * MIN,
  get_adset_insights: 10 * MIN, get_object_insights: 10 * MIN, get_adsets: 15 * MIN,
  get_campaign_video: 30 * MIN, get_ads: 30 * MIN, get_campaigns: 30 * MIN, adset_statuses: 10 * MIN,
}
const todayUTC = () => new Date().toISOString().split("T")[0]
function cacheTtl(body: any): number {
  const base = CACHE_TTL[body?.action || "get_campaigns"] || 0
  if (!base) return 0
  // период целиком в прошлом: цифры Meta за закрытые дни уже не меняются
  const until = body.until || body.since
  if (until && until < todayUTC()) return Math.max(base, 6 * 60 * MIN)
  return base
}
async function cacheKey(body: any): Promise<string> {
  const { force: _f, opt: _o, ...rest } = body || {}
  const sorted = JSON.stringify(rest, Object.keys(rest).sort())
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sorted))
  return (rest.action || "get_campaigns") + ":" + Array.from(new Uint8Array(h)).slice(0, 16).map(b => b.toString(16).padStart(2, "0")).join("")
}
const cacheHdr = () => ({ apikey: CACHE_KEY, Authorization: "Bearer " + CACHE_KEY, "Content-Type": "application/json" })
async function cacheGet(key: string, ttl: number): Promise<any | null> {
  if (!CACHE_URL || !CACHE_KEY) return null
  try {
    const r = await fetch(`${CACHE_URL}/rest/v1/meta_cache?key=eq.${encodeURIComponent(key)}&select=data,at`, { headers: cacheHdr() })
    const a = await r.json()
    const row = Array.isArray(a) ? a[0] : null
    if (row && Date.now() - new Date(row.at).getTime() < ttl) return row.data
  } catch { /* кеша нет — идём в Meta */ }
  return null
}
// после включения/выключения адсета старые ответы со статусами адсетов недействительны
async function cacheDropAdsets() {
  if (!CACHE_URL || !CACHE_KEY) return
  try {
    for (const p of ["get_adsets", "adset_statuses"])
      await fetch(`${CACHE_URL}/rest/v1/meta_cache?key=like.${p}:*`, { method: "DELETE", headers: cacheHdr() })
  } catch { /* не страшно */ }
}
async function cachePut(key: string, data: any) {
  if (!CACHE_URL || !CACHE_KEY) return
  try {
    await fetch(`${CACHE_URL}/rest/v1/meta_cache?on_conflict=key`, { method: "POST",
      headers: { ...cacheHdr(), Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify({ key, data, at: new Date().toISOString() }) })
  } catch { /* не сохранилось — не страшно */ }
}

function parseInsightRow(row: any) {
  const spend = Math.round(parseFloat(row.spend || "0") * 100) / 100
  let leads = 0
  for (const a of (row.actions || [])) if (a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped") leads += parseInt(a.value || "0")
  let avgView = 0, videoViews = 0
  for (const a of (row.video_avg_time_watched_actions || [])) if (a.action_type === "video_view") avgView = Math.round(parseFloat(a.value || "0") * 10) / 10
  // досмотры 3 сек — для этапа «Интерес к видосу» в конструкторе воронок
  for (const a of (row.actions || [])) if (a.action_type === "video_view") videoViews += parseInt(a.value || "0")
  return { video_views: videoViews, spend, impressions: parseInt(row.impressions || "0"), reach: parseInt(row.reach || "0"),
    clicks: parseInt(row.inline_link_clicks || "0"), ctr: Math.round(parseFloat(row.inline_link_click_ctr || "0") * 100) / 100,
    cpc: Math.round(parseFloat(row.cost_per_inline_link_click || "0") * 100) / 100, cpm: Math.round(parseFloat(row.cpm || "0") * 100) / 100,
    frequency: Math.round(parseFloat(row.frequency || "0") * 100) / 100, avg_view_time: avgView, leads, cpl: leads > 0 ? Math.round(spend / leads * 100) / 100 : 0 }
}
const INS_FIELDS = "spend,impressions,reach,inline_link_clicks,inline_link_click_ctr,cost_per_inline_link_click,cpm,frequency,actions,video_avg_time_watched_actions"

async function fetchInsights(objectId: string, since: string, until: string, region: string = "PL") {
  const fields = [
    "spend",
    "impressions",
    "reach",
    "inline_link_clicks",
    "inline_link_click_ctr",
    "cost_per_inline_link_click",
    "cpm",
    "frequency",
    "actions",
    "video_avg_time_watched_actions",
  ].join(",")

  // No time_increment — single row for the whole period
  const tr = encodeURIComponent(`{"since":"${since}","until":"${until}"}`)
  // Object may actually live under the other BM's account than its name implies — try both tokens.
  const j = await fbFetchWithFallback(token => `https://graph.facebook.com/v19.0/${objectId}/insights?fields=${fields}&time_range=${tr}&access_token=${token}`, region)
  if (j.error) throw new Error(fbErr(j.error))

  const row = j.data?.[0] || {}

  const spend = Math.round(parseFloat(row.spend || "0") * 100) / 100
  const impressions = parseInt(row.impressions || "0")
  const reach = parseInt(row.reach || "0")
  const linkClicks = parseInt(row.inline_link_clicks || "0")
  const frequency = Math.round(parseFloat(row.frequency || "0") * 100) / 100
  const cpm = Math.round(parseFloat(row.cpm || "0") * 100) / 100

  // Use Meta's own calculated CTR and CPC (most accurate)
  const linkCtr = Math.round(parseFloat(row.inline_link_click_ctr || "0") * 100) / 100
  const linkCpc = Math.round(parseFloat(row.cost_per_inline_link_click || "0") * 100) / 100

  let leads = 0
  for (const a of (row.actions || [])) {
    if (a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped") {
      leads += parseInt(a.value || "0")
    }
  }

  let avgView = 0
  for (const a of (row.video_avg_time_watched_actions || [])) {
    if (a.action_type === "video_view") avgView = Math.round(parseFloat(a.value || "0") * 10) / 10
  }

  const cpl = leads > 0 ? Math.round(spend / leads * 100) / 100 : 0

  return { spend, impressions, reach, clicks: linkClicks, ctr: linkCtr, cpc: linkCpc, cpm, frequency, avg_view_time: avgView, leads, cpl }
}

serve(async function(req) {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS })
  const body = await req.json().catch(() => ({}))
  const ttl = cacheTtl(body)
  if (ttl && !body.force) {
    const key = await cacheKey(body)
    const hit = await cacheGet(key, ttl)
    // заполнение корзины в кеше устарело — не отдаём его, иначе CRM тормозит по старой цифре
    if (hit) { delete hit.usage; return new Response(JSON.stringify({ ...hit, cached: true }), { headers: { ...CORS, "Content-Type": "application/json" } }) }
    const res = await handle(body)
    try { const d = await res.clone().json(); if (d && d.ok) await cachePut(key, d) } catch { /* не json */ }
    return res
  }
  return handle(body)
})

async function handle(body: any): Promise<Response> {
  try {
    const action = body.action || "get_campaigns"

    if (action === "get_campaign_insights") {
      const { campaign_id, since, until } = body
      if (!campaign_id) return json({ error: "campaign_id required" }, 400)
      try {
        const data = await fetchInsights(campaign_id, since || new Date(Date.now()-90*864e5).toISOString().split("T")[0], until || new Date().toISOString().split("T")[0], body.region)
        return json({ ok: true, campaign_id, ...data })
      } catch(e: any) { return json({ error: e.message }, 400) }
    }

    // ── get_bulk_insights — метрики по списку кампаний одним запросом ──
    if (action === "get_bulk_insights") {
      const ids: string[] = (body.campaign_ids || []).map(String).filter(Boolean).slice(0, 200)
      const since = body.since || new Date().toISOString().split("T")[0], until = body.until || since
      // Раньше — отдельный запрос в Meta на каждую кампанию: 30 РК в работе = 30 запросов
      // при каждом открытии «Заливов». Теперь один запрос на кабинет с фильтром по id.
      const out: Record<string, any> = {}
      if (ids.length) {
        const tr = encodeURIComponent(`{"since":"${since}","until":"${until}"}`)
        const filt = encodeURIComponent(JSON.stringify([{ field: "campaign.id", operator: "IN", value: ids }]))
        for (const [accId, accToken] of accountTokenPairs()) {
          let url = `https://graph.facebook.com/v19.0/act_${accId}/insights?level=campaign&fields=campaign_id,${INS_FIELDS}&time_range=${tr}&filtering=${filt}&limit=500&access_token=${accToken}`
          let page = 0
          while (url && page < 5) {
            const r = await fetch(url); noteUsage(r.headers); const j = await r.json()
            if (j.error) break
            for (const row of (j.data || [])) if (row.campaign_id && !out[row.campaign_id]) out[row.campaign_id] = parseInsightRow(row)
            url = j.paging?.next || ""; page++
          }
        }
        // кампании без показов за период Meta не возвращает — отдаём нули, как раньше
        for (const id of ids) if (!out[id]) out[id] = parseInsightRow({})
      }
      return json({ ok: true, since, until, data: out })
    }

    if (action === "get_campaign_video") {
      const { campaign_id, since, until } = body
      if (!campaign_id) return json({ ok: false, error: "campaign_id required" })
      try {
        const data = await fetchInsights(campaign_id, since || new Date(Date.now()-90*864e5).toISOString().split("T")[0], until || new Date().toISOString().split("T")[0], body.region)
        return json({ ok: true, campaign_id, frequency: data.frequency, avg_view_time: data.avg_view_time })
      } catch(e: any) { return json({ ok: false, error: e.message }) }
    }

    // ── selftest — что на самом деле с токенами и кабинетами ──
    // Дёргает по одному дешёвому запросу на кабинет и показывает результат.
    // Отвечает на вопрос «лимит, мёртвый токен или права» однозначно.
    if (action === "selftest") {
      const deep = body.deep === true   // тяжёлую пробу статистики делаем только по запросу
      const out: any[] = []
      // Meta сама сообщает загрузку лимита в заголовке x-business-use-case-usage:
      // проценты по вызовам и процессорному времени и сколько минут до возврата доступа.
      // В заголовке несколько корзин — по одной на тип вызовов (ads_insights,
      // ads_management и т.д.). Раньше я брал только первую и потому не видел,
      // что упёрлась как раз другая.
      const usageAll = (h: Headers) => {
        const out: any[] = []
        for (const name of ["x-business-use-case-usage", "x-ad-account-usage", "x-app-usage"]) {
          const raw = h.get(name)
          if (!raw) continue
          try {
            const o = JSON.parse(raw)
            const lists = Array.isArray(o) ? [o] : Object.values(o)
            for (const v of lists) for (const u of (Array.isArray(v) ? v : [v])) {
              out.push({ заголовок: name, тип: u.type || "—", вызовы: (u.call_count ?? "—") + "%",
                процессор: (u.total_cputime ?? "—") + "%", время: (u.total_time ?? "—") + "%",
                ждать_мин: u.estimated_time_to_regain_access ?? 0 })
            }
          } catch { /* заголовок не разобрался — пропускаем */ }
        }
        return out
      }
      for (const [accId, accToken] of accountTokenPairs()) {
        const r1 = await fetch(
          `https://graph.facebook.com/v19.0/act_${accId}?fields=name,currency,account_status&access_token=${accToken}`)
        const j = await r1.json()
        // а теперь настоящий «тяжёлый» запрос — именно он упирается в лимит
        // проба статистики сама тратит ту корзину, которую измеряет — только по флагу deep
        const r2 = deep ? await fetch(
          `https://graph.facebook.com/v19.0/act_${accId}/insights?fields=spend&date_preset=today&limit=1&access_token=${accToken}`)
          : null
        const j2: any = r2 ? await r2.json() : {}
        // третья проба — ровно тот запрос, что падает в анализе: список адсетов
        const r3 = await fetch(
          `https://graph.facebook.com/v19.0/act_${accId}/adsets?fields=id&limit=1&access_token=${accToken}`)
        const j3 = await r3.json()
        const use = [...usageAll(r3.headers), ...(r2 ? usageAll(r2.headers) : []), ...usageAll(r1.headers)]
        const worst = use.slice().sort((a, b) =>
          (parseFloat(b.процессор) || 0) + (parseFloat(b.вызовы) || 0)
          - (parseFloat(a.процессор) || 0) - (parseFloat(a.вызовы) || 0))[0] || null
        out.push({
          account: accId,
          token: accToken === FB_TOKEN_CZ && FB_TOKEN_CZ !== FB_TOKEN ? "FB_ACCESS_TOKEN_CZ" : "FB_ACCESS_TOKEN",
          token_tail: String(accToken || "").slice(-6),
          ok: !j.error,
          name: j.name || null,
          account_status: j.account_status ?? null,
          insights_ok: deep ? !j2.error : "не проверял",
          insights_error: j2.error ? fbErr(j2.error) : null,
          adsets_ok: !j3.error,
          adsets_error: j3.error ? fbErr(j3.error) : null,
          худшая_корзина: worst ? worst.тип : "—",
          лимит_вызовы: worst ? worst.вызовы : "—",
          лимит_процессор: worst ? worst.процессор : "—",
          ждать_мин: worst ? worst.ждать_мин : "—",
          все_корзины: use,
          error: j.error ? fbErr(j.error) : null,
          code: j.error?.code ?? j2.error?.code ?? null,
          subcode: j.error?.error_subcode ?? j2.error?.error_subcode ?? null,
        })
      }
      // чей это токен: у личного в /me стоит имя человека, у системного — имя System User.
      // Лимит 17/2446079 бьёт именно по личным токенам.
      let whoami: any = null
      try {
        const me = await (await fetch(
          `https://graph.facebook.com/v19.0/me?fields=id,name&access_token=${FB_TOKEN}`)).json()
        whoami = me.error ? { error: fbErr(me.error) } : { id: me.id, name: me.name }
      } catch (e) { whoami = { error: String(e) } }
      const tokens = [...new Set(out.map(o => o.token))]
      return json({ ok: true, accounts: out, tokens_used: tokens, whoami,
        verdict: out.some(o => !o.adsets_ok) ? "Список адсетов недоступен: " + (out.find(o => !o.adsets_ok)?.adsets_error || "")
          : out.some(o => !o.insights_ok) ? "Статистика недоступна: " + (out.find(o => !o.insights_ok)?.insights_error || "")
          : out.some(o => parseFloat(String(o["лимит_вызовы"])) > 80 || parseFloat(String(o["лимит_процессор"])) > 80)
            ? "Лимит Meta почти исчерпан — запросы начнут отбиваться. Смотри столбец ждать_мин"
          : out.every(o => o.ok) ? "Доступ и лимиты в порядке — причина в конкретном запросе, не в доступе"
          : out.every(o => o.code === 190) ? "Все токены недействительны — перевыпусти System User token"
          : out.some(o => o.code === 17 || o.subcode === 2446079) ? "Лимит запросов пользователя — ждать, это снимается само"
          : out.some(o => o.code === 4) ? "Лимит запросов приложения — ждать"
          : out.some(o => [200, 10, 272].includes(o.code)) ? "Нет прав ads_read на кабинет — выдай доступ в Business Manager"
          : "Смешанный результат, смотри таблицу" })
    }

    // ── adset_statuses — статусы всех адсетов списка кампаний, один запрос на кабинет ──
    // Нужен, чтобы домены освобождались сами, когда адсет выключили — в CRM или прямо в Ads Manager.
    if (action === "adset_statuses") {
      const ids: string[] = (body.campaign_ids || []).map(String).filter(Boolean).slice(0, 300)
      const out: any[] = []
      if (ids.length) {
        const filt = encodeURIComponent(JSON.stringify([{ field: "campaign.id", operator: "IN", value: ids }]))
        for (const [accId, accToken] of accountTokenPairs()) {
          let url = `https://graph.facebook.com/v19.0/act_${accId}/adsets?fields=id,name,campaign_id,status,effective_status,created_time&filtering=${filt}&limit=500&access_token=${accToken}`
          let page = 0
          while (url && page < 5) {
            const r = await fetch(url); noteUsage(r.headers); const j = await r.json()
            if (j.error) break
            for (const a of (j.data || [])) out.push({ id: a.id, name: a.name, campaign_id: a.campaign_id, status: a.status, effective_status: a.effective_status })
            url = j.paging?.next || ""; page++
          }
        }
      }
      return json({ ok: true, adsets: out })
    }

    if (action === "get_adsets") {
      const { campaign_id } = body
      if (!campaign_id) return json({ error: "campaign_id required" }, 400)
      const j = await fbFetchWithFallback(token => `https://graph.facebook.com/v19.0/${campaign_id}/adsets?fields=id,name,status,effective_status,daily_budget,created_time&limit=100&access_token=${token}`, body.region)
      if (j.error) return json({ error: fbErr(j.error) }, 400)
      return json({ ok: true, campaign_id, adsets: j.data || [] })
    }

    // ── get_ads — объявления адсета (или всей кампании) ──
    // Домен берём НЕ из названия, а из самого креатива: это ссылка, по которой
    // реально уходит человек. Названия пишутся руками и врут — мы на этом уже
    // обожглись на опечатке в имени кампании.
    if (action === "get_ads") {
      const { adset_id, campaign_id } = body
      const parent = adset_id || campaign_id
      if (!parent) return json({ error: "adset_id или campaign_id required" }, 400)
      const fields = [
        "id", "name", "status", "adset_id",
        "creative{object_story_spec,asset_feed_spec,effective_object_story_id,template_url}"
      ].join(",")
      const j = await fbFetchWithFallback(
        token => `https://graph.facebook.com/v19.0/${parent}/ads?fields=${encodeURIComponent(fields)}&limit=200&access_token=${token}`,
        body.region)
      if (j.error) return json({ error: fbErr(j.error) }, 400)

      const hostOf = (u: string) => {
        try { return new URL(u).hostname.replace(/^www[.]/, "").toLowerCase() } catch { return "" }
      }
      // ссылка может лежать в нескольких местах — обычное объявление,
      // динамический креатив и шаблон ведут себя по-разному
      const rawOf = (cr: any): string[] => {
        const out: string[] = []
        const push = (u: any) => { const v = String(u || "").trim(); if (/^https?:\/\//i.test(v) && !out.includes(v)) out.push(v) }
        const oss = cr?.object_story_spec
        push(oss?.link_data?.link)
        push(oss?.video_data?.call_to_action?.value?.link)
        ;(oss?.link_data?.child_attachments || []).forEach((c: any) => push(c?.link))
        ;(cr?.asset_feed_spec?.link_urls || []).forEach((l: any) => push(l?.website_url))
        push(cr?.template_url)
        return out
      }
      const linksOf = (cr: any): string[] => {
        const out: string[] = []
        const push = (u: any) => { const h = hostOf(String(u || "")); if (h && !out.includes(h)) out.push(h) }
        const oss = cr?.object_story_spec
        push(oss?.link_data?.link)
        push(oss?.link_data?.caption)
        push(oss?.video_data?.call_to_action?.value?.link)
        ;(oss?.link_data?.child_attachments || []).forEach((c: any) => push(c?.link))
        ;(cr?.asset_feed_spec?.link_urls || []).forEach((l: any) => push(l?.website_url))
        push(cr?.template_url)
        return out
      }

      const ads = (j.data || []).map((a: any) => {
        const domains = linksOf(a.creative)
        return {
          id: a.id, name: a.name, status: a.status, adset_id: a.adset_id,
          links: rawOf(a.creative),         // полные ссылки — по ним CRM находит кальку
          domains,                          // все найденные хосты
          domain: domains[0] || "",         // основной
          multi: domains.length > 1         // объявление ведёт на несколько доменов
        }
      })
      return json({ ok: true, parent, count: ads.length, ads })
    }

    // ── get_object_insights — статистика любого объекта: кампании, адсета, объявления ──
    if (action === "get_object_insights") {
      const { object_id, since, until } = body
      if (!object_id) return json({ error: "object_id required" }, 400)
      try {
        const data = await fetchInsights(
          object_id,
          since || new Date(Date.now() - 90 * 864e5).toISOString().split("T")[0],
          until || new Date().toISOString().split("T")[0],
          body.region)
        return json({ ok: true, object_id, ...data })
      } catch (e: any) { return json({ ok: false, error: e.message }) }
    }

    // ── set_adset_status — включить/выключить адсет ──
    if (action === "set_adset_status") {
      const { adset_id, status } = body
      if (!adset_id || !["ACTIVE","PAUSED"].includes(status)) return json({ error: "adset_id + status(ACTIVE|PAUSED) required" }, 400)
      const j = await fbFetchWithFallback(
        token => `https://graph.facebook.com/v19.0/${adset_id}?status=${status}&access_token=${token}`,
        body.region,
        { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      )
      if (j.error) return json({ ok: false, error: fbErr(j.error) })
      await cacheDropAdsets()
      return json({ ok: true, adset_id, status })
    }

    if (action === "get_adset_insights") {
      const { adset_id, since, until } = body
      if (!adset_id) return json({ error: "adset_id required" }, 400)
      try {
        const data = await fetchInsights(adset_id, since || new Date(Date.now()-90*864e5).toISOString().split("T")[0], until || new Date().toISOString().split("T")[0], body.region)
        return json({ ok: true, adset_id, ...data })
      } catch(e: any) { return json({ error: e.message }, 400) }
    }

    // ── reconcile: EVERY campaign with spend in the period, straight from the ad accounts ──
    // Used to find what Meta bills that the CRM isn't counting (not imported, no campaign_id, togo, misrouted).
    if (action === "reconcile") {
      const region = body.region || "PL"
      const since = body.since, until = body.until || since
      if (!since) return json({ error: "since required" }, 400)
      const rows: any[] = []
      const seenCamp = new Set<string>()   // one row per campaign, whatever account it came back from
      const accs: any[] = []
      for (const [accId, accToken] of accountTokenPairs()) {
        try {
          // валюта и имя кабинета приходят в самих строках — отдельный запрос не нужен
          const cur: any = {}
          const tr = encodeURIComponent(`{"since":"${since}","until":"${until}"}`)
          const inc = ""   // разбивка по дням у Meta сломана с 19.10 — дни запрашиваются по одному ниже
          let accSpend = 0
          const days: [string, string][] = []
          if (body.daily) { for (let d = since; d <= until && days.length < 45; d = new Date(new Date(d + "T12:00:00Z").getTime() + 864e5).toISOString().slice(0, 10)) days.push([d, d]) }
          else days.push([since, until])
          for (const [ds, de] of days) {
          const trd = encodeURIComponent(`{"since":"${ds}","until":"${de}"}`)
          let url = `https://graph.facebook.com/v19.0/act_${accId}/insights?level=campaign&fields=campaign_id,campaign_name,account_currency,account_name,spend,impressions,inline_link_clicks,date_start${inc}&time_range=${trd}&limit=500&access_token=${accToken}`
          let page = 0
          while (url && page < 40) {
            const rr = await fetch(url); noteUsage(rr.headers); const j = await rr.json()
            if (j.error) { accs.push({ account: accId, error: fbErr(j.error) }); break }
            for (const r of (j.data || [])) {
              if (!cur.currency && r.account_currency) { cur.currency = r.account_currency; cur.name = r.account_name }
              const sp = parseFloat(r.spend || 0)
              accSpend += sp
              const dedupKey = body.daily ? r.campaign_id + "|" + ds : r.campaign_id
              if (seenCamp.has(dedupKey)) continue
              seenCamp.add(dedupKey)
              rows.push({ campaign_id: r.campaign_id, name: r.campaign_name, spend: sp, imp: parseInt(r.impressions || 0), clicks: parseInt(r.inline_link_clicks || 0), day: body.daily ? ds : r.date_start, account_id: accId, currency: cur.currency || "?", region: regionOf(accId, r.campaign_name), name_region: nameRegion(r.campaign_name) })
            }
            url = j.paging?.next || ""
            page++
          }
          }
          accs.push({ account: accId, account_name: cur.name, currency: cur.currency, spend_all_regions: Math.round(accSpend * 100) / 100 })
        } catch (e: any) { accs.push({ account: accId, error: e.message }) }
      }
      const mine = rows.filter(r => r.region === region)
      const other = rows.filter(r => r.region !== region)
      const total = Math.round(mine.reduce((s, r) => s + r.spend, 0) * 100) / 100
      const currencies = [...new Set(rows.map(r => r.currency))]
      // `other` lets the client tell a genuinely misrouted RK from one that simply had no spend in the period
      let byDay: Record<string, { spend: number; imp: number; clicks: number }> | undefined
      if (body.daily) {
        byDay = {}
        for (const r of mine) {
          const e = byDay[r.day] || (byDay[r.day] = { spend: 0, imp: 0, clicks: 0 })
          e.spend += r.spend; e.imp += r.imp || 0; e.clicks += r.clicks || 0
        }
        for (const k of Object.keys(byDay)) byDay[k].spend = Math.round(byDay[k].spend * 100) / 100
      }
      return json({ ok: true, region, since, until, total, currencies, accounts: accs, campaigns: mine.sort((a, b) => b.spend - a.spend), other, byDay })
    }

    // get_campaigns default
    const region = body.region || "PL"
    const days = parseInt(body.days) || 3
    const campaigns: any[] = []
    const diag: any[] = []
    for (const [accId, accToken] of accountTokenPairs()) {
      try {
        const url = `https://graph.facebook.com/v19.0/act_${accId}/campaigns?fields=id,name,status,daily_budget,created_time&limit=500&access_token=${accToken}`
        const r = await fetch(url); const j = await r.json()
        if (j.error) { diag.push({ account: accId, error: fbErr(j.error) }); continue }
        const total = (j.data||[]).length
        const cutoff = new Date(Date.now()-days*864e5).toISOString()
        let matched = 0
        for (const camp of (j.data||[])) {
          if (camp.created_time < cutoff) continue
          if (regionOf(accId, camp.name) !== region) continue   // импорт тоже по кабинету
          campaigns.push({ id: camp.id, name: camp.name, status: camp.status, daily_budget: camp.daily_budget, created_time: camp.created_time, account_id: accId }); matched++
        }
        diag.push({ account: accId, total_in_account: total, within_days: matched })
      } catch(e) { diag.push({ account: accId, error: String(e) }) }
    }
    return json({ ok: true, region, accounts_used: accountTokenPairs().map(([a]) => a), days, diag, campaigns })

  } catch(e: any) { return json({ error: e.message }, 500) }
}
