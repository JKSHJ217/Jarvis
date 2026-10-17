(() => {
  const $ = (id) => document.getElementById(id);
  const chat = $("chat"), form = $("chatForm"), prompt = $("prompt");
  let speechOn = true;
  const memoryKey = "jarvisLiteMemoryV1";
  const consentKey = "jarvisLiteMemoryConsentV1";
  $("memoryConsent").checked = localStorage.getItem(consentKey) === "yes";

  function say(text, who="bot") {
    const el = document.createElement("div");
    el.className = "msg " + who;
    el.textContent = text;
    chat.appendChild(el);
    chat.scrollTop = chat.scrollHeight;
  }
  function speak(text) {
    if (!speechOn || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "ru-RU";
    window.speechSynthesis.speak(utter);
  }
  function reply(text) { say(text); speak(text); }

  function readMemory() {
    try { return JSON.parse(localStorage.getItem(memoryKey) || "[]"); }
    catch { return []; }
  }
  function saveMemory(item) {
    if (localStorage.getItem(consentKey) !== "yes") {
      reply("Сначала включи согласие на сохранение памяти в панели справа.");
      return false;
    }
    const items = readMemory();
    items.push({text:item, createdAt:new Date().toISOString()});
    localStorage.setItem(memoryKey, JSON.stringify(items.slice(-100)));
    reply("Сохранил заметку в памяти этого браузера.");
    return true;
  }
  function openAllowed(url, label) {
    if (confirm(`Открыть ${label} в новой вкладке?`)) {
      window.open(url, "_blank", "noopener,noreferrer");
      reply(`Открыл ${label}.`);
    } else reply("Не открываю сайт без подтверждения.");
  }
  function handle(raw) {
    const t = raw.trim();
    const lower = t.toLowerCase();
    if (!t) return;
    say(t, "user");

    if (/который час|сколько времени|текущее время/.test(lower)) {
      reply("Сейчас " + new Date().toLocaleTimeString("ru-RU", {hour:"2-digit",minute:"2-digit"}) + ".");
    } else if (lower.startsWith("создай заметку ")) {
      saveMemory(t.slice("создай заметку ".length).trim());
    } else if (/покажи память|что в памяти/.test(lower)) {
      const items = readMemory();
      reply(items.length ? "Твои заметки:\n" + items.map((x,i)=>`${i+1}. ${x.text}`).join("\n") : "Память пустая.");
    } else if (/открой youtube/.test(lower)) {
      openAllowed("https://www.youtube.com", "YouTube");
    } else if (/открой github/.test(lower)) {
      openAllowed("https://github.com", "GitHub");
    } else if (/привет|здравствуй/.test(lower)) {
      reply("Привет. Я на связи. Скажи «который час», «создай заметку …» или «открой GitHub».");
    } else if (/помощь|что ты умеешь/.test(lower)) {
      reply("Пока я умею показывать время, сохранять заметки с твоего согласия, показывать и удалять память, а также открывать YouTube и GitHub после подтверждения. Для полноценного ИИ нужен подключённый сервер или API.");
    } else {
      reply("Пока я не подключён к языковой модели, поэтому не умею отвечать на свободные вопросы. Могу выполнить демонстрационные команды или позже подключим ИИ через безопасный сервер.");
    }
  }

  form.addEventListener("submit", e => { e.preventDefault(); const value = prompt.value; prompt.value = ""; handle(value); });
  $("memoryConsent").addEventListener("change", e => {
    if (e.target.checked) {
      if (confirm("Разрешить хранить заметки в этом браузере на этом устройстве?")) {
        localStorage.setItem(consentKey, "yes");
        reply("Согласие включено. Память хранится только в этом браузере.");
      } else { e.target.checked = false; localStorage.removeItem(consentKey); }
    } else {
      localStorage.removeItem(consentKey);
      reply("Сохранение новых заметок отключено. Уже сохранённые заметки не удалены.");
    }
  });
  $("viewMemory").addEventListener("click", () => handle("покажи память"));
  $("deleteMemory").addEventListener("click", () => {
    if (confirm("Удалить все заметки JARVIS Lite из этого браузера?")) {
      localStorage.removeItem(memoryKey);
      reply("Локальная память удалена.");
    }
  });
  $("clearChat").addEventListener("click", () => { chat.replaceChildren(); reply("Чат очищен."); });
  $("speakToggle").addEventListener("click", () => {
    speechOn = !speechOn;
    $("speakToggle").textContent = speechOn ? "🔊 Озвучка: вкл." : "🔇 Озвучка: выкл.";
    $("speakToggle").setAttribute("aria-pressed", String(speechOn));
    if (!speechOn && "speechSynthesis" in window) window.speechSynthesis.cancel();
  });

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SpeechRecognition) {
    const rec = new SpeechRecognition();
    rec.lang = "ru-RU"; rec.interimResults = false; rec.maxAlternatives = 1;
    $("micBtn").addEventListener("click", () => {
      try { rec.start(); $("voiceStatus").textContent = "Слушаю…"; }
      catch { $("voiceStatus").textContent = "Голосовой ввод уже запущен. Попробуй ещё раз через секунду."; }
    });
    rec.onresult = e => { const text = e.results[0][0].transcript; prompt.value = text; $("voiceStatus").textContent = "Распознано: " + text; handle(text); prompt.value = ""; };
    rec.onerror = e => { $("voiceStatus").textContent = "Голосовая ошибка: " + e.error + ". Можно продолжить вводить текстом."; };
    rec.onend = () => { if ($("voiceStatus").textContent === "Слушаю…") $("voiceStatus").textContent = "Голосовой ввод завершён."; };
  } else {
    $("micBtn").disabled = true;
    $("voiceStatus").textContent = "Этот браузер не поддерживает распознавание речи. Попробуй Chrome или используй текст.";
  }

  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  }
})();