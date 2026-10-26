import { auth, db } from "../firebase.js";
import { saveLocalAttachment, getLocalAttachmentUrl } from "../local-attachments.js";
import { saveLocalProjectCover, getLocalProjectCoverUrl } from "../local-project-covers.js";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, addDoc, setDoc, updateDoc, deleteDoc, query, orderBy, limit, serverTimestamp, onSnapshot, deleteField } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";

const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const views = { login: $("#loginView"), denied: $("#deniedView"), dashboard: $("#dashboardView") };
let currentUser = null, editing = { collection: null, id: null };
const recordCache = { projects: [], services: [], skills: [] };
let stopChatList = null, stopChatThread = null, selectedChatId = null, cachedChats = [];
const configs = {
  projects: { label: "progetto", fields: [
    ["title","Nome progetto","text",true,"Titolo visibile nella card."],
    ["description","Descrizione del progetto","textarea",true,"Descrivi in modo sintetico obiettivo e risultato."],
    ["category","Categoria / tecnologie","text",true,"Etichette separate da virgola, ad esempio E-commerce, React, UX/UI."],
    ["badge","Badge in evidenza","text",false,"Etichetta breve opzionale, ad esempio Nuovo, E-commerce, Web app."],
    ["icon","Icona Font Awesome","text",false,"Classe icona opzionale, ad esempio fa-solid fa-code."],
    ["coverUpload","Immagine di copertina (upload)","file",false,"Carica una copertina JPG, PNG, WebP o GIF. Viene salvata solo in questo browser, senza Firebase Storage."],
    ["order","Ordine di visualizzazione","number",true,"Numero più basso = card mostrata prima."],
    ["visible","Pubblica sul sito","checkbox",false,"Attiva per rendere visibile il progetto."]
  ]},
  services: { label: "servizio", fields: [
    ["title","Titolo","text",true],["kicker","Etichetta breve","text",true],["description","Descrizione","textarea",true],["tags","Competenze / ambiti","text",true],["order","Ordine","number",true],["visible","Visibile sul sito","checkbox",false]
  ]},
  skills: { label: "competenza", fields: [
    ["title","Nome competenza","text",true],["category","Categoria","text",true],["description","Descrizione","textarea",false],["level","Livello descrittivo","text",false],["order","Ordine","number",true],["visible","Visibile","checkbox",false]
  ]}
};
function showView(name) { Object.entries(views).forEach(([key, el]) => el.hidden = key !== name); }
function setFeedback(node, text, error=false) { node.textContent = text; node.classList.toggle("error", error); }
function toast(text) { const el=$("#toast"); el.textContent=text; el.classList.add("show"); setTimeout(()=>el.classList.remove("show"),2600); }
function safeText(value) { return value == null ? "" : String(value); }
async function uploadAdminChatAttachment(file, chatId, uid, onProgress = () => {}) {
  onProgress(10);
  const attachment = await saveLocalAttachment(file, chatId, uid);
  onProgress(100);
  return attachment;
}
function ensureAdminMediaModal(){let modal=document.getElementById("chatMediaModal");if(modal)return modal;modal=document.createElement("div");modal.id="chatMediaModal";modal.className="chat-media-modal";modal.hidden=true;modal.innerHTML='<button type="button" class="chat-media-close" aria-label="Chiudi anteprima">×</button><div class="chat-media-stage"></div>';document.body.append(modal);const close=()=>{modal.hidden=true;modal.querySelectorAll("video").forEach(v=>v.pause());modal.querySelector(".chat-media-stage").replaceChildren();};modal.querySelector(".chat-media-close").addEventListener("click",close);modal.addEventListener("click",e=>{if(e.target===modal)close();});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close();});return modal;}
function appendChatAttachment(container, attachment) { if(!attachment?.id)return;const button=document.createElement("button");button.type="button";button.className="chat-media-preview";button.textContent="Anteprima locale";button.addEventListener("click",async()=>{try{const item=await getLocalAttachmentUrl(attachment.id),modal=ensureAdminMediaModal(),stage=modal.querySelector(".chat-media-stage"),media=item.type.startsWith("video/")?document.createElement("video"):document.createElement("img");stage.replaceChildren();media.src=item.url;media.alt=item.name;media.className="chat-media-fullscreen";if(media.tagName==="VIDEO"){media.controls=true;media.autoplay=true;media.playsInline=true;}modal.hidden=false;stage.append(media);}catch(error){alert(error.message||"Anteprima non disponibile su questo dispositivo.");}});getLocalAttachmentUrl(attachment.id).then(item=>{const media=item.type.startsWith("video/")?document.createElement("video"):document.createElement("img");media.src=item.url;media.alt=item.name;media.className="chat-media-thumb";if(media.tagName==="VIDEO"){media.muted=true;media.playsInline=true;media.preload="metadata";}button.replaceChildren(media);const label=document.createElement("span");label.textContent="Apri a schermo intero ↗";button.append(label);}).catch(()=>{button.textContent=`Anteprima locale · ${attachment.name||"file"}`;});container.append(button);}


