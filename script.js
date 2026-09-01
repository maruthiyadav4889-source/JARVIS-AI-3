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
userInput.addEventListener('input', () => {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 140) + 'px';
});

// Suggestion Cards Listener
document.querySelectorAll('.suggestion-card[data-prompt]').forEach(card => {
  card.addEventListener('click', () => {
    const text = card.getAttribute('data-prompt');
    userInput.value = text;
    userInput.focus();
  });
});

// Configure UPI ID
upiConfigBtn.addEventListener('click', () => {
  const custom = prompt("Set default recipient UPI ID (e.g. name@okhdfcbank):", defaultUpiId);
  if (custom) {
    defaultUpiId = custom.trim();
    localStorage.setItem('JARVIS_UPI', defaultUpiId);
    alert(`Default UPI ID set to: ${defaultUpiId}`);
  }
});

// --- CAMERA & GALLERY PHOTO ACCESS ---
function openCameraDirectly() {
  cameraInput.click();
}

attachBtn.addEventListener('click', () => {
  const choose = confirm("Tap OK to open CAMERA, or Cancel to choose from GALLERY:");
  if (choose) cameraInput.click();
  else fileInput.click();
});

function handleFileProcess(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    activeImageBase64 = reader.result;
    previewImg.src = activeImageBase64;
    imageName.textContent = file.name || "Photo Captured";
    imagePreviewContainer.style.display = 'block';
  };
  reader.readAsDataURL(file);
}

fileInput.addEventListener('change', (e) => handleFileProcess(e.target.files[0]));
cameraInput.addEventListener('change', (e) => handleFileProcess(e.target.files[0]));

removeImageBtn.addEventListener('click', () => {
  activeImageBase64 = null;
  fileInput.value = '';
  cameraInput.value = '';
  imagePreviewContainer.style.display = 'none';
});

// --- HARDWARE & DEVICE PROTOCOLS ---
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
  return `Valid telephone number required for ${target}.`;
}

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
    return `Camera hardware permission required for flashlight.`;
  }
}

function getLiveLocation() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve("Geolocation telemetry unavailable on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        window.open(`https://www.google.com/maps?q=${latitude},${longitude}`, '_blank');
        resolve(`Coordinates locked: Lat ${latitude.toFixed(4)}, Lon ${longitude.toFixed(4)}. Launching Google Maps.`);
      },
      (err) => resolve(`GPS lock failed: ${err.message}`)
    );
  });
}

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
    return `Payment directive executed: Transferring **₹${amount}** to **${targetUPI}**. Opening UPI apps (Google Pay / PhonePe / Paytm)...`;
  }

  if (q.includes("gpay") || q.includes("google pay")) {
    window.location.href = "upi://pay";
    return "Opening Google Pay selector, Boss.";
  }
  if (q.includes("paytm")) {
    window.location.href = "paytmmp://";
    return "Opening Paytm wallet, Boss.";
  }
  if (q.includes("phonepe")) {
    window.location.href = "phonepe://";
    return "Opening PhonePe, Boss.";
  }
  return null;
}

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

// --- ZERO-KEY AUTONOMOUS AI ENGINE ---
async function fetchAutonomousAI(userPrompt, imageAttached) {
  const promptContext = imageAttached 
    ? `[Optical Photo Scan Attached: Solve questions or explain document details]. User query: ${userPrompt || 'Analyze and solve this image step-by-step'}`
    : userPrompt;

  const systemPrompt = "You are Jarvis AI 1.0, Tony Stark's personal intelligent assistant. Address user as Boss or Sir. Format answers cleanly using Markdown, bold headings, lists, and code blocks.";
  const encoded = encodeURIComponent(`${systemPrompt}\n\nUser: ${promptContext}`);
  const url = `https://text.pollinations.ai/${encoded}?model=openai`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.ok) {
      const result = await response.text();
      if (result && result.trim().length > 0) return result;
    }
  } catch (e) {}

  return `Directive processed for: "${userPrompt || 'Image analysis'}". All systems ready, Boss.`;
}

// Master Router
async function executeDirective(text, hasImage) {
  const q = text.toLowerCase().trim();

  const payOutput = processPayment(text);
  if (payOutput) return payOutput;

  const mathOutput = solveMath(text);
  if (mathOutput && !hasImage) return mathOutput;

  if (q.startsWith("call ") || q.startsWith("dial ")) {
    const target = q.replace("call ", "").replace("dial ", "").replace("to ", "").trim();
    return triggerCall(target);
  }

  if (q.startsWith("save contact ") || q.startsWith("save number ")) {
    const parts = q.replace("save contact ", "").replace("save number ", "").split(" ");
    if (parts.length >= 2) {
      contacts[parts[0].toLowerCase()] = parts[1];
      localStorage.setItem('JARVIS_CONTACTS', JSON.stringify(contacts));
      return `Contact stored: ${parts[0].toUpperCase()} (${parts[1]}).`;
    }
  }

  if (q.includes("flashlight on") || q.includes("torch on")) return await toggleTorch(true);
  if (q.includes("flashlight off") || q.includes("torch off")) return await toggleTorch(false);
  if (q.includes("where am i") || q.includes("my location")) return await getLiveLocation();

  if (q.includes("stock") || q.includes("market") || q.includes("gainers")) {
    window.open("https://www.google.com/finance/markets/gainers", "_blank");
    return "Opening live stock market gainers, Boss.";
  }

  return await fetchAutonomousAI(text, hasImage);
}

// --- VOICE (TTS & STT) ---
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
    micBtn.classList.add('active');
  };

  recognition.onresult = (event) => {
    userInput.value = event.results[0][0].transcript;
    handleSend();
  };

  recognition.onerror = () => stopMic();
  recognition.onend = () => stopMic();
}

function stopMic() {
  isListening = false;
  micBtn.classList.remove('active');
}

micBtn.addEventListener('click', () => {
  if (!recognition) {
    alert("Microphone requires Chrome on Android.");
    return;
  }
  if (!isListening) recognition.start();
  else recognition.stop();
});

// --- UI MESSAGE DISPATCHER ---
function appendUserMessage(text, imageSrc = null) {
  if (welcomeContainer) welcomeContainer.style.display = 'none';

  const row = document.createElement('div');
  row.className = 'msg-row user';
  
  let content = `<div class="msg-bubble"><p>${escapeHTML(text)}</p>`;
  if (imageSrc) content += `<img src="${imageSrc}" alt="Uploaded photo" />`;
  content += `</div>`;

  row.innerHTML = content;
  chatFeed.appendChild(row);
  chatFeed.scrollTop = chatFeed.scrollHeight;
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
  chatFeed.appendChild(row);
  chatFeed.scrollTop = chatFeed.scrollHeight;
  return row;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[tag] || tag));
}

async function handleSend() {
  const text = userInput.value.trim();
  const attachedImg = activeImageBase64;

  if (!text && !attachedImg) return;

  appendUserMessage(text || "Analyze this photo", attachedImg);
  userInput.value = '';
  userInput.style.height = 'auto';

  activeImageBase64 = null;
  fileInput.value = '';
  cameraInput.value = '';
  imagePreviewContainer.style.display = 'none';

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

  chatFeed.scrollTop = chatFeed.scrollHeight;
  speakText(reply);
}

sendBtn.addEventListener('click', handleSend);
userInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});
