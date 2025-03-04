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

// DeepSeek API 调用
async function sendMessage() {
    const input = document.getElementById('chat-input').value;
    if (!input) return;

    showLoading();
    addMessage(input, 'user');
    document.getElementById('chat-input').value = '';

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                messages: [{
                    role: "user",
                    content: input
                }],
                temperature: 0.7
            })
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
        addMessage('系统暂时无法响应，请稍后再试', 'error');
    } finally {
        hideLoading();
    }
}

// 添加消息到聊天窗口
function addMessage(content, role) {
    const messages = document.getElementById('messages');
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', role);
    messageElement.innerHTML = `
        <div class="message-content">${content}</div>
    `;
    messages.appendChild(messageElement);
    messages.scrollTop = messages.scrollHeight;
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
    if (event.key === 'Enter') {
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
