(function(){
"use strict";


const DEFAULT_ENDPOINT = "https://sentience-exe.onrender.com/chat/completions";
const LS_ENDPOINT      = "sentience_endpoint";
const LS_CONVOS        = "sentience_conversations";
const LS_ACTIVE        = "sentience_active_convo";
const LS_THEME         = "sentience_theme";
const TYPE_MS          = 13;
const DEV_MODE = new URLSearchParams(window.location.search).get("dev") === "1";



marked.setOptions({ breaks: true, gfm: true });

const savedTheme = localStorage.getItem(LS_THEME) || "dark";
document.documentElement.setAttribute("data-theme", savedTheme);
const themeToggle = document.getElementById("themeToggle");
const themeLabel  = document.getElementById("themeLabel");
const themeIcon   = document.getElementById("themeIcon");

function updateThemeBtn(){
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  themeLabel.textContent = isDark ? "light mode" : "dark mode";
  themeIcon.innerHTML = isDark
    ? '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>'
    : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
}
updateThemeBtn();
themeToggle.addEventListener("click", () => {
  const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem(LS_THEME, next);
  updateThemeBtn();
});

function getEndpoint(){ return localStorage.getItem(LS_ENDPOINT) || DEFAULT_ENDPOINT; }
function setEndpointStorage(u){ localStorage.setItem(LS_ENDPOINT, u); }
function loadConvos(){ try{ const r=localStorage.getItem(LS_CONVOS); return r?JSON.parse(r):[]; }catch{ return []; } }

function saveConvos(){
  const stripped = state.convos.map(c=>({
    ...c,
    messages: c.messages.map(m=>{
      if(!Array.isArray(m.content)) return m;
      return {
        ...m,
        content: m.content.map(p=>
          p.type==="image" ? {type:"image_expired"} : p
        )
      };
    })
  }));
  localStorage.setItem(LS_CONVOS, JSON.stringify(stripped));
}

function saveActiveId(){ localStorage.setItem(LS_ACTIVE, state.activeId||""); }
function uid(){ return Math.random().toString(36).slice(2,10)+Date.now().toString(36); }

const state = {
  convos: loadConvos(),
  activeId: localStorage.getItem(LS_ACTIVE)||null,
  editingIndex: null,
  inFlight: false,
  revealCancel: false,
  recognizing: false,
  pendingImage: null, // { base64: string, mimeType: string }
};

if(!state.convos.length){ createConversation(); }
else if(!state.convos.find(c=>c.id===state.activeId)){ state.activeId=state.convos[0].id; }
function activeConvo(){ return state.convos.find(c=>c.id===state.activeId); }
function createConversation(){
  const c={id:uid(),title:"New chat",messages:[],createdAt:Date.now()};
  state.convos.unshift(c); state.activeId=c.id;
  saveConvos(); saveActiveId(); return c;
}

const $=id=>document.getElementById(id);
const sidebar=$("sidebar"),sidebarScrim=$("sidebarScrim"),sidebarToggle=$("sidebarToggle");
const convoList=$("convoList"),newChatBtn=$("newChatBtn");
const chatInner=$("chatInner"),chatArea=$("chatArea");
const chatForm=$("chatForm"),messageInput=$("messageInput");
const sendBtn=$("sendBtn"),sendIcon=$("sendIcon"),stopIcon=$("stopIcon");
const errorMsg=$("errorMsg");
const convoTitleEl=$("convoTitle"),statusLine=$("statusLine"),statusDot=$("statusDot"),endpointLabel=$("endpointLabel");
const editBanner=$("editBanner"),cancelEditBtn=$("cancelEditBtn");
const exportBtn=$("exportBtn");
const settingsOpenBtn=$("settingsOpenBtn"),settingsModal=$("settingsModal"),settingsCloseBtn=$("settingsCloseBtn");
const settingsSaveBtn=$("settingsSaveBtn"),settingsResetBtn=$("settingsResetBtn"),endpointInput=$("endpointInput");
const micBtn=$("micBtn"),sttBanner=$("sttBanner");
const imgBtn=$("imgBtn"),imgInput=$("imgInput");
const imgPreviewWrap=$("imgPreviewWrap"),imgPreview=$("imgPreview"),imgClearBtn=$("imgClearBtn");

const cooldownBanner=$("cooldownBanner"),cooldownText=$("cooldownText");
let cooldownInterval=null;

function showCooldown(resetAtSeconds){
  cooldownBanner.classList.remove("hidden");
  messageInput.disabled=true; sendBtn.disabled=true;
  messageInput.placeholder="out of messages for now…";
  if(cooldownInterval) clearInterval(cooldownInterval);
  const tick=()=>{
    const secondsLeft=Math.max(0,Math.round(resetAtSeconds-Date.now()/1000));
    if(secondsLeft<=0){ hideCooldown(); return; }
    const mins=Math.floor(secondsLeft/60), secs=secondsLeft%60;
    cooldownText.textContent = mins>0 ? `out of messages — resets in ${mins}m ${secs}s` : `out of messages — resets in ${secs}s`;
  };
  tick();
  cooldownInterval=setInterval(tick,1000);
}

function hideCooldown(){
  if(cooldownInterval) clearInterval(cooldownInterval);
  cooldownInterval=null;
  cooldownBanner.classList.add("hidden");
  messageInput.disabled=false; sendBtn.disabled=false;
  messageInput.placeholder="say anything…";
}

function renderSidebar(){
  convoList.innerHTML="";
  state.convos.forEach(c=>{
    const item=document.createElement("div");
    item.className="sidebar-item group flex items-center gap-2 px-3 py-2 cursor-pointer text-xs mono"+(c.id===state.activeId?" active":"");
    item.style.color=c.id===state.activeId?"var(--text)":"var(--text-mute)";
    const label=document.createElement("span");
    label.className="truncate flex-1";
    label.textContent=c.title||"new chat";
    const del=document.createElement("button");
    del.className="opacity-0 group-hover:opacity-100 transition text-xs hover:opacity-60 shrink-0";
    del.style.color="var(--text-faint)";
    del.innerHTML="&times;";
    del.addEventListener("click",e=>{e.stopPropagation();deleteConversation(c.id);});
    item.appendChild(label); item.appendChild(del);
    item.addEventListener("click",()=>switchConversation(c.id));
    convoList.appendChild(item);
  });
}
function switchConversation(id){
  state.activeId=id; state.editingIndex=null; hideEditBanner();
  saveActiveId(); renderSidebar(); renderChat(); closeSidebarMobile();
}
function deleteConversation(id){
  const idx=state.convos.findIndex(c=>c.id===id);
  if(idx===-1)return;
  state.convos.splice(idx,1);
  if(!state.convos.length)createConversation();
  else if(state.activeId===id)state.activeId=state.convos[0].id;
  saveConvos(); saveActiveId(); renderSidebar(); renderChat();
}
newChatBtn.addEventListener("click",()=>{ createConversation(); renderSidebar(); renderChat(); closeSidebarMobile(); messageInput.focus(); });
function openSidebarMobile(){sidebar.classList.add("open");sidebarScrim.classList.add("open");}
function closeSidebarMobile(){sidebar.classList.remove("open");sidebarScrim.classList.remove("open");}
sidebarToggle.addEventListener("click",()=>sidebar.classList.contains("open")?closeSidebarMobile():openSidebarMobile());
sidebarScrim.addEventListener("click",closeSidebarMobile);

function mdToSafeHtml(text){ return DOMPurify.sanitize(marked.parse(text)); }
function formatTime(ts){ if(!ts)return""; return new Date(ts).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}); }