async function isAuthorized(user) {
  // La regola Firestore richiede un documento admins/{uid} con active == true.
  const snap = await getDoc(doc(db, "admins", user.uid));
  return snap.exists() && snap.data().active === true;
}
async function authChanged(user) {
  currentUser = user;
  $("#userBadge").textContent = user ? user.email || user.uid : "NON AUTENTICATO";
  $("#logoutButton").hidden = !user;
  if (!user) { stopChatList?.(); stopChatThread?.(); stopChatList=null; stopChatThread=null; selectedChatId=null; showView("login"); return; }
  try {
    if (await isAuthorized(user)) {
      showView("dashboard");
      await Promise.all([loadRecords("projects"), loadRecords("services"), loadRecords("skills"), loadSettings(), loadRequests(), loadVisualEditor()]);
      startChatList();
    } else showView("denied");
  } catch (err) {
    console.error(err); showView("denied");
    setFeedback($("#loginFeedback"), "Impossibile verificare l'autorizzazione. Controlla la configurazione e le regole Firestore.", true);
  }
}
onAuthStateChanged(auth, authChanged);

$("#loginForm").addEventListener("submit", async event => {
  event.preventDefault(); const form=event.currentTarget, data=new FormData(form), button=form.querySelector("button");
  button.disabled=true; setFeedback($("#loginFeedback"),"Autenticazione in corso…");
  try { await signInWithEmailAndPassword(auth, String(data.get("email")).trim(), String(data.get("password"))); }
  catch (err) {
    console.error(err);
    const messages = { "auth/invalid-credential":"Email o password non corretti.", "auth/too-many-requests":"Troppi tentativi. Attendi e riprova.", "auth/operation-not-allowed":"Abilita Email/Password in Firebase Authentication.", "auth/network-request-failed":"Connessione non disponibile." };
    setFeedback($("#loginFeedback"), messages[err.code] || `Accesso non riuscito (${err.code || "errore"}).`, true);
  } finally { button.disabled=false; }
});
async function logout() { try { await signOut(auth); showView("login"); } catch(err) { console.error(err); toast("Errore durante l'uscita."); } }
$("#logoutButton").addEventListener("click",logout); $("#deniedLogout").addEventListener("click",logout);

$$(".admin-tabs button").forEach(button => button.addEventListener("click", async () => {
  $$(".admin-tabs button").forEach(b=>b.classList.toggle("active",b===button));
  $$(".panel").forEach(p=>p.hidden=p.id!==`panel-${button.dataset.panel}`);
  if(button.dataset.panel==="requests") await loadRequests();
  if(button.dataset.panel==="chat") startChatList();
}));
$$("[data-create]").forEach(button=>button.addEventListener("click",()=>openEditor(button.dataset.create)));
$("#closeDialog").addEventListener("click",()=>$("#recordDialog").close());
$("#cancelRecord").addEventListener("click",()=>$("#recordDialog").close());
$("#refreshRequests").addEventListener("click",loadRequests);
$("#refreshChats")?.addEventListener("click",startChatList);

