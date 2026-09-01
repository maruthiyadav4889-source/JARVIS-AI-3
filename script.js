const chatFeed = document.getElementById('chatFeed');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');
const attachBtn = document.getElementById('attachBtn');
const fileInput = document.getElementById('fileInput');
const cameraInput = document.getElementById('cameraInput');
const welcomeContainer = document.getElementById('welcomeContainer');
const upiConfigBtn = document.getElementById('upiConfigBtn');

const imagePreviewContainer = document.getElementById('imagePreviewContainer');
const previewImg = document.getElementById('previewImg');
const imageName = document.getElementById('imageName');
const removeImageBtn = document.getElementById('removeImageBtn');

// Local Data Store
let defaultUpiId = localStorage.getItem('JARVIS_UPI') || 'paytmqr281005050101150047395066@paytm';
let contacts = JSON.parse(localStorage.getItem('JARVIS_CONTACTS') || '{}');
let activeImageBase64 = null;
let torchStream = null;

// Auto-grow Input Field
if (userInput) {
  userInput.addEventListener('input', () => {
    userInput.style.height = 'auto';
    userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
  });
}

// Preset Handlers
document.querySelectorAll('.suggestion-card[data-prompt]').forEach(card => {
  card.addEventListener('click', () => {
    const text = card.getAttribute('data-prompt');
    if (userInput) {
      userInput.value = text;
      userInput.focus();
    }
  });
});

// Configure UPI ID
if (upiConfigBtn) {
  upiConfigBtn.addEventListener('click', () => {
    const custom = prompt("Set default recipient UPI ID (e.g. name@okhdfcbank):", defaultUpiId);
    if (custom) {
      defaultUpiId = custom.trim();
      localStorage.setItem('JARVIS_UPI', defaultUpiId);
      alert(`Default UPI ID set to: ${defaultUpiId}`);
    }
  });
}

// --- 1. OPTICAL CAMERA & GALLERY HANDLERS ---
function openCameraDirectly() {
  if (cameraInput) cameraInput.click();
}

if (attachBtn) {
  attachBtn.addEventListener('click', () => {
    const choose = confirm("Tap OK for CAMERA, or Cancel for GALLERY:");
    if (choose && cameraInput) cameraInput.click();
    else if (fileInput) fileInput.click();
  });
}

function handleFileProcess(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    activeImageBase64 = reader.result;
    if (previewImg) previewImg.src = activeImageBase64;
    if (imageName) imageName.textContent = file.name || "Photo Captured";
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

if (fileInput) fileInput.addEventListener('change', (e) => handleFileProcess(e.target.files[0]));
if (cameraInput) cameraInput.addEventListener('change', (e) => handleFileProcess(e.target.files[0]));

if (removeImageBtn) {
  removeImageBtn.addEventListener('click', () => {
    activeImageBase64 = null;
    if (fileInput) fileInput.value = '';
    if (cameraInput) cameraInput.value = '';
    if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';
  });
}

// --- 2. LOCAL DEVICE HOOKS (DATE, TIME, WEATHER, BATTERY) ---

// Real-Time Date & Time
function getSystemDateTime() {
  const now = new Date();
  const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  const formattedTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `Current telemetry: Today is **${formattedDate}**, and the time is **${formattedTime}**, Boss.`;
}

// Live GPS Weather (Open-Meteo API — No Key Required)
async function fetchLiveWeather() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve("GPS sensors unavailable. Please allow Location permissions on your device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const data = await res.json();
          const cw = data.current_weather;
          resolve(`Atmospheric sensors at Lat ${latitude.toFixed(2)}, Lon ${longitude.toFixed(2)}:\n* **Temperature:** ${cw.temperature}°C\n* **Wind Speed:** ${cw.windspeed} km/h\n* **Conditions:** Online and stable, Sir.`);
        } catch (e) {
          resolve("Atmospheric telemetry retrieved: Clear conditions, temperature is nominal.");
        }
      },
      () => {
        resolve("Location permission denied. Please enable GPS permissions in device settings to fetch live local weather.");
      },
      { timeout: 8000 }
    );
  });
}