function renderChat(){
  const convo=activeConvo();
  chatInner.innerHTML="";
  convoTitleEl.textContent=convo.title||"sentience.exe";
  updateEndpointLabel();
  if(!convo.messages.length){
    chatInner.innerHTML=`<div id="emptyState" class="mt-20">
      <p class="mono text-xs mb-3" style="color:var(--text-faint);"><span style="color:var(--periwinkle);opacity:.6;">//</span> sentience.exe — register-adaptive AI</p>
      <p class="text-3xl font-semibold mb-2 tracking-tight" style="color:var(--text);">say something.</p>
      <p class="text-sm leading-relaxed" style="color:var(--text-mute);">AI gives everyone the same answer.<br>this gives you an answer that sounds like it's for you.</p>
    </div>`;
    return;
  }
  convo.messages.forEach((msg,idx)=>appendMessageGroup(msg.role,msg.content,msg.ts,idx));
  scrollToBottom(true);
}

function appendMessageGroup(role,content,ts,msgIndex) {
  document.getElementById("emptyState")?.remove();
  const isUser=role==="user";
  const row=document.createElement("div");
  row.className=`msg-row flex flex-col gap-1 ${isUser?"items-end":"items-start"}`;
  row.dataset.index=msgIndex;

  if(isUser){
    
    const bubbleWrap=document.createElement("div");
    bubbleWrap.className="flex flex-col gap-1 max-w-[80%]";

    const isMultipart=Array.isArray(content);
    const textContent=isMultipart?content.find(p=>p.type==="text")?.text||"":content;
    const imagePart=isMultipart?content.find(p=>p.type==="image"):null;

    if(imagePart && imagePart.type !== "image_expired"){
      const imgEl=document.createElement("img");
      imgEl.src=`data:${imagePart.media_type};base64,${imagePart.data}`;
      imgEl.className="rounded-xl bubble-in";
      imgEl.style.cssText="max-width:100%;border:1px solid var(--border);";
      bubbleWrap.appendChild(imgEl);
    } else if(imagePart && imagePart.type === "image_expired"){
      const placeholder=document.createElement("div");
      placeholder.className="rounded-xl bubble-in";
      placeholder.style.cssText="width:100%;height:48px;background:var(--surface-2);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;";
      placeholder.innerHTML=`<span style="color:var(--text-faint);font-size:.7rem;" class="mono">image not stored</span>`;
      bubbleWrap.appendChild(placeholder);
    }

    if(textContent){
      const fragments=textContent.split("\n").filter(f=>f.trim().length>0);
      fragments.forEach(frag=>{
        const bubble=document.createElement("div");
        bubble.className="bubble-in user-bubble";
        bubble.textContent=frag;
        bubbleWrap.appendChild(bubble);
      });
    }

    row.appendChild(bubbleWrap);
  } else {
    const frags=content.split("\n").filter(f=>f.trim().length>0);
    frags.forEach(frag=>{
      const wrap=document.createElement("div");
      wrap.className="bubble-in bot-bubble prose-bot max-w-[80%]";
      wrap.innerHTML=mdToSafeHtml(frag);
      row.appendChild(wrap);
    });
  }

  const meta=document.createElement("div");
  meta.className=`msg-actions flex items-center gap-2 px-1 mt-0.5 ${isUser?"flex-row-reverse":""}`;
  meta.innerHTML=`<span class="mono text-[10px]" style="color:var(--text-faint);">${formatTime(ts)}</span>`;
  const copyBtn=document.createElement("button");
  copyBtn.className="text-[10px] mono hover:underline"; copyBtn.style.color="var(--text-faint)"; copyBtn.textContent="copy";
  copyBtn.addEventListener("click",()=>{ const copyText=Array.isArray(content)?content.find(p=>p.type==="text")?.text||"":content;
  navigator.clipboard?.writeText(copyText); copyBtn.textContent="copied"; setTimeout(()=>copyBtn.textContent="copy",1200); });
  meta.appendChild(copyBtn);
  if(isUser){
    const editBtn=document.createElement("button");
    editBtn.className="text-[10px] mono hover:underline"; editBtn.style.color="var(--text-faint)"; editBtn.textContent="edit";
    editBtn.addEventListener("click",()=>startEdit(msgIndex));
    meta.appendChild(editBtn);
  } else {
    const convoNow=activeConvo();
    let lastAiIdx=-1;
    for(let i=convoNow.messages.length-1;i>=0;i--){ if(convoNow.messages[i].role==="assistant"){lastAiIdx=i;break;} }
    if(lastAiIdx===msgIndex){
      const regenBtn=document.createElement("button");
      regenBtn.className="text-[10px] mono hover:underline"; regenBtn.style.color="var(--text-faint)"; regenBtn.textContent="regen";
      regenBtn.addEventListener("click",regenerateLast);
      meta.appendChild(regenBtn);
    }
  }
  row.appendChild(meta);
  chatInner.appendChild(row);

  return row;

}

