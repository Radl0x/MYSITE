import { auth, db } from "./firebase.js";
import { saveLocalAttachment, getLocalAttachmentUrl } from "./local-attachments.js";
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
const $ = (s, r=document) => r.querySelector(s);
async function uploadChatAttachment(file, chatId, uid, onProgress = () => {}) {
  onProgress(10);
  const attachment = await saveLocalAttachment(file, chatId, uid);
  onProgress(100);
  return attachment;
}
function ensureMediaModal(){let modal=document.getElementById("chatMediaModal");if(modal)return modal;modal=document.createElement("div");modal.id="chatMediaModal";modal.className="chat-media-modal";modal.hidden=true;modal.innerHTML='<button type="button" class="chat-media-close" aria-label="Chiudi anteprima">×</button><div class="chat-media-stage"></div>';document.body.append(modal);const close=()=>{modal.hidden=true;const stage=modal.querySelector(".chat-media-stage");stage.querySelectorAll("video").forEach(v=>v.pause());stage.replaceChildren();};modal.querySelector(".chat-media-close").addEventListener("click",close);modal.addEventListener("click",e=>{if(e.target===modal)close();});document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modal.hidden)close();});return modal;}
function appendAttachment(container, attachment) { if(!attachment?.id)return; const button=document.createElement("button");button.type="button";button.className="chat-media-preview";button.textContent="Apro anteprima…";button.addEventListener("click",async()=>{try{const item=await getLocalAttachmentUrl(attachment.id);const modal=ensureMediaModal(),stage=modal.querySelector(".chat-media-stage");stage.replaceChildren();const media=item.type.startsWith("video/")?document.createElement("video"):document.createElement("img");media.src=item.url;media.alt=item.name;media.className="chat-media-fullscreen";if(media.tagName==="VIDEO"){media.controls=true;media.autoplay=true;media.playsInline=true;}stage.append(media);modal.hidden=false;}catch(error){alert(error.message||"Anteprima non disponibile su questo dispositivo.");}});getLocalAttachmentUrl(attachment.id).then(item=>{const media=item.type.startsWith("video/")?document.createElement("video"):document.createElement("img");media.src=item.url;media.alt=item.name;media.className="chat-media-thumb";if(media.tagName==="VIDEO"){media.muted=true;media.playsInline=true;media.preload="metadata";}button.replaceChildren(media);const label=document.createElement("span");label.textContent="Apri a schermo intero ↗";button.append(label);}).catch(()=>{button.textContent=`Anteprima locale · ${attachment.name||"file"}`;});container.append(button); }