async function loadRecords(name) {
  const container=$(`#records-${name}`); container.innerHTML='<div class="empty-state">Caricamento…</div>';
  try {
    const snap=await getDocs(query(collection(db,name),limit(500)));
    container.replaceChildren();
    const records=snap.docs.map(s=>({id:s.id,data:s.data()})).sort((a,b)=>{
      const ao=Number.isFinite(Number(a.data.order))?Number(a.data.order):Number.MAX_SAFE_INTEGER;
      const bo=Number.isFinite(Number(b.data.order))?Number(b.data.order):Number.MAX_SAFE_INTEGER;
      return ao-bo || String(a.data.title||a.data.name||"").localeCompare(String(b.data.title||b.data.name||""),"it");
    });
    if(recordCache[name]) recordCache[name]=records;
    if(!records.length){container.innerHTML='<div class="empty-state">Nessun record. Usa il pulsante “Nuovo” per aggiungerne uno.</div>';return;}
    records.forEach(record=>{
      const s={id:record.id}; const d=record.data, card=document.createElement("article");card.className="record";
      const content=document.createElement("div"), title=document.createElement("div"), meta=document.createElement("div"), desc=document.createElement("div");
      title.className="record-title";title.textContent=d.title||d.name||"(senza titolo)";
      meta.className="record-meta";meta.textContent=`ID ${s.id} · ORDINE ${d.order??"—"} · ${d.visible===true?"ATTIVO SUL SITO":"NASCOSTO SUL SITO"}`;
      desc.className="record-desc";desc.textContent=d.description||d.category||"";
      content.append(title,meta,desc);
      const actions=document.createElement("div");actions.className="record-actions";
      const edit=document.createElement("button");edit.textContent="Modifica";edit.addEventListener("click",()=>openEditor(name,s.id,d));
      const visibility=document.createElement("button");visibility.textContent=d.visible===true?"Nascondi":"Attiva sul sito";visibility.addEventListener("click",async()=>{try{await updateDoc(doc(db,name,s.id),{visible:d.visible!==true,updatedAt:serverTimestamp(),updatedBy:currentUser?.uid||""});await loadRecords(name);toast(d.visible===true?"Elemento nascosto dal sito.":"Elemento attivato sul sito.");}catch(e){console.error(e);toast("Operazione non riuscita.");}});
      const del=document.createElement("button");del.className="delete";del.textContent="Elimina";del.addEventListener("click",async()=>{if(!confirm(`Eliminare definitivamente “${title.textContent}”?`))return;try{await deleteDoc(doc(db,name,s.id));await loadRecords(name);toast("Record eliminato.");}catch(e){console.error(e);toast("Eliminazione non riuscita.");}});
      actions.append(edit,visibility,del);card.append(content,actions);container.append(card);
    });
  } catch(err) { console.error(err);container.innerHTML='<div class="empty-state">Errore caricamento. Verifica accesso admin e regole Firestore.</div>'; }
}
function openEditor(name,id=null,data={}) {
  editing={collection:name,id};const config=configs[name];$("#dialogTitle").textContent=id?"Modifica "+config.label:"Nuovo "+config.label;
  const fields=$("#recordFields");fields.replaceChildren();
  config.fields.forEach(([key,label,type,required,help])=>{
    const wrapper=document.createElement("label");wrapper.className=(type==="textarea"?"full":"");
    if (help) { wrapper.title=help; wrapper.setAttribute("aria-label", `${label}. ${help}`); }
    if(type==="checkbox"){wrapper.className="checkbox-label full";const input=document.createElement("input");input.type="checkbox";input.name=key;input.checked=data[key]===true;const text=document.createElement("span");text.textContent=label;wrapper.append(input,text);}
    else {
      const title=document.createElement("span");title.textContent=label; if(help){title.title=help;title.className="field-label-help";}let input;
      if(type==="textarea"){input=document.createElement("textarea");input.rows=3;input.value=safeText(data[key]);}
      else {input=document.createElement("input");input.type=type;if(type!=="file")input.value=safeText(data[key]);else{input.accept="image/jpeg,image/png,image/webp,image/gif";input.dataset.existingUrl=data.imageUrl||"";if(data.imageUrl){const preview=document.createElement("small");preview.className="record-field-help";preview.textContent="Copertina attuale presente; carica un nuovo file per sostituirla.";wrapper.append(preview);}}if(type==="number")input.step="1";}
      input.name=key;input.required=required;
      if(help) { input.title=help; input.setAttribute("aria-describedby", `help-${key}`); const hint=document.createElement("small");hint.className="record-field-help";hint.id=`help-${key}`;hint.textContent=help;wrapper.append(title,input,hint); }
      else wrapper.append(title,input);
      if(key==="order"&&!id&&input.value===""){const cached=recordCache[name]||[];const max=cached.reduce((value,item)=>Math.max(value,Number(item.data.order)||0),0);input.value=String(max+1);}
    }
    fields.append(wrapper);
  });
  const coverInput=fields.querySelector('input[name="coverUpload"]');
  if(coverInput){
    const preview=document.createElement("div");preview.className="record-cover-local-preview";preview.style.cssText="margin-top:10px;display:flex;align-items:center;gap:12px;flex-wrap:wrap";
    const image=document.createElement("img");image.alt="Anteprima copertina progetto";image.style.cssText="display:block;max-width:240px;max-height:140px;object-fit:cover;border:1px solid rgba(117,231,255,.3);border-radius:8px";image.hidden=true;
    const status=document.createElement("small");status.className="record-field-help";status.textContent="Le copertine caricate vengono conservate localmente in questo browser.";
    preview.append(image,status);coverInput.closest("label")?.append(preview);
    const existing=data.imageUrl;
    if(existing){getLocalProjectCoverUrl(existing).then(url=>{image.src=url;image.hidden=false;}).catch(()=>{if(!String(existing).startsWith("local-cover:")){image.src=existing;image.hidden=false;}else status.textContent="Copertina locale non presente in questo browser: ricaricala per visualizzarla.";});}
    coverInput.addEventListener("change",()=>{const file=coverInput.files?.[0];if(!file)return;if(!file.type.startsWith("image/")||file.size>8*1024*1024){coverInput.value="";setFeedback($("#recordFeedback"),"Carica un'immagine valida di massimo 8 MB.",true);return;}if(image.dataset.previewUrl)URL.revokeObjectURL(image.dataset.previewUrl);const url=URL.createObjectURL(file);image.dataset.previewUrl=url;image.src=url;image.hidden=false;status.textContent=`Anteprima locale: ${file.name} · ${(file.size/1024).toFixed(0)} KB`;setFeedback($("#recordFeedback"),"");});
  }
  setFeedback($("#recordFeedback"),"");$("#recordDialog").showModal();
}
$("#recordForm").addEventListener("submit",async event=>{
  event.preventDefault();if(!currentUser||!editing.collection)return;
  const form=event.currentTarget,data={};
  let coverFile=null;
  for(const [key,label,type] of configs[editing.collection].fields){
    const input=form.elements[key];if(!input)continue;
    if(type==="file"){coverFile=input.files?.[0]||null;continue;}
    data[key]=type==="checkbox"?input.checked:type==="number"?(input.value===""?0:Number(input.value)):String(input.value).trim();
  }
  data.updatedAt=serverTimestamp();data.updatedBy=currentUser.uid;
  try{
    if(editing.collection==="projects"&&coverFile){data.imageUrl=await saveLocalProjectCover(coverFile);}
    if(editing.collection==="services" && editing.id) data.price=deleteField();
    if(editing.id)await updateDoc(doc(db,editing.collection,editing.id),data);
    else {data.createdAt=serverTimestamp();await addDoc(collection(db,editing.collection),data);}
    $("#recordDialog").close();await loadRecords(editing.collection);toast("Record salvato.");
  }catch(err){console.error(err);setFeedback($("#recordFeedback"),err.message||"Salvataggio fallito. Verifica i permessi Firestore.",true);}
});
async function loadSettings(){
  const form=$("#settingsForm");
  try{const snap=await getDoc(doc(db,"site","settings"));const d=snap.exists()?snap.data():{};for(const key of ["logoSymbol","brandName","heroSubtitle","contactEmail"])form.elements[key].value=d[key]||({logoSymbol:"S/",brandName:"STUDIO",heroSubtitle:"Progetto e sviluppo esperienze web su misura che uniscono identità, interazione e solidità tecnica. Dal primo concept al rilascio, trasformo ciò che vuoi comunicare in un’esperienza digitale chiara, riconoscibile e costruita per raggiungere un obiettivo.",contactEmail:"hello@example.com"}[key]);}
  catch(err){console.error(err);setFeedback($("#settingsFeedback"),"Impossibile leggere le impostazioni.",true);}
}
$("#settingsForm").addEventListener("submit",async event=>{
  event.preventDefault();const form=event.currentTarget;const data={logoSymbol:form.elements.logoSymbol.value.trim()||"S/",brandName:form.elements.brandName.value.trim(),heroSubtitle:form.elements.heroSubtitle.value.trim(),contactEmail:form.elements.contactEmail.value.trim(),updatedAt:serverTimestamp(),updatedBy:currentUser?.uid||""};
  try{await setDoc(doc(db,"site","settings"),data,{merge:true});setFeedback($("#settingsFeedback"),"Impostazioni salvate. Ricarica il sito pubblico per visualizzare gli aggiornamenti.");toast("Impostazioni salvate.");}
  catch(err){console.error(err);setFeedback($("#settingsFeedback"),"Salvataggio fallito. Verifica le regole Firestore.",true);}
});
async function loadRequests(){
  const container=$("#records-requests");container.innerHTML='<div class="empty-state">Caricamento richieste…</div>';
  try{
    const snap=await getDocs(query(collection(db,"requests"),orderBy("createdAt","desc"),limit(100)));
    $("#requestCount").textContent=String(snap.size);container.replaceChildren();
    if(snap.empty){container.innerHTML='<div class="empty-state">Non ci sono richieste al momento.</div>';return;}
    snap.forEach(s=>{
      const d=s.data(),card=document.createElement("article");card.className="record";
      const content=document.createElement("div"),title=document.createElement("div"),meta=document.createElement("div"),desc=document.createElement("div");
      title.className="record-title";title.textContent=`${d.name||"Senza nome"} — ${d.requestType||"contatto"}`;
      meta.className="record-meta";meta.textContent=`${d.email||""} · ${d.company||"Privato"} · ${d.createdAt?.toDate?d.createdAt.toDate().toLocaleString("it-IT"):"data non disponibile"}`;
      desc.className="record-desc";desc.textContent=`${d.projectType?d.projectType+" — ":""}${d.message||""}`;
      content.append(title,meta,desc);
      const actions=document.createElement("div");actions.className="record-actions";
      const status=document.createElement("select");status.className="status-select";status.setAttribute("aria-label","Stato richiesta");
      ["new","in-progress","completed","spam"].forEach(v=>{const o=document.createElement("option");o.value=v;o.textContent=({new:"Nuova","in-progress":"In lavorazione",completed:"Completata",spam:"Spam"})[v];o.selected=(d.status||"new")===v;status.append(o);});
      status.addEventListener("change",async()=>{try{await updateDoc(doc(db,"requests",s.id),{status:status.value,updatedAt:serverTimestamp()});toast("Stato aggiornato.");}catch(e){console.error(e);toast("Aggiornamento non riuscito.");}});
      const email=document.createElement("a");email.className="button secondary";email.href=`mailto:${encodeURIComponent(d.email||"")}?subject=${encodeURIComponent("Re: richiesta dal sito")}`;email.textContent="Rispondi";
      const del=document.createElement("button");del.className="delete";del.textContent="Elimina";del.addEventListener("click",async()=>{if(!confirm("Eliminare questa richiesta?"))return;try{await deleteDoc(doc(db,"requests",s.id));await loadRequests();toast("Richiesta eliminata.");}catch(e){console.error(e);toast("Eliminazione non riuscita.");}});
      actions.append(status,email,del);card.append(content,actions);container.append(card);
    });
  }catch(err){console.error(err);container.innerHTML='<div class="empty-state">Errore nel caricamento delle richieste. Verifica le regole Firestore.</div>';}
}


