'use client';

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react';

const IMAGE_MAX_SIZE = 960;
const JPEG_QUALITY = 0.6;
const REALTIME_INTERVAL_MS = 1500;
const ZOOM_LEVELS = [1, 1.5, 2, 2.5];
const DEFAULT_ZOOM_LEVEL = 1.5;

function getScaledSize(width, height, maxSize = IMAGE_MAX_SIZE) {
    if (width <= maxSize && height <= maxSize) {
        return { width, height };
    }

    const scale = maxSize / Math.max(width, height);
    return {
        width: Math.round(width * scale),
        height: Math.round(height * scale)
    };
}

function getPlateCrop(videoWidth, videoHeight, digitalZoom = 1) {
    const safeZoom = Math.max(1, digitalZoom);
    const cropWidth = Math.max(1, Math.round((videoWidth * 0.86) / safeZoom));
    const cropHeight = Math.max(1, Math.round(Math.min(cropWidth / 3, (videoHeight * 0.5) / safeZoom)));

    return {
        sx: Math.round((videoWidth - cropWidth) / 2),
        sy: Math.round((videoHeight - cropHeight) / 2),
        sw: cropWidth,
        sh: cropHeight
    };
}

function normalizeHardwareZoom(value) {
    if (!Number.isFinite(value)) {
        return 1;
    }

    return Math.max(1, Number(value.toFixed(2)));
}

function getHardwareZoomValue(targetZoom, zoomCapability) {
    const min = Number.isFinite(zoomCapability.min) ? zoomCapability.min : 1;
    const max = Number.isFinite(zoomCapability.max) ? zoomCapability.max : targetZoom;
    const step = Number.isFinite(zoomCapability.step) && zoomCapability.step > 0
        ? zoomCapability.step
        : 0;
    const clamped = Math.min(max, Math.max(min, targetZoom));

    if (!step) {
        return normalizeHardwareZoom(clamped);
    }

    const stepped = Math.round((clamped - min) / step) * step + min;
    return normalizeHardwareZoom(Math.min(max, Math.max(min, stepped)));
}