const toggle=$("#liveChatToggle"), panel=$("#liveChatPanel"), close=$("#liveChatClose"), startForm=$("#liveChatStartForm"), messageForm=$("#liveChatMessageForm");
if (toggle && panel && startForm && messageForm) {
  let chatId=localStorage.getItem("studio-live-chat-id")||"", stopMessages=null, stopChatStatus=null, sending=false, unreadCount=0, firstMessageSnapshot=true, conversationClosed=false, forceBottomAfterSend=false;
  const setError=(id,text)=>{const el=$(id);if(el)el.textContent=text||"";};
  const badge=document.createElement("span");badge.className="chat-unread-badge";badge.hidden=true;badge.setAttribute("aria-label","Nuovi messaggi");toggle.append(badge);
  const toast=document.createElement("div");toast.className="chat-incoming-toast";toast.hidden=true;toast.setAttribute("role","status");toast.setAttribute("aria-live","polite");toast.innerHTML='<span class="chat-incoming-dot"></span><span class="chat-incoming-copy"><strong>Nuovo messaggio</strong><small>Hai ricevuto una risposta dallo Studio.</small></span><button type="button" aria-label="Apri messaggio">Apri ↗</button>';
  $("#liveChat").append(toast);toast.querySelector("button").addEventListener("click",()=>open(true));
  function updateUnread(){badge.hidden=unreadCount===0;badge.textContent=unreadCount>9?"9+":String(unreadCount);toggle.classList.toggle("has-unread",unreadCount>0);toggle.setAttribute("aria-label",unreadCount?`Apri chat, ${unreadCount} nuovi messaggi`:(panel.hidden?"Apri chat":"Chiudi chat"));}
  function clearUnread(){unreadCount=0;updateUnread();toast.hidden=true;}
  function notifyIncoming(message){unreadCount++;updateUnread();toast.querySelector("small").textContent=message.length>70?`${message.slice(0,67)}…`:message;toast.hidden=false;toast.classList.remove("chat-toast-in");void toast.offsetWidth;toast.classList.add("chat-toast-in");if("Notification" in window&&Notification.permission==="granted"&&document.hidden){const notification=new Notification("Nuovo messaggio · Studio",{body:message.slice(0,140),tag:`studio-chat-${chatId}`});notification.onclick=()=>{window.focus();open(true);notification.close();};}}
  const open=(value)=>{panel.hidden=!value;toggle.setAttribute("aria-expanded",String(value));if(value){clearUnread();if(chatId)restoreChat();else startForm.querySelector('input[name="name"]').focus();}};
  toggle.addEventListener("click",()=>open(panel.hidden)); close?.addEventListener("click",()=>open(false));
  function showNewRequestAfterClose(){
    conversationClosed=true;
    if(stopMessages){stopMessages();stopMessages=null;}
    if(stopChatStatus){stopChatStatus();stopChatStatus=null;}
    chatId="";localStorage.removeItem("studio-live-chat-id");
    $("#liveChatConversation").hidden=true;$("#liveChatStart").hidden=false;
    $("#liveChatMessages")?.replaceChildren();
    const messageInput=$("#liveChatMessage");if(messageInput)messageInput.value="";
    if(attachmentInput)attachmentInput.value="";
    if(pendingFile){pendingFile.hidden=true;pendingFile.textContent="";}
    messageForm.querySelectorAll("input,textarea,button").forEach(el=>{el.disabled=true;});
    startForm.querySelectorAll("input,button").forEach(el=>{el.disabled=false;});
    setError("#liveChatStartFeedback","Questa conversazione è stata chiusa dallo Studio. Puoi inviare una nuova richiesta qui sotto.");
    setError("#liveChatMessageFeedback","");
  }
  function watchChatStatus(id){
    if(stopChatStatus)stopChatStatus();
    stopChatStatus=onSnapshot(doc(db,"chats",id),snap=>{
      if(!snap.exists()){showNewRequestAfterClose();return;}
      const data=snap.data();
      if(data.participantUid!==auth.currentUser?.uid)return;
      if(data.status==="closed"){showNewRequestAfterClose();return;}
      conversationClosed=false;
      messageForm.querySelectorAll("input,textarea,button").forEach(el=>{el.disabled=false;});
    },err=>console.warn("Stato chat non disponibile",err));
  }
  function renderMessages(snap,forceBottom=false){const box=$("#liveChatMessages");const wasNearBottom=box.scrollHeight-box.scrollTop-box.clientHeight<90;box.replaceChildren();if(snap.empty){const note=document.createElement("p");note.className="chat-system-note";note.textContent="Conversazione avviata. Scrivi pure il tuo messaggio.";box.append(note);}snap.forEach(item=>{const d=item.data(),bubble=document.createElement("article");bubble.className=`chat-message${d.senderRole==="visitor"?" mine":""}`;const text=document.createElement("div");text.textContent=d.text||"";if(d.attachment)appendAttachment(text,d.attachment);const meta=document.createElement("small");meta.className="chat-message-meta";meta.textContent=`${d.senderRole==="visitor"?"Tu":"Studio"} · ${d.createdAt?.toDate?d.createdAt.toDate().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}):"ora"}`;bubble.append(text,meta);box.append(bubble);});if(forceBottom||wasNearBottom)requestAnimationFrame(()=>{box.scrollTop=box.scrollHeight;});}
  function attachMessages(id){if(stopMessages)stopMessages();firstMessageSnapshot=true;stopMessages=onSnapshot(query(collection(db,"chats",id,"messages"),orderBy("createdAt","asc")),snap=>{const isInitialSnapshot=firstMessageSnapshot;if(!isInitialSnapshot){snap.docChanges().forEach(change=>{if(change.type==="added"&&change.doc.data().senderRole==="admin"&&panel.hidden)notifyIncoming(change.doc.data().text||"Hai ricevuto un nuovo messaggio.");});}firstMessageSnapshot=false;const forceBottom=isInitialSnapshot||forceBottomAfterSend;forceBottomAfterSend=false;renderMessages(snap,forceBottom);},err=>{console.error(err);setError("#liveChatMessageFeedback","Connessione chat interrotta. Riapri la pagina e riprova.");});}
  async function restoreChat(){try{if(!auth.currentUser)return;const snap=await getDoc(doc(db,"chats",chatId));if(!snap.exists()||snap.data().participantUid!==auth.currentUser.uid){chatId="";localStorage.removeItem("studio-live-chat-id");$("#liveChatStart").hidden=false;$("#liveChatConversation").hidden=true;return;}if(snap.data().status==="closed"){showNewRequestAfterClose();return;}$("#liveChatStart").hidden=true;$("#liveChatConversation").hidden=false;attachMessages(chatId);watchChatStatus(chatId);}catch(err){console.warn("Ripristino chat non riuscito",err);}}
  startForm.addEventListener("submit",async event=>{event.preventDefault();if(sending)return;const button=startForm.querySelector("button[type=submit]"),data=new FormData(startForm),name=String(data.get("name")||"").trim(),email=String(data.get("email")||"").trim();if(name.length<2||!email.includes("@")){setError("#liveChatStartFeedback","Inserisci nome ed email validi.");return;}sending=true;button.disabled=true;button.textContent="Connessione sicura…";setError("#liveChatStartFeedback","");
    try{if(!auth.currentUser)await signInAnonymously(auth);const existing=localStorage.getItem("studio-live-chat-id");if(existing){const old=await getDoc(doc(db,"chats",existing));if(old.exists()&&old.data().participantUid===auth.currentUser.uid&&old.data().status!=="closed"){chatId=existing;conversationClosed=false;$("#liveChatStart").hidden=true;$("#liveChatConversation").hidden=false;attachMessages(chatId);watchChatStatus(chatId);return;}localStorage.removeItem("studio-live-chat-id");chatId="";}
      const ref=await addDoc(collection(db,"chats"),{name,email,participantUid:auth.currentUser.uid,status:"open",createdAt:serverTimestamp(),lastMessage:"Conversazione avviata",lastMessageAt:serverTimestamp()});chatId=ref.id;conversationClosed=false;localStorage.setItem("studio-live-chat-id",chatId);$("#liveChatStart").hidden=true;$("#liveChatConversation").hidden=false;attachMessages(chatId);watchChatStatus(chatId);$("#liveChatMessage").focus();
    }catch(err){console.error(err);setError("#liveChatStartFeedback",err.code==="auth/operation-not-allowed"?"Attiva Anonymous Authentication in Firebase Authentication.":"Non riesco ad avviare la chat. Verifica connessione e regole Firestore.");}finally{sending=false;button.disabled=false;button.innerHTML='Avvia conversazione <span>↗</span>';}
  });
  const attachmentInput=$("#liveChatAttachment"), attachButton=$("#liveChatAttach"), pendingFile=$("#liveChatPendingFile");
  attachButton?.addEventListener("click",()=>attachmentInput?.click());
  attachmentInput?.addEventListener("change",()=>{const file=attachmentInput.files?.[0];pendingFile.hidden=!file;pendingFile.textContent=file?`📎 ${file.name} · ${(file.size/1024).toFixed(0)} KB`:"";});
  messageForm.addEventListener("submit",async event=>{event.preventDefault();const input=$("#liveChatMessage"),button=messageForm.querySelector('button[type="submit"]'),file=attachmentInput?.files?.[0],text=input.value.trim();if((!text&&!file)||!chatId||sending||conversationClosed)return;sending=true;button.disabled=true;attachButton.disabled=true;button.classList.add("is-sending");setError("#liveChatMessageFeedback","");try{const user=auth.currentUser;if(!user)throw new Error("Sessione chat scaduta");const chatSnap=await getDoc(doc(db,"chats",chatId));if(!chatSnap.exists()||chatSnap.data().status==="closed"){showNewRequestAfterClose();return;}let attachment=null;if(file){setError("#liveChatMessageFeedback","Salvataggio locale allegato…");attachment=await uploadChatAttachment(file,chatId,user.uid,percent=>setError("#liveChatMessageFeedback",`Salvataggio locale… ${percent}%`));}const messageText=text||(attachment?`Allegato: ${attachment.name}`:"");forceBottomAfterSend=true;await addDoc(collection(db,"chats",chatId,"messages"),{text:messageText,senderRole:"visitor",senderUid:user.uid,senderName:"Visitatore",createdAt:serverTimestamp(),...(attachment?{attachment}:{})});await updateDoc(doc(db,"chats",chatId),{lastMessage:messageText.slice(0,180),lastMessageAt:serverTimestamp()});input.value="";input.style.height="auto";if(attachmentInput)attachmentInput.value="";if(pendingFile){pendingFile.hidden=true;pendingFile.textContent="";}updateComposerCount();requestAnimationFrame(()=>{const messages=$("#liveChatMessages");if(messages)messages.scrollTop=messages.scrollHeight;});}catch(err){forceBottomAfterSend=false;console.error(err);setError("#liveChatMessageFeedback",err.message||"Messaggio non inviato. Controlla la connessione e riprova.");}finally{sending=false;button.disabled=conversationClosed;attachButton.disabled=conversationClosed;button.classList.remove("is-sending");if(!conversationClosed)input.focus();}});
  const textarea=$("#liveChatMessage");
  function updateComposerCount(){}
  textarea?.addEventListener("input",()=>{textarea.style.height="auto";textarea.style.height=`${Math.min(textarea.scrollHeight,140)}px`;updateComposerCount();});
  textarea?.addEventListener("keydown",event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.isComposing){event.preventDefault();messageForm.requestSubmit();}});
  onAuthStateChanged(auth, user => { if(user && chatId) restoreChat(); });
}
