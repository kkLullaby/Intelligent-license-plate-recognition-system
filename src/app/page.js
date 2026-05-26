'use client';

import { useState, useRef } from 'react';
import CameraFeed from '@/components/CameraFeed';
import ResultPanel from '@/components/ResultPanel';

export default function Home() {
    const [isScanning, setIsScanning] = useState(true);
    const [result, setResult] = useState(null);
    const cameraFeedRef = useRef(null);

    const handleRecognize = (data) => {
        // 如果没有识别到或者网络错误，且在实时模式下，只打印日志并继续扫描
        if (!data.success && data.isRealtime) {
            console.log("扫描中...", data.message);
            return;
        }
        // 成功识别到车牌，或者在拍照上传模式下失败，停止扫描并展示结果
        setIsScanning(false);
        setResult(data);
    };

    const handleResumeScan = () => {
        if (cameraFeedRef.current) {
            cameraFeedRef.current.triggerUpload();
        }
        setResult(null);
        setIsScanning(true);
    };

    return (
        <main className="app-container">
            <CameraFeed 
                ref={cameraFeedRef}
                isScanning={isScanning} 
                onRecognize={handleRecognize} 
            />
            <div className="info-section">
                <ResultPanel 
                    result={result}
                    isScanning={isScanning}
                    onResumeScan={handleResumeScan}
                />
            </div>
        </main>
    );
}
