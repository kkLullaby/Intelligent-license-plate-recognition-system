'use client';

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

const CameraFeed = forwardRef(function CameraFeed({ isScanning, onRecognize }, ref) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);

    useImperativeHandle(ref, () => ({
        triggerUpload: () => {
            if (mode === 'upload' && fileInputRef.current) {
                fileInputRef.current.click();
            }
        }
    }));
    const [hasCamera, setHasCamera] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const pollIntervalRef = useRef(null);
    const [mode, setMode] = useState('upload'); // 'realtime' or 'upload'
    const streamRef = useRef(null);

    // 请求摄像头权限并开启视频流
    const setupCamera = useCallback(async () => {
        // 延迟清空错误，避免 effect 中的同步 setState
        setTimeout(() => setErrorMsg(''), 0);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setErrorMsg("当前环境不支持访问摄像头（请确保使用HTTPS协议或localhost）。");
            setHasCamera(false);
            return;
        }
        try {
            const newStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }, // 优先使用后置摄像头
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            streamRef.current = newStream;
            setHasCamera(true);
        } catch (err) {
            console.error("Camera access error:", err);
            setErrorMsg("无法唤起摄像头，请检查权限或点击重新申请。");
            setHasCamera(false);
        }
    }, []);

    useEffect(() => {
        if (mode === 'realtime') {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setupCamera();
        } else {
            // 清理视频流
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        }
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [mode, setupCamera]); // 当模式切换时触发

    const sendImageForRecognition = useCallback(async (base64Image, isRealtime) => {
        try {
            const res = await fetch('/api/recognize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: base64Image })
            });
            const data = await res.json();
            onRecognize({ ...data, isRealtime });
        } catch (err) {
            console.error("Recognition request failed", err);
            onRecognize({ success: false, message: '网络请求失败，正在重试...', isRealtime });
        }
    }, [onRecognize]);

    // 截帧并调用 API
    const captureAndRecognize = useCallback(async () => {
        if (!videoRef.current || !canvasRef.current || !hasCamera) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
        }

        if (canvas.width === 0) return;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const base64Image = canvas.toDataURL('image/jpeg', 0.7);

        await sendImageForRecognition(base64Image, true);
    }, [hasCamera, sendImageForRecognition]);

    // 轮询控制 (每秒1次)
    useEffect(() => {
        if (mode === 'realtime' && isScanning && hasCamera) {
            pollIntervalRef.current = setInterval(() => {
                captureAndRecognize();
            }, 1000);
        } else {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        }

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, [isScanning, hasCamera, captureAndRecognize, mode]);

    // 处理文件上传
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                // 限制图片最大宽度/高度进行压缩
                const MAX_SIZE = 1200;
                let width = img.width;
                let height = img.height;
                if (width > height && width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                } else if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64Image = canvas.toDataURL('image/jpeg', 0.7);
                sendImageForRecognition(base64Image, false);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="camera-section">
            <div className="camera-controls">
                <button 
                    className="btn btn-secondary" 
                    onClick={() => setMode(m => m === 'realtime' ? 'upload' : 'realtime')}
                >
                    {mode === 'realtime' ? '切换拍照/相册' : '切换实时扫描'}
                </button>
                {mode === 'realtime' && (!hasCamera || errorMsg) && (
                    <button className="btn btn-secondary" onClick={setupCamera}>
                        重新申请权限
                    </button>
                )}
            </div>

            {mode === 'realtime' ? (
                errorMsg ? (
                    <div style={{ color: '#ef4444', padding: '20px', textAlign: 'center', zIndex: 10 }}>
                        <p>{errorMsg}</p>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="camera-video"
                        />
                        {isScanning && <div className="camera-overlay"></div>}
                    </>
                )
            ) : (
                <div className="upload-container">
                    <div className="upload-icon">📷</div>
                    <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                        如果无法使用实时扫描，可使用拍照或相册上传车牌照片。
                    </p>
                    <label className="upload-label">
                        拍摄/选择照片
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="file-input"
                            onChange={handleFileUpload}
                        />
                    </label>
                </div>
            )}
            
            <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
    );
});

export default CameraFeed;