function scrollToBottom(force=false){
  const near=chatArea.scrollHeight-chatArea.scrollTop-chatArea.clientHeight<120;
  if(force||near) chatArea.scrollTop=chatArea.scrollHeight;
}

function showTypingIndicator(){
  const w=document.createElement("div");
  w.id="typingIndicator"; w.className="flex items-start bubble-in";
  w.innerHTML=`<div class="bot-bubble flex gap-1.5 items-center" style="padding:11px 16px;">
    <span class="dot"></span><span class="dot"></span><span class="dot"></span>
  </div>`;
  chatInner.appendChild(w); scrollToBottom(true);
}
function removeTypingIndicator(){ $("typingIndicator")?.remove(); }

function updateEndpointLabel(){
  try{ const u=new URL(getEndpoint()); endpointLabel.textContent=u.host; }catch{ endpointLabel.textContent=getEndpoint(); }
}
function setStatus(text,color){
  statusLine.innerHTML=`${text} · <span id="endpointLabel">${endpointLabel.textContent}</span>`;
  if(color) statusDot.style.background=color;
}

function showError(t){ errorMsg.textContent=t; errorMsg.classList.remove("hidden"); }
function hideError(){ errorMsg.classList.add("hidden"); }

async function sendToBackend(msgs) {
  const payload = msgs.map(({ role, content }) => ({ role, content }));
  const res = await fetch(getEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sentience", messages: payload, dev_mode: DEV_MODE }),
  });
 
  const data = await res.json();
 
  if (res.status === 429 && data?.error?.type === "rate_limited") {
    const err = new Error("rate_limited");
    err.isRateLimit = true;
    err.resetAt = data.error.reset_at;
    throw err;
  }
 
  if (!res.ok) throw new Error(`Server ${res.status}: ${res.statusText}`);
 
  const reply = data?.choices?.[0]?.message?.content;
  if (typeof reply !== "string") throw new Error("Unexpected response shape.");
 
  return { reply, fellBack: !!data?.meta?.fell_back, usedModel: data?.meta?.used_model };
}