// Live chat CMS: real-time Firestore listeners, available only after admin authorization.
function filteredChats(){
  const term=String($("#adminChatSearch")?.value||"").trim().toLocaleLowerCase("it-IT"),filter=$("#adminChatFilter")?.value||"all";
  return cachedChats.filter(chat=>{
    if(filter!=="all"&&(chat.status||"open")!==filter)return false;
    return !term||[chat.name,chat.email,chat.lastMessage].some(value=>String(value||"").toLocaleLowerCase("it-IT").includes(term));
  });
}
function renderChatList(){
  const list=$("#adminChatList");if(!list)return;list.replaceChildren();
  if(!cachedChats.length){list.innerHTML='<div class="empty-state">Nessuna conversazione. Le chat avviate dal sito appariranno qui.</div>';return;}
  const visible=filteredChats();
  if(!visible.length){list.innerHTML='<div class="empty-state">Nessuna conversazione corrisponde alla ricerca.</div>';return;}
  visible.forEach(chat=>{
    const button=document.createElement("button");button.type="button";button.dataset.chatId=chat.id;button.className=`admin-chat-item${selectedChatId===chat.id?" active":""}`;
    const top=document.createElement("span");top.className="admin-chat-item-top";
    const name=document.createElement("strong");name.textContent=chat.name||"Visitatore";
    const status=document.createElement("em");status.className=chat.status==="closed"?"closed":"open";status.textContent=chat.status==="closed"?"CHIUSA":"● APERTA";top.append(name,status);
    const email=document.createElement("span");email.textContent=chat.email||"Email non disponibile";
    const preview=document.createElement("p");preview.textContent=chat.lastMessage||"Conversazione avviata";
    const time=document.createElement("small");time.className="admin-chat-time";time.textContent=chat.lastMessageAt?.toDate?chat.lastMessageAt.toDate().toLocaleString("it-IT",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short"}):"Nuova";
    button.append(top,email,preview,time);button.addEventListener("click",()=>openAdminChat(chat.id));list.append(button);
  });
}
function startChatList(){
  if(!currentUser)return;
  if(stopChatList)stopChatList();
  const list=$("#adminChatList");if(!list)return;
  list.innerHTML='<div class="empty-state">Connessione alle conversazioni…</div>';
  stopChatList=onSnapshot(query(collection(db,"chats"),orderBy("lastMessageAt","desc"),limit(100)),snap=>{
    cachedChats=snap.docs.map(s=>({id:s.id,...s.data()}));
    $("#chatCount").textContent=String(cachedChats.filter(c=>c.status!=="closed").length);
    renderChatList();
    if(selectedChatId&&!cachedChats.some(c=>c.id===selectedChatId)){selectedChatId=null;stopChatThread?.();stopChatThread=null;resetAdminThread();}
    else if(selectedChatId){const current=cachedChats.find(c=>c.id===selectedChatId);if(current)updateAdminThreadStatus(current);}
  },err=>{console.error(err);list.innerHTML='<div class="empty-state">Errore nel caricamento chat. Controlla le regole Firestore.</div>';});
}
function renderChatListSelection(){document.querySelectorAll(".admin-chat-item").forEach(button=>button.classList.toggle("active",button.dataset.chatId===selectedChatId));}
function updateAdminThreadStatus(chat){
  const head=$("#adminChatThreadHead"),details=head?.querySelector(".chat-thread-details"),statusButton=head?.querySelector(".chat-thread-status");
  if(details)details.textContent=`${chat.email||"Email non disponibile"} · ${chat.status==="closed"?"Conversazione chiusa":"Conversazione aperta"}`;
  if(statusButton)statusButton.textContent=chat.status==="closed"?"Riapri conversazione":"Chiudi conversazione";
  $("#adminChatReply").disabled=chat.status==="closed";$("#adminChatSend").disabled=chat.status==="closed";if($("#adminChatAttach"))$("#adminChatAttach").disabled=chat.status==="closed";
  if(chat.status==="closed")$("#adminChatFeedback").textContent="Questa conversazione è chiusa: riaprila per rispondere.";
  else if($("#adminChatFeedback").textContent.includes("conversazione è chiusa"))$("#adminChatFeedback").textContent="";
}
function resetAdminThread(){
  $("#adminChatThreadHead").replaceChildren();const title=document.createElement("strong");title.textContent="Seleziona una conversazione";const note=document.createElement("span");note.textContent="I nuovi messaggi appariranno in tempo reale.";$("#adminChatThreadHead").append(title,note);$("#adminChatMessages").replaceChildren();$("#adminChatReply").disabled=true;$("#adminChatSend").disabled=true;if($("#adminChatAttach"))$("#adminChatAttach").disabled=true;
}
function openAdminChat(id){
  selectedChatId=id;renderChatList();stopChatThread?.();
  const chat=cachedChats.find(c=>c.id===id);if(!chat)return;
  const head=$("#adminChatThreadHead");head.replaceChildren();const title=document.createElement("strong");title.textContent=chat.name||"Visitatore";const details=document.createElement("span");details.className="chat-thread-details";details.textContent=`${chat.email||"Email non disponibile"} · ${chat.status==="closed"?"Conversazione chiusa":"Conversazione aperta"}`;head.append(title,details);
  const statusButton=document.createElement("button");statusButton.type="button";statusButton.className="button secondary chat-thread-status";statusButton.textContent=chat.status==="closed"?"Riapri conversazione":"Chiudi conversazione";statusButton.addEventListener("click",async()=>{const latest=cachedChats.find(item=>item.id===id)||chat;try{await updateDoc(doc(db,"chats",id),{status:latest.status==="closed"?"open":"closed",updatedAt:serverTimestamp()});toast(latest.status==="closed"?"Conversazione riaperta.":"Conversazione chiusa.");}catch(e){console.error(e);toast("Impossibile aggiornare lo stato chat.");}});head.append(statusButton);
  updateAdminThreadStatus(chat);$("#adminChatReply").value="";updateAdminChatCount();
  stopChatThread=onSnapshot(query(collection(db,"chats",id,"messages"),orderBy("createdAt","asc")),snap=>{
    const box=$("#adminChatMessages");box.replaceChildren();if(snap.empty){const empty=document.createElement("p");empty.className="chat-thread-empty";empty.textContent="Nessun messaggio ancora. Invia una risposta per iniziare la conversazione.";box.append(empty);return;}
    snap.forEach(item=>{const d=item.data(),bubble=document.createElement("article");bubble.className=`admin-chat-message${d.senderRole==="admin"?" admin":""}`;const text=document.createElement("div");text.textContent=d.text||"";if(d.attachment)appendChatAttachment(text,d.attachment);const meta=document.createElement("small");meta.textContent=`${d.senderRole==="admin"?"Tu / Studio":(chat.name||"Visitatore")} · ${d.createdAt?.toDate?d.createdAt.toDate().toLocaleString("it-IT",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short"}):"ora"}`;bubble.append(text,meta);box.append(bubble);});box.scrollTop=box.scrollHeight;
  },err=>{console.error(err);$("#adminChatFeedback").textContent="Errore nel caricamento dei messaggi.";});
  if(!chat.status||chat.status!=="closed")$("#adminChatReply").focus();
}
function updateAdminChatCount(){const input=$("#adminChatReply"),counter=$("#adminChatCharCount");if(counter)counter.hidden=true;}
$("#adminChatSearch")?.addEventListener("input",renderChatList);
$("#adminChatFilter")?.addEventListener("change",renderChatList);
const adminReply=$("#adminChatReply");
adminReply?.addEventListener("input",()=>{adminReply.style.height="auto";adminReply.style.height=`${Math.min(adminReply.scrollHeight,150)}px`;updateAdminChatCount();});
adminReply?.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){event.preventDefault();$("#adminChatForm").requestSubmit();}});
const adminAttachmentInput=$("#adminChatAttachment"), adminAttachButton=$("#adminChatAttach"), adminPendingFile=$("#adminChatPendingFile");
adminAttachButton?.addEventListener("click",()=>adminAttachmentInput?.click());
adminAttachmentInput?.addEventListener("change",()=>{const file=adminAttachmentInput.files?.[0];if(adminPendingFile){adminPendingFile.hidden=!file;adminPendingFile.textContent=file?`📎 ${file.name} · ${(file.size/1024).toFixed(0)} KB`:"";}});
$("#adminChatForm")?.addEventListener("submit",async event=>{
  event.preventDefault();const input=$("#adminChatReply"),button=$("#adminChatSend"),file=adminAttachmentInput?.files?.[0],text=input.value.trim(),chatId=selectedChatId;if((!text&&!file)||!chatId||!currentUser||button.disabled)return;
  button.disabled=true;adminAttachButton.disabled=true;button.classList.add("is-sending");$("#adminChatFeedback").textContent=file?"Salvataggio locale allegato…":"Invio del messaggio…";
  try{let attachment=null;if(file)attachment=await uploadAdminChatAttachment(file,chatId,currentUser.uid,percent=>{$("#adminChatFeedback").textContent=`Salvataggio locale… ${percent}%`;});const messageText=text||(attachment?`Allegato: ${attachment.name}`:"");await addDoc(collection(db,"chats",chatId,"messages"),{text:messageText,senderRole:"admin",senderUid:currentUser.uid,senderName:currentUser.email||"Studio",createdAt:serverTimestamp(),...(attachment?{attachment}:{})});await updateDoc(doc(db,"chats",chatId),{lastMessage:messageText.slice(0,180),lastMessageAt:serverTimestamp(),status:"open"});input.value="";input.style.height="auto";if(adminAttachmentInput)adminAttachmentInput.value="";if(adminPendingFile){adminPendingFile.hidden=true;adminPendingFile.textContent="";}updateAdminChatCount();$("#adminChatFeedback").textContent="Risposta inviata in tempo reale.";}
  catch(err){console.error(err);$("#adminChatFeedback").textContent=err.message||"Invio non riuscito. Verifica la connessione e le regole Firestore.";}
  finally{button.classList.remove("is-sending");const chat=cachedChats.find(c=>c.id===chatId);button.disabled=!chat||chat.status==="closed";if(adminAttachButton)adminAttachButton.disabled=!chat||chat.status==="closed";input.focus();}
});

