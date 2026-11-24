import {DEFAULT_REMINDER,validReminder,nextReminder,reminderActive,localTime} from './core.js?v=4';
const $=id=>document.getElementById(id);
export function createReminder({getState,commit,notify}){
 let due=null,context=null,customBuffer=null,customName='',configKey='',disposed=false;
 function audioContext(){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)throw Error('Dieser Browser unterstützt die Tonwiedergabe nicht.');return context??=new Context()}
 async function unlock(){const ctx=audioContext();await ctx.resume();return ctx}
 function openDb(){return new Promise((resolve,reject)=>{if(!('indexedDB'in globalThis)){reject(Error('Lokaler Tonspeicher nicht verfügbar.'));return}const r=indexedDB.open('trinkjournal-audio',1);r.onupgradeneeded=()=>r.result.createObjectStore('sounds');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
 async function readSound(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('sounds','readonly'),r=tx.objectStore('sounds').get('custom');tx.oncomplete=()=>{resolve(r.result);db.close()};tx.onerror=()=>{reject(tx.error);db.close()}})}
 async function saveSound(value){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction('sounds','readwrite');tx.objectStore('sounds').put(value,'custom');tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>{db.close();reject(tx.error)};tx.onabort=()=>{db.close();reject(tx.error||Error('Ton konnte nicht gespeichert werden.'))}})}
 async function customAudio(){if(customBuffer)return customBuffer;const value=await readSound();if(!value)throw Error('Bitte zuerst einen eigenen Ton importieren.');customName=value.name;customBuffer=await audioContext().decodeAudioData(await value.blob.arrayBuffer());return customBuffer}
 async function play(sound,allowResume=false){
  const ctx=allowResume?await unlock():audioContext();if(ctx.state!=='running')throw Error('Bitte „Ton aktivieren“ antippen, damit der Browser Erinnerungen mit Ton zulässt.');
  if(sound==='custom'){const buffer=await customAudio(),source=ctx.createBufferSource(),gain=ctx.createGain();source.buffer=buffer;gain.gain.value=.55;source.connect(gain);gain.connect(ctx.destination);source.start();source.stop(ctx.currentTime+Math.min(buffer.duration,15));return}
  const notes=sound==='double'?[[660,0,.18],[660,.3,.18]]:sound==='drop'?[[1100,0,.13],[740,.16,.2]]:[[523.25,0,.32],[659.25,.18,.4],[783.99,.36,.65]];
  for(const[freq,delay,duration]of notes){const osc=ctx.createOscillator(),gain=ctx.createGain(),start=ctx.currentTime+delay;osc.type='sine';osc.frequency.setValueAtTime(freq,start);if(sound==='drop')osc.frequency.exponentialRampToValueAtTime(freq*.5,start+duration);gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(.18,start+.015);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);osc.connect(gain);gain.connect(ctx.destination);osc.start(start);osc.stop(start+duration+.05)}
 }
 function soundStatus(message){$('sound-status').textContent=message}
 function syncForm(){const r=getState().reminder||DEFAULT_REMINDER;$('reminder-enabled').checked=r.enabled;$('reminder-interval').value=r.interval;$('reminder-start').value=r.start;$('reminder-end').value=r.end;$('reminder-sound-enabled').checked=r.soundEnabled;$('reminder-sound').value=r.sound;soundStatus(customName?'Eigener Ton: '+customName:'Eigene MP3- oder WAV-Datei importierbar (max. 5 MB).')}
 function saveReminder(event){const values={enabled:$('reminder-enabled').checked,interval:Number($('reminder-interval').value),start:$('reminder-start').value,end:$('reminder-end').value,soundEnabled:$('reminder-sound-enabled').checked,sound:$('reminder-sound').value},field={'reminder-enabled':'enabled','reminder-interval':'interval','reminder-start':'start','reminder-end':'end','reminder-sound-enabled':'soundEnabled','reminder-sound':'sound'}[event?.target?.id],r=field?{...getState().reminder,[field]:values[field]}:values;if(!validReminder(r)){soundStatus('Bitte ein Intervall von 1–1440 Minuten und unterschiedliche Anfangs- und Endezeiten angeben. Die letzte gültige Einstellung bleibt gespeichert.');return}if(r.sound==='custom'&&!customName){soundStatus('Bitte zuerst einen eigenen Ton importieren.');$('reminder-sound').value=getState().reminder.sound;return}if(commit({...getState(),reminder:r})){reset();soundStatus('Einstellungen gespeichert.'+(customName?' Eigener Ton: '+customName:''));if(r.soundEnabled)void unlock().catch(e=>soundStatus('Gespeichert. '+e.message))}}
 $('reminder-form').onsubmit=e=>{e.preventDefault();saveReminder()};
 for(const id of ['reminder-interval','reminder-start','reminder-end'])$(id).oninput=saveReminder;
 for(const id of ['reminder-enabled','reminder-sound-enabled','reminder-sound'])$(id).onchange=saveReminder;
 $('test-sound').onclick=()=>play($('reminder-sound').value,true).then(()=>soundStatus('Ton abgespielt und für diese Sitzung aktiviert.')).catch(e=>soundStatus(e.message));
 $('enable-sound').onclick=()=>play(getState().reminder.sound,true).then(()=>{$('enable-sound').hidden=true}).catch(e=>notify(e.message));
 let uploadVersion=0;
 $('sound-file').onchange=async()=>{const version=++uploadVersion;const file=$('sound-file').files[0];if(!file)return;try{if(!/\.(mp3|wav)$/i.test(file.name))throw Error('Bitte eine MP3- oder WAV-Datei wählen.');if(file.size>5*1024*1024)throw Error('Die Tondatei darf höchstens 5 MB groß sein.');soundStatus('Ton wird geprüft …');const ctx=await unlock(),buffer=await ctx.decodeAudioData(await file.arrayBuffer());if(!buffer.duration||buffer.duration>120)throw Error('Bitte einen Ton mit maximal 120 Sekunden Länge wählen. Bei Erinnerungen werden bis zu 15 Sekunden abgespielt.');if(version!==uploadVersion)return;await saveSound({name:file.name,blob:file});customBuffer=buffer;customName=file.name;$('reminder-sound').value='custom';saveReminder()}catch(e){soundStatus(e.message)}};
 $('reminder-dismiss').onclick=()=>{$('reminder-banner').hidden=true};
 async function alertUser(slot){
  const fire=async()=>{const key='trinkjournal.reminder.last',id=String(slot);try{const last=Number(localStorage.getItem(key)||0);if(last>=slot)return;localStorage.setItem(key,id)}catch{/* In-app reminder remains available without cross-tab deduplication. */}
   $('reminder-banner').hidden=false;if(getState().reminder.soundEnabled)try{await play(getState().reminder.sound)}catch(e){$('enable-sound').hidden=false;notify(e.message)}
  };
  if(navigator.locks?.request)await navigator.locks.request('trinkjournal-reminder',{ifAvailable:true},lock=>lock?fire():undefined);else await fire();
 }
 function tick(){if(disposed)return;const r=getState().reminder,key=JSON.stringify(r),now=Date.now();if(key!==configKey){configKey=key;due=nextReminder(r,new Date(now))}$('timer-card').hidden=!r.enabled;if(!r.enabled){$('reminder-banner').hidden=true;return}
  if(due!==null&&now>=due){const slot=due;due=nextReminder(r,new Date(now+1));if(now-slot<60000&&reminderActive(r,new Date(now)))void alertUser(slot)}
  if(due===null)return;const secs=Math.max(0,Math.ceil((due-now)/1000));$('timer-countdown').textContent=[Math.floor(secs/3600),Math.floor(secs/60)%60,secs%60].map(n=>String(n).padStart(2,'0')).join(':');
  const next=new Date(due),dateLabel=next.toDateString()===new Date(now).toDateString()?'heute':'morgen';$('timer-next').textContent='Nächste Erinnerung '+dateLabel+' um '+localTime(next)+' Uhr · alle '+r.interval+' Min.';$('enable-sound').hidden=!r.soundEnabled||context?.state==='running';
 }
 function reset(){configKey='';tick()}
 readSound().then(v=>{if(v){customName=v.name;if($('settings-dialog').open)soundStatus('Eigener Ton: '+customName)}}).catch(()=>{});
 const interval=setInterval(tick,1000);interval.unref?.();document.addEventListener('visibilitychange',tick);tick();
 return {syncForm,reset,dispose(){disposed=true;clearInterval(interval)}};
}
