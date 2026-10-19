import './style.css';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

const $ = (s) => document.querySelector(s);
$('#app').innerHTML = `
<div class="shell">
<header class="top"><div class="brand"><img src="/editx-logo.svg" alt="EditX logo"><div><h1>EditX <span style="color:#8e7aff">AI</span> Studio</h1><small>AUTOMATED VIDEO EDITOR</small></div></div><div class="badge">✦ Beat-sync engine · v1.0</div></header>
<section class="hero"><div class="eyebrow">Your footage. Your sound. One edit.</div><h2>Make every beat<br><span>hit different.</span></h2><p>Videoni va musiqani yuklang. EditX ritmni tahlil qiladi, videodagi faol sahnalarni tanlaydi va musiqaga mos kesilgan, ranglari ishlangan montaj tayyorlaydi.</p></section>
<div class="grid">
<section class="panel"><h3>01 / Media import</h3>
<label class="upload"><span class="icon">▧</span><span><strong>Video faylni tanlang</strong><small id="videoName">MP4, MOV, WebM — imkon qadar kichikroq fayl</small></span><input id="videoFile" type="file" accept="video/*"></label>
<label class="upload"><span class="icon">♫</span><span><strong>Musiqani tanlang</strong><small id="musicName">MP3, WAV, M4A, AAC</small></span><input id="musicFile" type="file" accept="audio/*"></label>
<div class="settings">
<div class="field"><label>Edit uzunligi</label><select id="duration"><option value="15">15 soniya</option><option value="30" selected>30 soniya</option><option value="45">45 soniya</option></select></div>
<div class="field"><label>Format</label><select id="ratio"><option value="9:16">TikTok / Reels · 9:16</option><option value="16:9">YouTube · 16:9</option><option value="1:1">Square · 1:1</option></select></div>
<div class="field"><label>Montaj tezligi</label><select id="pace"><option value="fast">Tez / Phonk</option><option value="balanced" selected>Balansli</option><option value="cinematic">Cinematic</option></select></div>
<div class="field"><label>Sifat</label><select id="quality"><option value="720">720p · tezroq</option><option value="1080" selected>1080p · tavsiya</option></select></div>
</div>
<label class="checkrow"><input id="flash" type="checkbox" checked> Beat flash va rang effektlarini qo‘shish</label>
<label class="checkrow"><input id="slowmo" type="checkbox"> Slow-motion kayfiyati (render sekinroq bo‘lishi mumkin)</label>
<button class="btn primary" id="make" disabled>✦ AI EDIT YARATISH</button>
<div class="status" id="status">Video va musiqani yuklang — keyin montajni boshlash mumkin.<div class="progress"><div id="bar"></div></div></div>
<p class="note">Maxfiylik: fayllar brauzer ichida qayta ishlanadi. Birinchi ishga tushishda FFmpeg dvigateli internetdan yuklanadi.</p>
</section>
<section class="panel"><h3>02 / Preview & export <span class="pill">LOCAL RENDER</span></h3>
<div class="preview" id="preview">Videongiz preview’i shu yerda ko‘rinadi</div>
<div class="stats"><div class="stat">Video: <b id="vMeta">—</b></div><div class="stat">Musiqa: <b id="aMeta">—</b></div><div class="stat">Kesishlar: <b id="cutsMeta">—</b></div></div>
<div class="timeline" id="timeline"></div>
<div class="download" id="download"><a id="downloadLink" href="#" download="editx-ai-edit.mp4">⬇ Tayyor videoni yuklab olish</a></div>
<div class="status" style="margin-top:15px">Montaj usuli <b style="color:#d9d0ff">smart highlights + beat sync</b>: ovozdagi kuchli zarbalar aniqlanadi, video kadrlari harakat va yorqinlik bo‘yicha baholanadi, so‘ng kesishlar ritmga yaqinlashtiriladi.</div>
</section>
</div>
<div class="footer">EDITX AI STUDIO · Made for creators</div>
</div>`;