// Editor visivo controllato: salva soltanto le proprietà previste nello schema site/settings.
async function loadVisualEditor(){const form=$("#visualEditorForm");if(!form)return;try{const snap=await getDoc(doc(db,"site","settings")),d=snap.exists()?snap.data():{};for(const key of ["heroTitleLine1","heroTitleColor1","heroTitleLine2","heroTitleColor2","methodTitleLine1","methodTitleColor1","methodTitleLine2","methodTitleColor2","projectsTitleLine1","projectsTitleLine2","contactTitle","contactIntro","accentColor","cyanColor","backgroundColor","cursorStyle","announcement","customElementText","experienceValue","experienceLabel","workValue","workLabel","trustNote"]){if(form.elements[key])form.elements[key].value=d[key]??({heroTitleLine1:"Non seguo gli standard.",heroTitleColor1:"#f3f4f6",heroTitleLine2:"Li ridefinisco.",heroTitleColor2:"#b8ff65",methodTitleLine1:"Un’idea prende",methodTitleColor1:"#f3f4f6",methodTitleLine2:"forma, passo dopo passo.",methodTitleColor2:"#b8ff65",projectsTitleLine1:"Idee in prova.",projectsTitleLine2:"Soluzioni in costruzione.",experienceValue:"15+",experienceLabel:"ANNI DI ESPERIENZA",workValue:"200+",workLabel:"LAVORI CONCLUSI",trustNote:"Oltre 200 lavori portati a termine in totale autonomia, con attenzione alla qualità, alla cura dei dettagli e al risultato finale.",accentColor:"#b8ff65",cyanColor:"#75e7ff",backgroundColor:"#090b10",cursorStyle:"default"}[key]||"");}}catch(e){console.error(e);}}
$("#visualEditorForm")?.addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type="submit"]'),feedback=$("#visualEditorFeedback"),data={};for(const key of ["heroTitleLine1","heroTitleColor1","heroTitleLine2","heroTitleColor2","methodTitleLine1","methodTitleColor1","methodTitleLine2","methodTitleColor2","projectsTitleLine1","projectsTitleLine2","contactTitle","contactIntro","accentColor","cyanColor","backgroundColor","cursorStyle","announcement","customElementText","experienceValue","experienceLabel","workValue","workLabel","trustNote"])data[key]=String(form.elements[key]?.value??"").trim();button.disabled=true;feedback.textContent="Salvataggio…";try{await setDoc(doc(db,"site","settings"),data,{merge:true});feedback.textContent="Modifiche salvate. Ricarica il sito pubblico per visualizzarle.";toast("Editor visivo salvato.");}catch(err){console.error(err);feedback.textContent="Salvataggio non riuscito. Verifica le regole Firestore.";}finally{button.disabled=false;}});


