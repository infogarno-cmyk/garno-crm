// ─── DAWID · АВТОПРОСЧЁТ КУХНИ ──────────────────────────────────────────────
// Из параметров кухни (что понял Dawid из карточки, переписки и фото) строит просчёт
// в формате конструктора CRM: секции на стенах, доп. позиции, свои позиции, план.
// Правила — по бланкам менеджеров (ноябрь 2026), см. RULES ниже.
// Цены берутся из каталога CRM (категория 0 = ламинат) через ctx.calcPriceOf.
// Исключение — мойки: в каталоге CRM 1940/2010, в бланке менеджеров 1540/1610;
// в просчёте Dawid ставится цена бланка (только здесь, каталог менеджеров не меняется).

export const DAWID_VERSION = 1;

export const RULES = {
  cat: 0,                                   // ламинат — самый дешёвый материал
  sinkPrice: { "См-60AiS": 1540, "См-80AiS": 1610 },
  antresola: "Antresola 359/537",
  cornerMinWall: 190,                       // угловой шкаф, если обе стены ≥ 190 см (иначе глухой угол)
  sinkCornerCm: 100,                        // мойка ближе 100 см к углу → угловой шкаф под мойку
  montazPerCabinet: 200, montazMin: 3000, montazMax: 4500,
  zmywarka: 200,
  islandPanels: 900,                        // остров / барная стойка: боки + задняя стенка
  bokTall: 500, bokLow: 250,
  fridgeSidePanels: 2000,                   // отдельностоящий холодильник в нише
  blatPerM: 450,                            // оценка, проверить
  led: 500,
};

const CORNER_SQ = { floor: 58, top: 33 };

// ── утилиты ──────────────────────────────────────────────────────────────────
const num = v => { const n = parseFloat(String(v ?? "").replace(",", ".")); return isNaN(n) ? 0 : n; };
const r100 = v => Math.round(v / 100) * 100;
function freeIntervals(occ, s, e) {
  const o = occ.filter(x => x.b > s && x.a < e).sort((a, b) => a.a - b.a);
  const out = []; let cur = s;
  for (const x of o) { if (x.a > cur) out.push([cur, x.a]); cur = Math.max(cur, x.b); }
  if (cur < e) out.push([cur, e]);
  return out.filter(([a, b]) => b - a >= 1);
}

