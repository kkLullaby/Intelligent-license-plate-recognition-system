'use client';

import { useState, useEffect, useCallback } from 'react';

const GATES = [
    { key: '北一门', short: '一' },
    { key: '北二门', short: '二' },
];

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

    return (
        <aside className="hud-stats" aria-label="门岗到场统计">
            <div className="hud-stats-head">
                <span className="hud-live-dot" aria-hidden />
                <span className="hud-stats-label">门岗 LIVE</span>
            </div>
            <div className="hud-stats-body">
                {GATES.map(g => {
                    const s = stats?.[g.key] || { arrived: 0, reserved: 0 };
                    const ratio = s.reserved > 0 ? Math.min(s.arrived / s.reserved, 1) : 0;
                    const isFull = s.reserved > 0 && s.arrived >= s.reserved;

                    return (
                        <div key={g.key} className={`hud-row ${isFull ? 'is-full' : ''}`}>
                            <span className="hud-row-tag">北{g.short}</span>
                            <span className="hud-row-nums">
                                <span className="hud-arrived">{loading ? '–' : s.arrived}</span>
                                <span className="hud-sep">/</span>
                                <span className="hud-reserved">{loading ? '–' : s.reserved}</span>
                            </span>
                            <span className="hud-bar">
                                <span
                                    className="hud-bar-fill"
                                    style={{ width: `${ratio * 100}%` }}
                                />
                            </span>
                        </div>
                    );
                })}
            </div>
        </aside>
    );
}