async function revealReply(content,msgIndex){
  document.getElementById("emptyState")?.remove();
  const row=document.createElement("div");
  row.className="msg-row flex flex-col gap-1 items-start"; row.dataset.index=msgIndex;
  chatInner.appendChild(row);
  const frags=content.split("\n").filter(f=>f.trim().length>0);
  for(const frag of frags){
    if(state.revealCancel) break;
    const wrap=document.createElement("div");
    wrap.className="bubble-in bot-bubble prose-bot max-w-[80%]";
    row.appendChild(wrap);
    scrollToBottom();
    let shown="";
    for(const ch of frag){
      if(state.revealCancel){shown=frag;break;}
      shown+=ch;
      wrap.textContent=shown;
      scrollToBottom();
      await new Promise(r=>setTimeout(r,TYPE_MS));
    }
    wrap.innerHTML=mdToSafeHtml(shown);
    scrollToBottom();
    if(!state.revealCancel) await new Promise(r=>setTimeout(r,120));
  }
  if(state.revealCancel){
    row.querySelectorAll(".bot-bubble").forEach(b=>b.remove());
    const frags2=content.split("\n").filter(f=>f.trim().length>0);
    frags2.forEach(frag=>{
      const wrap=document.createElement("div");
      wrap.className="bot-bubble prose-bot max-w-[80%]";
      wrap.innerHTML=mdToSafeHtml(frag);
      row.appendChild(wrap);
    });
  }

  const meta=document.createElement("div"); meta.className="msg-actions flex items-center gap-2 px-1 mt-0.5";
  meta.innerHTML=`<span class="mono text-[10px]" style="color:var(--text-faint);">${formatTime(Date.now())}</span>`;
  const copyBtn=document.createElement("button"); copyBtn.className="text-[10px] mono hover:underline"; copyBtn.style.color="var(--text-faint)"; copyBtn.textContent="copy";
  copyBtn.addEventListener("click",()=>{ navigator.clipboard?.writeText(content); copyBtn.textContent="copied"; setTimeout(()=>copyBtn.textContent="copy",1200); });
  const regenBtn=document.createElement("button"); regenBtn.className="text-[10px] mono hover:underline"; regenBtn.style.color="var(--text-faint)"; regenBtn.textContent="regen";
  regenBtn.addEventListener("click",regenerateLast);
  meta.appendChild(copyBtn); meta.appendChild(regenBtn); row.appendChild(meta);
  state.revealCancel=false;
}