// ── главный вход ─────────────────────────────────────────────────────────────
// params — объект от /api/dawid (или из заметок, если API недоступен)
// ctx — функции и данные CRM: { CALC_BY_CODE, calcPriceOf, planWalls, planBad, calcTotals }
export function buildDawidCalc(params, ctx, meta = {}) {
  const P = normalizeParams(params);
  const log = [];          // какие правила сработали — показываем во вкладке Dawid
  const flags = [];        // что проверить менеджеру
  const items = []; let uid = 1;
  const plan = { shape: P.shape, lens: P.walls.map(w => String(Math.round(w.len))), gap: "120" };
  const W = ctx.planWalls(plan);
  const n = W.length;
  const floor = W.map(() => []), top = W.map(() => []);
  const custom = []; let cuid = 1;

  const keyOf = code => {
    if (ctx.CALC_BY_CODE[code]) return code;
    const norm = s => s.replace(/[СсЕеМмНнуУхХ]/g, m => ({ С: "C", с: "c", Е: "E", е: "e", М: "M", м: "m", Н: "H", н: "h", у: "u", У: "U", х: "x", Х: "X" })[m]).toLowerCase();
    return Object.keys(ctx.CALC_BY_CODE).find(k => norm(k) === norm(code)) || null;
  };
  const add = (code, wall, x, why) => {
    const k = keyOf(code); if (!k) { flags.push(`Нет в каталоге: ${code}`); return null; }
    const b = ctx.CALC_BY_CODE[k];
    const it = { uid: uid++, code: k, g: b.g.g, zone: b.g.z, w: b.s[1], cat: RULES.cat, price: ctx.calcPriceOf(k, RULES.cat), qty: 1, wall, x };
    if (RULES.sinkPrice[k] != null) { it.price = RULES.sinkPrice[k]; it.pm = true; }
    items.push(it);
    if (wall != null) {
      const layer = b.g.z === "top" ? top : floor;
      if (b.g.g !== "ant") layer[wall].push({ a: x, b: x + b.s[1], k });
    }
    if (why) log.push(why);
    return it;
  };
  const reserve = (wall, a, b, k) => floor[wall].push({ a, b, k });
  const addCustom = (name, sum) => custom.push({ uid: cuid++, name, sum: String(Math.round(sum)) });

  // ── 1. Углы ────────────────────────────────────────────────────────────────
  // угол k — между стеной k и k+1; владелец угла — стена k (как в конструкторе CRM)
  const corners = [];
  for (let k = 0; k < n - 1; k++) {
    if (!(W[k].c1 && W[k + 1].c0)) { corners.push(null); continue; }
    const big = Math.min(W[k].len, W[k + 1].len) >= RULES.cornerMinWall || P.shape === "U";
    const sinkHere = P.sink && P.sink.wall !== "island" && P.sink.center != null && (
      (P.sink.wall === k && W[k].len - P.sink.center <= RULES.sinkCornerCm) ||
      (P.sink.wall === k + 1 && P.sink.center <= RULES.sinkCornerCm));
    if (sinkHere) { corners.push("cmu"); continue; }
    corners.push(big ? "cu" : "dead");
  }
  // диапазоны пола: начало стены после угла — 58 см (квадрат угла принадлежит предыдущей стене)
  const fs = W.map((w, i) => (w.c0 && i > 0 ? CORNER_SQ.floor : 0));
  const fe = W.map((w, i) => (w.c1 && corners[i] === "dead" ? w.len - CORNER_SQ.floor : w.len));
  let sinkDone = false;
  corners.forEach((c, k) => {
    if (c === "cmu") { add("Cму-100/60", k, W[k].len - 100, "Мойка у угла → угловой шкаф под мойку Cму-100/60"); sinkDone = true; }
    else if (c === "cu") add("Cу-100/60", k, W[k].len - 100, `Угол ${k + 1}: стены ≥ ${RULES.cornerMinWall} см → угловой Cу-100/60`);
    else if (c === "dead") log.push(`Угол ${k + 1}: короткие стены → глухой угол (закрывается блендой)`);
  });
  if (P.sink && P.sink.wall === "island") sinkDone = false;

  // ── 2. Пеналы ──────────────────────────────────────────────────────────────
  const tall = [];
  if (P.fridge === "built_in") tall.push(["PKx-60/1", "холодильник"]);
  if (P.oven === "column") tall.push(["Pk-60D", "духовка"]);
  if (P.oven === "column_microwave") tall.push(["Pk-60ADiS", "духовка + СВЧ"]);
  if (P.oven !== "under_hob" && P.pantry !== false) tall.push(["Pk2-60/1", "продукты"]);
  else if (P.pantry === true) tall.push(["Pk2-60/1", "продукты"]);
  const fsW = P.fridge === "freestanding" ? (P.fridgeWidth || 60) : 0;
  const tallW = tall.length * 60 + fsW;
  let tallWall = null, tallX = 0;
  if (tallW) {
    const open = [];
    W.forEach((w, i) => { if (!w.c0) open.push([i, "start"]); if (!w.c1) open.push([i, "end"]); });
    let pick = null;
    if (P.tallWall != null && W[P.tallWall]) pick = open.find(([i]) => i === P.tallWall) || [P.tallWall, W[P.tallWall].c0 ? "end" : "start"];
    if (P.tallWall != null && P.tallEnd && W[P.tallWall]) pick = [P.tallWall, P.tallEnd];
    if (!pick) pick = open.sort((a, b) => W[b[0]].len - W[a[0]].len)[0] || [0, "start"];
    [tallWall] = pick;
    tallX = pick[1] === "start" ? fs[tallWall] : fe[tallWall] - tallW;
    let x = tallX;
    if (fsW) { reserve(tallWall, x, x + fsW, "fridge"); addCustom("Boki lodówki (wolnostojąca)", RULES.fridgeSidePanels); log.push(`Холодильник отдельностоящий → ниша ${fsW} см + боковины ${RULES.fridgeSidePanels} zł`); x += fsW; }
    for (const [code, what] of tall) { add(code, tallWall, x, null); add(RULES.antresola, tallWall, x, null); x += 60; }
    if (tall.length) log.push(`Пеналы: ${tall.map(t => t[1]).join(", ")} + антресоли ${RULES.antresola.replace("Antresola ", "")}`);
    addCustom("Bok słupka", RULES.bokTall);
  }

  // ── 3. Мойка + посудомойка ─────────────────────────────────────────────────
  const dw = P.dishwasher;
  const snap = (a, e, desired, w) => {
    if (e - a < w) return null;
    let x = a + Math.round((desired - a) / 30) * 30;
    return Math.max(a, Math.min(e - w, x));
  };
  const placeNear = (wall, desired, w) => {
    const fi = freeIntervals(floor[wall], fs[wall], fe[wall]).filter(([a, b]) => b - a >= w);
    let best = null;
    for (const [a, b] of fi) { const x = snap(a, b, desired, w); if (x == null) continue; const d = Math.abs(x + w / 2 - (desired + w / 2)); if (!best || d < best.d) best = { x, d }; }
    return best ? best.x : null;
  };
  const sideFree = (wall, x0, x1) => { // свободно слева и справа от [x0,x1]
    const fi = freeIntervals(floor[wall], fs[wall], fe[wall]);
    const L = fi.find(([a, b]) => b === x0); const R = fi.find(([a, b]) => a === x1);
    return { left: L ? L[1] - L[0] : 0, right: R ? R[1] - R[0] : 0 };
  };
  let sinkWall = null, sinkX = null;
  if (!sinkDone && P.sink && P.sink.wall !== "island") {
    sinkWall = P.sink.wall;
    let desired = P.sink.center != null ? P.sink.center - 30 : null;
    if (desired == null) { const win = (P.walls[sinkWall].windows || [])[0]; desired = win ? (win.from + win.to) / 2 - 30 : (fs[sinkWall] + fe[sinkWall]) / 2 - 30; }
    sinkX = placeNear(sinkWall, desired, 60);
    if (sinkX != null) { add("См-60AiS", sinkWall, sinkX, "Мойка См-60AiS — по цене бланка 1540"); sinkDone = true; }
    else flags.push("Мойку не удалось поставить на указанную стену — проверьте план");
  }
  if (sinkDone && dw && sinkWall != null) {
    const sf = sideFree(sinkWall, sinkX, sinkX + 60);
    const pick = (sf.right >= dw && (sf.right >= sf.left || sf.left < dw)) ? [sinkX + 60, "right"] : (sf.left >= dw ? [sinkX - dw, "left"] : null);
    if (pick) { reserve(sinkWall, pick[0], pick[0] + dw, "dw"); log.push(`Посудомойка ${dw} см рядом с мойкой`); }
    else if (sf.right >= 45 || sf.left >= 45) { const x = sf.right >= 45 ? sinkX + 60 : sinkX - 45; reserve(sinkWall, x, x + 45, "dw"); log.push("Посудомойка 45 см (на 60 не хватило места)"); }
    else flags.push("Нет места под посудомойку рядом с мойкой");
  } else if (sinkDone && dw && corners.includes("cmu")) {
    const k = corners.indexOf("cmu"); // рядом с угловой мойкой: сразу за углом (стена k+1), иначе перед ней на стене k
    const x1 = placeNear(k + 1, fs[k + 1], dw);
    if (x1 != null && x1 <= fs[k + 1] + 1) { reserve(k + 1, x1, x1 + dw, "dw"); log.push(`Посудомойка ${dw} см сразу за угловой мойкой`); }
    else { const sf = sideFree(k, W[k].len - 100, W[k].len);
      if (sf.left >= dw) { reserve(k, W[k].len - 100 - dw, W[k].len - 100, "dw"); log.push(`Посудомойка ${dw} см рядом с угловой мойкой`); }
      else flags.push("Нет места под посудомойку рядом с мойкой"); }
  }

  // ── 4. Плита ───────────────────────────────────────────────────────────────
  const hobCode = P.oven === "under_hob" ? "С-60DiS" : "С-60KIS";
  const kisFor = g => [90, 80, 60, 45].find(w => w <= g);
  const kisCode = w => `С-${w}KIS`;
  let hobWall = null;
  if (P.hob && P.hob.wall !== "island") {
    hobWall = P.hob.wall;
    if (!W[hobWall]) hobWall = 0;
    let desired = P.hob.center != null ? P.hob.center - 30 : null;
    if (desired == null) {
      const fi = freeIntervals(floor[hobWall], fs[hobWall], fe[hobWall]).sort((a, b) => (b[1] - b[0]) - (a[1] - a[0]))[0];
      desired = fi ? (fi[0] + fi[1]) / 2 - 30 : fs[hobWall];
    }
    const hx = placeNear(hobWall, desired, 60);
    if (hx != null) {
      add(hobCode, hobWall, hx, P.oven === "under_hob" ? "Духовка под плитой → С-60DiS" : "Духовка в пенале → плита над ящиками С-60KIS");
      const sf = sideFree(hobWall, hx, hx + 60); let nk = 0;
      const lw = sf.left >= 45 ? kisFor(sf.left) : null; if (lw) { add(kisCode(lw), hobWall, hx - lw, null); nk++; }
      const rw = sf.right >= 45 ? kisFor(sf.right) : null; if (rw) { add(kisCode(rw), hobWall, hx + 60, null); nk++; }
      if (nk) log.push(`Возле плиты шкафы с ящиками (самой большой ширины): ${nk} шт.`);
    } else flags.push("Плиту не удалось поставить — проверьте план");
  }

  // ── 5. Остров ──────────────────────────────────────────────────────────────
  if (P.island && P.island.len >= 60) {
    let left = Math.floor(P.island.len);
    const isl = [];
    if (P.island.sink || (P.sink && P.sink.wall === "island")) { isl.push("См-60AiS"); left -= 60; if (dw) { left -= dw; log.push(`Посудомойка ${dw} см в острове у мойки`); } }
    if (P.island.hob || (P.hob && P.hob.wall === "island")) { isl.push(hobCode); left -= 60; const w = left >= 45 ? kisFor(Math.min(left, 90)) : null; if (w) { isl.push(kisCode(w)); left -= w; } }
    while (left >= 60) { isl.push("С-60"); left -= 60; }
    if (left >= 45) { isl.push("С-45"); left -= 45; } else if (left >= 30) { isl.push("С-30"); left -= 30; }
    isl.forEach(c => add(c, null, 0, null));
    addCustom(P.island.bar ? "Barek: boki, plecy" : "Wyspa: boki, plecy", RULES.islandPanels);
    log.push(`Остров ${P.island.len} см: ${isl.join(", ")} + боковины и задняя стенка ${RULES.islandPanels} zł (на плане CRM острова нет — секции в спецификации)`);
  }

  // ── 6. Заполнение низа ─────────────────────────────────────────────────────
  let fillers = 0;
  const kisNow = () => items.filter(x => /KIS$/.test(x.code)).length;
  W.forEach((w, i) => {
    for (const [a, b] of freeIntervals(floor[i], fs[i], fe[i])) {
      let x = a, g = b - a;
      while (g >= 60) {
        // как менеджеры: меньше шкафов, но шире — промежуток 75–119 см закрываем одним шкафом с ящиками
        if (g >= 75 && g < 120 && kisNow() < 3) { const kw = kisFor(g); add(kisCode(kw), i, x, null); x += kw; g -= kw; continue; }
        if (kisNow() === 0 && g >= 60) { const kw = kisFor(Math.min(g, 90)); add(kisCode(kw), i, x, null); x += kw; g -= kw; continue; }
        add("С-60", i, x, null); x += 60; g -= 60;
      }
      if (g >= 45) { add("С-45", i, x, null); x += 45; g -= 45; }
      else if (g >= 30) { add("С-30", i, x, null); x += 30; g -= 30; }
      if (g >= 1) fillers++;
    }
  });
  log.push("Остальное место — С-60; промежуток 75–119 см — один шкаф с ящиками KIS; хотя бы один KIS в кухне; остаток С-45 / С-30, меньше 30 см — бленда");

  // ── 7. Верх ────────────────────────────────────────────────────────────────
  const upWalls = W.map((w, i) => P.walls[i].uppers !== false);
  const ts = W.map((w, i) => (w.c0 && i > 0 && upWalls[i - 1] ? CORNER_SQ.top : 0));
  const te = W.map(w => w.len);
  for (let k = 0; k < n - 1; k++) {
    if (W[k].c1 && W[k + 1].c0 && upWalls[k] && upWalls[k + 1]) {
      const win = (P.walls[k].windows || []).some(o => o.to > W[k].len - 94);
      const tallHere = tallWall === k && tallX + tallW > W[k].len - 94;
      if (!win && !tallHere) { add("НNу-94/60", k, W[k].len - 94, "Верх доходит до угла → угловой верхний HNу-94/60"); }
    }
  }
  let ups = 0;
  W.forEach((w, i) => {
    if (!upWalls[i]) return;
    const blocked = [...top[i]];
    (P.walls[i].windows || []).forEach(o => blocked.push({ a: o.from, b: o.to }));
    if (tallWall === i && tallW) blocked.push({ a: tallX, b: tallX + tallW });
    for (const [a, b] of freeIntervals(blocked, ts[i], te[i])) {
      let x = a, g = b - a;
      while (g >= 60) { add("HN-60", i, x, null); x += 60; g -= 60; ups++; }
      const hw = [45, 40, 30].find(v => v <= g); if (hw) { add(`HN-${hw}`, i, x, null); x += hw; g -= hw; ups++; }
    }
  });
  if (ups) log.push(`Верх: ${ups} шкафов HN (60, остаток 45/40/30) на стенах без окон${P.walls.some(w => w.uppers === false) ? " (где клиент не хочет верх — без верха)" : ""}`);

  // ── 8. Доп. позиции ────────────────────────────────────────────────────────
  const N = items.length;                                     // шкафы (посудомойка и боковины не считаются)
  const tallN = items.filter(x => x.zone === "tall" && x.g !== "ant").length;
  const montaz = Math.min(RULES.montazMax, Math.max(RULES.montazMin, RULES.montazPerCabinet * N));
  const produkcja = tallN >= 5 ? 1200 : (P.shape === "U" || N >= 17) ? 1100 : 1000;
  const lowRun = items.filter(x => x.zone !== "top" && x.g !== "ant").reduce((a, x) => a + x.w, 0) + (dw && sinkDone ? dw : 0);
  const cokol = lowRun < 370 ? 600 : lowRun < 500 ? 700 : 800;
  const blendy = N >= 20 ? 1000 : 900;
  const blatRun = items.filter(x => x.zone === "low").reduce((a, x) => a + x.w, 0) + (dw && sinkDone ? dw : 0);
  const blat = P.countertop === "stone" ? 0 : r100(blatRun / 100 * RULES.blatPerM);
  log.push(`Монтаж ${montaz} = ${RULES.montazPerCabinet} × ${N} шкафов, мин. ${RULES.montazMin}, макс. ${RULES.montazMax}`);
  log.push(`Производство ${produkcja}: ${tallN >= 5 ? "5+ пеналов" : (P.shape === "U" || N >= 17) ? "П-образная или 17+ шкафов" : "обычная кухня"}`);
  log.push(`Цоколь ${cokol} (низ ~${(lowRun / 100).toFixed(1)} м), бленды ${blendy}`);
  if (P.countertop === "stone") log.push("Камень по акции — обычная столешница 0, камень менеджер добавляет отдельно");
  else { log.push(`Столешница ≈ ${RULES.blatPerM} zł/м × ${(blatRun / 100).toFixed(1)} м = ${blat}`); flags.push(`Столешница ${blat} zł — оценка (${RULES.blatPerM} zł/м), проверить`); }
  if (P.countertop === "wood") flags.push("Клиент хочет деревянную столешницу — цену поставить вручную");
  if (dw && sinkDone) addCustom(`Zmywarka ${dw} (zabudowa)`, RULES.zmywarka);
  // боковина на открытом конце нижнего ряда (если там не пенал)
  W.forEach((w, i) => {
    const lows = items.filter(x => x.wall === i && x.zone === "low"); if (!lows.length) return;
    if (!w.c0 && !(tallWall === i && tallX <= fs[i] + 1) && Math.min(...lows.map(x => x.x)) <= 1) addCustom("Bok (koniec rzędu)", RULES.bokLow);
    if (!w.c1 && !(tallWall === i && tallX + tallW >= fe[i] - 1) && Math.max(...lows.map(x => x.x + x.w)) >= w.len - 1) addCustom("Bok (koniec rzędu)", RULES.bokLow);
  });
  const extras = {
    produkcja: { price: String(produkcja) }, montaz: { price: String(montaz) },
    blat: { price: String(blat) }, blendy: { price: String(blendy) }, cokol: { price: String(cokol) },
  };
  if (P.led) { extras.led = { price: String(RULES.led) }; log.push(`LED ${RULES.led} — клиент просил подсветку`); }

  const bad = ctx.planBad ? [...ctx.planBad(items, W)] : [];
  if (bad.length) flags.push(`Наложение секций на плане: ${bad.length} — поправьте вручную`);
  if (fillers) log.push(`Бленды закрывают ${fillers} узких промежутк${fillers === 1 ? "ок" : "а"}`);

  const calc = {
    id: Date.now(), name: `Dawid · ${meta.label || `${P.shape} ${P.walls.map(w => Math.round(w.len)).join("×")}${P.island ? " + wyspa" : ""}`}`, cat: RULES.cat, items, extras, custom, nonstd: [], discount: "",
    notes: `🤖 Dawid: ${P.summary || ""}`.trim(), plan,
    dawid: {
      v: DAWID_VERSION, at: Date.now(), model: meta.model || null, source: meta.source || "api",
      summary: P.summary || "", params: P, assumptions: P.assumptions || [], questions: P.questions || [],
      confidence: P.confidence || null, log, flags, files: meta.files || [],
    },
  };
  if (ctx.calcTotals) Object.assign(calc, ctx.calcTotals(calc));
  return calc;
}

