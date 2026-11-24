import {cleanNutrition,sortDrinks,moveDrink,validNutritionNumber} from './core.js?v=4';
export function createDrinkSettings({getState,commit,render,notify,element,amountOptions}){
 const list=document.getElementById('drink-settings');
 const saveDrinks=(drinks,order=getState().drinkOrder)=>{if(!commit({...getState(),drinks,drinkOrder:order}))return false;render();return true};
 const handles=new Map(),stars=new Map();let dragging=false;
 function moveRow(id,offset){if(saveDrinks(moveDrink(getState().drinks,id,offset),'manual')){paint(id,'handle');notify('Reihenfolge gespeichert.')}}
 function paint(focusId,focusKind='star'){
  handles.clear();stars.clear();
  list.replaceChildren(...getState().drinks.map(d=>{
   const row=element('article','drink-setting');row.dataset.drinkId=d.id;
   const line=element('div','drink-setting-line'),star=element('button','favorite-button',d.favorite?'★':'☆'),name=element('span','setting-name',d.name),amount=element('select'),handle=element('button','drag-handle','⠿');
   star.type='button';star.setAttribute('aria-label',d.name+' · '+(d.favorite?'von Hauptseite ausblenden':'auf Hauptseite anzeigen'));star.setAttribute('aria-pressed',String(d.favorite));star.title='Auf Hauptseite anzeigen';
   stars.set(d.id,star);star.onclick=()=>{if(saveDrinks(getState().drinks.map(x=>x.id===d.id?{...x,favorite:!x.favorite}:x)))paint(d.id)};
   amountOptions(amount,d.ml);amount.setAttribute('aria-label','Standardmenge für '+d.name);
   amount.onchange=()=>{if(saveDrinks(getState().drinks.map(x=>x.id===d.id?{...x,ml:Number(amount.value)}:x)))notify('Standardmenge gespeichert.');else amount.value=String(d.ml)};
   handle.type='button';handle.setAttribute('aria-label',d.name+' verschieben. Ziehen oder Pfeiltasten auf und ab verwenden.');handle.title='Ziehen oder mit Pfeiltasten verschieben';
   handles.set(d.id,handle);handle.onkeydown=e=>{if(!['ArrowUp','ArrowDown','Home','End'].includes(e.key))return;e.preventDefault();e.stopPropagation();const current=getState().drinks,index=current.findIndex(x=>x.id===d.id);moveRow(d.id,e.key==='Home'?-index:e.key==='End'?current.length-1-index:e.key==='ArrowUp'?-1:1)};
   handle.onpointerdown=e=>{
    if(e.button!==0||dragging)return;e.preventDefault();e.stopPropagation();handle.focus({preventScroll:true});dragging=true;row.classList.add('dragging');document.documentElement.classList.add('reordering');let moved=false,lastY=e.clientY,frame;
    const reorder=()=>{const other=[...list.children].filter(child=>child!==row);const before=other.find(child=>{const r=child.getBoundingClientRect();return lastY<r.top+r.height/2})||null;if(row.nextSibling!==before){list.insertBefore(row,before);moved=true}};
    const move=event=>{if(event.pointerId!==e.pointerId)return;event.preventDefault();lastY=event.clientY;reorder()};
    const scroll=()=>{const dialog=list.closest('dialog'),r=dialog.getBoundingClientRect();if(lastY<r.top+65)dialog.scrollTop-=14;else if(lastY>r.bottom-65)dialog.scrollTop+=14;reorder();frame=requestAnimationFrame(scroll)};
    const cleanup=()=>{dragging=false;cancelAnimationFrame(frame);row.classList.remove('dragging');document.documentElement.classList.remove('reordering');window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',finish,true);window.removeEventListener('pointercancel',cancel,true);window.removeEventListener('blur',cancel)};
    const finish=event=>{if(event.pointerId!==e.pointerId)return;event.preventDefault();cleanup();if(moved){const byId=new Map(getState().drinks.map(x=>[x.id,x]));if(saveDrinks([...list.children].map(child=>byId.get(child.dataset.drinkId)),'manual'))notify('Reihenfolge gespeichert.')}paint(d.id,'handle')};
    const cancel=()=>{cleanup();paint(d.id,'handle')};window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',finish,true);window.addEventListener('pointercancel',cancel,true);window.addEventListener('blur',cancel);frame=requestAnimationFrame(scroll);
   };
   line.append(star,name,amount,handle);row.append(line);
   const details=element('details','nutrition-editor'),summary=element('summary','','Bearbeiten'),form=element('form','nutrition-form');details.append(summary,form);
   const nameInput=element('input');nameInput.value=d.name;nameInput.required=true;nameInput.maxLength=60;
   const field=(label,input)=>{const wrap=element('label','editor-field',label);wrap.append(input);form.append(wrap)};field('Getränkename',nameInput);
   const fields={};const n=cleanNutrition(d.nutrition);
   for(const[key,label,max]of [['alcohol','Alkohol (% vol)',100],['kcal','Energie (kcal/100 ml)',1000],['sugar','Zucker (g/100 ml)',100],['sweetener','Süßstoff(e), Name(n)',null],['sweetenerMgL','Süßstoff(e) gesamt (mg/l)',100000],['caffeine','Koffein (mg/100 ml)',10000]]){
    const input=element('input');input.type=key==='sweetener'?'text':'number';input.value=n[key]??'';input.placeholder='Nicht angegeben';if(key==='sweetener')input.maxLength=100;else{input.min=0;input.max=max;input.step='any';input.inputMode='decimal'}fields[key]=input;field(label,input);
   }
   const hint=element('p','editor-hint','Wird sofort gespeichert. Leer = unbekannt. Änderungen gelten für künftige Einträge.');form.append(hint);
   nameInput.oninput=()=>{const value=nameInput.value.trim();if(value&&saveDrinks(getState().drinks.map(x=>x.id===d.id?{...x,name:value}:x)))name.textContent=value};
   for(const[key,input]of Object.entries(fields))input.oninput=()=>{if(input.validity?.badInput)return;const value=key==='sweetener'?input.value.trim():input.value===''?null:Number(input.value);if(key!=='sweetener'&&value!==null&&!validNutritionNumber(key,value))return;saveDrinks(getState().drinks.map(x=>x.id===d.id?{...x,nutrition:{...x.nutrition,[key]:value},referenceFields:(x.referenceFields||[]).filter(k=>k!==key)}:x))};
   form.onsubmit=e=>e.preventDefault();
   if(d.reference){const source=element('p','reference-note','Richtwerte: '+d.reference.note+' ');for(const[urlIndex,url]of d.reference.urls.entries()){const a=element('a','','Quelle '+(urlIndex+1));a.href=url;a.target='_blank';a.rel='noopener noreferrer';source.append(a,document.createTextNode(' '))}form.append(source)}
   const orderButtons=element('div','order-buttons');for(const[offset,label]of [[-1,'Nach oben'],[1,'Nach unten']]){const b=element('button','',label);b.type='button';b.onclick=()=>moveRow(d.id,offset);orderButtons.append(b)}form.append(orderButtons);
   row.append(details);return row;
  }));
  if(focusId)(focusKind==='handle'?handles:stars).get(focusId)?.focus({preventScroll:true});
 }
 document.getElementById('sort-drinks').onclick=()=>{if(saveDrinks(sortDrinks(getState().drinks),'alphabetical')){paint();notify('Nach Namen und Menge sortiert.')}};
 return {render:paint};
}
