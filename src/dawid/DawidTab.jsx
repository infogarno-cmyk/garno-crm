// ─── DAWID · вкладка «🤖 Dawid» в конструкторе просчёта ─────────────────────
// Показывает, что Dawid понял из карточки, какие правила применил и что проверить менеджеру.
import React from "react";

const SHAPE = { I: "прямая", L: "угловая (L)", U: "П-образная (U)", II: "параллельная" };
const FRIDGE = { built_in: "встроенный, в пенале", freestanding: "отдельностоящий (ниша)", none: "нет" };
const OVEN = { under_hob: "под плитой", column: "в пенале", column_microwave: "в пенале + микроволновка" };
const TOP = { standard: "стандартная (плита)", stone: "камень — по акции отдельно", wood: "дерево", unknown: "не указана" };

export default function DawidTab({ c, tot, T, fmtM, pl }) {
  const d = c.dawid || {}; const p = d.params || {};
  const L = (ru, plx) => (pl ? plx : ru);
  const box = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 8 };
  const lbl = { fontSize: 9.5, letterSpacing: ".16em", textTransform: "uppercase", color: T.muted };
  const row = (k, v) => v == null || v === "" ? null : (
    <div key={k} style={{ display: "flex", gap: 10, fontSize: 12.5, padding: "3px 0", borderTop: `1px solid ${T.border}` }}>
      <span style={{ width: 150, flexShrink: 0, color: T.muted }}>{k}</span><span style={{ color: T.text }}>{v}</span>
    </div>);
  const pos = o => !o ? "—" : o.wall === "island" ? L("на острове", "na wyspie") : `${L("стена", "ściana")} ${+o.wall + 1}${o.center != null ? ` · ~${Math.round(o.center)} см` : ""}`;
  const list = (arr, color) => (arr || []).length ? <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4, fontSize: 12.5, color: color || T.text }}>{arr.map((x, i) => <li key={i}>{x}</li>)}</ul> : <div style={{ fontSize: 12, color: T.dim }}>—</div>;
  const when = d.at ? new Date(d.at).toLocaleString(pl ? "pl-PL" : "ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "";
  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr)", gap: 10, alignContent: "start" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        <div style={{ ...box, borderColor: "rgba(227,184,96,.45)" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <div style={{ fontSize: 16 }}>🤖 {L("Просчёт Dawid", "Wycena Dawid")}</div>
            <div style={{ fontSize: 11, color: T.muted, marginLeft: "auto" }}>{when}{d.model ? ` · ${d.model}` : ""}{d.source === "notes" ? ` · ${L("без фото (только заявка)", "bez zdjęć (tylko zgłoszenie)")}` : ""}</div>
          </div>
          {d.summary ? <div style={{ fontSize: 13, lineHeight: 1.5 }}>{d.summary}</div> : null}
          <div style={{ fontSize: 11, color: T.muted }}>{L("Тестовый режим: просчёт не сохранён, пока менеджер не нажмёт «Сохранить в лид». КП не формируется.", "Tryb testowy: wycena nie jest zapisana, dopóki menedżer nie kliknie „Zapisz w leadzie”. Oferta nie powstaje.")}</div>
        </div>
        <div style={box}>
          <div style={lbl}>{L("что понял dawid", "co zrozumiał dawid")}</div>
          {row(L("Форма", "Kształt"), SHAPE[p.shape] || p.shape)}
          {(p.walls || []).map((w, i) => row(`${L("Стена", "Ściana")} ${i + 1}`, `${Math.round(w.len)} см${(w.windows || []).length ? ` · ${L("окно", "okno")} ${w.windows.map(o => `${Math.round(o.from)}–${Math.round(o.to)}`).join(", ")}` : ""}${w.uppers === false ? ` · ${L("без верха", "bez górnych")}` : ""}`))}
          {p.island ? row(L("Остров", "Wyspa"), `${Math.round(p.island.len)} см${p.island.hob ? " · плита" : ""}${p.island.sink ? " · мойка" : ""}${p.island.bar ? " · барная стойка" : ""}`) : null}
          {row(L("Мойка", "Zlew"), pos(p.sink))}
          {row(L("Плита", "Płyta"), pos(p.hob))}
          {row(L("Холодильник", "Lodówka"), FRIDGE[p.fridge] || p.fridge)}
          {row(L("Духовка", "Piekarnik"), OVEN[p.oven] || p.oven)}
          {row(L("Посудомойка", "Zmywarka"), p.dishwasher ? `${p.dishwasher} см` : L("нет", "brak"))}
          {row(L("Столешница", "Blat"), TOP[p.countertop] || p.countertop)}
          {row("LED", p.led ? L("да, клиент просил", "tak, klient prosił") : L("нет", "nie"))}
          {row(L("Уверенность", "Pewność"), d.confidence ? { high: L("высокая", "wysoka"), medium: L("средняя", "średnia"), low: L("низкая", "niska") }[d.confidence] : null)}
        </div>
        <div style={box}><div style={lbl}>{L("допущения", "założenia")}</div>{list(d.assumptions)}</div>
        <div style={box}><div style={lbl}>{L("уточнить у клиента", "do ustalenia z klientem")}</div>{list(d.questions, "#7dd3fc")}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
        <div style={{ ...box, borderColor: "rgba(246,196,83,.5)" }}><div style={lbl}>{L("проверить менеджеру", "do sprawdzenia")}</div>{list(d.flags, "#f6c453")}</div>
        <div style={box}>
          <div style={lbl}>{L("цена", "cena")}</div>
          {row(L("Секции (кат. 0, ламинат)", "Sekcje (kat. 0, laminat)"), fmtM(tot.sec))}
          {row(L("Доп. позиции", "Dodatki"), fmtM(tot.ex + tot.ns))}
          {row(L("Свои позиции", "Własne pozycje"), fmtM(tot.cus))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, color: "#f6e0aa", borderTop: `1px solid ${T.border}`, paddingTop: 6 }}><span>{L("Итого", "Razem")}</span><span>{fmtM(tot.disc ? tot.totalDisc : tot.total)}</span></div>
        </div>
        <div style={box}><div style={lbl}>{L("правила, которые применил dawid", "zasady zastosowane przez dawida")}</div>{list(d.log, T.muted)}</div>
        {(d.files || []).length ? <div style={box}><div style={lbl}>{L("смотрел файлы", "przejrzane pliki")}</div>{list(d.files, T.muted)}</div> : null}
      </div>
    </div>
  );
}
