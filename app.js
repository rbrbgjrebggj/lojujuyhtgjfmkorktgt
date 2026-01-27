// app.js - النسخة المحسنة
import { messages } from './messages.js';

class DiscordSpammer {
    constructor() {
        this.elements = {
            login: document.getElementById('login'),
            main: document.getElementById('main'),
            tokenInput: document.getElementById('tokenInput'),
            channelInput: document.getElementById('channelId'),
            mentionInput: document.getElementById('mention'),
            delayInput: document.getElementById('delay'),
            startBtn: document.getElementById('startBtn'),
            stopBtn: document.getElementById('stopBtn'),
            logBox: document.getElementById('logBox'),
            loginBtn: document.getElementById('loginBtn')
        };
        
        this.token = '';
        this.messageQueue = [];
        this.isSending = false;
        this.currentMessageIndex = 0;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        this.init();
    }
    
    init() {
        this.elements.loginBtn.onclick = () => this.login();
        this.elements.startBtn.onclick = () => this.startSending();
        this.elements.stopBtn.onclick = () => this.stopSending();
        
        // إضافة إدخال بالإنتر
        this.elements.tokenInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.login();
        });
        
        // تحميل الإعدادات من localStorage
        this.loadSettings();
    }
    
    login() {
        this.token = this.elements.tokenInput.value.trim();
        if (!this.token) {
            this.showAlert('⚠️ الرجاء إدخال التوكن');
            return;
        }
        
        // التحقق من صحة التوكن
        this.validateToken().then(isValid => {
            if (isValid) {
                this.saveSettings();
                this.elements.login.classList.add('hidden');
                this.elements.main.classList.remove('hidden');
                this.log('✅ تم الدخول بنجاح');
            } else {
                this.showAlert('❌ التوكن غير صالح');
            }
        });
    }
    
    async validateToken() {
        try {
            const response = await fetch('https://discord.com/api/v10/users/@me', {
                headers: { 'Authorization': this.token }
            });
            return response.ok;
        } catch {
            return false;
        }
    }
    
    saveSettings() {
        localStorage.setItem('discordSpammer_token', this.token);
        localStorage.setItem('discordSpammer_channel', this.elements.channelInput.value);
        localStorage.setItem('discordSpammer_mention', this.elements.mentionInput.value);
        localStorage.setItem('discordSpammer_delay', this.elements.delayInput.value);
    }
    
    loadSettings() {
        const savedToken = localStorage.getItem('discordSpammer_token');
        if (savedToken) this.elements.tokenInput.value = savedToken;
        
        this.elements.channelInput.value = localStorage.getItem('discordSpammer_channel') || '';
        this.elements.mentionInput.value = localStorage.getItem('discordSpammer_mention') || '';
        this.elements.delayInput.value = localStorage.getItem('discordSpammer_delay') || '1';
    }
    
    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }
    
    async sendMessage(channelId, content) {
        const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
        
        while (this.retryCount < this.maxRetries) {
            try {
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': this.token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content })
                });
                
                if (response.status === 429) {
                    const data = await response.json();
                    const waitTime = data.retry_after * 1000;
                    this.log(`⏳ معدل محدود! الانتظار ${data.retry_after} ثانية...`);
                    await this.sleep(waitTime);
                    this.retryCount++;
                    continue;
                }
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                this.retryCount = 0;
                this.log(`✅ تم الإرسال: ${content.substring(0, 50)}...`);
                return true;
                
            } catch (error) {
                this.log(`❌ خطأ: ${error.message}`);
                this.retryCount++;
                await this.sleep(2000);
            }
        }
        
        this.log('❌ فشل الإرسال بعد عدة محاولات');
        return false;
    }
    
    async startSending() {
        const channelId = this.elements.channelInput.value.trim();
        const mention = this.elements.mentionInput.value.trim();
        const delay = parseFloat(this.elements.delayInput.value) * 1000;
        
        if (!channelId) {
            this.showAlert('⚠️ الرجاء إدخال ID الروم');
            return;
        }
        
        if (delay < 100) {
            this.showAlert('⚠️ التاخير يجب أن يكون 0.1 ثانية على الأقل');
            return;
        }
        
        this.saveSettings();
        this.isSending = true;
        this.elements.startBtn.disabled = true;
        this.elements.stopBtn.disabled = false;
        
        this.log('🚀 بدأ الإرسال...');
        
        while (this.isSending) {
            if (this.currentMessageIndex === 0 || this.currentMessageIndex >= this.messageQueue.length) {
                this.messageQueue = this.shuffleArray(messages);
                this.currentMessageIndex = 0;
                this.log('🔀 تم خلط الرسائل');
            }
            
            const message = this.messageQueue[this.currentMessageIndex];
            let content = message;
            if (mention) content = `${mention} ${message}`.trim();
            
            const sent = await this.sendMessage(channelId, content);
            
            if (sent) {
                this.currentMessageIndex++;
            }
            
            if (!this.isSending) break;
            
            // عرض مؤشر التقدم
            const progress = Math.round((this.currentMessageIndex / this.messageQueue.length) * 100);
            this.updateProgress(progress);
            
            await this.sleep(delay);
        }
        
        this.elements.startBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.log('⏹️ تم إيقاف الإرسال');
    }
    
    stopSending() {
        this.isSending = false;
        this.log('⏸️ جاري إيقاف الإرسال...');
    }
    
    log(message) {
        const timestamp = new Date().toLocaleTimeString('ar-SA');
        this.elements.logBox.innerText += `[${timestamp}] ${message}\n`;
        this.elements.logBox.scrollTop = this.elements.logBox.scrollHeight;
    }
    
    updateProgress(percentage) {
        // يمكنك إضافة شريط تقدم في المستقبل
        if (percentage % 10 === 0) {
            this.log(`📊 التقدم: ${percentage}%`);
        }
    }
    
    showAlert(message) {
        alert(message);
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// بدء التطبيق عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', () => {
    window.spammer = new DiscordSpammer();
});