let video = null, music = null, ffmpeg = null, outputUrl = null;
const status = (msg, pct) => { $('#status').firstChild.textContent = msg; $('#bar').style.width = `${Math.max(0,Math.min(100,pct||0))}%`; };
function fmt(s){if(!Number.isFinite(s))return '—';return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;}
function ready(){ $('#make').disabled = !(video && music); }
$('#videoFile').addEventListener('change', e => {
 video = e.target.files[0] || null; $('#videoName').textContent = video ? `${video.name} · ${(video.size/1048576).toFixed(1)} MB` : 'MP4, MOV, WebM';
 if(video){const u=URL.createObjectURL(video);$('#preview').innerHTML=`<video src="${u}" controls playsinline></video>`;const v=$('#preview video');v.onloadedmetadata=()=>$('#vMeta').textContent=`${fmt(v.duration)} · ${v.videoWidth}×${v.videoHeight}`;}
 ready();
});
$('#musicFile').addEventListener('change', e => {
 music = e.target.files[0] || null; $('#musicName').textContent = music ? `${music.name} · ${(music.size/1048576).toFixed(1)} MB` : 'MP3, WAV, M4A, AAC';
 if(music){const a=new Audio(URL.createObjectURL(music));a.onloadedmetadata=()=>$('#aMeta').textContent=fmt(a.duration);}
 ready();
});
async function loadFFmpeg(){
 if(ffmpeg) return ffmpeg;
 ffmpeg=new FFmpeg();
 ffmpeg.on('log', ({message})=>{if(message && /frame=|error/i.test(message)) console.debug('[FFmpeg]',message);});
 ffmpeg.on('progress', ({progress})=>status('Video render qilinmoqda…', 35+Math.round(progress*60)));
 const base='https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd';
 await ffmpeg.load({coreURL:await toBlobURL(`${base}/ffmpeg-core.js`,'text/javascript'),wasmURL:await toBlobURL(`${base}/ffmpeg-core.wasm`,'application/wasm')});
 return ffmpeg;
}
// Decode audio and detect prominent local energy peaks. Falls back to regular cuts if decoding is unsupported.
async function detectBeats(file, duration, pace){
 const ctx=new (window.AudioContext||window.webkitAudioContext)();
 try{
  const data=await file.arrayBuffer(); const buf=await ctx.decodeAudioData(data.slice(0));
  const mono=new Float32Array(buf.length); for(let c=0;c<buf.numberOfChannels;c++){const d=buf.getChannelData(c);for(let i=0;i<d.length;i++)mono[i]+=d[i]/buf.numberOfChannels;}
  const hop=1024, energies=[];
  for(let i=0;i<mono.length;i+=hop){let sum=0;for(let j=i;j<Math.min(i+hop,mono.length);j++)sum+=mono[j]*mono[j];energies.push(Math.sqrt(sum/hop));}
  const fps=buf.sampleRate/hop, peaks=[];
  for(let i=Math.max(1,Math.floor(.25*fps));i<Math.min(energies.length,Math.floor(duration*fps));i++){
   const prev=energies.slice(Math.max(0,i-4),i).reduce((a,b)=>a+b,0)/Math.max(1,Math.min(4,i));
   if(energies[i]>.035 && energies[i]>prev*1.28 && energies[i]>=energies[i-1] && energies[i]>=(energies[i+1]||0)) peaks.push(i/fps);
  }
  const minGap=pace==='fast'?.42:pace==='cinematic'?1.45:.72, filtered=[];
  for(const p of peaks){if(!filtered.length||p-filtered[filtered.length-1]>=minGap)filtered.push(p);}
  await ctx.close(); return filtered;
 }catch(e){await ctx.close();return [];}
}
async function scoreVideo(file, duration, targetCount){
 const url=URL.createObjectURL(file), v=document.createElement('video');v.src=url;v.muted=true;v.playsInline=true;
 await new Promise((res,rej)=>{v.onloadedmetadata=res;v.onerror=rej;});
 const dur=Math.min(v.duration,duration*3);const canvas=document.createElement('canvas');canvas.width=96;canvas.height=54;const c=canvas.getContext('2d',{willReadFrequently:true});
 const points=[], n=Math.min(120,Math.max(30,Math.ceil(dur*1.5)));let prev=null;
 for(let i=0;i<n;i++){
  const t=(dur-0.08)*i/Math.max(1,n-1);v.currentTime=t;
  await new Promise(r=>{v.onseeked=()=>r();setTimeout(r,250)});
  try{c.drawImage(v,0,0,96,54);const pix=c.getImageData(0,0,96,54).data;let lum=0,motion=0;
   for(let j=0;j<pix.length;j+=4){const l=.2126*pix[j]+.7152*pix[j+1]+.0722*pix[j+2];lum+=l;if(prev)motion+=Math.abs(l-(.2126*prev[j]+.7152*prev[j+1]+.0722*prev[j+2]));}
   lum/=96*54;motion=prev?motion/(96*54):0;const score=Math.min(1,motion/30)*.65+Math.max(0,1-Math.abs(lum-125)/150)*.25+Math.random()*.02;
   points.push({t,score});prev=pix;
  }catch{}
 }
 URL.revokeObjectURL(url);
 // Keep a spread of visually active moments, not just the highest-scoring adjacent frames.
 const chosen=[];const spacing=Math.max(1.2,dur/Math.max(1,targetCount));
 for(let slot=0;slot<targetCount;slot++){const lo=slot*dur/targetCount,hi=(slot+1)*dur/targetCount;const pool=points.filter(p=>p.t>=lo&&p.t<hi).sort((a,b)=>b.score-a.score);if(pool.length)chosen.push(pool[0].t);}
 return chosen.length?chosen:[...Array(targetCount)].map((_,i)=>i*dur/targetCount);
}
$('#make').addEventListener('click', async()=>{
 if(!video||!music)return;
 $('#make').disabled=true;$('#download').style.display='none';$('#timeline').innerHTML='';
 let resultUrl=null;
 try{
  const duration=Number($('#duration').value),pace=$('#pace').value,ratio=$('#ratio').value,quality=Number($('#quality').value);
  status('Musiqa ritmi tahlil qilinmoqda…',5);
  const beats=await detectBeats(music,duration,pace);
  status('Videodagi faol sahnalar qidirilmoqda…',15);
  const cuts=await scoreVideo(video,duration,Math.max(8,Math.min(30,Math.round(duration/(pace==='fast'?1.0:pace==='cinematic'?2.2:1.5)))));
  const totalDur=Math.min(duration,Number($('#duration').value));let interval=pace==='fast'?.8:pace==='cinematic'?1.8:1.2;
  const beatCuts=beats.filter(b=>b>0&&b<totalDur);const points=[0];
  for(let t=interval;t<totalDur;t+=interval){const nearby=beatCuts.filter(b=>Math.abs(b-t)<.22).sort((a,b)=>Math.abs(a-t)-Math.abs(b-t))[0];points.push(nearby??t);}
  points.push(totalDur);const unique=[...new Set(points.map(p=>Math.max(0,Math.min(totalDur,p)).toFixed(2)))].map(Number).sort((a,b)=>a-b);
  const segments=[];for(let i=0;i<unique.length-1;i++){const d=unique[i+1]-unique[i];if(d>.25)segments.push({start:unique[i],dur:d});}
  if(!segments.length)segments.push({start:0,dur:totalDur});
  $('#cutsMeta').textContent=String(segments.length);$('#timeline').innerHTML=segments.map(()=>'<div class="segment"></div>').join('');
  status('Render dvigateli yuklanmoqda (birinchi safar kattaroq yuklama)…',25);
  const ff=await loadFFmpeg();
  const safe=(name)=>name.replace(/[^a-zA-Z0-9._-]/g,'_').slice(-90)||'media';
  const vf= safe(video.name), af=safe(music.name);
  await ff.writeFile(vf,await fetchFile(video));await ff.writeFile(af,await fetchFile(music));
  const [rw,rh]=ratio==='9:16'?[720,1280]:ratio==='1:1'?[1080,1080]:[1280,720];
  const outW=quality===720?Math.min(rw,720):rw, outH=quality===720?Math.round(rh*outW/rw):rh;
  const filters=[],labels=[];
  segments.forEach((s,i)=>{
   const t=cuts.reduce((best,x)=>Math.abs(x-s.start)<Math.abs(best-s.start)?x:best,cuts[0]||0);
   const start=Math.max(0,Math.min(Math.max(0,video.duration-s.dur-.05),t));
   let filter=`[0:v]trim=start=${start.toFixed(3)}:duration=${s.dur.toFixed(3)},setpts=PTS-STARTPTS,scale=${outW}:${outH}:force_original_aspect_ratio=increase,crop=${outW}:${outH},setsar=1`;
   if($('#flash').checked)filter+=`,eq=contrast=1.06:saturation=1.12:brightness=0.015`;
   if($('#slowmo').checked)filter+=`,setpts=1.08*PTS`;
   filter+=`,fps=30,format=yuv420p[v${i}]`;filters.push(filter);labels.push(`[v${i}]`);
  });
  let graph=filters.join(';')+`;${labels.join('')}concat=n=${labels.length}:v=1:a=0[vout];[1:a]atrim=duration=${totalDur},asetpts=PTS-STARTPTS,afade=t=out:st=${Math.max(0,totalDur-0.6)}:d=${Math.min(.6,totalDur)},volume=1[aout]`;
  // Encode to broadly compatible MP4; segments are cut to the beat grid and source moments are selected from analyzed visual activity.
  status('Video montaj qilinmoqda…',35);
  await ff.exec(['-i',vf,'-i',af,'-filter_complex',graph,'-map','[vout]','-map','[aout]','-t',String(totalDur),'-c:v','libx264','-preset','ultrafast','-crf',quality===720?'27':'23','-c:a','aac','-b:a','192k','-movflags','+faststart','-y','editx-output.mp4']);
  const data=await ff.readFile('editx-output.mp4');const blob=new Blob([data.buffer],{type:'video/mp4'});resultUrl=URL.createObjectURL(blob);
  $('#downloadLink').href=resultUrl;$('#download').style.display='block';$('#preview').innerHTML=`<video src="${resultUrl}" controls playsinline></video>`;
  status(`Tayyor! ${segments.length} ta kesish bilan MP4 yaratildi.`,100);
  try{await ff.deleteFile(vf);await ff.deleteFile(af);await ff.deleteFile('editx-output.mp4');}catch{}
 }catch(err){console.error(err);status('Xatolik: fayl juda katta bo‘lishi yoki brauzer xotirasi yetmasligi mumkin. Kichikroq video/fayl bilan qayta urinib ko‘ring. Tafsilot: '+(err?.message||'noma’lum xato'),0);}
 finally{$('#make').disabled=!(video&&music);}
});
