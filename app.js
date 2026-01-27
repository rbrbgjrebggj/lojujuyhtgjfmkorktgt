// ======== نظام Discord Spammer Pro ========
// إصدار Premium - متعدد التوكنات - فائق السرعة

class DiscordSpammerPro {
    constructor() {
        this.tokens = new Map(); // {token: {data, stats, status}}
        this.messages = [];
        this.settings = {
            channelId: '',
            mention: '',
            delay: 1,
            speed: 10,
            mode: 'sequential',
            autoRotate: true,
            useProxy: false,
            smartMode: true,
            maxRetries: 3,
            timeout: 10000
        };
        
        this.state = {
            isRunning: false,
            isPaused: false,
            sentCount: 0,
            failedCount: 0,
            startTime: null,
            activeTokens: new Set(),
            currentTokenIndex: 0,
            currentMessageIndex: 0,
            proxyList: [],
            rateLimitQueue: [],
            tokenRotationCount: 0
        };
        
        this.initialize();
    }
    
    async initialize() {
        this.loadFromStorage();
        this.bindEvents();
        this.setupDragAndDrop();
        this.updateUI();
        this.startStatsUpdater();
        
        // فحص التوكنات المحفوظة
        await this.verifyAllTokens();
        
        this.log('🚀 نظام Discord Spammer Pro جاهز للعمل!', 'success');
    }
    
    // ======== إدارة التوكنات ========
    async addTokens(tokenList) {
        const newTokens = [];
        
        for (let token of tokenList) {
            token = token.trim();
            if (!token || this.tokens.has(token)) continue;
            
            const tokenData = {
                token: token,
                username: 'جار الفحص...',
                userId: '',
                status: 'pending',
                stats: { sent: 0, failed: 0, rateLimited: 0 },
                lastUsed: null,
                isValid: false
            };
            
            this.tokens.set(token, tokenData);
            newTokens.push(tokenData);
        }
        
        if (newTokens.length > 0) {
            this.updateTokensUI();
            this.saveToStorage();
            this.log(`✅ تم إضافة ${newTokens.length} توكن جديد`, 'success');
            
            // فحص التوكنات الجديدة
            await this.verifyTokens(newTokens);
        }
    }
    
    async verifyTokens(tokenList) {
        const promises = tokenList.map(async (tokenData) => {
            try {
                const response = await fetch('https://discord.com/api/v10/users/@me', {
                    headers: { 'Authorization': tokenData.token },
                    signal: AbortSignal.timeout(5000)
                });
                
                if (response.ok) {
                    const userData = await response.json();
                    tokenData.username = userData.username;
                    tokenData.userId = userData.id;
                    tokenData.status = 'active';
                    tokenData.isValid = true;
                    this.log(`✅ ${userData.username} صالح`, 'success');
                } else {
                    tokenData.status = 'invalid';
                    tokenData.isValid = false;
                    this.log(`❌ توكن غير صالح`, 'error');
                }
            } catch (error) {
                tokenData.status = 'error';
                tokenData.isValid = false;
                this.log(`⚠️ خطأ في فحص التوكن`, 'warning');
            }
            
            tokenData.lastChecked = Date.now();
            this.tokens.set(tokenData.token, tokenData);
        });
        
        await Promise.allSettled(promises);
        this.updateTokensUI();
    }
    
    async verifyAllTokens() {
        const tokensToVerify = Array.from(this.tokens.values())
            .filter(t => !t.isValid || Date.now() - (t.lastChecked || 0) > 3600000);
        
        if (tokensToVerify.length > 0) {
            await this.verifyTokens(tokensToVerify);
        }
    }
    