const CameraFeed = forwardRef(function CameraFeed({ isScanning, onRecognize, overlay }, ref) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const recognitionInFlightRef = useRef(false);
    const [isRecognizing, setIsRecognizing] = useState(false);

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
    const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM_LEVEL);
    const zoomLevelRef = useRef(DEFAULT_ZOOM_LEVEL);
    const [hardwareZoomApplied, setHardwareZoomApplied] = useState(1);
    const digitalZoom = Math.max(1, zoomLevel / hardwareZoomApplied);

    const applyHardwareZoom = useCallback(async (targetZoom, stream = streamRef.current) => {
        const track = stream?.getVideoTracks?.()[0];
        const zoomCapability = track?.getCapabilities?.()?.zoom;

        if (!track || !zoomCapability || !track.applyConstraints) {
            setHardwareZoomApplied(1);
            return;
        }

        const nextHardwareZoom = getHardwareZoomValue(targetZoom, zoomCapability);

        try {
            await track.applyConstraints({
                advanced: [{ zoom: nextHardwareZoom }]
            });
            setHardwareZoomApplied(nextHardwareZoom);
        } catch (err) {
            console.warn("Hardware zoom unavailable, falling back to digital zoom", err);
            setHardwareZoomApplied(1);
        }
    }, []);

    useEffect(() => {
        zoomLevelRef.current = zoomLevel;
    }, [zoomLevel]);

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
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                }, // 优先使用后置摄像头并请求高清分辨率
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = newStream;
            }
            streamRef.current = newStream;
            setHasCamera(true);
            await applyHardwareZoom(zoomLevelRef.current, newStream);
        } catch (err) {
            console.error("Camera access error:", err);
            setErrorMsg("无法唤起摄像头，请检查权限或点击重新申请。");
            setHasCamera(false);
        }
    }, [applyHardwareZoom]);

    useEffect(() => {
        if (mode === 'realtime') {
            setupCamera();
        } else {
            // 清理视频流
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
            setHardwareZoomApplied(1);
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

    useEffect(() => {
        if (mode === 'realtime' && streamRef.current) {
            applyHardwareZoom(zoomLevel);
        }
    }, [applyHardwareZoom, mode, zoomLevel]);

    /**
     * 锁屏 / 切换 App 回到前台后，恢复摄像头视频流。
     * - iOS Safari / Android Chrome 进入后台会暂停 video，回前台时 muted+autoplay
     *   的 <video> 不会自动恢复播放，需要主动 play()。
     * - 某些设备会把 MediaStreamTrack 标记为 ended，此时必须重新 getUserMedia。
     * - 同时监听 video 元素自身的 pause / suspend，作为兜底。
     */
    useEffect(() => {
        if (mode !== 'realtime') return;

        const resumeVideo = () => {
            const stream = streamRef.current;
            const track = stream?.getVideoTracks?.()[0];

            // track 已结束 → 重新拉流
            if (!stream || !track || track.readyState === 'ended' || !track.enabled) {
                setupCamera();
                return;
            }

            // 视频元素停了 → 主动 play
            const video = videoRef.current;
            if (video && video.paused) {
                const p = video.play();
                if (p && typeof p.catch === 'function') {
                    p.catch((err) => {
                        // 自动播放被拦截时，重新申请权限通常能恢复
                        console.warn('视频恢复播放失败，尝试重启摄像头:', err);
                        setupCamera();
                    });
                }
            }
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                // 延迟一帧，等浏览器把 video 状态刷新好
                setTimeout(resumeVideo, 100);
            }
        };

        const onPageShow = () => {
            setTimeout(resumeVideo, 100);
        };

        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pageshow', onPageShow);
        window.addEventListener('focus', onPageShow);

        const video = videoRef.current;
        if (video) {
            video.addEventListener('pause', resumeVideo);
            video.addEventListener('suspend', resumeVideo);
        }

        return () => {
            document.removeEventListener('visibilitychange', onVisibilityChange);
            window.removeEventListener('pageshow', onPageShow);
            window.removeEventListener('focus', onPageShow);
            if (video) {
                video.removeEventListener('pause', resumeVideo);
                video.removeEventListener('suspend', resumeVideo);
            }
        };
    }, [mode, setupCamera]);

    const sendImageForRecognition = useCallback(async (base64Image, isRealtime) => {
        if (recognitionInFlightRef.current) {
            return;
        }

        recognitionInFlightRef.current = true;
        setIsRecognizing(true);

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
        } finally {
            recognitionInFlightRef.current = false;
            setIsRecognizing(false);
        }
    }, [onRecognize]);

    // 截帧并调用 API
    const captureAndRecognize = useCallback(async () => {
        if (recognitionInFlightRef.current) return;
        if (!videoRef.current || !canvasRef.current || !hasCamera) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');

        if (!video.videoWidth || !video.videoHeight) return;

        const crop = getPlateCrop(video.videoWidth, video.videoHeight, digitalZoom);
        const targetSize = getScaledSize(crop.sw, crop.sh);

        canvas.width = targetSize.width;
        canvas.height = targetSize.height;

        context.drawImage(
            video,
            crop.sx,
            crop.sy,
            crop.sw,
            crop.sh,
            0,
            0,
            targetSize.width,
            targetSize.height
        );
        const base64Image = canvas.toDataURL('image/jpeg', JPEG_QUALITY);

        await sendImageForRecognition(base64Image, true);
    }, [digitalZoom, hasCamera, sendImageForRecognition]);

    // 轮询控制
    useEffect(() => {
        if (mode === 'realtime' && isScanning && hasCamera) {
            pollIntervalRef.current = setInterval(() => {
                captureAndRecognize();
            }, REALTIME_INTERVAL_MS);
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
        if (recognitionInFlightRef.current) return;

        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                const { width, height } = getScaledSize(img.width, img.height);
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                const base64Image = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
                sendImageForRecognition(base64Image, false);
                e.target.value = '';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="camera-section">
            {overlay && <div className="camera-overlay-hud">{overlay}</div>}
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
                            style={{ transform: `scale(${digitalZoom})` }}
                        />
                        {isScanning && <div className="camera-overlay"></div>}
                        <div className="zoom-control" role="group" aria-label="镜头缩放">
                            <span className="zoom-label">缩放</span>
                            <div className="zoom-options">
                                {ZOOM_LEVELS.map(level => (
                                    <button
                                        key={level}
                                        type="button"
                                        className={`zoom-option ${zoomLevel === level ? 'is-active' : ''}`}
                                        aria-pressed={zoomLevel === level}
                                        title={`镜头缩放 ${level}x`}
                                        onClick={() => setZoomLevel(level)}
                                    >
                                        {level}x
                                    </button>
                                ))}
                            </div>
                        </div>
                        {isRecognizing && (
                            <div className="recognition-pill">
                                识别中
                            </div>
                        )}
                    </>
                )
            ) : (
                <div className="upload-container">
                    <div className="upload-icon">📷</div>
                    <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
                        如果无法使用实时扫描，可使用拍照或相册上传车牌照片。
                    </p>
                    <label className={`upload-label ${isRecognizing ? 'is-disabled' : ''}`}>
                        {isRecognizing ? '识别中...' : '拍摄/选择照片'}
                        <input 
                            ref={fileInputRef}
                            type="file" 
                            accept="image/*" 
                            capture="environment" 
                            className="file-input"
                            disabled={isRecognizing}
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
