'use client';

import { useState, useRef, useCallback } from 'react';
import CameraFeed from '@/components/CameraFeed';
import ResultPanel from '@/components/ResultPanel';
import LogPanel from '@/components/LogPanel';
import GateStats from '@/components/GateStats';
import reservations from '@/data/reservations.json';

function normalizePlate(value) {
    return String(value ?? '')
        .trim()
        .replace(/[\s·.\-]/g, '')
        .toUpperCase();
}

export default function Home() {
    const [isScanning, setIsScanning] = useState(true);
    const [result, setResult] = useState(null);
    const cameraFeedRef = useRef(null);
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [statsRefreshKey, setStatsRefreshKey] = useState(0);

    const refreshStats = useCallback(() => {
        setStatsRefreshKey(k => k + 1);
    }, []);

    const handleRecognize = (data) => {
        // 如果没有识别到或者网络错误，且在实时模式下，只打印日志并继续扫描
        if (!data.success && data.isRealtime) {
            console.log("扫描中...", data.message);
            return;
        }
        // 成功识别到车牌，或者在拍照上传模式下失败，停止扫描并展示结果
        setIsScanning(false);
        setResult(data);
        if (data.success) refreshStats();
    };

    const handleResumeScan = () => {
        if (cameraFeedRef.current) {
            cameraFeedRef.current.triggerUpload();
        }
        setResult(null);
        setIsScanning(true);
    };

    const handleManualLookup = async (plateValue) => {
        const plate = normalizePlate(plateValue);
        if (!plate) return;

        const reservation = reservations.find(
            item => normalizePlate(item.plate) === plate
        );

        const resultData = {
            success: true,
            plate,
            isReserved: Boolean(reservation),
            parkingLot: reservation?.parkingLot,
            source: 'manual'
        };

        // 记录手动查询日志
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plate,
                    isReserved: resultData.isReserved,
                    parkingLot: resultData.parkingLot ?? null,
                    source: 'manual',
                }),
            });
        } catch (err) {
            console.warn('日志记录失败:', err);
        }

        setIsScanning(false);
        setResult(resultData);
        refreshStats();
    };

    return (
        <main className="app-container">
            <CameraFeed 
                ref={cameraFeedRef}
                isScanning={isScanning} 
                onRecognize={handleRecognize} 
            />
            <div className="info-section">
                <GateStats refreshKey={statsRefreshKey} />
                <ResultPanel 
                    result={result}
                    isScanning={isScanning}
                    onResumeScan={handleResumeScan}
                    onManualLookup={handleManualLookup}
                />
            </div>

            <button
                className="log-fab"
                onClick={() => setIsLogOpen(true)}
                title="查看识别记录"
                aria-label="查看识别记录"
            >
                📋
            </button>

            <LogPanel
                isOpen={isLogOpen}
                onClose={() => setIsLogOpen(false)}
            />
        </main>
    );
}