    getNextToken() {
        const validTokens = Array.from(this.tokens.values())
            .filter(t => t.isValid && t.status === 'active');
        
        if (validTokens.length === 0) return null;
        
        let tokenData;
        
        switch(this.settings.mode) {
            case 'sequential':
                this.state.currentTokenIndex = 
                    (this.state.currentTokenIndex + 1) % validTokens.length;
                tokenData = validTokens[this.state.currentTokenIndex];
                break;
                
            case 'random':
                tokenData = validTokens[Math.floor(Math.random() * validTokens.length)];
                break;
                
            case 'smart':
                // اختيار التوكن الأقل استخداماً مؤخراً
                tokenData = validTokens.reduce((leastUsed, current) => {
                    if (!leastUsed.lastUsed) return current;
                    if (!current.lastUsed) return leastUsed;
                    return current.lastUsed < leastUsed.lastUsed ? current : leastUsed;
                });
                break;
                
            case 'simultaneous':
                // استخدام جميع التوكنات المتاحة
                return validTokens;
        }
        
        tokenData.lastUsed = Date.now();
        return tokenData;
    }
    
    // ======== إدارة الرسائل ========
    addMessage(text) {
        if (!text.trim()) return;
        
        const message = {
            id: Date.now() + Math.random(),
            text: text.trim(),
            uses: 0,
            lastUsed: null,
            createdAt: Date.now()
        };
        
        this.messages.push(message);
        this.updateMessagesUI();
        this.saveToStorage();
        this.log(`📝 تم إضافة رسالة جديدة`, 'success');
    }
    
