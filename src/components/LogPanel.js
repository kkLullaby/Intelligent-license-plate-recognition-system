'use client';

import { useState, useEffect, useCallback } from 'react';

function formatTimestamp(isoString) {
    const date = new Date(isoString);
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getSourceLabel(source) {
    switch (source) {
        case 'ocr': return 'OCR扫描';
        case 'manual': return '手动查询';
        case 'realtime': return '实时扫描';
        case 'upload': return '照片上传';
        default: return source || '未知';
    }
}

export default function LogPanel({ isOpen, onClose }) {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchPlate, setSearchPlate] = useState('');

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchPlate.trim()) {
                params.set('plate', searchPlate.trim());
            }
            const res = await fetch(`/api/logs?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.records || []);
            }
        } catch (err) {
            console.error('获取日志失败:', err);
        } finally {
            setLoading(false);
        }
    }, [searchPlate]);

    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen, fetchLogs]);

    const handleClearLogs = async () => {
        if (!confirm('确定要清空所有识别记录吗？此操作不可恢复。')) return;
        try {
            const res = await fetch('/api/logs', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setLogs([]);
            }
        } catch (err) {
            console.error('清空日志失败:', err);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="log-panel-overlay" onClick={onClose}>
            <div className="log-panel" onClick={e => e.stopPropagation()}>
                <div className="log-panel-header">
                    <h2 className="log-panel-title">
                        <span className="log-icon">📋</span>
                        识别记录
                    </h2>
                    <button className="log-close-btn" onClick={onClose} aria-label="关闭">
                        ✕
                    </button>
                </div>

                <div className="log-toolbar">
                    <div className="log-search-wrapper">
                        <input
                            className="log-search-input"
                            type="text"
                            placeholder="搜索车牌号..."
                            value={searchPlate}
                            onChange={e => setSearchPlate(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchLogs()}
                        />
                        <button className="log-search-btn" onClick={fetchLogs}>
                            搜索
                        </button>
                    </div>
                    <div className="log-actions">
                        <button className="log-refresh-btn" onClick={fetchLogs} title="刷新">
                            ↻
                        </button>
                        <button
                            className="log-clear-btn"
                            onClick={handleClearLogs}
                            disabled={logs.length === 0}
                        >
                            清空
                        </button>
                    </div>
                </div>

                <div className="log-count">
                    共 <strong>{logs.length}</strong> 条记录
                </div>

                <div className="log-list">
                    {loading ? (
                        <div className="log-empty">
                            <div className="log-spinner"></div>
                            <p>加载中...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="log-empty">
                            <span className="log-empty-icon">📭</span>
                            <p>暂无识别记录</p>
                        </div>
                    ) : (
                        logs.map((entry) => (
                            <div key={entry.id} className="log-entry">
                                <div className="log-entry-main">
                                    <span className="log-plate">{entry.plate}</span>
                                    <span className={`log-status ${entry.isReserved ? 'log-status-reserved' : 'log-status-unreserved'}`}>
                                        {entry.isReserved ? '已预约' : '未预约'}
                                    </span>
                                </div>
                                <div className="log-entry-meta">
                                    <span className="log-time">{formatTimestamp(entry.timestamp)}</span>
                                    <span className="log-source">{getSourceLabel(entry.source)}</span>
                                    {entry.parkingLot && (
                                        <span className="log-parking">🅿 {entry.parkingLot}</span>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
