'use client';

import { useState, useEffect, useCallback } from 'react';

const GATES = ['北一门', '北二门'];

export default function GateStats({ refreshKey }) {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/stats');
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (err) {
            console.error('获取统计数据失败:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
    }, [fetchStats, refreshKey]);

    if (loading && !stats) {
        return (
            <div className="gate-stats glass-panel">
                <div className="gate-stats-loading">加载中...</div>
            </div>
        );
    }

    if (!stats) return null;

    return (
        <div className="gate-stats glass-panel">
            <div className="gate-stats-header">
                <span className="gate-stats-icon">🚗</span>
                <span className="gate-stats-title">门岗到场统计</span>
            </div>
            <div className="gate-stats-grid">
                {GATES.map(gate => {
                    const s = stats[gate] || { arrived: 0, reserved: 0 };
                    const ratio = s.reserved > 0 ? s.arrived / s.reserved : 0;
                    const isFull = s.reserved > 0 && s.arrived >= s.reserved;

                    return (
                        <div key={gate} className="gate-card">
                            <div className="gate-card-name">{gate}</div>
                            <div className="gate-card-count">
                                <span className={`gate-arrived ${isFull ? 'gate-arrived-full' : ''}`}>
                                    {s.arrived}
                                </span>
                                <span className="gate-separator">/</span>
                                <span className="gate-reserved">{s.reserved}</span>
                            </div>
                            <div className="gate-bar-track">
                                <div
                                    className={`gate-bar-fill ${isFull ? 'gate-bar-full' : ''}`}
                                    style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                                />
                            </div>
                            <div className="gate-card-label">已到 / 已预约</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
