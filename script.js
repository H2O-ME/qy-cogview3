document.addEventListener('DOMContentLoaded', function() {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-btn');
    const newChatButton = document.getElementById('new-chat');
    const themeToggle = document.getElementById('theme-toggle');
    
    // 设置当前日期
    const currentDateElem = document.getElementById('current-date');
    if (currentDateElem) {
        const now = new Date();
        currentDateElem.textContent = now.toLocaleDateString('zh-CN');
    }
    
    // 确保highlight.js加载
    function ensureHighlightJsLoaded() {
        if (!window.hljs) {
            console.warn("highlight.js 未加载，尝试动态加载...");
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/highlight.js@11.7.0/lib/highlight.min.js";
            document.head.appendChild(script);
            
            return new Promise((resolve) => {
                script.onload = () => {
                    console.log("highlight.js 已成功加载");
                    resolve();
                };
                script.onerror = () => {
                    console.error("highlight.js 加载失败");
                    resolve(); // 即使失败也继续
                };
            });
        }
        return Promise.resolve();
    }
    
    // 在页面加载时检查
    ensureHighlightJsLoaded();
    
    // 配置marked.js以支持语法高亮
    marked.setOptions({
        highlight: function(code, lang) {
            try {
                if (lang && window.hljs && window.hljs.getLanguage(lang)) {
                    return window.hljs.highlight(code, { language: lang }).value;
                } else if (window.hljs) {
                    return window.hljs.highlightAuto(code).value;
                }
            } catch (e) {
                console.error("代码高亮出错:", e);
            }
            // 如果hljs未加载或出错，返回原始代码
            return code;
        },
        breaks: true
    });
    
    // 使用CryptoJS加密API密钥
    function decryptApiKey(encryptedKey, password) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedKey, password);
            return bytes.toString(CryptoJS.enc.Utf8);
        } catch (error) {
            console.error("解密错误:", error);
            return "";
        }
    }
    
    // 加密API密钥 
    const encryptedApiKey = "U2FsdGVkX1/7gqRQIGh6xSHdPj06YmsJhK9FrfN6hKEGUx1h7B+psBxjbDaZAZxz"+
                            "2z8CCTdyOufgQ4veDVmQ4SKSFCfa1EeppeNauzeyuMA=";
    let decryptedApiKey = null;
    
    // 主题切换功能
    themeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        const icon = this.querySelector('i');
        if (icon.classList.contains('ri-sun-line')) {
            icon.classList.remove('ri-sun-line');
            icon.classList.add('ri-moon-line');
        } else {
            icon.classList.remove('ri-moon-line');
            icon.classList.add('ri-sun-line');
        }
    });
    
    // 调整textarea高度
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, 150) + 'px';
    });
    
    // 按Enter键发送消息
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    // 点击发送按钮
    sendButton.addEventListener('click', sendMessage);
    
    // 新建对话
    newChatButton.addEventListener('click', function() {
        chatContainer.innerHTML = `
            <div class="welcome-message">
                <h2>欢迎使用清言AI图像生成服务</h2>
                <p>这是一个基于CogView-3模型的AI图像生成应用，请输入您的描述文本来生成图像。</p>
            </div>
        `;
    });
    
    // 添加用户消息
    function addUserMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-container', 'user-container');
        messageElement.innerHTML = `
            <div class="avatar user-avatar">
                <i class="ri-user-fill"></i>
            </div>
            <div class="message user-message">
                ${message}
            </div>
        `;
        
        // 删除欢迎消息
        const welcomeMessage = document.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        chatContainer.appendChild(messageElement);
        scrollToBottom();
        
        // 添加出现动画
        setTimeout(() => {
            messageElement.classList.add('appeared');
        }, 50);
    }
    
    // 添加机器人输入指示器
    function addBotTypingIndicator() {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message-container', 'bot-container');
        messageElement.innerHTML = `
            <div class="avatar bot-avatar">
            </div>
            <div class="message bot-message">
                <div class="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        
        chatContainer.appendChild(messageElement);
        scrollToBottom();
        
        return messageElement.querySelector('.bot-message');
    }
    
    // 更新机器人消息为图像
    function updateBotMessageWithImage(element, imageUrl) {
        element.innerHTML = `
            <div class="image-container">
                <img src="${imageUrl}" alt="AI生成的图像" class="generated-image">
                <div class="image-controls">
                    <a href="${imageUrl}" download="cogview_image.jpg" class="download-btn">
                        <i class="ri-download-line"></i> 下载图像
                    </a>
                </div>
            </div>
        `;
        
        scrollToBottom();
    }

    // 更新机器人消息为错误信息
    function updateBotMessageWithError(element, errorMessage) {
        element.innerHTML = `
            <div class="error-message">
                <i class="ri-error-warning-line"></i>
                <p>${errorMessage}</p>
            </div>
        `;
        
        scrollToBottom();
    }
    
    // 滚动到底部
    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 获取用户输入的密码并解密API密钥
    async function getDecryptedApiKey() {
        // 如果已经解密过，直接返回
        if (decryptedApiKey) {
            return decryptedApiKey;
        }
        
        // 创建密码输入对话框
        return new Promise((resolve) => {
            // 创建模态对话框
            const modalOverlay = document.createElement('div');
            modalOverlay.className = 'modal-overlay';
            
            const modalContainer = document.createElement('div');
            modalContainer.className = 'modal-container';
            
            modalContainer.innerHTML = `
                <div class="modal-header">
                    <h3>请输入授权码</h3>
                </div>
                <div class="modal-body">
                    <p>请输入管理员向您提供的密码以继续使用</p>
                    <input type="password" id="decrypt-password" class="password-input" placeholder="输入密码...">
                    <div class="error-message" style="display: none; color: #dc3545; margin-top: 10px;"></div>
                </div>
                <div class="modal-footer">
                    <button id="decrypt-button" class="decrypt-button">解密</button>
                </div>
            `;
            
            // 添加到文档
            modalOverlay.appendChild(modalContainer);
            document.body.appendChild(modalOverlay);
            
            // 获取元素
            const passwordInput = document.getElementById('decrypt-password');
            const decryptButton = document.getElementById('decrypt-button');
            const errorMessage = document.querySelector('.error-message');
            
            // 自动聚焦到密码输入框
            passwordInput.focus();
            
            // 点击解密按钮
            const handleDecrypt = () => {
                const password = passwordInput.value.trim();
                if (!password) {
                    errorMessage.textContent = '请输入密码';
                    errorMessage.style.display = 'block';
                    return;
                }
                
                try {
                    // 尝试解密
                    const apiKey = decryptApiKey(encryptedApiKey, password);
                    if (!apiKey) {
                        throw new Error('解密失败，密码可能不正确');
                    }
                    
                    // 解密成功，移除模态框
                    document.body.removeChild(modalOverlay);
                    decryptedApiKey = apiKey; // 保存解密后的密钥
                    resolve(apiKey);
                } catch (error) {
                    errorMessage.textContent = '解密失败，请检查密码是否正确';
                    errorMessage.style.display = 'block';
                    passwordInput.value = '';
                    passwordInput.focus();
                }
            };
            
            // 点击解密按钮
            decryptButton.addEventListener('click', handleDecrypt);
            
            // 按Enter键也可以解密
            passwordInput.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleDecrypt();
                }
            });
        });
    }
    
    // 发送消息函数
    function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;
        
        // 添加用户消息到聊天容器
        addUserMessage(message);
        
        // 清空输入框并重置高度
        userInput.value = '';
        userInput.style.height = 'auto';
        
        // 添加正在输入指示器
        const botMessageElement = addBotTypingIndicator();
        
        // 调用CogView-3-Flash API
        fetchImageFromCogView(message, botMessageElement);
    }
    
    // 调用CogView-3-Flash API生成图像
    async function fetchImageFromCogView(prompt, botMessageElement) {
        // 获取解密后的API密钥
        let apiKey;
        try {
            apiKey = await getDecryptedApiKey();
        } catch (error) {
            updateBotMessageWithError(botMessageElement, "API密钥解密失败，无法继续。错误信息: " + error.message);
            return;
        }
        
        // 请求数据结构
        const requestData = {
            prompt: prompt,
            model: "cogview-3-flash",
            n: 1,
            width: 1024,
            height: 1024,
            steps: 28
        };

        try {
            // CogView-3-Flash API端点
            const apiUrl = "https://open.bigmodel.cn/api/paas/v4/images/generations";
            
            // 使用fetch API发送请求
            const response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`API请求失败: ${errorData.error?.message || response.status}`);
            }

            const data = await response.json();
            
            if (data.data && data.data.length > 0 && data.data[0].url) {
                // 更新消息为图像
                updateBotMessageWithImage(botMessageElement, data.data[0].url);
            } else {
                throw new Error("未能获取到生成的图像");
            }
            
        } catch (error) {
            console.error("API请求错误:", error);
            updateBotMessageWithError(botMessageElement, "抱歉，图像生成失败。错误信息: " + error.message);
        }
    }
    
    // 添加深色模式CSS
    const darkThemeStyle = document.createElement('style');
    darkThemeStyle.textContent = `
        body.dark-theme {
            background: linear-gradient(to bottom right, #1a1c2d, #2d2b3d);
            color: #f5f5f5;
        }
        
        body.dark-theme .sidebar {
            background: #252836;
            border-right: 1px solid #3f4156;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }
        
        body.dark-theme .logo-icon {
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
        }
        
        body.dark-theme .model-name {
            color: #a3a8e0;
        }
        
        body.dark-theme .model-version,
        body.dark-theme .footer,
        body.dark-theme .history-title,
        body.dark-theme .light-text {
            color: #a0a0a0;
        }
        
        body.dark-theme .history-title-header {
            color: #a3a8e0;
        }
        
        body.dark-theme .footer {
            border-top: 1px solid #3f4156;
        }
        
        body.dark-theme .chat-history-item:hover {
            background-color: rgba(78, 84, 200, 0.15);
        }
        
        body.dark-theme .main {
            background-color: #1e1f2c;
        }
        
        body.dark-theme .header {
            background-color: #252836;
            box-shadow: 0 2px 15px rgba(0, 0, 0, 0.15);
        }
        
        body.dark-theme .welcome-message {
            background: #252836;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        }
        
        body.dark-theme .welcome-message p {
            color: #a0a0a0;
        }
        
        body.dark-theme .user-message {
            background: linear-gradient(135deg, #394175, #32386e);
            border-left: 1px solid rgba(255, 255, 255, 0.1);
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            color: #f5f5f5;
        }
        
        body.dark-theme .bot-message {
            background: linear-gradient(135deg, #252836, #2a2d3e);
            border-left: 1px solid rgba(255, 255, 255, 0.05);
            border-top: 1px solid rgba(255, 255, 255, 0.02);
            color: #f5f5f5;
        }
        
        body.dark-theme .input-container {
            background-color: #252836;
            box-shadow: 0 -2px 15px rgba(0, 0, 0, 0.15);
        }
        
        body.dark-theme #user-input {
            background-color: #1e1f2c;
            border: 1px solid #3f4156;
            color: #f5f5f5;
        }
        
        body.dark-theme #user-input:focus {
            border-color: #4e54c8;
            box-shadow: 0 0 0 3px rgba(78, 84, 200, 0.2);
        }
        
        body.dark-theme .theme-toggle {
            background: #252836;
            border: 1px solid #3f4156;
        }
        
        body.dark-theme .theme-toggle i {
            color: #a3a8e0;
        }
        
        body.dark-theme .encryption-status {
            background: rgba(37, 40, 54, 0.9);
            color: #a0a0a0;
        }
        
        body.dark-theme .error-message {
            background-color: rgba(220, 53, 69, 0.1);
            border-left: 3px solid #dc3545;
        }
        
        body.dark-theme ::-webkit-scrollbar-track {
            background: #252836;
        }
        
        body.dark-theme ::-webkit-scrollbar-thumb {
            background: #3f4156;
        }
        
        body.dark-theme ::-webkit-scrollbar-thumb:hover {
            background: #4e54c8;
        }
    `;
    
    document.head.appendChild(darkThemeStyle);
    
    // 添加模态对话框样式
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
        .modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }
        
        .modal-container {
            background-color: white;
            border-radius: 10px;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.2);
            width: 400px;
            max-width: 90%;
            overflow: hidden;
            animation: modalFadeIn 0.3s ease;
        }
        
        @keyframes modalFadeIn {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }
        
        .modal-header {
            padding: 15px 20px;
            border-bottom: 1px solid var(--border-color);
        }
        
        .modal-header h3 {
            margin: 0;
            color: var(--primary-color);
        }
        
        .modal-body {
            padding: 20px;
        }
        
        .modal-footer {
            padding: 15px 20px;
            border-top: 1px solid var(--border-color);
            display: flex;
            justify-content: flex-end;
        }
        
        .password-input {
            width: 100%;
            padding: 12px 15px;
            margin-top: 10px;
            border: 1px solid var(--border-color);
            border-radius: 8px;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .password-input:focus {
            outline: none;
            border-color: var(--primary-color);
            box-shadow: 0 0 0 3px rgba(78, 84, 200, 0.2);
        }
        
        .decrypt-button {
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
        }
        
        .decrypt-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(78, 84, 200, 0.3);
        }
        
        body.dark-theme .modal-container {
            background-color: #252836;
            box-shadow: 0 5px 25px rgba(0, 0, 0, 0.3);
        }
        
        body.dark-theme .modal-header,
        body.dark-theme .modal-footer {
            border-color: #3f4156;
        }
        
        body.dark-theme .modal-header h3,
        body.dark-theme .modal-body p {
            color: #f5f5f5;
        }
        
        body.dark-theme .password-input {
            background-color: #1e1f2c;
            border: 1px solid #3f4156;
            color: #f5f5f5;
        }
        
        /* 图像容器样式 */
        .image-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }
        
        .generated-image {
            max-width: 100%;
            max-height: 400px; /* 限制图像最大高度 */
            object-fit: contain; /* 保持图像比例 */
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            margin-bottom: 15px;
            transition: transform 0.3s ease;
        }
        
        .generated-image:hover {
            transform: scale(1.02);
            cursor: pointer;
        }
        
        /* 点击图像可以全屏查看 */
        .fullscreen-image {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        
        .fullscreen-image img {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        }
        
        .fullscreen-close {
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            font-size: 24px;
            cursor: pointer;
        }
        
        .image-controls {
            display: flex;
            justify-content: center;
            margin-top: 10px;
        }
        
        .download-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            text-decoration: none;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(78, 84, 200, 0.3);
        }
        
        .error-message {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 15px;
            background-color: rgba(220, 53, 69, 0.05);
            border-left: 3px solid var(--danger-color);
            border-radius: 5px;
        }
        
        .error-message i {
            color: var(--danger-color);
            font-size: 1.5rem;
        }
    `;
    document.head.appendChild(modalStyle);

    // 在modalStyle后面添加图像样式
    const imageStyle = document.createElement('style');
    imageStyle.textContent = `
        .image-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 100%;
        }
        
        .generated-image {
            max-width: 100%;
            max-height: 400px; /* 限制图像最大高度 */
            object-fit: contain; /* 保持图像比例 */
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
            margin-bottom: 15px;
            transition: transform 0.3s ease;
        }
        
        .generated-image:hover {
            transform: scale(1.02);
            cursor: pointer;
        }
        
        /* 点击图像可以全屏查看 */
        .fullscreen-image {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background-color: rgba(0, 0, 0, 0.9);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        }
        
        .fullscreen-image img {
            max-width: 90%;
            max-height: 90%;
            object-fit: contain;
        }
        
        .fullscreen-close {
            position: absolute;
            top: 20px;
            right: 20px;
            color: white;
            font-size: 24px;
            cursor: pointer;
        }
        
        .image-controls {
            display: flex;
            justify-content: center;
            margin-top: 10px;
        }
        
        .download-btn {
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            text-decoration: none;
            padding: 8px 15px;
            border-radius: 20px;
            font-size: 0.9rem;
            transition: all 0.3s ease;
        }
        
        .download-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 15px rgba(78, 84, 200, 0.3);
        }
        
        /* 深色主题样式 */
        body.dark-theme .generated-image {
            box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
        }
        
        /* 响应式样式 */
        @media (max-width: 768px) {
            .generated-image {
                max-height: 300px;
            }
        }
    `;
    document.head.appendChild(imageStyle);

    // 添加图像点击查看大图功能
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('generated-image')) {
            const imageUrl = e.target.src;
            
            // 创建全屏图像查看层
            const fullscreenView = document.createElement('div');
            fullscreenView.className = 'fullscreen-image';
            fullscreenView.innerHTML = `
                <div class="fullscreen-close"><i class="ri-close-line"></i></div>
                <img src="${imageUrl}" alt="全屏查看">
            `;
            
            document.body.appendChild(fullscreenView);
            
            // 点击关闭全屏查看
            fullscreenView.addEventListener('click', function() {
                document.body.removeChild(fullscreenView);
            });
        }
    });
}); 