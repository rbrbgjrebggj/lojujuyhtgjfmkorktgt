import { messages } from './messages.js';

const loginSection = document.getElementById('login');
const mainSection = document.getElementById('main');
const tokenInput = document.getElementById('tokenInput');
const channelInput = document.getElementById('channelId');
const mentionInput = document.getElementById('mention');
const delayInput = document.getElementById('delay');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const logBox = document.getElementById('logBox');

let token = '';
let messageQueue = [];
let isSending = false;

document.getElementById('loginBtn').onclick = () => {
  token = tokenInput.value.trim();
  if (!token) return alert('اكتب التوكن');

  loginSection.classList.add('hidden');
  mainSection.classList.remove('hidden');
};

function shuffleArray(array) {
  let shuffled = array.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

async function sendMessage(channelId, content) {
  const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
  const data = { content };

  while (true) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });

    const txt = await res.text();

    if (res.status === 429) {
      const retryData = JSON.parse(txt);
      const waitTime = retryData.retry_after * 1000;
      logBox.innerText += `⏳ Rate Limited! بننتظر ${retryData.retry_after} ثانية...\n`;
      await new Promise(r => setTimeout(r, waitTime));
    } else if (!res.ok) {
      logBox.innerText += `❌ خطأ: ${res.status} - ${txt}\n`;
      break;
    } else {
      logBox.innerText += `✅ تم الإرسال: ${content}\n`;
      break;
    }
  }
}

startBtn.onclick = async () => {
  const channelId = channelInput.value.trim();
  const mention = mentionInput.value.trim();
  const delay = parseFloat(delayInput.value) * 1000;

  if (!channelId) return alert("اكتب ID الروم");

  messageQueue = shuffleArray(messages);
  isSending = true;

  for (let msg of messageQueue) {
    if (!isSending) {
      logBox.innerText += "🛑 تم إيقاف الإرسال.\n";
      break;
    }

    let content = `${mention} ${msg}`.trim();
    await sendMessage(channelId, content);
    await new Promise(r => setTimeout(r, delay));
  }

  if (isSending) {
    logBox.innerText += `✅ تم الإرسال لكل الرسائل.\n`;
  }
};

stopBtn.onclick = () => {
  isSending = false;
};