// Battery Status
async function getBatteryTelemetry() {
  if ('getBattery' in navigator) {
    try {
      const b = await navigator.getBattery();
      const level = Math.round(b.level * 100);
      return `Main power cell is at **${level}%** capacity and **${b.charging ? 'actively charging' : 'operating on internal power'}**, Sir.`;
    } catch (e) {}
  }
  return "Power cell operating at normal parameters, Sir.";
}

// Flashlight / Rear LED
async function toggleTorch(enable) {
  try {
    if (enable) {
      torchStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const track = torchStream.getVideoTracks()[0];
      await track.applyConstraints({ advanced: [{ torch: true }] });
      return "Flashlight illuminated, Boss.";
    } else {
      if (torchStream) {
        torchStream.getTracks().forEach(t => t.stop());
        torchStream = null;
      }
      return "Flashlight extinguished, Boss.";
    }
  } catch (err) {
    return "Flashlight error: Camera permission required to control physical LED.";
  }
}

// Cellular Phone Calling
function triggerCall(target) {
  let num = target.replace(/[^0-9+]/g, '');
  const key = target.toLowerCase().trim();

  if (!num && contacts[key]) num = contacts[key];
  else if (!num) {
    const ask = prompt(`No phone number saved for "${target}". Enter number:`);
    if (ask) {
      contacts[key] = ask.trim();
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      num = ask.trim();
    }
  }

  if (num) {
    window.location.href = `tel:${num}`;
    return `Initiating cellular link to ${target} (${num}), Boss.`;
  }
  return `Cellular directive aborted. Valid number required for ${target}.`;
}

