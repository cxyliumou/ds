const API_KEY = 'sk-428cd5de780149cf9e96ec67301c430d'; // 替换为您的实际 API Key
const API_URL = 'https://api.deepseek.com/chat/completions';

// 媒体录制相关变量
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// 初始化媒体设备
async function initMedia() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 1280, height: 720 },
            audio: true
        });
        const videoElement = document.getElementById('preview');
        videoElement.srcObject = stream;

        // 初始化媒体录制器
        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (e) => {
            if (e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        mediaRecorder.onstop = () => {
            const blob = new Blob(recordedChunks, { type: 'video/webm' });
            // 这里可以添加视频上传逻辑
            recordedChunks = [];
            console.log('录制完成，视频已保存:', blob);
        };

    } catch (error) {
        console.error('获取媒体设备失败:', error);
        alert('无法访问摄像头/麦克风，请检查设备权限！');
    }
}

// 开始录制
async function startRecording() {
    if (!mediaRecorder) {
        await initMedia();
    }
    if (mediaRecorder.state === 'inactive') {
        mediaRecorder.start();
        isRecording = true;
        document.getElementById('recording-indicator').style.display = 'block';
        document.getElementById('startInterview').disabled = true;
        document.getElementById('stopInterview').disabled = false;
        console.log('录制已开始');
    }
}

// 停止录制
function stopRecording() {
    if (mediaRecorder && isRecording) {
        mediaRecorder.stop();
        isRecording = false;
        document.getElementById('recording-indicator').style.display = 'none';
        document.getElementById('startInterview').disabled = false;
        document.getElementById('stopInterview').disabled = true;
        console.log('录制已停止');

        // 停止所有媒体流
        const stream = document.getElementById('preview').srcObject;
        stream.getTracks().forEach(track => track.stop());
    }
}

// 语音输入功能
let recognition;
function initSpeechRecognition() {
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
        recognition.lang = 'zh-CN';
        recognition.interimResults = true;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chat-input').value = transcript;
        };

        recognition.onerror = (event) => {
            console.error('语音识别错误:', event.error);
            alert('语音识别失败，请检查麦克风权限！');
        };
    } else {
        console.warn('当前浏览器不支持语音识别');
        alert('您的浏览器不支持语音识别功能，请使用 Chrome 或 Edge 浏览器。');
    }
}

function toggleVoiceInput() {
    const voiceBtn = document.getElementById('voice-btn');
    if (!recognition) initSpeechRecognition();

    if (voiceBtn.classList.contains('active')) {
        recognition.stop();
        voiceBtn.classList.remove('active');
    } else {
        recognition.start();
        voiceBtn.classList.add('active');
    }
}

// 格式化消息文本
function formatMessage(text) {
    if (!text) return '';

    // 处理标题和换行
    let lines = text.split('\n');
    let formattedLines = lines.map(line => {
        // 处理标题（**文本**）
        line = line.replace(/\*\*(.*?)\*\*/g, '<span class="bold-text">$1</span>');
        return line;
    });

    // 将 ### 替换为换行，并确保每个部分都是一个段落
    let processedText = formattedLines.join('\n');
    let sections = processedText
        .split('###')
        .filter(section => section.trim())
        .map(section => {
            // 移除多余的换行和空格
            let lines = section.split('\n').filter(line => line.trim());

            if (lines.length === 0) return '';

            // 处理每个部分
            let result = '';
            let currentIndex = 0;

            while (currentIndex < lines.length) {
                let line = lines[currentIndex].trim();

                // 如果是数字开头（如 "1.")
                if (/^\d+\./.test(line)) {
                    result += `<p class="section-title">${line}</p>`;
                }
                // 如果是小标题（以破折号开头）
                else if (line.startsWith('-')) {
                    result += `<p class="subsection"><span class="bold-text">${line.replace(/^-/, '').trim()}</span></p>`;
                }
                // 如果是正文（包含冒号的行）
                else if (line.includes(':')) {
                    let [subtitle, content] = line.split(':').map(part => part.trim());
                    result += `<p><span class="subtitle">${subtitle}</span>: ${content}</p>`;
                }
                // 普通文本
                else {
                    result += `<p>${line}</p>`;
                }
                currentIndex++;
            }
            return result;
        });

    return sections.join('');
}

// 添加消息到聊天窗口
function addMessage(content, role) {
    const messages = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);

    const avatar = document.createElement('img');
    avatar.src = role === 'user' ? 'user-avatar.png' : 'bot-avatar.png';
    avatar.alt = role === 'user' ? 'User' : 'Bot';

    const messageContent = document.createElement('div');
    messageContent.className = 'message-content';
    messageContent.innerHTML = role === 'user' ? content : formatMessage(content);

    messageElement.appendChild(avatar);
    messageElement.appendChild(messageContent);
    messages.appendChild(messageElement);

    // 平滑滚动到底部
    messageElement.scrollIntoView({ behavior: 'smooth' });
}

// DeepSeek API 调用
async function sendMessage() {
    const input = document.getElementById('chat-input').value;
    if (!input) return;

    showLoading();
    addMessage(input, 'user');
    document.getElementById('chat-input').value = '';

    try {
        const payload = {
            model: "deepseek-chat",
            messages: [
                { role: "system", content: "You are a helpful assistant" },
                { role: "user", content: input }
            ],
            stream: false,
            temperature: 0.7
        };

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`API 请求失败: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('API 响应:', data); // 打印 API 响应
        if (data.choices && data.choices.length > 0) {
            addMessage(data.choices[0].message.content, 'bot');
        } else {
            throw new Error('API 返回数据无效');
        }
    } catch (error) {
        console.error('API请求失败:', error);
        addMessage(`出错了: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// 显示加载动画
function showLoading() {
    document.getElementById('loading').style.display = 'block';
}

// 隐藏加载动画
function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

// 绑定按钮事件
document.getElementById('startInterview').addEventListener('click', startRecording);
document.getElementById('stopInterview').addEventListener('click', stopRecording);
document.getElementById('voice-btn').addEventListener('click', toggleVoiceInput);

// 监听回车键
document.getElementById('chat-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault(); // 防止默认换行行为
        sendMessage();
    }
});

// 初始化媒体设备
document.addEventListener('DOMContentLoaded', () => {
    if (navigator.mediaDevices) {
        initMedia().catch(console.error);
    } else {
        alert('您的浏览器不支持媒体设备功能！');
    }
});