// Editor esteso: indicizza i nodi testuali della pagina pubblica e salva override selettivi.
const contentEditorState = { entries: [], original: {}, draft: {} };
const contentExcluded = 'script,style,noscript,svg,canvas,video,audio,iframe,template,input,textarea,select,option,button,[contenteditable="true"],#liveChat,#objectControls,#preloader';
function cssPathForElement(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts=[]; let node=el;
  while(node && node.nodeType===1 && node.tagName.toLowerCase()!=='html') {
    if(node.id){parts.unshift(`#${CSS.escape(node.id)}`);break;}
    const tag=node.tagName.toLowerCase(); let index=1, sibling=node;
    while((sibling=sibling.previousElementSibling)) if(sibling.tagName===node.tagName) index++;
    parts.unshift(`${tag}:nth-of-type(${index})`); node=node.parentElement;
  }
  return parts.join(' > ');
}
function describeContentNode(el, text, selector) {
  const section=el.closest('section[id],header,footer,nav')?.id || el.closest('section[id]')?.id || 'pagina';
  return `Voce modificabile: “${text.slice(0,90)}${text.length>90?'…':''}”. Elemento HTML: <${el.tagName.toLowerCase()}>. Area: ${section}. Selettore tecnico: ${selector}. Modifica il testo mantenendo breve una voce di navigazione e conservando le informazioni essenziali. I cambiamenti vengono salvati in Firestore e applicati sul sito pubblico al prossimo caricamento. Per contenuti che includono icone o elementi annidati, questa voce è esclusa per evitare di rimuovere struttura o interazioni.`;
}
async function scanSiteContent() {
  const target=$('#contentEditorFields'), feedback=$('#contentEditorFeedback');
  target.innerHTML='<div class="empty-state">Scansione della pagina pubblica…</div>'; feedback.textContent='';
  try {
    const response=await fetch('./index.html',{cache:'no-store'}); if(!response.ok) throw new Error(`Pagina pubblica non raggiungibile (${response.status}).`);
    const html=await response.text(), parsed=new DOMParser().parseFromString(html,'text/html');
    const elements=[...parsed.body.querySelectorAll('h1,h2,h3,h4,p,a,span,small,strong,em,li,label,figcaption,blockquote,div')];
    const entries=[], seen=new Set();
    for(const el of elements){
      // Campi gestiti da impostazioni strutturate (es. heroSubtitle/contactEmail) non devono comparire anche nell'editor generico: due input diversi finirebbero per sovrascriversi.
      if(el.closest(contentExcluded)||el.children.length>0||el.hasAttribute('data-setting')||el.closest('[data-setting]')) continue;
      const text=(el.textContent||'').trim().replace(/\s+/g,' '); if(!text||text.length<2||text.length>1200) continue;
      const legacySelector=cssPathForElement(el); const stableId=el.getAttribute('data-cms-edit-id'); const selector=stableId ? `[data-cms-edit-id=\"${stableId}\"]` : legacySelector; if(!selector||seen.has(selector)) continue; seen.add(selector);
      // Avoid technical metadata and non-content dynamic status elements.
      if(/^(?:\d+|↗|↘|↑|↓|×|\+|⌘|S\/)$/u.test(text)) continue;
      const key=selector; entries.push({key,selector,legacySelector,text,tag:el.tagName.toLowerCase(),section:el.closest('section[id],header,footer,nav')?.id||'pagina',tooltip:describeContentNode(el,text,selector)});
    }
    const settingsSnap=await getDoc(doc(db,'site','settings')), saved=settingsSnap.exists()?(settingsSnap.data().contentOverrides||{}):{};
    contentEditorState.entries=entries; contentEditorState.original={...saved}; contentEditorState.draft={...saved};
    target.replaceChildren();
    const groups=new Map(); for(const entry of entries){const group=groups.get(entry.section)||[];group.push(entry);groups.set(entry.section,group);}
    for(const [section,items] of groups){const group=document.createElement('details');group.className='content-editor-group';group.open=section==='pagina'||section==='home';const summary=document.createElement('summary');summary.textContent=`${section.toUpperCase()} · ${items.length} voci`;group.append(summary);const grid=document.createElement('div');grid.className='content-editor-group-fields';
      for(const entry of items){const wrap=document.createElement('label');wrap.className='content-edit-field';wrap.title=entry.tooltip;const top=document.createElement('span');top.className='content-edit-label';top.textContent=`${entry.tag.toUpperCase()} · ${entry.text.slice(0,72)}${entry.text.length>72?'…':''}`;const help=document.createElement('span');help.className='content-edit-help';help.textContent=`Area: ${entry.section} · Selettore: ${entry.selector}`;help.title=entry.tooltip;const input=entry.text.length>100||entry.tag==='p'||entry.tag==='blockquote'?document.createElement('textarea'):document.createElement('input');if(input.tagName==='INPUT')input.type='text';input.value=Object.prototype.hasOwnProperty.call(saved,entry.key)?saved[entry.key]:(Object.prototype.hasOwnProperty.call(saved,entry.legacySelector)?saved[entry.legacySelector]:entry.text);input.dataset.contentKey=entry.key;input.title=entry.tooltip;input.setAttribute('aria-label',`Modifica testo: ${entry.text.slice(0,80)}`);input.addEventListener('input',()=>{contentEditorState.draft[entry.key]=input.value;wrap.classList.add('is-edited');});wrap.append(top,help,input);grid.append(wrap);}
      group.append(grid);target.append(group);
    }
    feedback.textContent=`Scansione completata: ${entries.length} voci testuali rilevate. Ogni campo include dettagli e istruzioni nel tooltip.`;
  } catch(error){console.error(error);target.innerHTML='<div class="empty-state">Impossibile leggere index.html. Avvia il sito tramite un server web e verifica che admin.html e index.html siano nella stessa cartella.</div>';feedback.textContent=error.message||'Scansione non riuscita.';}
}
$('#scanSiteContent')?.addEventListener('click',scanSiteContent);
$('#resetContentDraft')?.addEventListener('click',async()=>{
  const button=$('#resetContentDraft'),feedback=$('#contentEditorFeedback');
  if(!confirm('Ripristinare i testi originali presenti attualmente in index.html e rimuovere tutte le sovrascritture salvate?'))return;
  button.disabled=true;feedback.textContent='Ripristino dei contenuti predefiniti…';
  try{
    // Sovrascrive la mappa intera con una mappa vuota: non lascia chiavi obsolete in Firestore.
    await setDoc(doc(db,'site','settings'),{contentOverrides:{}},{merge:true});
    contentEditorState.original={};contentEditorState.draft={};
    await scanSiteContent();
    feedback.textContent='Ripristino completato: sono stati ripristinati i testi originali attuali del sito.';
    toast('Testi originali ripristinati.');
  }catch(error){console.error(error);feedback.textContent=`Ripristino non riuscito: ${error.message||'verifica le regole Firestore.'}`;}
  finally{button.disabled=false;}
});
$('#saveAllContent')?.addEventListener('click',async()=>{
  const button=$('#saveAllContent'),feedback=$('#contentEditorFeedback');
  button.disabled=true;feedback.textContent='Salvataggio dei contenuti…';
  try{
    const overrides={};
    // Legge i campi tramite dataset: CSS.escape non è corretto per confrontare il valore letterale di un attributo.
    const inputs=[...document.querySelectorAll('[data-content-key]')];
    for(const entry of contentEditorState.entries){
      const input=inputs.find(el=>el.dataset.contentKey===entry.key);
      if(!input)continue;
      const value=input.value;
      if(value!==entry.text)overrides[entry.key]=value;
    }
    const settingsRef=doc(db,'site','settings');
    await setDoc(settingsRef,{contentOverrides:overrides},{merge:true});
    // Verifica che la scrittura sia leggibile prima di dichiarare il successo.
    const verifySnap=await getDoc(settingsRef);
    const verified=verifySnap.exists()?(verifySnap.data().contentOverrides||{}):{};
    const expectedKeys=Object.keys(overrides).sort(), actualKeys=Object.keys(verified).sort(); if(expectedKeys.length!==actualKeys.length || expectedKeys.some((key,i)=>key!==actualKeys[i] || verified[key]!==overrides[key])) throw new Error('Verifica del salvataggio non riuscita.');
    contentEditorState.original={...overrides};contentEditorState.draft={...overrides};
    feedback.textContent=`Salvate e verificate ${Object.keys(overrides).length} modifiche. Ricarica il sito pubblico con Ctrl+F5 per visualizzarle.`;
    toast('Contenuti salvati e verificati.');
  }catch(error){console.error('CMS content save error:',error);feedback.textContent=`Salvataggio non riuscito: ${error.code||error.message||'verifica le regole Firestore.'}`;}
  finally{button.disabled=false;}
});

// Tooltip esplicativi anche per i campi già presenti in impostazioni e moduli record.
document.querySelectorAll('#admin-main label, .settings-form label, .record-fields label, #loginForm label').forEach(label=>{
  const field=label.querySelector('input,textarea,select'); if(!field)return;
  const labelText=(label.childNodes[0]?.textContent||label.textContent||field.name||field.id||'Campo').trim().replace(/\s+/g,' ');
  const name=field.name||field.id||'campo';
  const explanation=`Campo CMS “${labelText}”. Identificatore: ${name}. Modifica questo valore per aggiornare la proprietà corrispondente. Usa testo chiaro e conciso; per colori scegli un valore coerente con la palette del sito. La modifica viene salvata solo quando premi il pulsante Salva del relativo pannello.`;
  label.title=explanation; field.title=explanation;
});
