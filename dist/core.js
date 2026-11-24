import {CATALOG} from './catalog.js?v=4';
export const AMOUNTS=[20,40,100,200,250,300,330,400,500,750,1000];
export const DEFAULT_DRINKS=CATALOG;
export function localDate(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function localTime(d=new Date()){return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`}
export function liters(ml){return new Intl.NumberFormat('de-DE',{maximumFractionDigits:2}).format(ml/1000)}
export function totals(entries){const groups=new Map();for(const e of entries)groups.set(e.name,(groups.get(e.name)||0)+e.ml);return {ml:entries.reduce((s,e)=>s+e.ml,0),groups:[...groups].sort((a,b)=>b[1]-a[1])}}
function cell(value){let s=String(value);if(/^[\s]*[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'}
export function csv(entries){const extended=entries.some(e=>e.nutrition);return '\uFEFF'+[['Datum','Uhrzeit','Getränk','Menge (l)',...(extended?NUTRITION_HEADERS:[])],...[...entries].sort((a,b)=>(a.day+a.time).localeCompare(b.day+b.time)).map(e=>[e.day,e.time,e.name,liters(e.ml),...(extended?NUTRITION_KEYS.map(k=>typeof e.nutrition?.[k]==='number'?String(e.nutrition[k]).replace('.',','):e.nutrition?.[k]??''):[])])].map(row=>row.map(cell).join(';')).join('\r\n')+'\r\n'}
export const DEFAULT_GOAL_ML=1500;
export function validGoal(ml){return Number.isInteger(ml)&&ml>=100&&ml<=20000}
export function progress(ml,goal){const percent=Math.round(ml/goal*100);return {percent,fill:Math.min(100,Math.max(0,ml/goal*100))}}
function parseRows(text){
 const rows=[];let row=[],value='',quoted=false,closed=false;
 const field=()=>{row.push(value);value='';closed=false};
 const line=()=>{field();if(row.some(s=>s.trim()))rows.push(row);row=[]};
 for(let i=0;i<text.length;i++){const c=text[i];
  if(quoted){if(c==='"'){if(text[i+1]==='"'){value+='"';i++}else{quoted=false;closed=true}}else value+=c;continue}
  if(c===';'){field();continue}if(c==='\r'||c==='\n'){if(c==='\r'&&text[i+1]==='\n')i++;line();continue}
  if(c==='"'&&!value&&!closed){quoted=true;continue}if(closed||c==='"')throw Error('Ungültige CSV-Anführungszeichen.');value+=c;
 }if(quoted)throw Error('Die CSV-Datei enthält ein nicht geschlossenes Textfeld.');if(value||closed||row.length)line();return rows;
}
export function parseCsv(text){
 if(text.length>5*1024*1024)throw Error('Die Datei ist zu groß (maximal 5 MB).');
 const rows=parseRows(text.replace(/^\uFEFF/,''));const header=rows.shift();
 const normalized=header?.map(s=>s.trim()).join(';');const extended=normalized===['Datum','Uhrzeit','Getränk','Menge (l)',...NUTRITION_HEADERS].join(';');
 if(!extended&&normalized!=='Datum;Uhrzeit;Getränk;Menge (l)')throw Error('Bitte einen CSV-Export der App verwenden (Datum;Uhrzeit;Getränk;Menge (l), optional mit Inhaltsstoff-Spalten).');
 if(rows.length>50000)throw Error('Maximal 50.000 Einträge pro Import.');
 return rows.map((r,i)=>{const fail=()=>{throw Error('Ungültiger Eintrag '+(i+1)+': Bitte Datum, Uhrzeit, Getränkename, Menge und Inhaltsstoffe prüfen. Es wurde nichts importiert.')};if(r.length!==(extended?4+NUTRITION_KEYS.length:4))fail();
  const[day,time,rawName,volume]=r;const d=new Date(day+'T12:00:00');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(d.getTime())||localDate(d)!==day||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))fail();
  const name=/^'[\s]*[=+@\-\t\r]/.test(rawName)?rawName.slice(1):rawName;
  if(!name.trim()||name.length>60||!/^\d+(?:[,.]\d{1,2})?$/.test(volume))fail();
  const ml=Math.round(Number(volume.replace(',','.'))*1000);if(!AMOUNTS.includes(ml))fail();
  const entry={day,time,name,ml};if(extended){const n={};for(let j=0;j<NUTRITION_KEYS.length;j++){const key=NUTRITION_KEYS[j],v=r[j+4];if(key==='sweetener'){n[key]=unescapeCell(v);if(n[key].length>100)fail()}else if(v==='')n[key]=null;else{if(!/^\d+(?:[,.]\d+)?$/.test(v))fail();n[key]=Number(v.replace(',','.'));if(!validNutritionNumber(key,n[key]))fail()}}entry.nutrition=n}return entry;
 });
}
function unescapeCell(s){return /^'[\s]*[=+@\-\t\r]/.test(s)?s.slice(1):s}
export const NUTRITION_KEYS=['alcohol','kcal','sugar','sweetener','sweetenerMgL','caffeine'];
export const NUTRITION_HEADERS=['Alkohol (% vol)','Energie (kcal/100 ml)','Zucker (g/100 ml)','Süßstoff','Süßstoff (mg/l)','Koffein (mg/100 ml)'];
export function validNutritionNumber(key,n){return Number.isFinite(n)&&n>=0&&n<=({alcohol:100,kcal:1000,sugar:100,sweetenerMgL:100000,caffeine:10000}[key]??0)}
export function cleanNutrition(n={}){return Object.fromEntries(NUTRITION_KEYS.map(k=>[k,k==='sweetener'?String(n?.[k]||'').slice(0,100):(validNutritionNumber(k,n?.[k])?n[k]:null)]))}
export function nutrientTotals(entries){
 const out=Object.fromEntries(['alcohol','kcal','sugar','sweetenerMgL','caffeine'].map(k=>[k,{value:0,known:0}]));
 for(const e of entries)for(const key of Object.keys(out)){const value=e.nutrition?.[key];if(typeof value!=='number'||!validNutritionNumber(key,value))continue;out[key].known++;out[key].value+=key==='alcohol'?e.ml*value/100:key==='sweetenerMgL'?e.ml*value/1000:e.ml*value/100}
 return out;
}
export function sortDrinks(drinks){const collator=new Intl.Collator('de',{sensitivity:'base'});return [...drinks].sort((a,b)=>collator.compare(a.name,b.name)||a.ml-b.ml)}
export function moveDrink(drinks,id,offset){const list=[...drinks],index=list.findIndex(d=>d.id===id),to=index+offset;if(index<0||to<0||to>=list.length)return list;const [item]=list.splice(index,1);list.splice(to,0,item);return list}
export const DEFAULT_REMINDER={enabled:false,interval:60,start:'08:00',end:'22:00',soundEnabled:false,sound:'chime'};
export function validReminder(r){return r&&typeof r.enabled==='boolean'&&typeof r.soundEnabled==='boolean'&&Number.isInteger(r.interval)&&r.interval>=1&&r.interval<=1440&&[r.start,r.end].every(v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v))&&r.start!==r.end&&['chime','double','drop','custom'].includes(r.sound)}
export function nextReminder(r,after=new Date()){
 if(!r.enabled||!validReminder(r))return null;let best=Infinity;const now=Number(after),[sh,sm]=r.start.split(':').map(Number),[eh,em]=r.end.split(':').map(Number);
 for(let day=-1;day<=2;day++){const start=new Date(now);start.setDate(start.getDate()+day);start.setHours(sh,sm,0,0);const end=new Date(start);end.setHours(eh,em,0,0);if(end<=start)end.setDate(end.getDate()+1);const step=r.interval*60000,candidate=+start+Math.max(0,Math.ceil((now-start)/step))*step;if(candidate<=end&&candidate>=now)best=Math.min(best,candidate)}return Number.isFinite(best)?best:null;
}
export function reminderActive(r,when=new Date()){
 if(!r.enabled||!validReminder(r))return false;const now=Number(when),[sh,sm]=r.start.split(':').map(Number),[eh,em]=r.end.split(':').map(Number);
 for(const offset of [-1,0]){const start=new Date(now);start.setDate(start.getDate()+offset);start.setHours(sh,sm,0,0);const end=new Date(start);end.setHours(eh,em,0,0);if(end<=start)end.setDate(end.getDate()+1);if(now>=start&&now<=end)return true}return false;
}
export function normalizeState(data){
 const base=data||{drinks:structuredClone(DEFAULT_DRINKS),entries:[]};
 if(!Array.isArray(base.drinks)||!Array.isArray(base.entries)||!base.drinks.every(d=>typeof d.id==='string'&&typeof d.name==='string'&&AMOUNTS.includes(d.ml))||!base.entries.every(e=>typeof e.id==='string'&&typeof e.name==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(e.day)&&/^\d{2}:\d{2}$/.test(e.time)&&AMOUNTS.includes(e.ml)))throw Error('Ungültige gespeicherte Daten.');
 const drinks=base.drinks.map(d=>({...d,favorite:d.favorite!==false,nutrition:cleanNutrition(d.nutrition)}));
 if((base.schemaVersion||0)<4){
  for(const d of drinks)if(d.name==='Wein'){d.name='Weißwein';if(d.id==='wein')d.ml=200}
  for(const d of DEFAULT_DRINKS)if(!drinks.some(x=>x.name===d.name&&x.ml===d.ml)){const copy=structuredClone(d);copy.nutrition=cleanNutrition(copy.nutrition);while(drinks.some(x=>x.id===copy.id))copy.id+='-v4';drinks.push(copy)}
  const forced={Bier:5,Weißwein:12,Rotwein:14,Sekt:12,Spirituosen:40,Likör:18,Weinschorle:6,'Bier (light)':2.5};
  for(const d of drinks){const reference=CATALOG.find(p=>p.name.toLocaleLowerCase('de')===d.name.toLocaleLowerCase('de'));if(!reference)continue;d.reference=structuredClone(reference.reference);d.referenceFields=[];for(const key of NUTRITION_KEYS)if((d.nutrition[key]===null||d.nutrition[key]==='')&&reference.nutrition[key]!==null&&reference.nutrition[key]!==undefined){d.nutrition[key]=reference.nutrition[key];d.referenceFields.push(key)}if(forced[d.name]!==undefined)d.nutrition.alcohol=forced[d.name]}
 }
 const order=(base.schemaVersion||0)<4?'alphabetical':base.drinkOrder||'alphabetical';
 return {...base,schemaVersion:4,drinkOrder:order,drinks:order==='alphabetical'?sortDrinks(drinks):drinks,entries:base.entries,goalMl:validGoal(base.goalMl)?base.goalMl:DEFAULT_GOAL_ML,reminder:validReminder(base.reminder)?{...base.reminder}:{...DEFAULT_REMINDER}};
}
const signature=e=>JSON.stringify([e.day,e.time,e.name,e.ml]);
export function mergeImport(existing,incoming){
 const counts=new Map();for(const e of existing){const key=signature(e);counts.set(key,(counts.get(key)||0)+1)}
 const additions=[];let skipped=0;
 for(const e of incoming){const key=signature(e),count=counts.get(key)||0;if(count){counts.set(key,count-1);skipped++}else additions.push(e)}
 return {additions,skipped};
}