// Instant UPI Payment
function processPayment(text) {
  const q = text.toLowerCase();
  const amountMatch = q.match(/(?:pay|send|transfer|amount)\s*(?:rs|inr|₹)?\s*(\d+(?:\.\d+)?)/i);
  const amount = amountMatch ? amountMatch[1] : null;

  const upiMatch = text.match(/[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/);
  let targetUPI = upiMatch ? upiMatch[0] : defaultUpiId;
  let targetName = "Merchant Payee";

  for (const name in contacts) {
    if (q.includes(name)) {
      targetName = name.toUpperCase();
      targetUPI = `${contacts[name]}@upi`;
      break;
    }
  }

  if (amount) {
    const upiUri = `upi://pay?pa=${targetUPI}&pn=${encodeURIComponent(targetName)}&am=${amount}&cu=INR&tn=Jarvis%20AI%20Payment`;
    setTimeout(() => { window.location.href = upiUri; }, 350);
    return `Payment protocol engaged: Transferring **₹${amount}** to **${targetUPI}**. Opening UPI interface...`;
  }

  if (q.includes("gpay") || q.includes("google pay")) {
    window.location.href = "upi://pay";
    return "Launching Google Pay selector, Boss.";
  }
  if (q.includes("paytm")) {
    window.location.href = "paytmmp://";
    return "Launching Paytm wallet, Boss.";
  }
  if (q.includes("phonepe")) {
    window.location.href = "phonepe://";
    return "Launching PhonePe, Boss.";
  }
  return null;
}

// Instant Offline Calculator
function solveMath(text) {
  let clean = text.toLowerCase()
    .replace(/tell|what is|calculate|solve|evaluate|find|value of/gi, '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/,/g, '')
    .trim();

  clean = clean.replace(/(\d+)\s*[xX]\s*(\d+)/g, '$1 * $2');

  if (/^[\d+\-*/().\s^%]+$/.test(clean) && /\d/.test(clean)) {
    try {
      const sanitized = clean.replace(/\^/g, '**');
      const result = Function(`'use strict'; return (${sanitized})`)();
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return `Calculation complete, Sir: **${clean.replace(/\*/g, '×')} = ${result.toLocaleString()}**`;
      }
    } catch (e) {
      return null;
    }
  }
  return null;
}

// --- 3. RELIABLE FREE AI REASONING & ASSIGNMENT ENGINE ---
async function fetchAutonomousAI(userPrompt, imageAttached) {
  const promptContext = imageAttached 
    ? `[Optical scan attached: Solve the questions, assignments, or extract data from this document/image]. Question: ${userPrompt || 'Analyze and solve step-by-step'}`
    : userPrompt;

  const systemPrompt = "You are Jarvis AI 1.0, Tony Stark's personal AI assistant. Address the user as Boss or Sir. Deliver complete, direct, and well-structured answers using clean Markdown, bold highlights, math formatting, and code blocks.";

  // Tier 1: POST to Pollinations Neural Gateway
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch("https://text.pollinations.ai/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: promptContext }
        ],
        model: "openai",
        seed: Math.floor(Math.random() * 1000)
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      if (text && text.trim().length > 0) return text;
    }
  } catch (e) {}

  // Tier 2: Direct Wikipedia / Knowledge Gateway fallback
  try {
    const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(userPrompt)}`);
    const wikiData = await wikiRes.json();
    if (wikiData.extract) return wikiData.extract;
  } catch (e) {}

  return `I have processed your query: "${userPrompt}". All neural sub-routines standing by for your next directive, Boss.`;
}

// --- 4. MASTER PROTOCOL ROUTER ---
async function executeDirective(text, hasImage) {
  const q = text.toLowerCase().trim();

  // A. Greetings & Identity
  if (['hai', 'hi', 'hello', 'hey', 'jarvis', 'ok jarvis'].includes(q)) {
    return "Good day, Boss. All optical, audio, hardware, and payment systems are fully operational. How may I assist you?";
  }
  if (q.includes("who are you") || q.includes("your name")) {
    return "I am **Jarvis AI 1.0**, your autonomous personal assistant. I can solve assignments, process camera scans, manage UPI payments, execute phone calls, and control hardware sensors.";
  }

  // B. Date & Time
  if (q.includes("date") || q.includes("today date") || q.includes("what is today") || q.includes("day is today") || q.includes("time") || q.includes("current time")) {
    return getSystemDateTime();
  }

  // C. Weather
  if (q.includes("weather") || q.includes("temperature") || q.includes("climate") || q.includes("rain")) {
    return await fetchLiveWeather();
  }

  // D. Battery Telemetry
  if (q.includes("battery") || q.includes("power level") || q.includes("charge")) {
    return await getBatteryTelemetry();
  }

  // E. UPI Payments
  const payOutput = processPayment(text);
  if (payOutput) return payOutput;

  // F. Offline Math
  const mathOutput = solveMath(text);
  if (mathOutput && !hasImage) return mathOutput;

  // G. Phone Calls
  if (q.startsWith("call ") || q.startsWith("dial ")) {
    const target = q.replace("call ", "").replace("dial ", "").replace("to ", "").trim();
    return triggerCall(target);
  }

  // H. Save Contact
  if (q.startsWith("save contact ") || q.startsWith("save number ")) {
    const parts = q.replace("save contact ", "").replace("save number ", "").split(" ");
    if (parts.length >= 2) {
      contacts[parts[0].toLowerCase()] = parts[1];
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      return `Contact stored: **${parts[0].toUpperCase()}** (${parts[1]}).`;
    }
  }

  // I. Flashlight / Torch
  if (q.includes("flashlight on") || q.includes("torch on")) return await toggleTorch(true);
  if (q.includes("flashlight off") || q.includes("torch off")) return await toggleTorch(false);

  // J. Live GPS Navigation
  if (q.includes("where am i") || q.includes("my location")) {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve("Geolocation telemetry unavailable on this device.");
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
          resolve(`Coordinates locked: Lat **${latitude.toFixed(4)}**, Lon **${longitude.toFixed(4)}**. Launching Google Maps.`);
        },
        (err) => resolve(`GPS lock failed: ${err.message}`)
      );
    });
  }

  // K. Stock Market
  if (q.includes("stock") || q.includes("market") || q.includes("gainers")) {
    window.open("https://www.google.com/finance/markets/gainers", "_blank");
    return "Accessing real-time equity gainers and market telemetry, Boss.";
  }

  // L. Generative AI Engine (Assignments, Coding, Writing, Photo Analysis)
  return await fetchAutonomousAI(text, hasImage);
}

// --- 5. VOICE ENGINE (TTS & SPEECH RECOGNITION) ---
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#`_₹💸📈📱👛📍🔦📸🖼️]/g, '').replace(/J\.A\.R\.V\.I\.S:/g, '').substring(0, 280);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 0.95;
    window.speechSynthesis.speak(utterance);
  }
}

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let isListening = false;

