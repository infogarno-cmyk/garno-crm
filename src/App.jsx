import { useState, useRef, useEffect } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import React from "react";

class ErrorBoundary extends React.Component{
  constructor(p){super(p);this.state={error:null};}
  static getDerivedStateFromError(e){return{error:e};}
  componentDidCatch(e,info){console.error("GarnoCRM crash:",e,info);}
  render(){
    if(this.state.error){
      return(
        <div style={{display:"flex",height:"100vh",background:"#00132f",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"sans-serif",padding:24}}>
          <div style={{fontSize:32}}>⚠️</div>
          <div style={{color:"#fff",fontWeight:700,fontSize:18}}>Ошибка загрузки</div>
          <div style={{color:"rgba(255,255,255,0.6)",fontSize:13,maxWidth:500,textAlign:"center",background:"rgba(255,255,255,0.05)",padding:16,borderRadius:8,fontFamily:"monospace"}}>
            {this.state.error.toString()}
          </div>
          <button onClick={()=>{localStorage.clear();window.location.reload();}}
            style={{background:"#bfa47e",color:"#00132f",border:"none",borderRadius:8,padding:"10px 24px",fontWeight:800,cursor:"pointer",fontSize:14}}>
            🔄 Сбросить и перезапустить
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── BRAND COLORS ─────────────────────────────────────────────────────────────
const C = {
  bg:"#00132f", surface:"#001840", card:"#001f4e",
  accent:"#bfa47e", accentDim:"rgba(191,164,126,0.15)", accentBorder:"rgba(191,164,126,0.35)",
  text:"#fff", muted:"rgba(255,255,255,0.55)", dim:"rgba(255,255,255,0.3)",
  border:"rgba(255,255,255,0.07)", borderMd:"rgba(255,255,255,0.14)",
  green:"#4ade80", red:"#f87171", blue:"#60a5fa",
  yellow:"#fbbf24", purple:"#a78bfa", cyan:"#22d3ee",
};
const TIP={contentStyle:{background:"#001840",border:"1px solid rgba(255,255,255,0.14)",borderRadius:8,color:"#fff",fontSize:11},labelStyle:{color:"#fff"},itemStyle:{color:"#fff"}};
const MONTHS_RU=["Январь","Февраль","Март","Апрель","Май","Июнь","Июль","Август","Сентябрь","Октябрь","Ноябрь","Декабрь"];
const MONTHS_PL=["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"];

// ─── TRANSLATIONS ─────────────────────────────────────────────────────────────
const T = {
  ru:{
    dashboard:"Дашборд",leads:"Лиды",calendar:"Календарь",analytics:"Аналитика",ai:"AI Ассистент",sales:"Продажи",
    allLeads:"Все лиды",newLeads:"Новые",processed:"Обработано",todayMeetings:"Встречи сегодня",
    search:"Поиск...",addLead:"+ Добавить лид",name:"Имя",phone:"Телефон",source:"Источник",
    qualification:"Квалификация",action:"Действие",period:"Срок",manager:"Менеджер",score:"Оценка",
    date:"Дата",notes:"Заметки",history:"История",save:"Сохранить",cancel:"Отмена",edit:"Редактировать",
    allManagers:"Все",funnel:"Воронка продаж",kpi:"KPI менеджеров",upcoming:"Ближайшие задачи",addEvent:"+ Событие",
    aiPlaceholder:'Спросите что-нибудь... или: "Сгенерируй КП для id=1010526 сумма 45000"',send:"Отправить",
    avgScore:"Средний AI",qualityLeads:"Kwaly",qualityPct:"Kwaly%",conv4to5:"4→5",conv5toSell:"5→Продажа",
    convRate:"Конверсия",revenue:"Выручка",many:"Продаж",totalSales:"Выручка",salesCount:"Продаж",
    podium:"Пьедестал",visits:"Визиты",source_label:"Источник",
    unqualified:"Неквалиф.",prequalified:"Предв. квалиф.",qualified:"Квалифицирован",salon:"Визит в салон",sale:"Продажа",
    thinking:"Думает",missedCall:"Недозвон",cancelled:"Отмена",callback:"Повтор",
    withinMonth:"В теч. месяца",within3m:"В теч. 3 мес.",within6m:"В теч. полугода",year:"Год",
    justPrice:"Только цена",unconfirmed:"Срок не подтвержден",
    evVisit:"Визит",evMeasure:"Замер",evContract:"Договор",evPhone:"Телефон",evDelivery:"Доставка",
    period1d:"1 день",period3d:"3 дня",period7d:"Неделя",period14d:"2 нед.",
    period30d:"Месяц",period90d:"Квартал",period365d:"Год",periodAll:"Всё",
    saleAmountTitle:"Введите сумму продажи",saleAmountConfirm:"Подтвердить продажу",
    todaySection:"Сегодня",noToday:"Нет задач на сегодня",
    saleSectionTitle:"Все продажи",description:"Описание",
    deleteSelected:"Удалить выбранные",
  },
  pl:{
    dashboard:"Panel",leads:"Leady",calendar:"Kalendarz",analytics:"Analityka",ai:"Asystent AI",sales:"Sprzedaże",
    allLeads:"Wszystkie",newLeads:"Nowe",processed:"Przetworzone",todayMeetings:"Spotkania dziś",
    search:"Szukaj...",addLead:"+ Dodaj lead",name:"Imię",phone:"Telefon",source:"Źródło",
    qualification:"Kwalifikacja",action:"Akcja",period:"Termin",manager:"Menedżer",score:"Ocena",
    date:"Data",notes:"Notatki",history:"Historia",save:"Zapisz",cancel:"Anuluj",edit:"Edytuj",
    allManagers:"Wszyscy",funnel:"Lejek sprzedaży",kpi:"KPI menedżerów",upcoming:"Nadchodzące",addEvent:"+ Wydarzenie",
    aiPlaceholder:'Zapytaj... lub: "Wygeneruj ofertę dla id=1010526 kwota 45000"',send:"Wyślij",
    avgScore:"Śr. AI",qualityLeads:"Kwaly",qualityPct:"Kwaly%",conv4to5:"4→5",conv5toSell:"5→Sprzedaż",
    convRate:"Konwersja",revenue:"Przychód",many:"Sprzedaży",totalSales:"Przychód",salesCount:"Sprzedaży",
    podium:"Podium",visits:"Wizyty",source_label:"Źródło",
    unqualified:"Niekwalif.",prequalified:"Wstępnie kwalif.",qualified:"Kwalifikowana",salon:"Wizyta w salonie",sale:"Sprzedaż",
    thinking:"Myśli",missedCall:"Niedozwon",cancelled:"Anulowanie",callback:"Powtórka",
    withinMonth:"W ciągu miesiąca",within3m:"W ciągu 3 mies.",within6m:"W ciągu pół roku",year:"Rok",
    justPrice:"Chce tylko cenę",unconfirmed:"Termin niepotwierdzony",
    evVisit:"Wizyta",evMeasure:"Pomiar",evContract:"Umowa",evPhone:"Telefon",evDelivery:"Dostawa",
    period1d:"1 dzień",period3d:"3 dni",period7d:"Tydzień",period14d:"2 tyg.",
    period30d:"Miesiąc",period90d:"Kwartał",period365d:"Rok",periodAll:"Wszystko",
    saleAmountTitle:"Wprowadź kwotę sprzedaży",saleAmountConfirm:"Potwierdź sprzedaż",
    todaySection:"Dzisiaj",noToday:"Brak zadań na dzisiaj",
    saleSectionTitle:"Wszystkie sprzedaże",description:"Opis",
    deleteSelected:"Usuń wybrane",
  }
};

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const MANAGERS = ["Oleh","Dmytro","Patryk","Danya"];
const MGR_COLOR = {Oleh:C.blue,Dmytro:C.green,Patryk:C.purple,Danya:C.cyan};
function scoreToQual(s){const n=parseInt(s)||0;if(n<=2)return"unqualified";if(n===3)return"prequalified";if(n===4)return"qualified";if(n===5)return"salon";return"sale";}
const QUALS=["unqualified","prequalified","qualified","salon","sale"];
const QUAL_COLOR={unqualified:C.red,prequalified:C.yellow,qualified:C.green,salon:C.blue,sale:C.accent};
const ACTIONS=["thinking","missedCall","cancelled","callback"];
const ACT_COLOR={thinking:C.blue,missedCall:C.yellow,cancelled:C.red,callback:C.green};
const BUDGETS=["withinMonth","within3m","within6m","year","justPrice","unconfirmed"];
const BUD_COLOR={withinMonth:C.green,within3m:C.cyan,within6m:C.yellow,year:C.purple,justPrice:C.muted,unconfirmed:"rgba(255,255,255,0.2)"};
const SOURCES=["pl.calculatorkuchni.online","roda.calculatorkuchni.online","fast.calculatorkuchni.online","us.calculatorkuchni.online","1.designkitchen.online","fillout","garnofurniture.ukr","garnofurniture.com","Instagram","Mail"];
const SRC_COLOR={"pl.calculatorkuchni.online":"#3b82f6","roda.calculatorkuchni.online":"#8b5cf6","fast.calculatorkuchni.online":"#06b6d4","us.calculatorkuchni.online":"#10b981","1.designkitchen.online":"#f59e0b","fillout":"#ec4899","garnofurniture.ukr":"#a78bfa","garnofurniture.com":"#60a5fa","Instagram":"#E1306C","Mail":"#bfa47e"};
function srcShort(s){return s.replace(".calculatorkuchni.online","…").replace(".designkitchen.online","…des").replace("garnofurniture","garno");}
const EVENT_TYPES=["visit","measure","contract","phone","delivery"];
const EVENT_COLOR={visit:C.blue,measure:C.accent,contract:C.green,phone:C.purple,delivery:C.cyan};
const DATE_RANGES=[{key:"1d",days:1},{key:"3d",days:3},{key:"7d",days:7},{key:"14d",days:14},{key:"30d",days:30},{key:"90d",days:90},{key:"365d",days:365},{key:"all",days:99999}];
const TODAY = new Date().toISOString().slice(0,10);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function rnd(a,b){return Math.floor(a+Math.random()*(b-a+1));}
function fmtM(n){if(!n&&n!==0)return"—";return new Intl.NumberFormat("pl-PL").format(n)+" zł";}
function dAgo(n){const d=new Date(Date.now()-n*86400000);return d.toLocaleDateString("ru-RU");}
function daysAgoFn(str){if(!str)return 9999;const p=str.split(".");if(p.length!==3)return 9999;const d=new Date(`${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`);return Math.floor((Date.now()-d.getTime())/86400000);}
function filterByRange(items,range){if(range==="all")return items;const r=DATE_RANGES.find(d=>d.key===range);if(!r)return items;return items.filter(l=>daysAgoFn(l.createdAt)<=r.days);}
const evLabel=(type,lang)=>({visit:{ru:"Визит",pl:"Wizyta"},measure:{ru:"Замер",pl:"Pomiar"},contract:{ru:"Договор",pl:"Umowa"},phone:{ru:"Телефон",pl:"Telefon"},delivery:{ru:"Доставка",pl:"Dostawa"}}[type]?.[lang]||type);
function makeLeadId(n,dateStr){let d;try{if(dateStr){const p=dateStr.split(".");d=new Date(`${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`);if(isNaN(d))d=new Date();}else d=new Date();}catch{d=new Date();}const dd=String(d.getDate()).padStart(2,"0");const mm=String(d.getMonth()+1).padStart(2,"0");const yy=String(d.getFullYear()).slice(-2);return `${n}${dd}${mm}${yy}`;}
function nowStr(){const d=new Date();return`${d.toLocaleDateString("ru-RU")} ${d.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})}`;}

// ─── SEED LEADS ───────────────────────────────────────────────────────────────
const RAW=[
  [1,"garnofurniture.ukr",true,"01.05","48 600 655 845",5,"Марина","within3m","Oleh","callback","Cena 26 090 zł, надо подергать 28.05.26"],
  [2,"garnofurniture.com",false,"01.05","48 510 496 018",2,"Kamilla","within6m","Dmytro","thinking",""],
  [3,"fast.calculatorkuchni.online",true,"02.05","48 530 399 395",6,"Grzegorz","within3m","Dmytro","thinking","kuchnia 23250 zł z blatem standardowym lub 28 822 z blatem promocyjnym"],
  [4,"garnofurniture.com",false,"02.05","48 505 913 889",1,"Paweł","within6m","Patryk","cancelled","Tak sobie wtajemnie nie potrzeba"],
  [5,"us.calculatorkuchni.online",true,"03.05","38 025 725 6843",0,"Ольга","justPrice","Patryk","cancelled","napisan"],
  [6,"pl.calculatorkuchni.online",true,"03.05","48 531 004 060",2,"","within6m","Patryk","thinking","kuchnia na listopad / grudzień"],
  [7,"pl.calculatorkuchni.online",true,"03.05","48 604 059 427",4,"","within3m","Patryk","thinking","półwysep 120cm, złobenie na półwyspie"],
  [8,"pl.calculatorkuchni.online",true,"03.05","48 501 688 076",4,"Marcin","withinMonth","Patryk","thinking","Kontakt pod koniec tygodnia"],
  [9,"fast.calculatorkuchni.online",true,"05.05","48 692 610 890",4,"","within3m","Patryk","thinking","Wysłana wiadomość"],
  [10,"fast.calculatorkuchni.online",true,"05.05","48 506 525 403",4,"","within3m","Patryk","thinking","Wymiana kuchni może za 3 miesiące"],
  [11,"fast.calculatorkuchni.online",true,"05.05","48 665 148 815",4,"","within3m","Patryk","thinking","wysłana wycena na maila Kuchnia na sierpień/wrzesień"],
  [12,"garnofurniture.com",true,"06.05","48 787 963 326",3,"Gerry Weber","within3m","Dmytro","thinking",""],
  [13,"fast.calculatorkuchni.online",false,"07.05","48 531 620 510",0,"","within6m","Patryk","missedCall","wysłana wiadomość"],
  [14,"fast.calculatorkuchni.online",false,"07.05","48 509 496 057",0,"","justPrice","Patryk","thinking","Przesłan dw awairanty, laminat i lakier"],
  [15,"us.calculatorkuchni.online",true,"08.05","48 788 914 268",2,"Катерина","justPrice","Oleh","thinking","dom, срока нет, вiцениш метрами 18430, дорого"],
  [16,"us.calculatorkuchni.online",true,"08.05","48 721 858 642",1,"Мария","within3m","Oleh","thinking","ВРОЦЛАВ, ждем проект после 16.05"],
  [17,"us.calculatorkuchni.online",true,"08.05","38 099 642 1443",2,"Оля","year","Dmytro","thinking","571 231 171 стоимость 18320зл"],
  [18,"garnofurniture.com",true,"08.05","48 725 599 991",4,"natalia","within6m","Patryk","thinking","Ma podesłać rzut"],
  [19,"garnofurniture.ukr",true,"09.05","48 722 727 466",4,"Анна","withinMonth","Dmytro","thinking","Za Wrocławiem, вартість кухні в плити Крона"],
  [20,"us.calculatorkuchni.online",true,"09.05","48 730 376 626",2,"Tomasz","within6m","Dmytro","thinking","wysłana wycena na maila, za drogo"],
  [21,"garnofurniture.ukr",true,"12.05","48 575 088 950",5,"Дарья","withinMonth","Dmytro","callback","25 615 + 8480 blat + 4200 witryna"],
  [22,"garnofurniture.ukr",true,"12.05","48 733 414 135",3,"Аліна","withinMonth","Dmytro","thinking","старе мешкання, будуть переносити стіни"],
  [23,"us.calculatorkuchni.online",true,"12.05","48 798 502 663",5,"Василь","within3m","Oleh","callback","Wizyta w salonie - umówiona"],
  [24,"fast.calculatorkuchni.online",false,"12.05","48 793 992 121",4,"","withinMonth","Patryk","thinking","Za drogo wycena z metra / szuka czegoś taniego"],
  [25,"garnofurniture.com",false,"14.05","48 535 473 859",0,"","within3m",null,"missedCall","Wysłana wiadomość"],
  [26,"us.calculatorkuchni.online",true,"14.05","48 664 329 099",2,"","year","Dmytro","cancelled","2,5 km od niemców - кухня 2 метра"],
  [27,"us.calculatorkuchni.online",true,"14.05","48 733 861 064",2,"Monika","within6m","Dmytro","thinking","cjna 25 655 + 3850 witryna + 6500 stop promocyjna"],
  [28,"garnofurniture.com",true,"14.05","48 691 402 443",2,"Iwona","within6m","Dmytro","thinking","wycena na karteczce 22795 zł + blat promo 7650 zł"],
  [29,"us.calculatorkuchni.online",false,"14.05","48 664 764 578",2,"Ирина","within6m","Oleh","missedCall","Ma podesłać preferencje kuchnia wrzesień/październik"],
];
function buildSeedLeads(){return RAW.map(([id,src,done,ddmm,phone,score,name,budget,mgr,action,notes])=>{const createdAt=`${ddmm}.2026`;return{id,leadId:makeLeadId(id,createdAt),name:name||"",phone,source:src,createdAt,qualification:scoreToQual(score),action,manager:mgr||null,score,notes:notes||"",budgetTimeline:budget,quoteAmt:score===6?23250:null,isDone:done,history:[]};});}
const SEED_LEADS=buildSeedLeads();
const SEED_EVENTS=[
  {id:1,title:"Замер — Wiśniewska K.",date:TODAY,time:"14:00",timeEnd:"15:00",manager:"Dmytro",type:"measure",description:"Первичный замер кухни"},
  {id:2,title:"Встреча Dmytro",date:TODAY,time:"19:30",timeEnd:"20:30",manager:"Dmytro",type:"visit",description:""},
  {id:3,title:"Договор — kuchni",date:TODAY.slice(0,8)+"14",time:"11:00",timeEnd:"12:00",manager:"Patryk",type:"contract",description:""},
];
const SEED_SALES=[{id:1,leadId:"502.05",name:"Grzegorz",phone:"48 530 399 395",manager:"Dmytro",source:"fast.calculatorkuchni.online",createdAt:"2.5.2026",saleAmount:23250,notes:"kuchnia 23250 zł standardowy blat"}];

// ─── JSONBIN DATABASE ─────────────────────────────────────────────────────────
const BIN_BASE="https://api.jsonbin.io/v3/b";
const LS_KEY="garno_cfg"; // localStorage — only stores credentials

function lsGet(k){try{return JSON.parse(localStorage.getItem(k));}catch{return null;}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch{}}

async function binRead(binId,apiKey){
  const r=await fetch(`${BIN_BASE}/${binId}/latest`,{
    headers:{"X-Master-Key":apiKey,"X-Bin-Meta":"false"},
    cache:"no-store"
  });
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  const j=await r.json();
  // JSONBin v3: response is { record: {...} } or directly the data
  return j?.record ?? j;
}
async function binWrite(binId,apiKey,data){
  const r=await fetch(`${BIN_BASE}/${binId}`,{method:"PUT",headers:{"Content-Type":"application/json","X-Master-Key":apiKey},body:JSON.stringify(data)});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
}
async function binCreate(apiKey,data){
  const r=await fetch(BIN_BASE,{method:"POST",headers:{"Content-Type":"application/json","X-Master-Key":apiKey,"X-Bin-Name":"GarnoCRM","X-Bin-Private":"false"},body:JSON.stringify(data)});
  if(!r.ok){const txt=await r.text();throw new Error(`HTTP ${r.status}: ${txt.slice(0,100)}`);}
  const j=await r.json();
  // JSONBin v3 returns { record: {...}, metadata: { id: "..." } }
  const id = j?.metadata?.id || j?.id || j?._id;
  if(!id) throw new Error("JSONBin не вернул Bin ID. Ответ: "+JSON.stringify(j).slice(0,200));
  return id;
}

const INIT_DB=()=>({leads:SEED_LEADS,events:SEED_EVENTS,sales:SEED_SALES,nextNum:SEED_LEADS.length+1,chat:[{role:"assistant",content:`Привет! Я GarnoAI 👋\nЛидов: ${SEED_LEADS.length} | Kwaly: ${SEED_LEADS.filter(l=>l.score>=4).length} | Продаж: ${SEED_LEADS.filter(l=>l.score===6).length}\n\nКоманды:\n• "Задачи Dmytro сегодня"\n• "Сгенерируй КП для id=${SEED_LEADS[0]?.leadId} сумма 23250"\n• "Запомни: факт для обучения"\n• "Статистика менеджеров"`}]});

function useDatabase(){
  const [db,setDbState]=useState(null);
  const [status,setStatus]=useState("loading"); // loading|setup|ready|error
  const [syncLabel,setSyncLabel]=useState("●");
  const cfgRef=useRef(null);
  const localRef=useRef(null);
  const savingRef=useRef(false);
  const saveTimer=useRef(null);

  useEffect(()=>{
    (async()=>{
      const cfg=lsGet(LS_KEY);
      if(!cfg){setStatus("setup");return;}
      cfgRef.current=cfg;
      try{
        setSyncLabel("⟳");
        const data=await binRead(cfg.binId,cfg.apiKey);
        localRef.current=JSON.stringify(data);
        setDbState(data);
        setStatus("ready");
        setSyncLabel("●");
      }catch(e){console.error(e);setStatus("error");}
    })();
  },[]);

  useEffect(()=>{
    if(status!=="ready")return;
    const iv=setInterval(async()=>{
      if(savingRef.current)return;
      try{
        const data=await binRead(cfgRef.current.binId,cfgRef.current.apiKey);
        const json=JSON.stringify(data);
        if(json!==localRef.current){localRef.current=json;setDbState(data);setSyncLabel("✓");setTimeout(()=>setSyncLabel("●"),2000);}
      }catch{}
    },5000);
    return()=>clearInterval(iv);
  },[status]);

  const updateDb=(upd)=>{
    setDbState(prev=>{
      const next=typeof upd==="function"?upd(prev):upd;
      const json=JSON.stringify(next);
      localRef.current=json;
      savingRef.current=true;
      setSyncLabel("⟳");
      if(saveTimer.current)clearTimeout(saveTimer.current);
      saveTimer.current=setTimeout(async()=>{
        try{
          await binWrite(cfgRef.current.binId,cfgRef.current.apiKey,next);
          setSyncLabel("✓");setTimeout(()=>setSyncLabel("●"),2000);
        }catch(e){console.error(e);setSyncLabel("!");}
        finally{savingRef.current=false;}
      },400);
      return next;
    });
  };

  const configure=async(cfg,initData)=>{
    lsSet(LS_KEY,cfg);cfgRef.current=cfg;
    localRef.current=JSON.stringify(initData);
    setDbState(initData);setStatus("ready");
  };

  return{db,status,syncLabel,updateDb,configure};
}

// ─── UI ATOMS ─────────────────────────────────────────────────────────────────
function Badge({label,color=C.blue,small}){return <span style={{display:"inline-block",background:`${color}22`,color,border:`1px solid ${color}44`,borderRadius:20,padding:small?"1px 7px":"2px 10px",fontSize:small?10:11,fontWeight:600,whiteSpace:"nowrap"}}>{label}</span>;}
function Avatar({name,color,size=32}){const ini=(name||"?").split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();return <div style={{width:size,height:size,borderRadius:"50%",background:color?`${color}25`:C.accentDim,border:`1.5px solid ${color||C.accent}50`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:size*0.34,fontWeight:700,color:color||C.accent,flexShrink:0}}>{ini}</div>;}
function Dot({color}){return <span style={{width:7,height:7,borderRadius:"50%",background:color,display:"inline-block",flexShrink:0}}/>;}
function SrcBadge({source}){const c=SRC_COLOR[source]||C.muted;return <span style={{fontSize:9,color:c,background:`${c}20`,border:`1px solid ${c}40`,borderRadius:4,padding:"1px 5px",whiteSpace:"nowrap",fontWeight:600,maxWidth:90,overflow:"hidden",textOverflow:"ellipsis",display:"inline-block"}}>{srcShort(source)}</span>;}
function ScoreBar({score}){const c=score<=2?C.red:score===3?C.yellow:score===4?C.green:score===5?C.blue:C.accent;return <div style={{display:"flex",gap:2,alignItems:"center"}}>{Array.from({length:7}).map((_,i)=><div key={i} style={{width:7,height:7,borderRadius:2,background:i<=score?c:"rgba(255,255,255,0.12)"}}/>)}<span style={{fontSize:10,color:c,marginLeft:2,fontWeight:700}}>{score}</span></div>;}
function Btn({children,onClick,variant="primary",small,disabled}){const s={primary:{background:C.accent,color:"#00132f",border:"none"},ghost:{background:"transparent",color:C.muted,border:`1px solid ${C.border}`},danger:{background:"rgba(248,113,113,0.15)",color:C.red,border:`1px solid ${C.red}44`}};return <button onClick={onClick} disabled={disabled} style={{...s[variant],padding:small?"5px 12px":"8px 18px",borderRadius:8,fontSize:small?12:13,fontWeight:600,cursor:disabled?"not-allowed":"pointer",opacity:disabled?0.5:1,whiteSpace:"nowrap",display:"inline-flex",alignItems:"center",gap:6}}>{children}</button>;}
function DateRangeBar({range,setRange,t}){return <div style={{display:"flex",gap:2,background:C.card,borderRadius:9,padding:3,border:`1px solid ${C.border}`,flexWrap:"wrap"}}>{DATE_RANGES.map(d=>{const lk=`period${d.key.charAt(0).toUpperCase()+d.key.slice(1)}`;const active=range===d.key;return <button key={d.key} onClick={()=>setRange(d.key)} style={{padding:"4px 9px",borderRadius:7,border:"none",background:active?C.accentDim:"transparent",color:active?C.accent:C.muted,cursor:"pointer",fontSize:10,fontWeight:active?700:500,whiteSpace:"nowrap"}}>{t[lk]||d.key}</button>;})}</div>;}

// ─── SETUP SCREEN ─────────────────────────────────────────────────────────────
function SetupScreen({onSave}){
  const [apiKey,setApiKey]=useState("");
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState("");
  const ins={background:C.surface,border:`1px solid ${C.borderMd}`,color:"#fff",borderRadius:8,padding:"12px 14px",fontSize:14,width:"100%",boxSizing:"border-box",outline:"none",fontFamily:"monospace"};

  const connect=async()=>{
    const key=apiKey.trim();
    if(!key){setErr("Вставьте Master Key");return;}
    setBusy(true);setErr("");
    try{
      const initData=INIT_DB();
      const binId=await binCreate(key,initData);
      if(!binId)throw new Error("Не получили Bin ID");
      await onSave({binId,apiKey:key},initData);
    }catch(e){
      let msg=e.message;
      if(msg.includes("401")||msg.includes("403"))msg="❌ Неверный Master Key. Скопируйте точно с сайта jsonbin.io";
      else if(msg.includes("429"))msg="❌ Слишком много запросов. Подождите минуту.";
      else msg="❌ "+msg;
      setErr(msg);
    }
    setBusy(false);
  };

  return(
    <div style={{display:"flex",height:"100vh",background:C.bg,alignItems:"center",justifyContent:"center",fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <div style={{width:"min(460px,96vw)",borderRadius:16,border:`1px solid ${C.accentBorder}`,background:C.surface,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{background:"linear-gradient(135deg,#001840,#002259)",padding:"24px 28px"}}>
          <div style={{fontSize:28,fontWeight:900,color:C.accent,letterSpacing:2,marginBottom:4}}>GARNO<span style={{color:"#fff"}}>CRM</span></div>
          <div style={{fontSize:13,color:C.muted}}>Первоначальная настройка базы данных</div>
        </div>
        <div style={{padding:24,display:"flex",flexDirection:"column",gap:16}}>
          {[{n:"1",t:"Зайдите на jsonbin.io и зарегистрируйтесь (бесплатно)",b:<>Откройте <a href="https://jsonbin.io" target="_blank" rel="noreferrer" style={{color:C.accent}}>jsonbin.io</a> → Sign Up</>},
            {n:"2",t:'Получите Master Key',b:<>В меню слева нажмите <b style={{color:"#fff"}}>«API Keys»</b> → скопируйте <b style={{color:C.accent}}>Master Key</b> (начинается с <code style={{color:C.cyan,background:C.card,padding:"1px 5px",borderRadius:3}}>$2a$10$</code>)</>},
            {n:"3",t:"Вставьте ключ ниже",b:null},
          ].map(s=>(
            <div key={s.n} style={{display:"flex",gap:12,padding:"11px 14px",background:C.card,borderRadius:10,border:`1px solid ${C.border}`}}>
              <div style={{width:26,height:26,borderRadius:"50%",background:`${C.accent}25`,border:`2px solid ${C.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,color:C.accent,flexShrink:0}}>{s.n}</div>
              <div><div style={{fontSize:13,fontWeight:700,color:"#fff",marginBottom:s.b?4:0}}>{s.t}</div>{s.b&&<div style={{fontSize:12,color:C.muted,lineHeight:1.7}}>{s.b}</div>}</div>
            </div>
          ))}
          <input value={apiKey} onChange={e=>{setApiKey(e.target.value);setErr("");}} placeholder="$2a$10$..." type="password" style={ins} onKeyDown={e=>e.key==="Enter"&&connect()}/>
          {err&&<div style={{fontSize:12,color:C.red,background:"rgba(248,113,113,0.1)",borderRadius:8,padding:"10px 14px",lineHeight:1.5}}>{err}</div>}
          <button onClick={connect} disabled={busy||!apiKey.trim()}
            style={{background:busy?"rgba(255,255,255,0.08)":`linear-gradient(135deg,${C.accent},#d4b896)`,color:busy?"rgba(255,255,255,0.4)":"#00132f",border:"none",borderRadius:10,padding:"14px 0",fontSize:15,fontWeight:800,cursor:busy?"not-allowed":"pointer",opacity:!apiKey.trim()?0.5:1}}>
            {busy?"⟳ Создаём базу данных...":"🔗 Подключить и запустить CRM"}
          </button>
          <div style={{fontSize:11,color:C.dim,textAlign:"center",lineHeight:1.5}}>CRM автоматически создаст базу данных.<br/>Одноразовая настройка — данные не пропадут при обновлениях.</div>
        </div>
      </div>
    </div>
  );
}

// ─── GOOGLE-STYLE CALENDAR POPUP ──────────────────────────────────────────────
function CalPopup({initDate,initEvent,onSave,onDelete,onClose,t,lang}){
  const isEdit=!!initEvent;
  const [form,setForm]=useState(initEvent||{title:"",date:initDate||TODAY,time:"10:00",timeEnd:"11:00",manager:"Oleh",type:"visit",description:""});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const ins={background:"#001f4e",border:"1px solid rgba(255,255,255,0.14)",color:"#fff",borderRadius:7,padding:"7px 10px",fontSize:13,width:"100%",boxSizing:"border-box",outline:"none"};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.65)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:3000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#001840",borderRadius:14,border:`1px solid ${C.accentBorder}`,width:"min(500px,96vw)",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.7)"}}>
        <div style={{background:"linear-gradient(135deg,#001f4e,#002259)",padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{fontSize:15,fontWeight:700,color:C.accent}}>{isEdit?`✎ ${lang==="ru"?"Редактировать":"Edytuj"}`:`+ ${lang==="ru"?"Новое событие":"Nowe wydarzenie"}`}</div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{padding:20,display:"flex",flexDirection:"column",gap:14}}>
          <input value={form.title} onChange={e=>set("title",e.target.value)} placeholder={lang==="ru"?"Добавьте название...":"Dodaj tytuł..."} autoFocus style={{background:"transparent",border:"none",borderBottom:`2px solid ${C.accentBorder}`,color:"#fff",fontSize:17,fontWeight:600,padding:"4px 0",outline:"none",width:"100%"}}/>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:16,color:C.muted}}>📅</span>
            <input type="date" value={form.date} onChange={e=>set("date",e.target.value)} style={{...ins,width:"auto",padding:"5px 8px"}}/>
            <input type="time" value={form.time} onChange={e=>set("time",e.target.value)} style={{...ins,width:"auto",padding:"5px 8px"}}/>
            <span style={{color:C.muted,fontSize:12}}>—</span>
            <input type="time" value={form.timeEnd||""} onChange={e=>set("timeEnd",e.target.value)} style={{...ins,width:"auto",padding:"5px 8px"}}/>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
            <span style={{fontSize:14,color:C.muted}}>🏷</span>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {EVENT_TYPES.map(tp=>{const c=EVENT_COLOR[tp];const active=form.type===tp;return <button key={tp} onClick={()=>set("type",tp)} style={{padding:"5px 12px",borderRadius:20,border:`1px solid ${active?c:C.border}`,background:active?`${c}25`:"transparent",color:active?c:C.muted,cursor:"pointer",fontSize:11,fontWeight:600}}>{evLabel(tp,lang)}</button>;})}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <span style={{fontSize:14,color:C.muted}}>👤</span>
            <select value={form.manager} onChange={e=>set("manager",e.target.value)} style={{...ins,width:"auto"}}>{MANAGERS.map(m=><option key={m}>{m}</option>)}</select>
          </div>
          <div style={{display:"flex",alignItems:"flex-start",gap:8}}>
            <span style={{fontSize:14,color:C.muted,marginTop:8}}>📝</span>
            <textarea value={form.description||""} onChange={e=>set("description",e.target.value)} placeholder={lang==="ru"?"Описание...":"Opis..."} rows={2} style={{...ins,resize:"vertical",lineHeight:1.5}}/>
          </div>
        </div>
        <div style={{padding:"12px 20px",borderTop:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",gap:8}}>
          <div>{isEdit&&<Btn onClick={()=>onDelete(form.id)} variant="danger" small>✕ {lang==="ru"?"Удалить":"Usuń"}</Btn>}</div>
          <div style={{display:"flex",gap:8}}>
            <Btn onClick={onClose} variant="ghost" small>{t.cancel}</Btn>
            <button onClick={()=>form.title&&onSave(form)} disabled={!form.title} style={{background:`linear-gradient(135deg,${C.accent},#d4b896)`,color:"#00132f",border:"none",borderRadius:8,padding:"7px 18px",fontSize:13,fontWeight:800,cursor:form.title?"pointer":"not-allowed",opacity:form.title?1:0.5}}>✓ {t.save}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── KP MODAL ─────────────────────────────────────────────────────────────────
function KPModal({lead,amount,onClose}){
  const today=new Date().toLocaleDateString("pl-PL",{day:"2-digit",month:"long",year:"numeric"});
  const CO=[{n:"01",t:"ZAPYTANIE",d:"Pobranie od was informacji do wyceny"},{n:"02",t:"KONTAKT Z KLIENTEM",d:"Łączymy się z wami dostępnymi sposobami (Mail, WhatsApp i tp.)"},{n:"03",t:"WYCENA",d:"Dokonujemy wyceny waszego zapytania"},{n:"04",t:"SPOTKANIE W SHOWROOMIE",d:"Zapraszamy was do showroomu na bezpłatną konsultację"},{n:"05",t:"PODPISANIE UMOWY",d:"Podpisanie umowy z zaliczką 10%"},{n:"06",t:"POMIARY",d:"Przyjeżdżamy do was na obiekt w celu pobrania pomiarów"},{n:"07",t:"OMÓWIENIE SZCZEGÓŁÓW",d:"Spotkanie w showroomie w celu uwierdenia projektu"},{n:"08",t:"MONTAŻ",d:"Przywieziemy i zmontujemy wasze zlecenie"}];
  const rows=[{lbl:"Meble na wymiar (projekt + wykonanie)",pct:0.72},{lbl:"Montaż i instalacja",pct:0.15},{lbl:"Transport i dostawa",pct:0.08},{lbl:"Projekt 3D i wizualizacja",pct:0.05}];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:5000,overflowY:"auto"}} onClick={onClose}>
      <div className="no-print" onClick={e=>e.stopPropagation()} style={{position:"fixed",top:14,right:14,display:"flex",gap:8,zIndex:5001}}>
        <button onClick={()=>window.print()} style={{background:C.accent,color:"#00132f",border:"none",borderRadius:8,padding:"9px 18px",fontSize:13,fontWeight:800,cursor:"pointer"}}>🖨 PDF</button>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.1)",color:"#fff",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"9px 14px",cursor:"pointer"}}>✕</button>
      </div>
      <div id="kp-doc" onClick={e=>e.stopPropagation()} style={{background:"#fff",maxWidth:794,margin:"56px auto 40px",borderRadius:8,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        <div style={{background:"#00132f",padding:"36px 48px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><div style={{fontSize:32,fontWeight:900,letterSpacing:3,color:"#bfa47e"}}>GARNO</div><div style={{fontSize:11,color:"rgba(191,164,126,0.7)",letterSpacing:4,textTransform:"uppercase",marginTop:2}}>Custom Furniture</div></div>
          <div style={{textAlign:"right"}}><div style={{color:"#bfa47e",fontSize:12,letterSpacing:2,textTransform:"uppercase",marginBottom:4}}>OFERTA HANDLOWA</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:11}}>GARNO/{lead.leadId}/{new Date().getFullYear()}</div><div style={{color:"rgba(255,255,255,0.5)",fontSize:11}}>{today}</div></div>
        </div>
        <div style={{height:3,background:"linear-gradient(90deg,#bfa47e,#d4b896,#bfa47e)"}}/>
        <div style={{padding:"28px 48px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:28}}>
          <div><div style={{fontSize:10,color:"#aaa",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>KLIENT</div><div style={{fontSize:20,fontWeight:700,color:"#00132f",marginBottom:4}}>{lead.name||"—"}</div><div style={{fontSize:13,color:"#555"}}>{lead.phone}</div><div style={{fontSize:11,color:"#999",marginTop:4}}>ID: <b style={{color:"#bfa47e"}}>{lead.leadId}</b></div></div>
          <div><div style={{fontSize:10,color:"#aaa",textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>GARNO Custom Furniture</div><div style={{fontSize:12,color:"#555",lineHeight:2}}>garnofurniture.com<br/>garnofurniture.ukr<br/>Warszawa, Polska</div></div>
        </div>
        <div style={{margin:"0 48px",height:1,background:"#e8e0d4"}}/>
        <div style={{padding:"28px 48px"}}>
          <div style={{fontSize:10,color:"#aaa",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>SZCZEGÓŁOWA WYCENA</div>
          {rows.map((r,i)=>{const v=Math.round(amount*r.pct);return(<div key={i} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:"1px solid #f0ebe2"}}><span style={{fontSize:13,color:"#333"}}>{r.lbl}</span><span style={{fontSize:13,fontWeight:700,color:"#00132f"}}>{fmtM(v)}</span></div>);})}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,padding:"14px 20px",background:"#00132f",borderRadius:10}}><div style={{color:"#bfa47e",fontSize:14,fontWeight:700,letterSpacing:1}}>ŁĄCZNA KWOTA</div><div style={{color:"#bfa47e",fontSize:24,fontWeight:900}}>{fmtM(amount)}</div></div>
          <div style={{fontSize:11,color:"#aaa",marginTop:6}}>* Cena zawiera VAT 23%. Zaliczka 10% = {fmtM(Math.round(amount*0.1))}</div>
        </div>
        <div style={{padding:"0 48px 28px"}}>
          <div style={{fontSize:10,color:"#aaa",textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>MATERIAŁY I JAKOŚĆ</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>{[{i:"🪵",t:"Korpusy — Kronopan",d:"Płyta wiórowa Kronopan E1 16/18mm. Certyfikat ekologiczny."},{i:"✨",t:"Fronty MDF / fornir",d:"Lakier wysokopołyskowy lub naturalny fornir. 200+ kolorów RAL."},{i:"⚙️",t:"Okucia Blum (Austria)",d:"Ciche domykanie, 30-letnia gwarancja, 100 000 cykli."},{i:"🏆",t:"Blaty — premium",d:"Kwarcyt, granit, laminat HPL lub Corian."}].map(m=>(<div key={m.t} style={{padding:14,borderRadius:10,border:"1px solid #e8e0d4",background:"#faf8f5"}}><div style={{fontSize:18,marginBottom:6}}>{m.i}</div><div style={{fontSize:12,fontWeight:700,color:"#00132f",marginBottom:4}}>{m.t}</div><div style={{fontSize:11,color:"#666",lineHeight:1.6}}>{m.d}</div></div>))}</div>
        </div>
        <div style={{background:"#00132f",padding:"40px 48px"}}>
          <div style={{fontSize:26,fontWeight:900,color:"#bfa47e",marginBottom:4}}>co dalej?</div>
          <div style={{color:"rgba(255,255,255,0.45)",fontSize:12,marginBottom:28}}>Proces realizacji krok po kroku</div>
          <div style={{position:"relative",paddingLeft:44}}>
            <div style={{position:"absolute",left:16,top:8,bottom:8,width:2,background:"rgba(191,164,126,0.25)"}}/>
            {CO.map((step,i)=>(<div key={step.n} style={{position:"relative",paddingBottom:20,paddingLeft:24}}><div style={{position:"absolute",left:-28,width:14,height:14,borderRadius:"50%",background:i===3?"transparent":"#bfa47e",border:"2px solid #bfa47e",top:3,boxSizing:"border-box"}}/><div style={{fontSize:9,color:"rgba(191,164,126,0.55)",letterSpacing:2,marginBottom:1}}>{step.n}</div><div style={{fontSize:13,fontWeight:700,color:"#bfa47e",marginBottom:2}}>{step.t}</div><div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.6}}>{step.d}</div></div>))}
          </div>
        </div>
        <div style={{background:"#bfa47e",padding:"14px 48px",display:"flex",justifyContent:"space-between",alignItems:"center"}}><div style={{fontSize:12,color:"#00132f",fontWeight:800}}>GARNO Custom Furniture</div><div style={{fontSize:10,color:"rgba(0,19,47,0.65)"}}>Ważność oferty: 30 dni</div></div>
      </div>
    </div>
  );
}

// ─── SALE MODAL ───────────────────────────────────────────────────────────────
function SaleModal({lead,t,onConfirm,onCancel}){
  const [amt,setAmt]=useState("");
  return(<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.87)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:4000}}><div style={{background:C.surface,borderRadius:16,border:`2px solid ${C.accent}`,width:"min(380px,94vw)",padding:32}}><div style={{fontSize:20,fontWeight:800,color:C.accent,marginBottom:4}}>🎉 {t.saleAmountTitle}</div><div style={{fontSize:13,color:C.muted,marginBottom:20}}>{lead?.name||lead?.phone}</div><input type="number" value={amt} onChange={e=>setAmt(e.target.value)} autoFocus onKeyDown={e=>e.key==="Enter"&&amt&&onConfirm(parseInt(amt)||0)} style={{background:C.card,border:`2px solid ${C.accentBorder}`,color:"#fff",borderRadius:9,padding:"12px 16px",fontSize:18,width:"100%",boxSizing:"border-box",outline:"none",fontWeight:700}} placeholder="0"/><div style={{display:"flex",gap:10,marginTop:16}}><Btn onClick={onCancel} variant="ghost">{t.cancel}</Btn><button onClick={()=>onConfirm(parseInt(amt)||0)} disabled={!amt} style={{flex:1,background:`linear-gradient(135deg,${C.accent},#d4b896)`,color:"#00132f",border:"none",borderRadius:9,padding:"11px 0",fontSize:14,fontWeight:800,cursor:amt?"pointer":"not-allowed",opacity:amt?1:0.5}}>✓ {t.saleAmountConfirm}</button></div></div></div>);
}

// ─── ADD LEAD MODAL ───────────────────────────────────────────────────────────
function AddLeadModal({onClose,onAdd,t,lang,nextNum,currentUser}){
  const [form,setForm]=useState({name:"",phone:"",action:"thinking",source:SOURCES[0],manager:currentUser||"",notes:"",budgetTimeline:"unconfirmed"});
  const set=(k,v)=>setForm(p=>({...p,[k]:v}));
  const previewId=makeLeadId(nextNum,dAgo(0));
  const ins={background:C.surface,border:`1px solid ${C.borderMd}`,color:"#fff",borderRadius:7,padding:"8px 11px",fontSize:13,width:"100%",boxSizing:"border-box",outline:"none"};
  const submit=()=>{if(!form.name.trim())return;const createdAt=dAgo(0);onAdd({...form,id:nextNum,leadId:makeLeadId(nextNum,createdAt),score:0,qualification:"unqualified",createdAt,isDone:false,quoteAmt:null,history:[{date:nowStr(),action:lang==="ru"?"Лид добавлен":"Lead dodany",by:currentUser||"Admin"}]});onClose();};
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:2000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:16,border:`1px solid ${C.accentBorder}`,width:"min(480px,95vw)",padding:28}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div><div style={{fontSize:18,fontWeight:800,color:C.accent}}>+ {t.addLead}</div><div style={{fontSize:11,color:C.muted,marginTop:3}}>ID: <b style={{color:C.accent,fontFamily:"monospace"}}>{previewId}</b></div></div>
          <button onClick={onClose} style={{background:"transparent",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>✕</button>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:11}}>
          <div><div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>{t.name} *</div><input value={form.name} onChange={e=>set("name",e.target.value)} style={ins}/></div>
          <div><div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>{t.phone}</div><input value={form.phone} onChange={e=>set("phone",e.target.value)} placeholder="48 500 000 000" style={ins}/></div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>{t.source}</div><select value={form.source} onChange={e=>set("source",e.target.value)} style={ins}>{SOURCES.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>{t.action}</div><select value={form.action} onChange={e=>set("action",e.target.value)} style={ins}>{ACTIONS.map(a=><option key={a} value={a}>{t[a]||a}</option>)}</select></div>
          </div>
          <div><div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>{t.manager}</div><select value={form.manager} onChange={e=>set("manager",e.target.value)} style={ins}><option value="">{lang==="ru"?"— не назначен —":"— nieprzypisany —"}</option>{MANAGERS.map(m=><option key={m}>{m}</option>)}</select></div>
          <div><div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>{t.period}</div><select value={form.budgetTimeline} onChange={e=>set("budgetTimeline",e.target.value)} style={{...ins,borderColor:BUD_COLOR[form.budgetTimeline]||C.borderMd}}>{BUDGETS.map(b=><option key={b} value={b}>{t[b]||b}</option>)}</select></div>
          <div><div style={{fontSize:10,color:C.muted,marginBottom:4,textTransform:"uppercase",letterSpacing:0.8}}>{t.notes}</div><textarea value={form.notes} onChange={e=>set("notes",e.target.value)} rows={2} style={{...ins,resize:"vertical"}}/></div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:10,marginTop:18,paddingTop:14,borderTop:`1px solid ${C.border}`}}>
          <Btn onClick={onClose} variant="ghost">{t.cancel}</Btn>
          <button onClick={submit} style={{background:`linear-gradient(135deg,${C.accent},#d4b896)`,color:"#00132f",border:"none",borderRadius:9,padding:"10px 22px",fontSize:14,fontWeight:800,cursor:"pointer"}}>✓ {lang==="ru"?"Добавить":"Dodaj"}</button>
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV=[{key:"dashboard",icon:"⊞",ru:"Дашборд",pl:"Panel"},{key:"leads",icon:"◈",ru:"Лиды",pl:"Leady"},{key:"calendar",icon:"◷",ru:"Календарь",pl:"Kalendarz"},{key:"analytics",icon:"◎",ru:"Аналитика",pl:"Analityka"},{key:"ai",icon:"◆",ru:"AI Ассистент",pl:"Asystent AI"},{key:"sales",icon:"★",ru:"Продажи",pl:"Sprzedaże"}];
function Sidebar({page,setPage,lang,collapsed,mgr,setMgr}){
  return(
    <div style={{width:collapsed?56:200,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,transition:"width 0.2s",overflow:"hidden"}}>
      <div style={{padding:"14px 10px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:34,height:34,borderRadius:9,background:C.accentDim,border:`1px solid ${C.accentBorder}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,color:C.accent,flexShrink:0,fontWeight:900}}>G</div>
        {!collapsed&&<span style={{color:C.accent,fontWeight:900,fontSize:14,letterSpacing:1.5}}>GARNO<span style={{color:"#fff"}}>CRM</span></span>}
      </div>
      <nav style={{flex:1,padding:"8px 6px",display:"flex",flexDirection:"column",gap:2}}>
        {NAV.map(item=>{const active=page===item.key;return(<button key={item.key} onClick={()=>setPage(item.key)} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 10px",borderRadius:8,border:"none",background:active?C.accentDim:"transparent",color:active?C.accent:C.muted,cursor:"pointer",textAlign:"left",fontSize:13,fontWeight:active?700:500,borderLeft:active?`2px solid ${C.accent}`:"2px solid transparent"}}><span style={{fontSize:14,flexShrink:0}}>{item.icon}</span>{!collapsed&&<span style={{whiteSpace:"nowrap"}}>{lang==="ru"?item.ru:item.pl}</span>}</button>);})}
        {!collapsed&&page==="leads"&&(<div style={{marginTop:10,borderTop:`1px solid ${C.border}`,paddingTop:10}}>{["all",...MANAGERS].map(m=>(<button key={m} onClick={()=>setMgr(m)} style={{display:"flex",alignItems:"center",gap:7,padding:"7px 10px",borderRadius:6,border:"none",background:mgr===m?`${MGR_COLOR[m]||C.accent}22`:"transparent",color:mgr===m?(MGR_COLOR[m]||C.accent):C.muted,cursor:"pointer",fontSize:12,fontWeight:mgr===m?600:400,width:"100%",textAlign:"left"}}>{m!=="all"&&<Avatar name={m} color={MGR_COLOR[m]} size={18}/>}{m==="all"?`◉ ${lang==="ru"?"Все":"Wszyscy"}`:m}</button>))}</div>)}
      </nav>
    </div>
  );
}

// ─── TOPBAR ───────────────────────────────────────────────────────────────────
function TopBar({lang,setLang,search,setSearch,collapsed,setCollapsed,t,onAddLead,currentUser,setCurrentUser,syncLabel}){
  const [showUsers,setShowUsers]=useState(false);
  const syncColor=syncLabel==="✓"?C.green:syncLabel==="!"?C.red:syncLabel==="⟳"?C.yellow:C.green;
  return(
    <div style={{height:56,background:C.surface,borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10,padding:"0 14px",flexShrink:0}}>
      <button onClick={()=>setCollapsed(p=>!p)} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:18,padding:4}}>☰</button>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:8,display:"flex",alignItems:"center",gap:8,padding:"7px 12px",maxWidth:300}}>
        <span style={{color:C.dim,fontSize:12}}>🔍</span>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder={t.search} style={{background:"transparent",border:"none",outline:"none",color:"#fff",fontSize:12,width:170}}/>
      </div>
      <div style={{flex:1}}/>
      {/* Sync status */}
      <div style={{display:"flex",alignItems:"center",gap:5,fontSize:10,background:C.card,borderRadius:7,padding:"4px 10px",border:`1px solid ${C.border}`}}>
        <span style={{color:syncColor,fontSize:14}}>{syncLabel}</span>
        <span style={{color:syncColor,fontWeight:600}}>LIVE SYNC</span>
      </div>
      <button onClick={onAddLead} style={{background:`linear-gradient(135deg,${C.accent},#d4b896)`,color:"#00132f",border:"none",borderRadius:10,padding:"10px 20px",fontSize:13,fontWeight:800,cursor:"pointer",display:"flex",alignItems:"center",gap:8,boxShadow:`0 2px 14px rgba(191,164,126,0.4)`}}><span style={{fontSize:16,fontWeight:900}}>+</span> {t.addLead}</button>
      <div style={{display:"flex",gap:2,background:C.card,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>{["ru","pl"].map(l=><button key={l} onClick={()=>setLang(l)} style={{padding:"4px 10px",borderRadius:6,border:"none",background:lang===l?C.accentDim:"transparent",color:lang===l?C.accent:C.muted,cursor:"pointer",fontSize:11,fontWeight:700}}>{l.toUpperCase()}</button>)}</div>
      {/* User switcher */}
      <div style={{position:"relative"}}>
        <button onClick={()=>setShowUsers(p=>!p)} style={{display:"flex",alignItems:"center",gap:8,background:C.card,border:`1px solid ${MGR_COLOR[currentUser]||C.accentBorder}`,borderRadius:10,padding:"6px 12px",cursor:"pointer",color:"#fff"}}>
          <div style={{width:24,height:24,borderRadius:"50%",background:`${MGR_COLOR[currentUser]||C.accent}25`,border:`2px solid ${MGR_COLOR[currentUser]||C.accent}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:800,color:MGR_COLOR[currentUser]||C.accent}}>{(currentUser||"?")[0].toUpperCase()}</div>
          <span style={{fontSize:12,fontWeight:600,color:MGR_COLOR[currentUser]||C.accent}}>{currentUser||"Выбрать"}</span>
          <span style={{fontSize:10,color:C.muted}}>▾</span>
        </button>
        {showUsers&&<div onClick={()=>setShowUsers(false)} style={{position:"fixed",inset:0,zIndex:1999}}/>}
        {showUsers&&(
          <div style={{position:"absolute",top:"calc(100% + 6px)",right:0,background:C.surface,border:`1px solid ${C.accentBorder}`,borderRadius:12,padding:8,zIndex:2000,minWidth:160,boxShadow:"0 8px 32px rgba(0,0,0,0.5)"}}>
            <div style={{fontSize:9,color:C.muted,textTransform:"uppercase",letterSpacing:1,padding:"4px 10px 8px",borderBottom:`1px solid ${C.border}`,marginBottom:6}}>Аккаунт</div>
            {MANAGERS.map(m=>{const active=currentUser===m;return(
              <button key={m} onClick={()=>{setCurrentUser(m);setShowUsers(false);}} style={{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"8px 12px",borderRadius:8,border:"none",background:active?`${MGR_COLOR[m]}20`:"transparent",cursor:"pointer",marginBottom:2}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:`${MGR_COLOR[m]}25`,border:`2px solid ${MGR_COLOR[m]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:MGR_COLOR[m]}}>{m[0]}</div>
                <div style={{textAlign:"left"}}><div style={{fontSize:13,fontWeight:700,color:active?MGR_COLOR[m]:"#fff"}}>{m}</div><div style={{fontSize:10,color:C.muted}}>{m==="Danya"?"Администратор":"Менеджер"}</div></div>
                {active&&<div style={{marginLeft:"auto",width:8,height:8,borderRadius:"50%",background:MGR_COLOR[m]}}/>}
              </button>
            );})}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({leads,events,t,lang}){
  const [range,setRange]=useState("30d");
  const fl=filterByRange(leads,range);
  const qual=fl.filter(l=>["qualified","salon","sale"].includes(l.qualification));
  const funnelData=QUALS.map(q=>({name:t[q],val:fl.filter(l=>l.qualification===q).length,color:QUAL_COLOR[q]}));
  const srcData=SOURCES.map(s=>({name:srcShort(s),value:fl.filter(l=>l.source===s).length,fill:SRC_COLOR[s]})).filter(d=>d.value>0).sort((a,b)=>b.value-a.value);
  const mgrData=MANAGERS.map(m=>{const ml=fl.filter(l=>l.manager===m);return{name:m,total:ml.length,conv:ml.length?Math.round(ml.filter(l=>["qualified","salon","sale"].includes(l.qualification)).length/ml.length*100):0};});
  const todayEvs=[...events].filter(e=>e.date===TODAY).sort((a,b)=>a.time.localeCompare(b.time));
  const upcoming=[...events].filter(e=>e.date>=TODAY).sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
  return(
    <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{t.dashboard} <span style={{fontSize:11,color:C.muted}}>({fl.length})</span></div><DateRangeBar range={range} setRange={setRange} t={t}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10}}>
        {[{label:t.newLeads,val:fl.filter(l=>!l.manager).length,color:C.yellow},{label:t.processed,val:fl.filter(l=>l.isDone).length,color:C.green},{label:t.todayMeetings,val:todayEvs.length,color:C.blue},{label:t.convRate,val:`${fl.length?Math.round(qual.length/fl.length*100):0}%`,color:C.accent}].map(s=>(<div key={s.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px"}}><div style={{fontSize:9,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:1}}>{s.label}</div><div style={{fontSize:28,fontWeight:800,color:s.color}}>{s.val}</div></div>))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{t.funnel}</div>
          {funnelData.map(d=>(<div key={d.name} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:"#fff"}}>{d.name}</span><span style={{fontSize:12,color:d.color,fontWeight:700}}>{d.val}</span></div><div style={{background:"rgba(255,255,255,0.07)",borderRadius:4,height:6}}><div style={{background:d.color,borderRadius:4,height:6,width:`${fl.length?Math.round(d.val/fl.length*100):0}%`,transition:"width 0.8s"}}/></div></div>))}
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>{t.kpi}</div>
          {mgrData.map(m=>(<div key={m.name} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${C.border}`}}><Avatar name={m.name} color={MGR_COLOR[m.name]} size={32}/><div style={{flex:1}}><div style={{fontSize:12,color:MGR_COLOR[m.name],fontWeight:700}}>{m.name}</div><div style={{fontSize:10,color:C.muted}}>{m.total} leads</div></div><div style={{fontSize:16,fontWeight:800,color:m.conv>40?C.green:m.conv>20?C.yellow:C.red}}>{m.conv}%</div></div>))}
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.source_label}</div>
          <ResponsiveContainer width="100%" height={150}><BarChart data={srcData.slice(0,7)} margin={{top:0,right:0,bottom:22,left:-20}}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)"/><XAxis dataKey="name" tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false} angle={-28} textAnchor="end"/><YAxis tick={{fill:C.muted,fontSize:9}} axisLine={false} tickLine={false}/><Tooltip {...TIP}/><Bar dataKey="value" radius={[4,4,0,0]}>{srcData.slice(0,7).map((d,i)=><Cell key={i} fill={d.fill||C.accent}/>)}</Bar></BarChart></ResponsiveContainer>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
          <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>{t.upcoming}</div>
          {upcoming.slice(0,5).map(ev=>{const c=EVENT_COLOR[ev.type]||C.muted;return(<div key={ev.id} style={{display:"flex",gap:10,padding:"6px 0",borderBottom:`1px solid ${C.border}`}}><div style={{width:3,background:c,borderRadius:2,flexShrink:0}}/><div style={{flex:1}}><div style={{fontSize:11,color:"#fff"}}>{ev.title}</div><div style={{fontSize:10,color:C.muted}}>{ev.time}{ev.timeEnd?`–${ev.timeEnd}`:""} · <span style={{color:MGR_COLOR[ev.manager]}}>{ev.manager}</span></div></div><Badge label={ev.date.slice(5)} color={c} small/></div>);})}
        </div>
      </div>
      <div style={{background:C.card,border:`2px solid ${C.accentBorder}`,borderRadius:14,padding:18}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}><span style={{fontSize:16}}>📅</span><div style={{fontSize:14,fontWeight:700,color:C.accent}}>{t.todaySection} — {TODAY}</div><span style={{fontSize:11,color:C.muted}}>({todayEvs.length} {lang==="ru"?"событий":"zdarzeń"})</span></div>
        {todayEvs.length===0?<div style={{color:C.dim,fontSize:13}}>{t.noToday}</div>:
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))",gap:8,marginBottom:12}}>
            {todayEvs.map(ev=>{const c=EVENT_COLOR[ev.type]||C.muted;return(<div key={ev.id} style={{background:C.surface,borderRadius:9,padding:"10px 12px",border:`1px solid ${c}44`,borderLeft:`4px solid ${c}`}}><div style={{fontSize:12,color:"#fff",fontWeight:600,marginBottom:3}}>{ev.title}</div><div style={{fontSize:10,color:C.muted}}>{ev.time}{ev.timeEnd?`–${ev.timeEnd}`:""} · <span style={{color:MGR_COLOR[ev.manager]}}>{ev.manager}</span></div>{ev.description&&<div style={{fontSize:10,color:C.dim,marginTop:3}}>{ev.description}</div>}<div style={{marginTop:6}}><Badge label={evLabel(ev.type,lang)} color={c} small/></div></div>);})}
          </div>}
      </div>
    </div>
  );
}

// ─── LEADS PAGE ───────────────────────────────────────────────────────────────
function LeadsPage({leads,setLeads,t,mgr,search,onOpen}){
  const [range,setRange]=useState("all");
  const [fQ,setFQ]=useState("all");const [fA,setFA]=useState("all");const [fS,setFS]=useState("all");const [sort,setSort]=useState("date");
  const [selected,setSelected]=useState(new Set());
  const ss={background:C.card,border:`1px solid ${C.border}`,color:"#fff",borderRadius:6,padding:"5px 8px",fontSize:11,cursor:"pointer"};
  const fl=filterByRange(leads,range).filter(l=>mgr==="all"||l.manager===mgr).filter(l=>!search||l.name.toLowerCase().includes(search.toLowerCase())||l.phone.includes(search)||(l.leadId||"").includes(search)).filter(l=>fQ==="all"||l.qualification===fQ).filter(l=>fA==="all"||l.action===fA).filter(l=>fS==="all"||l.source===fS).sort((a,b)=>sort==="score"?b.score-a.score:sort==="date"?b.id-a.id:a.id-b.id);
  const toggleOne=(id,e)=>{e.stopPropagation();setSelected(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});};
  const toggleAll=()=>setSelected(selected.size===fl.length&&fl.length>0?new Set():new Set(fl.map(l=>l.id)));
  const deleteSelected=()=>{setLeads(p=>p.filter(l=>!selected.has(l.id)));setSelected(new Set());};
  const allChecked=fl.length>0&&selected.size===fl.length;
  const someChecked=selected.size>0&&selected.size<fl.length;
  return(
    <div style={{padding:18,display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{mgr==="all"?t.allLeads:`${t.leads} — ${mgr}`} <span style={{fontSize:12,color:C.muted}}>({fl.length})</span></div>
          {selected.size>0&&(<div style={{display:"flex",alignItems:"center",gap:8,background:"rgba(248,113,113,0.12)",border:`1px solid ${C.red}44`,borderRadius:9,padding:"6px 14px"}}>
            <span style={{fontSize:12,color:C.red,fontWeight:600}}>✓ {selected.size}</span>
            <button onClick={deleteSelected} style={{background:C.red,border:"none",color:"#fff",borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>🗑 {t.deleteSelected}</button>
            <button onClick={()=>setSelected(new Set())} style={{background:"transparent",border:"none",color:C.muted,cursor:"pointer",fontSize:14}}>✕</button>
          </div>)}
        </div>
        <DateRangeBar range={range} setRange={setRange} t={t}/>
      </div>
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <select value={fQ} onChange={e=>setFQ(e.target.value)} style={ss}><option value="all">{t.qualification}</option>{QUALS.map(q=><option key={q} value={q}>{t[q]}</option>)}</select>
        <select value={fA} onChange={e=>setFA(e.target.value)} style={ss}><option value="all">{t.action}</option>{ACTIONS.map(a=><option key={a} value={a}>{t[a]}</option>)}</select>
        <select value={fS} onChange={e=>setFS(e.target.value)} style={ss}><option value="all">{t.source}</option>{SOURCES.map(s=><option key={s} value={s}>{srcShort(s)}</option>)}</select>
        <select value={sort} onChange={e=>setSort(e.target.value)} style={ss}><option value="date">{t.date}</option><option value="id">ID</option><option value="score">{t.score} ↓</option></select>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
            <thead><tr style={{background:C.surface,borderBottom:`1px solid ${C.border}`}}>
              <th style={{padding:"9px 10px",width:36}}><input type="checkbox" checked={allChecked} ref={el=>{if(el)el.indeterminate=someChecked;}} onChange={toggleAll} style={{cursor:"pointer",width:14,height:14,accentColor:C.accent}}/></th>
              {["ID",t.date,t.name,t.phone,t.score,t.qualification,t.period,t.action,t.manager,t.source,""].map((h,i)=><th key={i} style={{padding:"9px 10px",color:C.muted,fontWeight:600,textAlign:"left",whiteSpace:"nowrap",fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>)}
            </tr></thead>
            <tbody>{fl.map(l=>{const isSel=selected.has(l.id);return(
              <tr key={l.id} onClick={()=>onOpen(l)}
                style={{borderBottom:`1px solid ${C.border}`,background:isSel?"rgba(191,164,126,0.1)":l.qualification==="sale"?"rgba(191,164,126,0.06)":"transparent",cursor:"pointer"}}
                onMouseEnter={e=>!isSel&&(e.currentTarget.style.background=C.surface)}
                onMouseLeave={e=>{e.currentTarget.style.background=isSel?"rgba(191,164,126,0.1)":l.qualification==="sale"?"rgba(191,164,126,0.06)":"transparent";}}>
                <td style={{padding:"8px 10px"}} onClick={e=>toggleOne(l.id,e)}><input type="checkbox" checked={isSel} onChange={()=>{}} onClick={e=>toggleOne(l.id,e)} style={{cursor:"pointer",width:14,height:14,accentColor:C.accent}}/></td>
                <td style={{padding:"8px 10px"}}><span style={{fontSize:10,color:C.accent,fontFamily:"monospace",fontWeight:600}}>{l.leadId||l.id}</span></td>
                <td style={{padding:"8px 10px",color:C.dim,fontSize:11,whiteSpace:"nowrap"}}>{l.createdAt}</td>
                <td style={{padding:"8px 10px"}}><span style={{color:"#fff",fontWeight:500}}>{l.name||<span style={{color:C.dim}}>—</span>}</span></td>
                <td style={{padding:"8px 10px",color:C.muted,fontFamily:"monospace",fontSize:11}}>{l.phone}</td>
                <td style={{padding:"8px 10px"}}><ScoreBar score={l.score}/></td>
                <td style={{padding:"8px 10px"}}><Badge label={t[l.qualification]} color={QUAL_COLOR[l.qualification]} small/></td>
                <td style={{padding:"8px 10px"}}><Badge label={(t[l.budgetTimeline]||"").slice(0,14)} color={BUD_COLOR[l.budgetTimeline]} small/></td>
                <td style={{padding:"8px 10px"}}><Badge label={t[l.action]} color={ACT_COLOR[l.action]} small/></td>
                <td style={{padding:"8px 10px"}}>{l.manager?<div style={{display:"flex",alignItems:"center",gap:5}}><Avatar name={l.manager} color={MGR_COLOR[l.manager]} size={18}/><span style={{color:MGR_COLOR[l.manager],fontSize:11}}>{l.manager}</span></div>:<span style={{color:C.dim,fontSize:11}}>—</span>}</td>
                <td style={{padding:"8px 10px"}}><SrcBadge source={l.source}/></td>
                <td style={{padding:"8px 10px"}}><button onClick={e=>{e.stopPropagation();onOpen(l);}} style={{background:C.accentDim,border:`1px solid ${C.accentBorder}`,color:C.accent,borderRadius:6,padding:"3px 8px",fontSize:10,cursor:"pointer",fontWeight:700}}>→</button></td>
              </tr>
            );})}</tbody>
          </table>
          {fl.length===0&&<div style={{padding:40,textAlign:"center",color:C.muted}}>Нет лидов</div>}
        </div>
      </div>
    </div>
  );
}

// ─── LEAD DETAIL ──────────────────────────────────────────────────────────────
function LeadDetail({lead,setLeads,t,lang,onClose,onAddSale,currentUser}){
  const [editing,setEditing]=useState(false);
  const [form,setForm]=useState({...lead});
  const [showSale,setShowSale]=useState(false);
  const set=(k,v)=>setForm(p=>{const u={...p,[k]:v};if(k==="score"){u.qualification=scoreToQual(v);if(parseInt(v)===6&&parseInt(p.score)!==6)setShowSale(true);}return u;});
  const save=()=>{const entry={date:nowStr(),action:lang==="ru"?"Изменено":"Zmieniono",by:currentUser||"—"};const updated={...form,history:[...(form.history||[]),entry]};setLeads(p=>p.map(l=>l.id===lead.id?{...l,...updated}:l));setEditing(false);setForm(updated);};
  const confirmSale=(amt)=>{const upd={...form,saleAmount:amt,isDone:true};setLeads(p=>p.map(l=>l.id===lead.id?{...l,...upd}:l));onAddSale({id:Date.now(),leadId:lead.leadId||lead.id,name:form.name,phone:form.phone,manager:form.manager||"—",source:form.source,createdAt:new Date().toLocaleDateString("ru-RU"),saleAmount:amt,notes:form.notes});setShowSale(false);onClose();};
  const inp=(field,label)=>(<div style={{marginBottom:10}}><div style={{fontSize:10,color:C.muted,marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>{label}</div>{editing?<input value={form[field]||""} onChange={e=>set(field,e.target.value)} style={{background:C.surface,border:`1px solid ${C.borderMd}`,color:"#fff",borderRadius:6,padding:"6px 10px",fontSize:12,width:"100%",boxSizing:"border-box"}}/>:<div style={{fontSize:13,color:form[field]?"#fff":C.dim}}>{form[field]||"—"}</div>}</div>);
  return(<>
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.78)",display:"flex",alignItems:"flex-end",justifyContent:"center",zIndex:1000}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:C.surface,borderRadius:"16px 16px 0 0",border:`1px solid ${C.border}`,width:"100%",maxWidth:820,maxHeight:"90vh",overflow:"auto",padding:22}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}><Avatar name={lead.name||lead.phone} color={QUAL_COLOR[form.qualification]} size={44}/><div><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{lead.name||lead.phone}</div><div style={{fontSize:11,color:C.muted}}>ID: <b style={{color:C.accent,fontFamily:"monospace"}}>{lead.leadId||lead.id}</b> · {lead.phone}</div></div><Badge label={t[form.qualification]} color={QUAL_COLOR[form.qualification]}/></div>
          <div style={{display:"flex",gap:8}}>{!editing?<Btn onClick={()=>setEditing(true)} small>✎ {t.edit}</Btn>:<><Btn onClick={save} small>✓ {t.save}</Btn><Btn onClick={()=>{setEditing(false);setForm({...lead});}} variant="ghost" small>{t.cancel}</Btn></>}<Btn onClick={onClose} variant="ghost" small>✕</Btn></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
          <div style={{background:C.card,borderRadius:10,padding:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>📞 Контакт</div>
            {inp("name",t.name)}{inp("phone",t.phone)}
            <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.muted,marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>{t.action}</div>{editing?<select value={form.action||""} onChange={e=>set("action",e.target.value)} style={{background:C.surface,border:`1px solid ${C.borderMd}`,color:"#fff",borderRadius:6,padding:"6px 10px",fontSize:12,width:"100%"}}>{ACTIONS.map(o=><option key={o} value={o}>{t[o]||o}</option>)}</select>:<Badge label={t[form.action]||"—"} color={ACT_COLOR[form.action]||C.muted} small/>}</div>
            <div><div style={{fontSize:10,color:C.muted,marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>{t.manager}</div>{editing?<select value={form.manager||""} onChange={e=>set("manager",e.target.value||null)} style={{background:C.surface,border:`1px solid ${C.borderMd}`,color:"#fff",borderRadius:6,padding:"6px 10px",fontSize:12,width:"100%"}}><option value="">—</option>{MANAGERS.map(m=><option key={m}>{m}</option>)}</select>:form.manager?<div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={form.manager} color={MGR_COLOR[form.manager]} size={22}/><span style={{color:MGR_COLOR[form.manager]}}>{form.manager}</span></div>:<span style={{color:C.dim}}>—</span>}</div>
          </div>
          <div style={{background:C.card,borderRadius:10,padding:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:1,marginBottom:10}}>◈ Оценка 0–6</div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:10}}>{[0,1,2,3,4,5,6].map(s=>{const q=scoreToQual(s);const c=QUAL_COLOR[q];const active=form.score===s;return(<button key={s} onClick={()=>editing&&set("score",s)} style={{width:34,height:34,borderRadius:8,border:`2px solid ${active?c:"rgba(255,255,255,0.15)"}`,background:active?`${c}30`:"transparent",color:active?c:C.muted,cursor:editing?"pointer":"default",fontWeight:700,fontSize:13}}>{s}</button>);})}</div>
            <div style={{background:`${QUAL_COLOR[form.qualification]}18`,border:`1px solid ${QUAL_COLOR[form.qualification]}44`,borderRadius:8,padding:"7px 12px",marginBottom:10}}><div style={{fontSize:11,color:QUAL_COLOR[form.qualification],fontWeight:700}}>→ {t[form.qualification]}</div></div>
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginTop:14}}>
          <div style={{background:C.card,borderRadius:10,padding:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>📝 {t.notes}</div>
            <div style={{marginBottom:10}}><div style={{fontSize:10,color:C.muted,marginBottom:3,textTransform:"uppercase",letterSpacing:0.5}}>{t.period}</div>{editing?<select value={form.budgetTimeline||"unconfirmed"} onChange={e=>set("budgetTimeline",e.target.value)} style={{background:C.surface,border:`1px solid ${BUD_COLOR[form.budgetTimeline]||C.borderMd}`,color:BUD_COLOR[form.budgetTimeline]||"#fff",borderRadius:6,padding:"6px 10px",fontSize:12,width:"100%"}}>{BUDGETS.map(b=><option key={b} value={b}>{t[b]||b}</option>)}</select>:<Badge label={t[form.budgetTimeline]||"—"} color={BUD_COLOR[form.budgetTimeline]||C.muted} small/>}</div>
            {editing?<textarea value={form.notes} onChange={e=>set("notes",e.target.value)} style={{background:C.surface,border:`1px solid ${C.borderMd}`,color:"#fff",borderRadius:6,padding:"8px 10px",fontSize:12,width:"100%",minHeight:80,resize:"vertical",boxSizing:"border-box"}}/>:<div style={{fontSize:12,color:form.notes?"#fff":C.dim,lineHeight:1.6}}>{form.notes||"—"}</div>}
          </div>
          <div style={{background:C.card,borderRadius:10,padding:14,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:10,color:C.accent,textTransform:"uppercase",letterSpacing:1,marginBottom:8}}>◷ {t.history}</div>
            {(form.history||[]).length===0?<div style={{color:C.dim,fontSize:12}}>—</div>:[...(form.history||[])].reverse().map((h,i)=>(<div key={i} style={{display:"flex",gap:8,marginBottom:8}}><div style={{width:2,background:C.accentBorder,borderRadius:1}}/><div><div style={{fontSize:11,color:"#fff"}}>{h.action}</div><div style={{fontSize:10,color:C.muted}}>{h.date} · <span style={{color:MGR_COLOR[h.by]||C.accent,fontWeight:600}}>{h.by}</span></div></div></div>))}
          </div>
        </div>
      </div>
    </div>
    {showSale&&<SaleModal lead={form} t={t} onConfirm={confirmSale} onCancel={()=>{setShowSale(false);setForm(p=>({...p,score:5,qualification:"salon"}));}}/>}
  </>);
}

// ─── CALENDAR PAGE ────────────────────────────────────────────────────────────
function CalendarPage({events,setEvents,t,lang}){
  const [calDate,setCalDate]=useState(()=>{const d=new Date();return{year:d.getFullYear(),month:d.getMonth()};});
  const [popup,setPopup]=useState(null);
  const prevM=()=>setCalDate(p=>{const m=p.month-1;return m<0?{year:p.year-1,month:11}:{year:p.year,month:m};});
  const nextM=()=>setCalDate(p=>{const m=p.month+1;return m>11?{year:p.year+1,month:0}:{year:p.year,month:m};});
  const dIM=new Date(calDate.year,calDate.month+1,0).getDate();
  const fd=new Date(calDate.year,calDate.month,1).getDay();
  const mStr=`${calDate.year}-${String(calDate.month+1).padStart(2,"0")}`;
  const mName=lang==="ru"?MONTHS_RU[calDate.month]:MONTHS_PL[calDate.month];
  const days=["Вс","Пн","Вт","Ср","Чт","Пт","Сб"];
  const handleSave=(form)=>{if(form.id&&events.find(e=>e.id===form.id))setEvents(p=>p.map(e=>e.id===form.id?{...form}:e));else setEvents(p=>[...p,{...form,id:Date.now()}]);setPopup(null);};
  const handleDelete=(id)=>{setEvents(p=>p.filter(e=>e.id!==id));setPopup(null);};
  const sorted=[...events].filter(e=>e.date.startsWith(mStr)).sort((a,b)=>a.date===b.date?a.time.localeCompare(b.time):a.date.localeCompare(b.date));
  return(
    <div style={{padding:18}}>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
        <button onClick={prevM} style={{background:C.card,border:`1px solid ${C.border}`,color:"#fff",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:16,fontWeight:700}}>‹</button>
        <div style={{fontSize:18,fontWeight:700,color:"#fff",minWidth:180,textAlign:"center"}}>{mName} {calDate.year}</div>
        <button onClick={nextM} style={{background:C.card,border:`1px solid ${C.border}`,color:"#fff",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:16,fontWeight:700}}>›</button>
        <div style={{flex:1}}/>
        <button onClick={()=>setPopup({initDate:TODAY,initEvent:null})} style={{background:`linear-gradient(135deg,${C.accent},#d4b896)`,color:"#00132f",border:"none",borderRadius:8,padding:"8px 16px",fontSize:12,fontWeight:700,cursor:"pointer"}}>+ {t.addEvent}</button>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden",marginBottom:16}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",borderBottom:`1px solid ${C.border}`}}>{days.map(d=><div key={d} style={{padding:"10px 6px",textAlign:"center",fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase",letterSpacing:0.5}}>{d}</div>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)"}}>
          {Array.from({length:fd}).map((_,i)=><div key={`e${i}`} style={{minHeight:90,borderRight:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`}}/>)}
          {Array.from({length:dIM}).map((_,i)=>{const day=i+1;const ds=`${mStr}-${String(day).padStart(2,"0")}`;const dayEvs=events.filter(e=>e.date===ds).sort((a,b)=>a.time.localeCompare(b.time));const isToday=ds===TODAY;return(<div key={day} onClick={()=>setPopup({initDate:ds,initEvent:null})} style={{minHeight:90,padding:"5px 4px 3px",borderRight:`1px solid ${C.border}`,borderBottom:`1px solid ${C.border}`,background:isToday?"rgba(191,164,126,0.08)":"transparent",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=isToday?"rgba(191,164,126,0.12)":"rgba(255,255,255,0.02)"} onMouseLeave={e=>e.currentTarget.style.background=isToday?"rgba(191,164,126,0.08)":"transparent"}><div style={{width:22,height:22,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",background:isToday?C.accent:"transparent",color:isToday?"#00132f":C.muted,fontSize:11,fontWeight:isToday?700:400,marginBottom:2}}>{day}</div>{dayEvs.map(ev=>{const c=EVENT_COLOR[ev.type]||C.muted;return(<div key={ev.id} onClick={e=>{e.stopPropagation();setPopup({initDate:ds,initEvent:ev});}} style={{background:`${c}22`,border:`1px solid ${c}44`,borderRadius:3,padding:"1px 4px",marginBottom:1,fontSize:8,color:c,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",cursor:"pointer"}}>{ev.time} {ev.title}</div>);})}</div>);})}
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
        {sorted.map(ev=>{const c=EVENT_COLOR[ev.type]||C.muted;return(<div key={ev.id} style={{background:C.card,border:`1px solid ${c}33`,borderLeft:`3px solid ${c}`,borderRadius:8,padding:"10px 12px",cursor:"pointer"}} onClick={()=>setPopup({initDate:ev.date,initEvent:ev})} onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background=C.card}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:12,color:"#fff",fontWeight:600}}>{ev.title}</span><button onClick={e=>{e.stopPropagation();handleDelete(ev.id);}} style={{background:"transparent",border:"none",color:C.dim,cursor:"pointer",fontSize:12,padding:0}}>✕</button></div><div style={{fontSize:10,color:C.muted,marginBottom:6}}>{ev.date} · {ev.time}{ev.timeEnd?`–${ev.timeEnd}`:""} · <span style={{color:MGR_COLOR[ev.manager]}}>{ev.manager}</span></div>{ev.description&&<div style={{fontSize:10,color:C.dim,marginBottom:6,fontStyle:"italic"}}>{ev.description}</div>}<Badge label={evLabel(ev.type,lang)} color={c} small/></div>);})}
      </div>
      {popup&&<CalPopup initDate={popup.initDate} initEvent={popup.initEvent} onSave={handleSave} onDelete={handleDelete} onClose={()=>setPopup(null)} t={t} lang={lang}/>}
    </div>
  );
}

// ─── ANALYTICS ────────────────────────────────────────────────────────────────
function AnalyticsPage({leads,sales,t}){
  const [range,setRange]=useState("all");
  const fl=filterByRange(leads,range);const fs=filterByRange(sales,range);
  const mData=MANAGERS.map(m=>{const ml=fl.filter(l=>l.manager===m);const ms=fs.filter(s=>s.manager===m);const total=ml.length;const kwaly=ml.filter(l=>l.score>=4).length;const s4=ml.filter(l=>l.score===4).length;const s5=ml.filter(l=>l.score===5).length;const avg=total?(ml.reduce((a,l)=>a+l.score,0)/total).toFixed(2):0;return{name:m,total,kwaly,kwalyPct:total?parseFloat((kwaly/total*100).toFixed(1)):0,to5:s4?parseFloat((s5/s4*100).toFixed(1)):0,toSell:s5?parseFloat((ms.length/s5*100).toFixed(1)):0,salesCount:ms.length,salesRev:ms.reduce((a,s)=>a+s.saleAmount,0),visits:ml.filter(l=>l.score>=5).length,avg:parseFloat(avg)};});
  const podium=[...mData].sort((a,b)=>b.salesRev-a.salesRev);const medals=["🥇","🥈","🥉"];
  const allKwaly=fl.filter(l=>l.score>=4).length;const allS5=fl.filter(l=>l.score===5).length;const allRev=fs.reduce((a,s)=>a+s.saleAmount,0);const avgAll=fl.length?(fl.reduce((a,l)=>a+l.score,0)/fl.length).toFixed(2):"0";
  const qData=QUALS.map(q=>({name:t[q],value:fl.filter(l=>l.qualification===q).length,fill:QUAL_COLOR[q]})).filter(d=>d.value>0);
  const PL=({cx,cy,midAngle,outerRadius,name,value})=>{if(!value)return null;const R=Math.PI/180;const r=outerRadius+22;const x=cx+r*Math.cos(-midAngle*R);const y=cy+r*Math.sin(-midAngle*R);return <text x={x} y={y} fill="#fff" textAnchor={x>cx?"start":"end"} dominantBaseline="central" fontSize={9}>{(name||"").slice(0,10)}: {value}</text>;};
  return(
    <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{t.analytics} <span style={{fontSize:11,color:C.muted}}>({fl.length})</span></div><DateRangeBar range={range} setRange={setRange} t={t}/></div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        {[{label:t.avgScore,val:avgAll,color:C.accent},{label:`${t.qualityLeads} (4+)`,val:allKwaly,color:C.green},{label:t.qualityPct,val:`${fl.length?Math.round(allKwaly/fl.length*100):0}%`,color:C.blue},{label:t.totalSales,val:fmtM(allRev),color:C.yellow},{label:t.salesCount,val:fs.length,color:C.purple}].map(s=>(<div key={s.label} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px"}}><div style={{fontSize:9,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5,lineHeight:1.3}}>{s.label}</div><div style={{fontSize:typeof s.val==="string"&&s.val.length>8?16:24,fontWeight:800,color:s.color}}>{s.val}</div></div>))}
      </div>
      <div style={{background:C.card,border:`1px solid ${C.accentBorder}`,borderRadius:12,padding:16}}>
        <div style={{fontSize:11,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:14}}>{t.podium}</div>
        <div style={{display:"flex",gap:20,alignItems:"flex-end",justifyContent:"center"}}>{podium.map((m,i)=>{const h=[120,90,70][i]||60;return(<div key={m.name} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}><div style={{fontSize:22}}>{medals[i]||"🏅"}</div><Avatar name={m.name} color={MGR_COLOR[m.name]} size={44}/><div style={{fontSize:13,color:MGR_COLOR[m.name],fontWeight:700}}>{m.name}</div><div style={{fontSize:11,color:C.accent,fontWeight:700}}>{fmtM(m.salesRev)}</div><div style={{width:80,background:MGR_COLOR[m.name],borderRadius:"6px 6px 0 0",height:h,display:"flex",alignItems:"flex-start",justifyContent:"center",paddingTop:8}}><span style={{color:"rgba(255,255,255,0.9)",fontSize:16,fontWeight:900}}>{i+1}</span></div></div>);})}
        </div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
          <thead><tr style={{background:"rgba(191,164,126,0.10)",borderBottom:`1px solid ${C.accentBorder}`}}>{["Менеджер","AI","Kwaly","Kwaly%","4→5","5→Sell",t.visits,t.salesCount,t.totalSales].map(h=><th key={h} style={{padding:"9px 12px",color:C.accent,fontWeight:700,textAlign:"left",fontSize:10,textTransform:"uppercase",letterSpacing:0.5}}>{h}</th>)}</tr></thead>
          <tbody>
            {mData.map((m,i)=>(<tr key={m.name} style={{borderBottom:`1px solid ${C.border}`,background:i%2===0?"transparent":"rgba(255,255,255,0.02)"}}><td style={{padding:"11px 12px"}}><div style={{display:"flex",alignItems:"center",gap:8}}><Avatar name={m.name} color={MGR_COLOR[m.name]} size={28}/><span style={{color:MGR_COLOR[m.name],fontWeight:700}}>{m.name}</span></div></td><td style={{padding:"11px 12px"}}><div style={{background:C.accentDim,borderRadius:6,padding:"2px 8px",color:C.accent,fontWeight:700,fontSize:12,display:"inline-block"}}>{m.avg}</div></td><td style={{padding:"11px 12px",color:C.green,fontWeight:700,fontSize:14}}>{m.kwaly}</td><td style={{padding:"11px 12px"}}><span style={{color:m.kwalyPct>40?C.green:m.kwalyPct>20?C.yellow:C.red,fontWeight:700}}>{m.kwalyPct}%</span></td><td style={{padding:"11px 12px"}}><span style={{color:m.to5>25?C.green:m.to5>0?C.yellow:C.dim,fontWeight:700}}>{m.to5}%</span></td><td style={{padding:"11px 12px"}}><span style={{color:m.toSell>50?C.green:m.toSell>0?C.yellow:C.dim,fontWeight:700}}>{m.toSell}%</span></td><td style={{padding:"11px 12px",color:C.blue,fontWeight:700}}>{m.visits}</td><td style={{padding:"11px 12px",color:C.purple,fontWeight:800,fontSize:14}}>{m.salesCount}</td><td style={{padding:"11px 12px",color:"#fff",fontSize:11}}>{m.salesRev?fmtM(m.salesRev):<span style={{color:C.dim}}>—</span>}</td></tr>))}
            <tr style={{background:"rgba(191,164,126,0.08)",borderTop:`1px solid ${C.accentBorder}`}}><td style={{padding:"10px 12px",color:C.accent,fontWeight:700}}>ИТОГО</td><td style={{padding:"10px 12px",color:C.accent,fontWeight:700}}>{avgAll}</td><td style={{padding:"10px 12px",color:C.green,fontWeight:700}}>{allKwaly}</td><td style={{padding:"10px 12px",color:C.blue,fontWeight:700}}>{fl.length?parseFloat((allKwaly/fl.length*100).toFixed(1)):0}%</td><td style={{padding:"10px 12px",color:C.yellow,fontWeight:700}}>{allKwaly?parseFloat((allS5/allKwaly*100).toFixed(1)):0}%</td><td style={{padding:"10px 12px",color:C.purple,fontWeight:700}}>{allS5?parseFloat((fs.length/allS5*100).toFixed(1)):0}%</td><td style={{padding:"10px 12px",color:C.blue,fontWeight:700}}>{fl.filter(l=>l.score>=5).length}</td><td style={{padding:"10px 12px",color:C.accent,fontWeight:800}}>{fs.length}</td><td style={{padding:"10px 12px",color:"#fff",fontWeight:700}}>{fmtM(allRev)}</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:16}}>
        <ResponsiveContainer width="100%" height={190}><PieChart><Pie data={qData} cx="50%" cy="50%" innerRadius={44} outerRadius={68} dataKey="value" labelLine={false} label={<PL/>}>{qData.map((e,i)=><Cell key={i} fill={e.fill}/>)}</Pie><Tooltip {...TIP}/></PieChart></ResponsiveContainer>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6}}>{qData.map(d=><div key={d.name} style={{display:"flex",alignItems:"center",gap:4}}><Dot color={d.fill}/><span style={{fontSize:10,color:C.muted}}>{d.name}: <b style={{color:d.fill}}>{d.value}</b></span></div>)}</div>
      </div>
    </div>
  );
}

// ─── AI PAGE ──────────────────────────────────────────────────────────────────
function localAns(q,leads,events){
  const lq=q.toLowerCase();const dm=lq.match(/(oleh|dmytro|patryk|danya)/i);const m=dm?dm[1].charAt(0).toUpperCase()+dm[1].slice(1):null;
  if((lq.includes("задач")||lq.includes("встреч")||lq.includes("событи")||lq.includes("сегодня"))&&m){const evs=events.filter(e=>e.date===TODAY&&e.manager===m);if(!evs.length)return`📅 У ${m} сегодня нет событий.`;return`📅 У ${m} сегодня (${evs.length}):\n`+evs.map(e=>`• ${e.time}${e.timeEnd?`–${e.timeEnd}`:""}: [${e.type}] ${e.title}${e.description?` — ${e.description}`:""}`).join("\n");}
  if(lq.includes("задач")||lq.includes("встреч")||lq.includes("сегодня")){const evs=events.filter(e=>e.date===TODAY);if(!evs.length)return"📅 Сегодня событий нет.";return`📅 Сегодня (${evs.length}):\n`+MANAGERS.map(mn=>{const mevs=evs.filter(e=>e.manager===mn);if(!mevs.length)return`${mn}: нет`;return`${mn}: `+mevs.map(e=>`${e.time} ${e.title}`).join(", ");}).join("\n");}
  if(lq.includes("менедж")||lq.includes("статистик")){return"📊 По менеджерам:\n"+MANAGERS.map(mn=>{const ml=leads.filter(l=>l.manager===mn);return`• ${mn}: ${ml.length} лидов | AI: ${ml.length?(ml.reduce((a,l)=>a+l.score,0)/ml.length).toFixed(1):0} | Kwaly: ${ml.filter(l=>l.score>=4).length} | Продаж: ${ml.filter(l=>l.score===6).length}`;}).join("\n");}
  if(lq.includes("незаконч")||lq.includes("итог")){const open=leads.filter(l=>l.action==="missedCall"||l.action==="callback");return`📋 Незакрытые (${open.length}):\n`+open.slice(0,8).map(l=>`• ${l.name||l.phone} [${l.action}] — ${l.manager||"—"}`).join("\n");}
  if(lq.includes("лучш")){const best=[...MANAGERS].sort((a,b)=>{const al=leads.filter(l=>l.manager===a);const bl=leads.filter(l=>l.manager===b);return(bl.filter(l=>l.score>=4).length/Math.max(bl.length,1))-(al.filter(l=>l.score>=4).length/Math.max(al.length,1));})[0];return`🏆 Лучший: ${best}`;}
  return`GarnoCRM: ${leads.length} лидов | Kwaly: ${leads.filter(l=>l.score>=4).length} | Продаж: ${leads.filter(l=>l.score===6).length} | AI avg: ${leads.length?(leads.reduce((a,l)=>a+l.score,0)/leads.length).toFixed(2):0}`;
}

function AIPage({leads,events,sales,t,lang,chatHistory,setChatHistory}){
  const [input,setInput]=useState("");const [loading,setLoading]=useState(false);const [apiOk,setApiOk]=useState(true);const [kpData,setKpData]=useState(null);const [memory,setMemory]=useState([]);const ref=useRef(null);
  useEffect(()=>{ref.current?.scrollIntoView({behavior:"smooth"});},[chatHistory]);
  const QUICK=["Задачи Dmytro сегодня","Задачи Oleh сегодня","Задачи Patryk сегодня","Статистика менеджеров","Незаконченные задачи","Все события сегодня","Итог дня","Лучший по конверсии?"];
  const buildCtx=()=>{const todayEvs=events.filter(e=>e.date===TODAY);const mStats=MANAGERS.map(m=>{const ml=leads.filter(l=>l.manager===m);const mev=todayEvs.filter(e=>e.manager===m);return`${m}:лидов=${ml.length},kwaly=${ml.filter(l=>l.score>=4).length},продаж=${ml.filter(l=>l.score===6).length},avg=${ml.length?(ml.reduce((s,l)=>s+l.score,0)/ml.length).toFixed(1):0},задачи=[${mev.map(e=>`${e.time} ${e.type}:${e.title}`).join(";")||"нет"}]`;}).join(" | ");const memCtx=memory.length?`\nОбучение: ${memory.join("; ")}`:"";;return`Ты GarnoAI — ассистент CRM GARNO Custom Furniture (Польша). 0-2=неквалиф,3=предв,4=квалиф,5=визит,6=продажа.\nДанные: лидов=${leads.length}, ${mStats}\nСегодня=${TODAY}. Незакрытых=${leads.filter(l=>["missedCall","callback"].includes(l.action)).length}${memCtx}`;};
  const detectKP=(msg)=>{const m1=msg.match(/(?:кп|ofert|предложен|коммерч)/i);if(!m1)return null;const idM=msg.match(/(?:id|лид)[=\s#:]?\s*(\d{5,})/i);const amtM=msg.match(/(?:сумм[аы]|kwot)[а\s]*[=:\s]?\s*([\d\s]+)/i);if(!idM||!amtM)return null;const leadId=idM[1];const amount=parseInt(amtM[1].replace(/\s/g,""))||0;const lead=leads.find(l=>(l.leadId||"").toString()===leadId||l.id.toString()===leadId);return lead&&amount>0?{lead,amount}:null;};
  const send=async(text)=>{
    const msg=text||input;if(!msg.trim()||loading)return;setInput("");
    if(msg.toLowerCase().startsWith("запомни:")){const info=msg.replace(/^запомни:\s*/i,"").trim();setMemory(p=>[...p,info]);setChatHistory(p=>[...p,{role:"user",content:msg},{role:"assistant",content:`✅ Запомнил:\n"${info}"`}]);return;}
    const kp=detectKP(msg);
    if(kp){setChatHistory(p=>[...p,{role:"user",content:msg},{role:"assistant",content:`📄 Генерирую КП для ${kp.lead.name||kp.lead.phone} (${kp.lead.leadId}) · ${fmtM(kp.amount)}...`}]);setTimeout(()=>setKpData(kp),400);return;}
    const upd=[...chatHistory,{role:"user",content:msg}];setChatHistory(upd);setLoading(true);
    if(apiOk){try{const ctrl=new AbortController();setTimeout(()=>ctrl.abort(),14000);const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",signal:ctrl.signal,headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:900,system:buildCtx(),messages:upd.map(m=>({role:m.role,content:m.content}))})});const data=await res.json();if(!res.ok||data.error){setApiOk(false);setChatHistory(p=>[...p,{role:"assistant",content:localAns(msg,leads,events)}]);}else{setChatHistory(p=>[...p,{role:"assistant",content:(data.content?.map(c=>c.text||"").join("\n")||"").replace(/\*\*/g,"")}]);setApiOk(true);}}catch{setApiOk(false);setChatHistory(p=>[...p,{role:"assistant",content:localAns(msg,leads,events)}]);}}else{setTimeout(()=>{setChatHistory(p=>[...p,{role:"assistant",content:localAns(msg,leads,events)}]);setLoading(false);},300);return;}
    setLoading(false);
  };
  return(
    <div style={{padding:18,display:"flex",gap:14,height:"calc(100vh - 120px)"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",background:C.card,border:`1px solid ${C.border}`,borderRadius:12,overflow:"hidden"}}>
        <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:apiOk?C.green:C.yellow}}/>
          <span style={{fontSize:13,fontWeight:700,color:"#fff"}}>GarnoAI</span>
          <span style={{fontSize:10,color:C.muted}}>{apiOk?"claude-sonnet":"локальный"} · {leads.length} leads</span>
          {memory.length>0&&<span style={{fontSize:10,color:C.blue}}>📚 {memory.length} фактов</span>}
          {!apiOk&&<button onClick={()=>setApiOk(true)} style={{background:C.accentDim,border:`1px solid ${C.accentBorder}`,color:C.accent,borderRadius:6,padding:"2px 8px",fontSize:10,cursor:"pointer",marginLeft:"auto"}}>↻ API</button>}
        </div>
        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {chatHistory.map((m,i)=>(<div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}><div style={{maxWidth:"82%",padding:"10px 14px",background:m.role==="user"?C.accentDim:C.surface,border:`1px solid ${m.role==="user"?C.accentBorder:C.border}`,borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",fontSize:12,color:"#fff",lineHeight:1.6,whiteSpace:"pre-wrap"}}>{m.content}</div></div>))}
          {loading&&<div style={{display:"flex",gap:5,padding:"10px 14px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"14px 14px 14px 4px",width:"fit-content"}}>{[0,1,2].map(i=><div key={i} style={{width:6,height:6,borderRadius:"50%",background:C.accent,animation:"pulse 1s infinite",animationDelay:`${i*0.2}s`}}/>)}</div>}
          <div ref={ref}/>
        </div>
        <div style={{padding:10,borderTop:`1px solid ${C.border}`,display:"flex",gap:8}}>
          <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()} placeholder={t.aiPlaceholder} style={{flex:1,background:C.surface,border:`1px solid ${C.borderMd}`,color:"#fff",borderRadius:8,padding:"9px 12px",fontSize:12,outline:"none"}}/>
          <button onClick={()=>setChatHistory([{role:"assistant",content:"GarnoAI готов."}])} style={{background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"9px 10px",cursor:"pointer",fontSize:12}} title="Очистить">🗑</button>
          <button onClick={()=>send()} disabled={loading||!input.trim()} style={{background:C.accent,border:"none",color:"#00132f",borderRadius:8,padding:"9px 16px",fontSize:12,fontWeight:700,cursor:"pointer",opacity:(!input.trim()||loading)?0.5:1}}>{t.send}</button>
        </div>
      </div>
      <div style={{width:185,display:"flex",flexDirection:"column",gap:5}}>
        <div style={{fontSize:10,color:C.muted,textTransform:"uppercase",letterSpacing:1,marginBottom:4}}>Быстрые запросы</div>
        {QUICK.map((q,i)=><button key={i} onClick={()=>send(q)} style={{background:C.card,border:`1px solid ${C.border}`,color:C.muted,borderRadius:8,padding:"7px 10px",fontSize:11,cursor:"pointer",textAlign:"left",lineHeight:1.4}} onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accentBorder;e.currentTarget.style.color=C.accent;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.muted;}}>{q}</button>)}
        <div style={{fontSize:10,color:C.muted,marginTop:6,padding:"8px 10px",background:C.card,borderRadius:8,border:`1px solid ${C.border}`,lineHeight:1.6}}>
          💡 <b style={{color:C.accent}}>Запомни: факт</b> — обучить<br/><br/>
          📄 <b style={{color:C.accent}}>Сгенерируй КП для id={leads[0]?.leadId} сумма 23250</b>
        </div>
      </div>
      {kpData&&<KPModal lead={kpData.lead} amount={kpData.amount} onClose={()=>setKpData(null)}/>}
    </div>
  );
}

// ─── SALES PAGE ───────────────────────────────────────────────────────────────
function SalesPage({sales,setSales,t,lang}){
  const [range,setRange]=useState("all");const [confirmId,setConfirmId]=useState(null);
  const fs=filterByRange(sales,range);const totalRev=fs.reduce((a,s)=>a+s.saleAmount,0);
  const mRev=MANAGERS.map(m=>({name:m,rev:fs.filter(s=>s.manager===m).reduce((a,s)=>a+s.saleAmount,0),count:fs.filter(s=>s.manager===m).length}));
  const deleteSale=(id)=>{setSales(p=>p.filter(s=>s.id!==id));setConfirmId(null);};
  return(
    <div style={{padding:18,display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8}}><div style={{fontSize:16,fontWeight:700,color:"#fff"}}>★ {t.saleSectionTitle} <span style={{fontSize:11,color:C.muted}}>({fs.length})</span></div><DateRangeBar range={range} setRange={setRange} t={t}/></div>
      <div style={{display:"grid",gridTemplateColumns:`1fr repeat(${MANAGERS.length},1fr)`,gap:10}}>
        <div style={{background:C.card,border:`2px solid ${C.accentBorder}`,borderRadius:12,padding:"14px 16px"}}><div style={{fontSize:10,color:C.muted,marginBottom:6,textTransform:"uppercase",letterSpacing:0.5}}>{lang==="ru"?"Общая выручка":"Łączny przychód"}</div><div style={{fontSize:22,fontWeight:800,color:C.accent}}>{fmtM(totalRev)}</div><div style={{fontSize:11,color:C.muted,marginTop:4}}>{fs.length} {t.many}</div></div>
        {mRev.map(m=>(<div key={m.name} style={{background:C.card,border:`1px solid ${MGR_COLOR[m.name]}33`,borderRadius:12,padding:"14px 16px"}}><div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}><Avatar name={m.name} color={MGR_COLOR[m.name]} size={22}/><span style={{fontSize:11,color:MGR_COLOR[m.name],fontWeight:700}}>{m.name}</span></div><div style={{fontSize:18,fontWeight:800,color:MGR_COLOR[m.name]}}>{fmtM(m.rev)}</div><div style={{fontSize:11,color:C.muted,marginTop:2}}>{m.count} {t.many}</div></div>))}
      </div>
      {fs.length===0?<div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:40,textAlign:"center",color:C.muted}}><div style={{fontSize:32,marginBottom:10}}>★</div><div>{lang==="ru"?"Продажи появятся при оценке 6":"Sprzedaże pojawią się przy ocenie 6"}</div></div>:
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:10}}>
          {[...fs].sort((a,b)=>b.saleAmount-a.saleAmount).map(s=>(<div key={s.id} style={{background:C.card,border:`1px solid ${confirmId===s.id?C.red:C.accentBorder}`,borderRadius:12,padding:16,borderTop:`3px solid ${confirmId===s.id?C.red:C.accent}`,position:"relative"}}>
            {confirmId===s.id?(
              <div style={{position:"absolute",top:10,right:10,display:"flex",alignItems:"center",gap:6,background:C.surface,border:`1px solid ${C.red}`,borderRadius:8,padding:"4px 8px"}}>
                <span style={{fontSize:10,color:C.red,fontWeight:600}}>Удалить?</span>
                <button onClick={()=>deleteSale(s.id)} style={{background:C.red,border:"none",color:"#fff",borderRadius:5,padding:"2px 8px",fontSize:11,fontWeight:700,cursor:"pointer"}}>Да</button>
                <button onClick={()=>setConfirmId(null)} style={{background:"transparent",border:`1px solid ${C.border}`,color:C.muted,borderRadius:5,padding:"2px 8px",fontSize:11,cursor:"pointer"}}>Нет</button>
              </div>
            ):(
              <button onClick={()=>setConfirmId(s.id)} style={{position:"absolute",top:10,right:10,background:"rgba(248,113,113,0.15)",border:`1px solid ${C.red}44`,color:C.red,borderRadius:6,padding:"3px 8px",fontSize:12,cursor:"pointer",fontWeight:700}}>✕</button>
            )}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10,paddingRight:34}}><Avatar name={s.name||s.phone} color={C.accent} size={36}/><div><div style={{fontSize:13,color:"#fff",fontWeight:700}}>{s.name||s.phone}</div><div style={{fontSize:10,color:C.muted,fontFamily:"monospace"}}>{s.leadId}</div></div><div style={{marginLeft:"auto",textAlign:"right"}}><div style={{fontSize:16,fontWeight:800,color:C.accent}}>{fmtM(s.saleAmount)}</div><div style={{fontSize:9,color:C.dim}}>{s.createdAt}</div></div></div>
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><SrcBadge source={s.source}/>{s.manager&&<div style={{display:"flex",alignItems:"center",gap:4}}><Avatar name={s.manager} color={MGR_COLOR[s.manager]} size={14}/><span style={{fontSize:10,color:MGR_COLOR[s.manager]}}>{s.manager}</span></div>}</div>{s.notes&&<div style={{fontSize:10,color:C.muted,marginTop:8,lineHeight:1.5}}>{s.notes}</div>}
          </div>))}
        </div>}
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  return <ErrorBoundary><GarnoCRM/></ErrorBoundary>;
}

function GarnoCRM(){
  const {db,status,syncLabel,updateDb,configure}=useDatabase();
  const [page,setPage]=useState("dashboard");
  const [selLead,setSelLead]=useState(null);
  const [lang,setLang]=useState("ru");
  const [mgr,setMgr]=useState("all");
  const [search,setSearch]=useState("");
  const [collapsed,setCollapsed]=useState(false);
  const [showAdd,setShowAdd]=useState(false);
  const [currentUser,setCurrentUser]=useState(()=>localStorage.getItem("garno_user")||null);
  const t=T[lang];

  const saveUser=(u)=>{localStorage.setItem("garno_user",u);setCurrentUser(u);};

  if(status==="loading") return(
    <div style={{display:"flex",height:"100vh",background:C.bg,alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`*{box-sizing:border-box;}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}`}</style>
      <div style={{fontSize:34,fontWeight:900,color:C.accent,letterSpacing:3}}>GARNO<span style={{color:"#fff"}}>CRM</span></div>
      <div style={{color:C.muted,fontSize:13}}>Загрузка базы данных...</div>
      <div style={{display:"flex",gap:6}}>{[0,1,2].map(i=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:C.accent,animation:"pulse 1s infinite",animationDelay:`${i*0.25}s`}}/>)}</div>
    </div>
  );
  if(status==="setup") return <SetupScreen onSave={configure}/>;
  if(status==="error") return(
    <div style={{display:"flex",height:"100vh",background:C.bg,alignItems:"center",justifyContent:"center",flexDirection:"column",gap:16,fontFamily:"'DM Sans',sans-serif"}}>
      <div style={{fontSize:32,color:C.red}}>⚠️</div>
      <div style={{color:"#fff",fontWeight:700}}>Ошибка подключения к базе данных</div>
      <button onClick={()=>{localStorage.removeItem("garno_cfg");window.location.reload();}} style={{background:C.accent,color:"#00132f",border:"none",borderRadius:8,padding:"10px 20px",fontWeight:700,cursor:"pointer"}}>Переподключить</button>
    </div>
  );
  if(!db) return null;

  // User picker
  if(!currentUser) return(
    <div style={{display:"flex",height:"100vh",background:C.bg,alignItems:"center",justifyContent:"center",flexDirection:"column",gap:24,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`*{box-sizing:border-box;}`}</style>
      <div style={{textAlign:"center",marginBottom:8}}><div style={{fontSize:34,fontWeight:900,color:C.accent,letterSpacing:3,marginBottom:6}}>GARNO<span style={{color:"#fff"}}>CRM</span></div><div style={{color:C.muted,fontSize:14}}>Выберите свой аккаунт</div></div>
      <div style={{display:"flex",gap:16,flexWrap:"wrap",justifyContent:"center"}}>
        {MANAGERS.map(m=>(<button key={m} onClick={()=>saveUser(m)} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"28px 36px",background:C.card,border:`2px solid ${MGR_COLOR[m]}44`,borderRadius:16,cursor:"pointer"}} onMouseEnter={e=>{e.currentTarget.style.borderColor=MGR_COLOR[m];e.currentTarget.style.background=`${MGR_COLOR[m]}15`;}} onMouseLeave={e=>{e.currentTarget.style.borderColor=`${MGR_COLOR[m]}44`;e.currentTarget.style.background=C.card;}}><div style={{width:64,height:64,borderRadius:"50%",background:`${MGR_COLOR[m]}25`,border:`3px solid ${MGR_COLOR[m]}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26,fontWeight:900,color:MGR_COLOR[m]}}>{m[0]}</div><div style={{fontSize:16,fontWeight:800,color:"#fff",marginBottom:4}}>{m}</div><div style={{fontSize:11,color:C.muted}}>{m==="Danya"?"Администратор":"Менеджер"}</div></button>))}
      </div>
    </div>
  );

  const leads   = db.leads   ?? [];
  const events  = db.events  ?? [];
  const sales   = db.sales   ?? [];
  const nextNum = db.nextNum ?? (leads.length+1);
  const chatHist= db.chat    ?? [];

  const setLeads  = upd => updateDb(p=>({...p,leads:  typeof upd==="function"?upd(p.leads  ??[]):upd}));
  const setEvents = upd => updateDb(p=>({...p,events: typeof upd==="function"?upd(p.events ??[]):upd}));
  const setSales  = upd => updateDb(p=>({...p,sales:  typeof upd==="function"?upd(p.sales  ??[]):upd}));
  const setChatHistory = upd => updateDb(p=>({...p,chat: typeof upd==="function"?upd(p.chat??[]):upd}));
  const addLead=(l)=>{updateDb(p=>({...p,leads:[l,...(p.leads??[])],nextNum:(p.nextNum??leads.length+1)+1}));};
  const addSale=(s)=>setSales(p=>[s,...p]);

  return(
    <div style={{display:"flex",height:"100vh",background:C.bg,color:"#fff",fontFamily:"'DM Sans','Segoe UI',sans-serif",overflow:"hidden",fontSize:13}}>
      <style>{`*{box-sizing:border-box;}::-webkit-scrollbar{width:5px;height:5px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(191,164,126,0.25);border-radius:3px;}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.25);}select option{background:#001840;color:#fff;}input[type=checkbox]{accent-color:#bfa47e;}@media print{.no-print{display:none!important;}#kp-doc{box-shadow:none!important;margin:0!important;border-radius:0!important;}}`}</style>
      <Sidebar page={page} setPage={setPage} lang={lang} collapsed={collapsed} mgr={mgr} setMgr={setMgr}/>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        <TopBar lang={lang} setLang={setLang} search={search} setSearch={setSearch} collapsed={collapsed} setCollapsed={setCollapsed} t={t} onAddLead={()=>setShowAdd(true)} currentUser={currentUser} setCurrentUser={saveUser} syncLabel={syncLabel}/>
        <div style={{flex:1,overflowY:"auto"}}>
          {page==="dashboard"  && <Dashboard leads={leads} events={events} t={t} lang={lang}/>}
          {page==="leads"      && <LeadsPage leads={leads} setLeads={setLeads} t={t} mgr={mgr} search={search} onOpen={setSelLead}/>}
          {page==="calendar"   && <CalendarPage events={events} setEvents={setEvents} t={t} lang={lang}/>}
          {page==="analytics"  && <AnalyticsPage leads={leads} sales={sales} t={t} lang={lang}/>}
          {page==="ai"         && <AIPage leads={leads} events={events} sales={sales} t={t} lang={lang} chatHistory={chatHist} setChatHistory={setChatHistory}/>}
          {page==="sales"      && <SalesPage sales={sales} setSales={setSales} t={t} lang={lang}/>}
        </div>
      </div>
      {selLead  && <LeadDetail lead={selLead} setLeads={setLeads} t={t} lang={lang} onClose={()=>setSelLead(null)} onAddSale={addSale} currentUser={currentUser}/>}
      {showAdd  && <AddLeadModal onClose={()=>setShowAdd(false)} onAdd={addLead} t={t} lang={lang} nextNum={nextNum} currentUser={currentUser}/>}
    </div>
  );
}