    shuffleMessages() {
        for (let i = this.messages.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.messages[i], this.messages[j]] = [this.messages[j], this.messages[i]];
        }
        this.updateMessagesUI();
        this.log(`🔀 تم خلط الرسائل`, 'success');
    }
    
    getNextMessage() {
        if (this.messages.length === 0) return null;
        
        let message;
        
        switch(this.settings.mode) {
            case 'sequential':
                this.state.currentMessageIndex = 
                    (this.state.currentMessageIndex + 1) % this.messages.length;
                message = this.messages[this.state.currentMessageIndex];
                break;
                
            case 'random':
                message = this.messages[Math.floor(Math.random() * this.messages.length)];
                break;
                
            default:
                message = this.messages[this.state.currentMessageIndex];
                this.state.currentMessageIndex = 
                    (this.state.currentMessageIndex + 1) % this.messages.length;
        }
        
        message.uses++;
        message.lastUsed = Date.now();
        return message;
    }
    
    // ======== إرسال الرسائل ========
    async sendMessage(tokenData, channelId, content) {
        const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
        let retries = 0;
        
        while (retries < this.settings.maxRetries) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), this.settings.timeout);
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Authorization': tokenData.token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ content }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (response.status === 429) {
                    // Rate limited
                    const data = await response.json();
                    const waitTime = (data.retry_after || 1) * 1000;
                    
                    tokenData.stats.rateLimited++;
                    this.log(`⏳ ${tokenData.username}: Rate limited - انتظر ${waitTime/1000} ثانية`, 'warning');
                    
                    // إضافة للانتظار
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                    retries++;
                    continue;
                }
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                // نجاح الإرسال
                tokenData.stats.sent++;
                this.state.sentCount++;
                tokenData.lastUsed = Date.now();
                
                this.updateStatsUI();
                return true;
                
            } catch (error) {
                retries++;
                tokenData.stats.failed++;
                this.state.failedCount++;
                
                if (retries < this.settings.maxRetries) {
                    this.log(`🔄 ${tokenData.username}: إعادة المحاولة ${retries}/${this.settings.maxRetries}`, 'warning');
                    await this.sleep(2000 * retries);
                } else {
                    this.log(`❌ ${tokenData.username}: فشل الإرسال بعد ${this.settings.maxRetries} محاولات`, 'error');
                    tokenData.status = 'error';
                    this.updateTokensUI();
                }
            }
        }
        
        return false;
    }
    
    async startSending() {
        if (!this.settings.channelId) {
            this.showNotification('⚠️ الرجاء إدخال ID الروم', 'warning');
            return;
        }
        
        if (this.messages.length === 0) {
            this.showNotification('⚠️ لا توجد رسائل للإرسال', 'warning');
            return;
        }
        
        const validTokens = Array.from(this.tokens.values()).filter(t => t.isValid);
        if (validTokens.length === 0) {
            this.showNotification('⚠️ لا توجد توكنات صالحة', 'warning');
            return;
        }
        
        this.state.isRunning = true;
        this.state.isPaused = false;
        this.state.startTime = Date.now();
        this.state.sentCount = 0;
        this.state.failedCount = 0;
        
        this.updateUI();
        this.log('🚀 بدأ الإرسال...', 'success');
        
        // بدء حلقة الإرسال
        this.sendingLoop();
    }
    
    async sendingLoop() {
        while (this.state.isRunning && !this.state.isPaused) {
            // الحصول على الرسالة التالية
            const messageData = this.getNextMessage();
            if (!messageData) {
                this.log('⚠️ لا توجد رسائل متاحة', 'warning');
                break;
            }
            
            // بناء محتوى الرسالة
            let content = messageData.text;
            if (this.settings.mention) {
                content = `${this.settings.mention} ${content}`;
            }
            
            // الحصول على التوكن/التوكنات
            let tokensToUse;
            if (this.settings.mode === 'simultaneous') {
                tokensToUse = this.getNextToken(); // يعيد مصفوفة
            } else {
                tokensToUse = [this.getNextToken()];
            }
            
            // إرسال متعدد
            const sendPromises = tokensToUse
                .filter(token => token && token.isValid)
                .map(tokenData => 
                    this.sendMessage(tokenData, this.settings.channelId, content)
                );
            
            await Promise.allSettled(sendPromises);
            
            // حساب التأخير التالي
            const delay = (1 / this.settings.speed) * 1000;
            await this.sleep(delay);
            
            // تحديث الواجهة
            this.updateProgress();
            
            // التحقق إذا كان يجب إيقاف الإرسال
            if (!this.state.isRunning || this.state.isPaused) {
                break;
            }
        }
        
        if (!this.state.isPaused) {
            this.stopSending();
        }
    }
    
    pauseSending() {
        this.state.isPaused = true;
        this.log('⏸️ توقف مؤقت', 'warning');
        this.updateUI();
    }
    
    resumeSending() {
        if (this.state.isRunning && this.state.isPaused) {
            this.state.isPaused = false;
            this.log('▶️ استئناف الإرسال', 'success');
            this.sendingLoop();
        }
    }
    
    stopSending() {
        this.state.isRunning = false;
        this.state.isPaused = false;
        this.log('⏹️ توقف الإرسال', 'info');
        this.updateUI();
        
        // إظهار الإحصائيات النهائية
        const duration = (Date.now() - this.state.startTime) / 1000;
        const speed = this.state.sentCount / duration;
        
        this.showNotification(
            `✅ الانتهاء! أرسلت ${this.state.sentCount} رسالة في ${duration.toFixed(1)} ثانية (${speed.toFixed(1)}/ث)`,
            'success'
        );
    }
    
    // ======== النظام الذكي ========
    async smartTokenRotation() {
        if (!this.settings.autoRotate) return;
        
        // تحليل استخدام التوكنات
        const tokenStats = Array.from(this.tokens.values())
            .filter(t => t.isValid)
            .map(t => ({
                token: t,
                score: t.stats.rateLimited * 10 + t.stats.failed * 5
            }));
        
        // تعطيل التوكنات ذات الأداء السيء مؤقتاً
        tokenStats
            .filter(s => s.score > 50)
            .forEach(s => {
                s.token.status = 'cooldown';
                this.log(`❄️ ${s.token.username}: تبريد بسبب الأداء السيء`, 'warning');
                
                // إعادة التنشيط بعد 5 دقائق
                setTimeout(() => {
                    if (s.token.status === 'cooldown') {
                        s.token.status = 'active';
                        this.updateTokensUI();
                    }
                }, 300000);
            });
        
        this.updateTokensUI();
    }
    
    // ======== الواجهة ========
    bindEvents() {
        // التوكنات
        document.getElementById('loadTokens').onclick = () => this.handleLoadTokens();
        document.getElementById('verifyTokens').onclick = () => this.verifyAllTokens();
        document.getElementById('clearTokens').onclick = () => this.clearTokens();
        
        // الرسائل
        document.getElementById('addMessage').onclick = () => {
            const editor = document.getElementById('messageEditor');
            this.addMessage(editor.value);
            editor.value = '';
        };
        
        document.getElementById('shuffleMessages').onclick = () => this.shuffleMessages();
        document.getElementById('importMessages').onclick = () => this.importMessages();
        
        // التحكم
        document.getElementById('startBtn').onclick = () => this.startSending();
        document.getElementById('pauseBtn').onclick = () => {
            if (this.state.isPaused) {
                this.resumeSending();
            } else {
                this.pauseSending();
            }
        };
        document.getElementById('stopBtn').onclick = () => this.stopSending();
        document.getElementById('testBtn').onclick = () => this.testSending();
        
        // الإعدادات
        document.getElementById('delayRange').oninput = (e) => {
            this.settings.delay = parseFloat(e.target.value);
            document.getElementById('delayInput').value = this.settings.delay;
            this.saveToStorage();
        };
        
        document.getElementById('delayInput').oninput = (e) => {
            this.settings.delay = parseFloat(e.target.value);
            document.getElementById('delayRange').value = this.settings.delay;
            this.saveToStorage();
        };
        
        document.getElementById('speedRange').oninput = (e) => {
            this.settings.speed = parseInt(e.target.value);
            document.getElementById('speedValue').textContent = this.settings.speed;
            this.saveToStorage();
        };
        
        document.getElementById('channelId').oninput = (e) => {
            this.settings.channelId = e.target.value;
            this.saveToStorage();
        };
        
        document.getElementById('mention').oninput = (e) => {
            this.settings.mention = e.target.value;
            this.saveToStorage();
        };
        
        // وضع الإرسال
        document.querySelectorAll('.mode-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.mode-btn').classList.add('active');
                this.settings.mode = e.target.closest('.mode-btn').dataset.mode;
                this.saveToStorage();
                this.log(`🔄 تغيير وضع الإرسال إلى: ${this.settings.mode}`, 'info');
            };
        });
        
        // السجلات
        document.getElementById('clearLogs').onclick = () => {
            document.getElementById('logBox').innerHTML = '';
        };
        
        // السحب والإفلات
        this.setupDragAndDrop();
        
        // تغيير السمة
        document.querySelector('.theme-toggle').onclick = () => this.toggleTheme();
    }
    
    setupDragAndDrop() {
        const textarea = document.getElementById('bulkTokens');
        const dropZone = document.querySelector('.token-input-group');
        
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            textarea.addEventListener(eventName, preventDefaults, false);
            dropZone.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        ['dragenter', 'dragover'].forEach(eventName => {
            dropZone.addEventListener(eventName, highlight, false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, unhighlight, false);
        });
        
        function highlight() {
            dropZone.classList.add('drag-over');
        }
        
        function unhighlight() {
            dropZone.classList.remove('drag-over');
        }
        
        dropZone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (files.length > 0) {
                const file = files[0];
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    textarea.value = e.target.result;
                    this.handleLoadTokens();
                };
                
                reader.readAsText(file);
            }
        }, false);
    }
    
    async handleLoadTokens() {
        const textarea = document.getElementById('bulkTokens');
        const tokens = textarea.value
            .split('\n')
            .map(t => t.trim())
            .filter(t => t && t.length > 10);
        
        if (tokens.length > 0) {
            await this.addTokens(tokens);
            textarea.value = '';
        }
    }
    
    updateTokensUI() {
        const container = document.getElementById('tokensContainer');
        if (!container) return;
        
        const validTokens = Array.from(this.tokens.values()).filter(t => t.isValid);
        const invalidTokens = Array.from(this.tokens.values()).filter(t => !t.isValid);
        
        let html = '';
        
        // التوكنات الصالحة
        validTokens.forEach(token => {
            html += `
                <div class="token-item ${token.status}">
                    <div class="token-info">
                        <div class="token-name">
                            <i class="fas fa-user"></i> ${token.username}
                        </div>
                        <div class="token-preview">
                            ${token.token.substring(0, 25)}...
                        </div>
                        <div class="token-stats">
                            <span><i class="fas fa-paper-plane"></i> ${token.stats.sent}</span>
                            <span><i class="fas fa-times-circle"></i> ${token.stats.failed}</span>
                            <span><i class="fas fa-clock"></i> ${token.stats.rateLimited}</span>
                        </div>
                    </div>
                    <div class="token-status">
                        <span class="status-badge ${token.status}">
                            ${token.status === 'active' ? 'نشط' : 
                              token.status === 'cooldown' ? 'تبريد' : 
                              token.status === 'error' ? 'خطأ' : '...'}
                        </span>
                    </div>
                </div>
            `;
        });
        
        // التوكنات غير الصالحة
        if (invalidTokens.length > 0) {
            html += `<div class="section-title">غير صالح (${invalidTokens.length})</div>`;
            invalidTokens.forEach(token => {
                html += `
                    <div class="token-item invalid">
                        <div class="token-info">
                            <div class="token-preview">
                                ${token.token.substring(0, 30)}...
                            </div>
                        </div>
                        <div class="token-status">
                            <span class="status-badge invalid">غير صالح</span>
                        </div>
                    </div>
                `;
            });
        }
        
        container.innerHTML = html || '<div class="empty-state">لا توجد توكنات</div>';
        document.getElementById('tokenCount').textContent = this.tokens.size;
        document.getElementById('activeTokens').textContent = validTokens.length;
    }
    
    updateMessagesUI() {
        const container = document.getElementById('messagesContainer');
        if (!container) return;
        
        let html = '';
        
        this.messages.forEach((msg, index) => {
            html += `
                <div class="message-item">
                    <div class="message-number">${index + 1}</div>
                    <div class="message-content">
                        ${this.escapeHtml(msg.text.substring(0, 100))}${msg.text.length > 100 ? '...' : ''}
                    </div>
                    <div class="message-stats">
                        <span><i class="fas fa-play"></i> ${msg.uses}</span>
                        <button onclick="spammer.deleteMessage(${msg.id})" class="btn-icon">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html || '<div class="empty-state">لا توجد رسائل</div>';
        document.getElementById('messagesCount').textContent = this.messages.length;
        document.getElementById('msgCount').textContent = this.messages.length;
    }
    
    updateStatsUI() {
        document.getElementById('sentCount').textContent = this.state.sentCount;
        document.getElementById('remainingCount').textContent = this.messages.length;
        document.getElementById('currentSpeed').textContent = this.calculateCurrentSpeed();
        document.getElementById('speed').textContent = this.settings.speed;
        
        // تحديث سرعة الإرسال الحقيقية
        if (this.state.startTime && this.state.sentCount > 0) {
            const duration = (Date.now() - this.state.startTime) / 1000;
            const realSpeed = (this.state.sentCount / duration).toFixed(1);
            document.getElementById('speedValue').textContent = realSpeed;
        }
    }
    
    updateProgress() {
        const progress = this.messages.length > 0 ? 
            (this.state.currentMessageIndex / this.messages.length) * 100 : 0;
        
        document.getElementById('progressPercent').textContent = `${progress.toFixed(1)}%`;
        document.getElementById('progressFill').style.width = `${progress}%`;
        
        // حساب الوقت المتبقي
        if (this.state.sentCount > 0 && this.state.startTime) {
            const elapsed = Date.now() - this.state.startTime;
            const avgTimePerMessage = elapsed / this.state.sentCount;
            const remaining = this.messages.length - this.state.currentMessageIndex;
            const remainingTime = (remaining * avgTimePerMessage) / 1000;
            
            document.getElementById('timeElapsed').textContent = this.formatTime(elapsed / 1000);
            document.getElementById('timeRemaining').textContent = this.formatTime(remainingTime);
        }
    }
    
    updateUI() {
        this.updateTokensUI();
        this.updateMessagesUI();
        this.updateStatsUI();
        this.updateProgress();
        
        // تحديث حالة الأزرار
        const startBtn = document.getElementById('startBtn');
        const pauseBtn = document.getElementById('pauseBtn');
        const stopBtn = document.getElementById('stopBtn');
        
        if (this.state.isRunning) {
            startBtn.disabled = true;
            stopBtn.disabled = false;
            pauseBtn.innerHTML = this.state.isPaused ? 
                '<i class="fas fa-play"></i> استئناف' : 
                '<i class="fas fa-pause"></i> إيقاف مؤقت';
        } else {
            startBtn.disabled = false;
            stopBtn.disabled = true;
            pauseBtn.innerHTML = '<i class="fas fa-pause"></i> إيقاف مؤقت';
        }
    }
    
    // ======== أدوات مساعدة ========
    log(message, type = 'info') {
        const logBox = document.getElementById('logBox');
        if (!logBox) return;
        
        const time = new Date().toLocaleTimeString('ar-SA');
        const logEntry = document.createElement('div');
        logEntry.className = `log-entry ${type}`;
        logEntry.innerHTML = `
            <span class="log-time">[${time}]</span>
            <span class="log-message">${message}</span>
        `;
        
        logBox.appendChild(logEntry);
        logBox.scrollTop = logBox.scrollHeight;
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notificationContainer');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                             type === 'error' ? 'exclamation-circle' : 
                             type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const icon = document.querySelector('.theme-toggle i');
        icon.className = newTheme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
    }
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    calculateCurrentSpeed() {
        if (!this.state.startTime || this.state.sentCount === 0) return '0';
        
        const duration = (Date.now() - this.state.startTime) / 1000;
        return (this.state.sentCount / duration).toFixed(1);
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // ======== التخزين ========
    saveToStorage() {
        const data = {
            tokens: Array.from(this.tokens.values()),
            messages: this.messages,
            settings: this.settings
        };
        
        localStorage.setItem('discordSpammerPro', JSON.stringify(data));
    }
    
    loadFromStorage() {
        const saved = localStorage.getItem('discordSpammerPro');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                
                // تحميل التوكنات
                if (data.tokens && Array.isArray(data.tokens)) {
                    data.tokens.forEach(tokenData => {
                        this.tokens.set(tokenData.token, tokenData);
                    });
                }
                
                // تحميل الرسائل
                if (data.messages && Array.isArray(data.messages)) {
                    this.messages = data.messages;
                }
                
                // تحميل الإعدادات
                if (data.settings) {
                    Object.assign(this.settings, data.settings);
                    
                    // تحديث واجهة الإعدادات
                    if (document.getElementById('channelId')) {
                        document.getElementById('channelId').value = this.settings.channelId;
                        document.getElementById('mention').value = this.settings.mention;
                        document.getElementById('delayRange').value = this.settings.delay;
                        document.getElementById('delayInput').value = this.settings.delay;
                        document.getElementById('speedRange').value = this.settings.speed;
                        document.getElementById('speedValue').textContent = this.settings.speed;
                    }
                }
                
                this.log('📂 تم تحميل البيانات المحفوظة', 'success');
            } catch (error) {
                console.error('Error loading from storage:', error);
            }
        }
        
        // تحميل السمة
        const theme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        
        const icon = document.querySelector('.theme-toggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
        }
    }
    
    // ======== ميزات إضافية ========
    async importMessages() {
        // محاكاة استيراد الرسائل من ملف
        const sampleMessages = [
            "مرحباً بالجميع! 🎉",
            "كيف الحال؟ 😊",
            "أتمنى لكم يوم سعيد! 🌟",
            "هذه رسالة تلقائية من النظام 🤖",
            "شكراً لمتابعتكم! 🙏",
            "تابعونا للمزيد! 🔥",
            "لا تنسوا الإعجاب والمشاركة! 💕",
            "تفاعلوا مع المحتوى! 🚀",
            "أفضل الأمنيات لكم! ❤️",
            "إلى اللقاء في المنشور القادم! 👋"
        ];
        
        sampleMessages.forEach(msg => this.addMessage(msg));
        this.showNotification('✅ تم استيراد 10 رسائل افتراضية', 'success');
    }
    
    clearTokens() {
        if (confirm('هل تريد مسح جميع التوكنات؟')) {
            this.tokens.clear();
            this.updateTokensUI();
            this.saveToStorage();
            this.log('🗑️ تم مسح جميع التوكنات', 'warning');
        }
    }
    
    deleteMessage(id) {
        this.messages = this.messages.filter(msg => msg.id !== id);
        this.updateMessagesUI();
        this.saveToStorage();
        this.log('🗑️ تم حذف الرسالة', 'warning');
    }
    
    async testSending() {
        if (!this.settings.channelId) {
            this.showNotification('⚠️ أدخل ID الروم أولاً', 'warning');
            return;
        }
        
        const validTokens = Array.from(this.tokens.values()).filter(t => t.isValid);
        if (validTokens.length === 0) {
            this.showNotification('⚠️ لا توجد توكنات صالحة للاختبار', 'warning');
            return;
        }
        
        const testToken = validTokens[0];
        const testMessage = "🧪 هذه رسالة اختبارية من النظام. إذا وصلتك فقد تم الاتصال بنجاح!";
        
        this.log(`🧪 بدء اختبار الإرسال باستخدام ${testToken.username}...`, 'info');
        
        const success = await this.sendMessage(testToken, this.settings.channelId, testMessage);
        
        if (success) {
            this.showNotification('✅ الاختبار ناجح! تم إرسال رسالة الاختبار', 'success');
        } else {
            this.showNotification('❌ فشل الاختبار. تحقق من التوكن وID الروم', 'error');
        }
    }
    
    startStatsUpdater() {
        setInterval(() => {
            if (this.state.isRunning && !this.state.isPaused) {
                this.updateStatsUI();
                this.updateProgress();
            }
        }, 1000);
    }
}

// ======== بدء النظام ========
window.addEventListener('DOMContentLoaded', () => {
    window.spammer = new DiscordSpammerPro();
    
    // إضافة بعض الرسائل الافتراضية إذا لم توجد
    if (window.spammer.messages.length === 0) {
        const defaultMessages = [
            "مرحباً بالجميع! 👋",
            "أتمنى لكم يوماً سعيداً! 🌞",
            "شكراً للمتابعة! ❤️",
            "تفاعلوا مع المحتوى! 🚀",
            "لا تنسوا الإعجاب! 👍"
        ];
        
        defaultMessages.forEach(msg => window.spammer.addMessage(msg));
    }
    
    console.log(`
    ███████╗██████╗ ██╗███████╗ ██████╗ ██████╗ ██████╗ 
    ██╔════╝██╔══██╗██║██╔════╝██╔════╝██╔═══██╗██╔══██╗
    ███████╗██████╔╝██║███████╗██║     ██║   ██║██║  ██║
    ╚════██║██╔═══╝ ██║╚════██║██║     ██║   ██║██║  ██║
    ███████║██║     ██║███████║╚██████╗╚██████╔╝██████╔╝
    ╚══════╝╚═╝     ╚═╝╚══════╝ ╚═════╝ ╚═════╝ ╚═════╝ 
                                                        
    ✅ Discord Spammer Pro v5.0 - Ready!
    📊 Features: Multi-Token, Smart System, Ultra Fast
    ⚠️ Warning: Use responsibly!
    `);
});
