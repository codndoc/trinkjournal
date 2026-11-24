import {localDate,nutrientTotals,totals} from './core.js?v=4';
const DAY=86400000;
export const NUTRIENTS=[{id:'alcohol',name:'Reiner Alkohol',unit:'ml'},{id:'kcal',name:'Energie',unit:'kcal'},{id:'sugar',name:'Zucker',unit:'g'},{id:'sweetenerMgL',name:'Süßstoffe',unit:'mg'},{id:'caffeine',name:'Koffein',unit:'mg'}];
function utc(day){const value=Date.parse(day+'T00:00:00Z');if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(value)||new Date(value).toISOString().slice(0,10)!==day)throw Error('Bitte gültige Datumswerte wählen.');return value}
export function shiftDay(day,amount){return new Date(utc(day)+amount*DAY).toISOString().slice(0,10)}
export function dayCount(start,end){const count=(utc(end)-utc(start))/DAY+1;if(count<1)throw Error('Das Enddatum muss am oder nach dem Anfangsdatum liegen.');if(count>36600)throw Error('Bitte einen Zeitraum von höchstens 100 Jahren wählen.');return count}
export function monday(day){const offset=(new Date(utc(day)).getUTCDay()+6)%7;return shiftDay(day,-offset)}
export function periodRange(kind,anchor,today=localDate()){
 utc(anchor);let start,end;const year=Number(anchor.slice(0,4)),month=Number(anchor.slice(5,7));
 if(kind==='week'){start=monday(anchor);end=shiftDay(start,6)}else if(kind==='month'){start=anchor.slice(0,7)+'-01';const d=new Date(utc(start));d.setUTCMonth(month);end=shiftDay(d.toISOString().slice(0,10),-1)}else if(kind==='year'){start=`${year}-01-01`;end=`${year}-12-31`}else throw Error('Unbekannter Zeitraum.');
 if(start<=today&&end>today)end=today;return {start,end};
}
export function automaticAggregation(days){return days<=45?'day':days<=210?'week':'month'}
function bucketStart(day,unit){return unit==='week'?monday(day):unit==='month'?day.slice(0,7)+'-01':day}
function nextBucket(day,unit){if(unit==='month'){const d=new Date(utc(day));d.setUTCMonth(d.getUTCMonth()+1);return d.toISOString().slice(0,10)}return shiftDay(day,unit==='week'?7:1)}
function measure(entries,id){
 if(id==='volume')return {value:entries.reduce((s,e)=>s+e.ml,0)/1000,known:entries.length,relevant:entries.length,name:'Gesamtmenge',unit:'l'};
 if(id.startsWith('drink:')){const name=id.slice(6),matching=entries.filter(e=>e.name===name);return {value:matching.reduce((s,e)=>s+e.ml,0)/1000,known:matching.length,relevant:matching.length,name,unit:'l'}}
 const nutrient=NUTRIENTS.find(n=>id==='nutrient:'+n.id);if(!nutrient)throw Error('Unbekannte Auswertung.');const sum=nutrientTotals(entries)[nutrient.id];return {...sum,relevant:entries.length,name:nutrient.name,unit:nutrient.unit};
}
export function statistics(entries,{start,end,aggregation='auto',metric='volume'}){
 const days=dayCount(start,end),unit=aggregation==='auto'?automaticAggregation(days):aggregation;
 if(!['day','week','month'].includes(unit))throw Error('Unbekannte Zeiteinheit.');
 const first=bucketStart(start,unit);let bucketCount=0;for(let day=first;day<=end;day=nextBucket(day,unit)){if(++bucketCount>1500)throw Error('Zu viele Abschnitte. Bitte nach Wochen oder Monaten zusammenfassen.')}
 const selected=entries.filter(e=>e.day>=start&&e.day<=end),byBucket=new Map();for(const e of selected){const key=bucketStart(e.day,unit);if(!byBucket.has(key))byBucket.set(key,[]);byBucket.get(key).push(e)}
 const total=measure(selected,metric),buckets=[];
 for(let day=first;day<=end;day=nextBucket(day,unit)){const from=day<start?start:day,next=nextBucket(day,unit),to=shiftDay(next,-1)>end?end:shiftDay(next,-1),bucketDays=dayCount(from,to),m=measure(byBucket.get(day)||[],metric),unknown=metric.startsWith('nutrient:')&&m.relevant>0&&m.known===0;
  buckets.push({start:from,end:to,days:bucketDays,value:unknown?null:m.value,average:unknown?null:m.value/bucketDays,known:m.known,relevant:m.relevant,partial:m.known<m.relevant});
 }
 const drinkTotals=totals(selected),nutrients=nutrientTotals(selected);
 return {start,end,days,aggregation:unit,entries:selected.length,daysWithEntries:new Set(selected.map(e=>e.day)).size,total:{...total,average:total.value/days,unknown:metric.startsWith('nutrient:')&&total.known===0,partial:total.known<total.relevant},buckets,volume:drinkTotals.ml/1000,drinks:drinkTotals.groups.map(([name,ml])=>({name,value:ml/1000,average:ml/1000/days})),nutrients:NUTRIENTS.filter(n=>nutrients[n.id].known>0).map(n=>({...n,...nutrients[n.id],average:nutrients[n.id].value/days,relevant:selected.length}))};
}