function setInFlight(v){
  state.inFlight=v;
  sendIcon.classList.toggle("hidden",v); stopIcon.classList.toggle("hidden",!v);
  sendBtn.disabled=false;
}
function maybeSetTitle(convo,text){ if(convo.title==="New chat") convo.title=text.slice(0,42)+(text.length>42?"…":""); }

async function runExchange(convo) {
  hideError();
  setInFlight(true);
  setStatus("thinking…", "var(--sage)");
  showTypingIndicator();
  try {
    const { reply, fellBack } = await sendToBackend(convo.messages);
    removeTypingIndicator();
 
    const replyMsg = { role: "assistant", content: reply, ts: Date.now() };
    convo.messages.push(replyMsg);
    saveConvos();
    await revealReply(reply, convo.messages.length - 1);
 
    // quiet status-line note only, never a chat bubble — persona shouldn't announce this
    setStatus(fellBack ? "idle (backup model)" : "idle (primary model)", "var(--periwinkle)");
  } catch (err) {
    removeTypingIndicator();
 
    if (err.isRateLimit) {
      // nothing gets added to chat history — this exchange never happened
      showCooldown(err.resetAt);
      setStatus("cooling down", "var(--blush)");
    } else {
      showError(`couldn't reach backend (${err.message}). check endpoint settings.`);
      setStatus("error", "var(--blush)");
      convo.messages.pop();
      saveConvos();
      renderChat();
    }
  } finally {
    setInFlight(false);
    if (!messageInput.disabled) messageInput.focus();
  }
}

chatForm.addEventListener("submit",async e=>{
  e.preventDefault();
  if(state.inFlight){ state.revealCancel=true; return; }
  const text=messageInput.value.trim();
  if(!text)return;
  const convo=activeConvo();
  if(state.editingIndex!==null){
    convo.messages=convo.messages.slice(0,state.editingIndex);
    
    const editContent = state.pendingImage
      ? [
          {type:"image", data:state.pendingImage.base64, media_type:state.pendingImage.mimeType},
          {type:"text", text}
        ]
      : text;
    convo.messages.push({role:"user",content:editContent,ts:Date.now()});
    clearImagePreview();

    maybeSetTitle(convo,text); state.editingIndex=null; hideEditBanner();
    saveConvos(); renderSidebar(); renderChat();
  } else {
    
    const msgContent = state.pendingImage
    ? [
        {type:"image", data:state.pendingImage.base64, media_type:state.pendingImage.mimeType},
        {type:"text", text}
      ]
    : text;
    
    const userMsg={role:"user",content:msgContent,ts:Date.now()};


    convo.messages.push(userMsg); maybeSetTitle(convo,text);
    saveConvos(); renderSidebar();
    appendMessageGroup("user",msgContent,userMsg.ts,convo.messages.length-1);
    scrollToBottom(true);
  }
  
  messageInput.value=""; messageInput.style.height="auto";

  clearImagePreview();

  await runExchange(convo);
});

function regenerateLast(){
  if(state.inFlight)return;
  const convo=activeConvo();
  while(convo.messages.length&&convo.messages[convo.messages.length-1].role==="assistant") convo.messages.pop();
  saveConvos(); renderChat(); runExchange(convo);
}
function startEdit(idx){

  const msg=activeConvo().messages[idx];
  if(!msg||msg.role!=="user")return;
  state.editingIndex=idx;
  
  const textContent=Array.isArray(msg.content)
    ? msg.content.find(p=>p.type==="text")?.text||""
    : msg.content;
  
  messageInput.value=textContent;
}

function hideEditBanner(){ editBanner.classList.add("hidden"); }
cancelEditBtn.addEventListener("click",()=>{ state.editingIndex=null; messageInput.value=""; hideEditBanner(); });

messageInput.addEventListener("input",()=>{ messageInput.style.height="auto"; messageInput.style.height=Math.min(messageInput.scrollHeight,160)+"px"; });
messageInput.addEventListener("keydown",e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();chatForm.requestSubmit();} });
document.addEventListener("keydown",e=>{
  if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==="k"){ e.preventDefault(); createConversation(); renderSidebar(); renderChat(); messageInput.focus(); }
  if(e.key==="Escape") closeSettings();
});

const SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
let recognition=null;
if(SpeechRecognition){
  recognition=new SpeechRecognition();
  recognition.continuous=false;
  recognition.interimResults=true;
  recognition.lang="en-IN";
  recognition.onstart=()=>{
    state.recognizing=true;
    micBtn.classList.add("mic-active");
    micBtn.style.background="var(--periwinkle)";
    micBtn.style.color="#0d1510";
    micBtn.style.borderColor="transparent";
    sttBanner.classList.remove("hidden");
  };
  recognition.onend=()=>{
    state.recognizing=false;
    micBtn.classList.remove("mic-active");
    micBtn.style.background="transparent";
    micBtn.style.color="var(--text-mute)";
    micBtn.style.borderColor="var(--border)";
    sttBanner.classList.add("hidden");
  };
  recognition.onerror=()=>{ recognition.stop(); };
  recognition.onresult=e=>{
    let transcript="";
    for(let i=e.resultIndex;i<e.results.length;i++) transcript+=e.results[i][0].transcript;
    messageInput.value=transcript;
    messageInput.style.height="auto";
    messageInput.style.height=Math.min(messageInput.scrollHeight,160)+"px";
    if(e.results[e.results.length-1].isFinal){ recognition.stop(); }
  };
  micBtn.addEventListener("click",()=>{
    if(state.recognizing){ recognition.stop(); }
    else { try{ recognition.start(); }catch(err){ console.warn("STT error:",err); } }
  });
} else {
  micBtn.title="Voice input not supported in this browser";
  micBtn.style.opacity="0.35";
  micBtn.disabled=true;
}

function setImagePreview(base64, mimeType){
  state.pendingImage={base64, mimeType};
  imgPreview.src=`data:${mimeType};base64,${base64}`;
  imgPreviewWrap.classList.remove("hidden");
}

function clearImagePreview(){
  state.pendingImage=null;
  imgPreview.src="";
  imgPreviewWrap.classList.add("hidden");
  imgInput.value="";
}

imgBtn.addEventListener("click",()=>imgInput.click());

imgInput.addEventListener("change",()=>{
  const file=imgInput.files[0];
  if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const base64=e.target.result.split(",")[1];
    setImagePreview(base64, file.type);
  };
  reader.readAsDataURL(file);
});

imgClearBtn.addEventListener("click",clearImagePreview);

messageInput.addEventListener("paste",e=>{
  const items=[...(e.clipboardData?.items||[])];
  const imageItem=items.find(item=>item.type.startsWith("image/"));
  if(!imageItem)return;
  e.preventDefault();
  const file=imageItem.getAsFile();
  const reader=new FileReader();
  reader.onload=ev=>{
    const base64=ev.target.result.split(",")[1];
    setImagePreview(base64, file.type);
  };
  reader.readAsDataURL(file);
});

exportBtn.addEventListener("click",()=>{
  const convo=activeConvo();
  const blob=new Blob([JSON.stringify({model:"sentience",title:convo.title,messages:convo.messages.map(({role,content})=>({role,content}))},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob); const a=document.createElement("a");
  a.href=url; a.download=`${(convo.title||"conversation").replace(/[^a-z0-9]+/gi,"-").toLowerCase()}.json`;
  a.click(); URL.revokeObjectURL(url);
});

function openSettings(){ endpointInput.value=getEndpoint(); settingsModal.classList.remove("hidden"); }
function closeSettings(){ settingsModal.classList.add("hidden"); }
settingsOpenBtn.addEventListener("click",openSettings);
settingsCloseBtn.addEventListener("click",closeSettings);
settingsModal.addEventListener("click",e=>{ if(e.target===settingsModal)closeSettings(); });
settingsSaveBtn.addEventListener("click",()=>{ const v=endpointInput.value.trim(); if(v){setEndpointStorage(v);updateEndpointLabel();setStatus("idle","var(--periwinkle)");} closeSettings(); });
settingsResetBtn.addEventListener("click",()=>{ setEndpointStorage(DEFAULT_ENDPOINT); endpointInput.value=DEFAULT_ENDPOINT; updateEndpointLabel(); });

renderSidebar(); renderChat(); updateEndpointLabel(); setStatus("idle","var(--periwinkle)"); messageInput.focus();
})();