// 媒体录制相关变量
let mediaRecorder;
let recordedChunks = [];
let isRecording = false;

// 初始化媒体设备（摄像头和麦克风）
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
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    recognition.lang = 'zh-CN';
    recognition.interimResults = true;

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        document.getElementById('chat-input').value = transcript;
    };

    recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
    };
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

// 绑定按钮事件
document.getElementById('startInterview').addEventListener('click', startRecording);
document.getElementById('stopInterview').addEventListener('click', stopRecording);
document.getElementById('voice-btn').addEventListener('click', toggleVoiceInput);

// 初始化媒体设备
document.addEventListener('DOMContentLoaded', () => {
    if (navigator.mediaDevices) {
        initMedia().catch(console.error);
    } else {
        alert('您的浏览器不支持媒体设备功能！');
    }
});