// ── нормализация параметров от модели ────────────────────────────────────────
export function normalizeParams(p) {
  p = p || {};
  const shape = ["I", "L", "U", "II"].includes(p.shape) ? p.shape : "I";
  const need = { I: 1, L: 2, U: 3, II: 2 }[shape];
  let walls = (Array.isArray(p.walls) ? p.walls : []).map(w => ({
    len: Math.max(60, Math.min(900, num(w && (w.len_cm ?? w.len)) || 0)),
    windows: (w && Array.isArray(w.windows) ? w.windows : []).map(o => ({ from: num(o.from_cm ?? o.from), to: num(o.to_cm ?? o.to) })).filter(o => o.to > o.from),
    uppers: w && w.uppers === false ? false : true,
  })).filter(w => w.len >= 60);
  while (walls.length < need) walls.push({ len: 240, windows: [], uppers: true });
  walls = walls.slice(0, need);
  const pos = o => {
    if (!o) return null;
    const wall = (o.wall === "island" || o.on_island) ? "island" : Math.max(0, Math.min(need - 1, Math.round(num(o.wall))));
    const c = o.center_cm ?? o.center; return { wall, center: c == null || c === "" ? null : num(c) };
  };
  const island = p.island && num(p.island.len_cm ?? p.island.len) >= 60 ? { len: Math.min(400, num(p.island.len_cm ?? p.island.len)), hob: !!(p.island.hob || (p.hob && p.hob.on_island)), sink: !!(p.island.sink || (p.sink && p.sink.on_island)), bar: !!p.island.bar } : null;
  let isl = island;
  if (!isl && ((p.sink && p.sink.on_island) || (p.hob && p.hob.on_island))) isl = { len: 180, hob: !!(p.hob && p.hob.on_island), sink: !!(p.sink && p.sink.on_island), bar: false };
  const dwRaw = num(p.dishwasher_cm ?? p.dishwasher);
  return {
    shape, walls, island: isl,
    sink: pos(p.sink) || { wall: walls.length > 1 ? 1 : 0, center: null },
    hob: pos(p.hob) || { wall: 0, center: null },
    fridge: ["built_in", "freestanding", "none"].includes(p.fridge) ? p.fridge : "built_in",
    fridgeWidth: num(p.fridge_width_cm) || null,
    oven: ["under_hob", "column", "column_microwave"].includes(p.oven) ? p.oven : "under_hob",
    pantry: typeof p.pantry === "boolean" ? p.pantry : undefined,
    dishwasher: dwRaw >= 55 ? 60 : dwRaw >= 40 ? 45 : (p.dishwasher_cm === 0 || p.dishwasher === false ? 0 : 60),
    tallWall: p.tall_wall == null || p.tall_wall === "" ? null : Math.max(0, Math.min(need - 1, Math.round(num(p.tall_wall)))),
    tallEnd: p.tall_end === "start" || p.tall_end === "end" ? p.tall_end : null,
    led: !!p.led, countertop: ["standard", "stone", "wood", "unknown"].includes(p.countertop) ? p.countertop : "unknown",
    summary: String(p.summary || ""), assumptions: Array.isArray(p.assumptions) ? p.assumptions.map(String) : [],
    questions: Array.isArray(p.questions) ? p.questions.map(String) : [], confidence: p.confidence || null,
  };
}