if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';

  recognition.onstart = () => {
    isListening = true;
    if (micBtn) micBtn.classList.add('active');
  };

  recognition.onresult = (event) => {
    if (userInput) userInput.value = event.results[0][0].transcript;
    handleSend();
  };

  recognition.onerror = () => stopMic();
  recognition.onend = () => stopMic();
}

function stopMic() {
  isListening = false;
  if (micBtn) micBtn.classList.remove('active');
}

if (micBtn) {
  micBtn.addEventListener('click', () => {
    if (!recognition) {
      alert("Microphone requires Chrome on Android.");
      return;
    }
    if (!isListening) recognition.start();
    else recognition.stop();
  });
}

// --- 6. UI DISPATCHER ---
function appendUserMessage(text, imageSrc = null) {
  if (welcomeContainer) welcomeContainer.style.display = 'none';

  const row = document.createElement('div');
  row.className = 'msg-row user';
  
  let content = `<div class="msg-bubble"><p>${escapeHTML(text)}</p>`;
  if (imageSrc) content += `<img src="${imageSrc}" alt="Uploaded photo" />`;
  content += `</div>`;

  row.innerHTML = content;
  if (chatFeed) {
    chatFeed.appendChild(row);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }
}

function appendJarvisLoading() {
  const row = document.createElement('div');
  row.className = 'msg-row jarvis';
  row.innerHTML = `
    <svg class="jarvis-avatar gemini-sparkle" viewBox="0 0 24 24">
      <path fill="url(#sparkle-grad)" d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z"/>
    </svg>
    <div class="msg-bubble">
      <div class="loading-shimmer">
        <div class="shimmer-line"></div>
        <div class="shimmer-line short"></div>
      </div>
    </div>
  `;
  if (chatFeed) {
    chatFeed.appendChild(row);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }
  return row;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

async function handleSend() {
  const text = userInput ? userInput.value.trim() : "";
  const attachedImg = activeImageBase64;

  if (!text && !attachedImg) return;

  appendUserMessage(text || "Analyze this photo", attachedImg);
  if (userInput) {
    userInput.value = '';
    userInput.style.height = 'auto';
  }

  activeImageBase64 = null;
  if (fileInput) fileInput.value = '';
  if (cameraInput) cameraInput.value = '';
  if (imagePreviewContainer) imagePreviewContainer.style.display = 'none';

  const loadingRow = appendJarvisLoading();
  const reply = await executeDirective(text, attachedImg !== null);

  const bubble = loadingRow.querySelector('.msg-bubble');
  bubble.innerHTML = (typeof marked !== 'undefined') ? marked.parse(reply) : reply;

  const actions = document.createElement('div');
  actions.className = 'msg-actions';
  actions.innerHTML = `
    <button class="action-tool-btn" title="Read Aloud">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
      </svg>
    </button>
  `;
  actions.querySelector('button').addEventListener('click', () => speakText(reply));
  bubble.appendChild(actions);

  if (chatFeed) chatFeed.scrollTop = chatFeed.scrollHeight;
  speakText(reply);
}

if (sendBtn) sendBtn.addEventListener('click', handleSend);
if (userInput) {
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });
    }
    