// ── запасной вариант без ИИ: разбор строки заявки с калькулятора ─────────────
// «W kształcie litery U · 500 × 300 × 200 · Płyta wiórowa · … | W zabudowie»
export function paramsFromNotes(notes) {
  const t = String(notes || "").replace(/\*\*/g, "");
  const head = t.split(/\n/).slice(0, 3).join(" ");
  let shape = "I";
  if (/(litery\s*u|u-kszta|п-образ|u-подібн|\bU\b)/i.test(head)) shape = "U";
  else if (/(naro[żz]n|litery\s*l|кутов|углов|\bL\b)/i.test(head)) shape = "L";
  const island = /(wysp|остров|ostr[uů]v)/i.test(head);
  if (island && shape === "I") shape = "L";
  const m = head.match(/(\d{2,3})\s*[x×хX]\s*(\d{2,3})(?:\s*[x×хX]\s*(\d{2,3}))?/);
  const nums = m ? [m[1], m[2], m[3]].filter(Boolean).map(Number) : (head.match(/\b(\d{3})\b/) ? [Number(head.match(/\b(\d{3})\b/)[1])] : []);
  const need = { I: 1, L: 2, U: 3 }[shape];
  const walls = [];
  for (let i = 0; i < need; i++) walls.push({ len_cm: nums[i] && nums[i] >= 100 ? nums[i] : 240 });
  const builtIn = /(w zabudowie|в забудов|вбудов|встро)/i.test(head);
  return {
    shape, walls, island: island ? { len_cm: 120, hob: false, sink: false } : null,
    sink: { wall: need > 1 ? 1 : 0 }, hob: { wall: 0 },
    fridge: "built_in", oven: "under_hob", dishwasher_cm: 60, led: false,
    countertop: /(kwarc|kamie|кварц|камін|камен|spiek)/i.test(head) ? "stone" : /(drewn|дерев)/i.test(head) ? "wood" : "unknown",
    summary: `Разбор строки заявки без анализа фото: ${head.slice(0, 160)}`,
    assumptions: ["Фото и планы не анализировались (ИИ недоступен) — расстановка по умолчанию", builtIn ? "Техника встроенная" : "Тип техники не указан — встроенная по умолчанию"],
    questions: ["Подтвердите длины стен и где вывод воды"], confidence: "low",
  };
}
