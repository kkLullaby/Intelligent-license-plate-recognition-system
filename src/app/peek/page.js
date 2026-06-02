'use client';

// /peek —— 后台管理：预约名单 & 识别日志 的 CRUD
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

const TABS = [
    { key: 'reservations', label: '预约名单' },
    { key: 'logs', label: '识别日志' },
];

const PARKING_OPTIONS = ['', '北一门', '北二门'];

function formatTimestamp(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export default function PeekPage() {
    const [tab, setTab] = useState('reservations');

    return (
        <div style={S.page}>
            <div style={S.shell}>
                <header style={S.header}>
                    <div>
                        <h1 style={S.title}>🛠 后台管理 /peek</h1>
                        <p style={S.subtitle}>查看与管理预约名单和识别日志（SQLite 数据库）</p>
                    </div>
                    <Link href="/" style={S.backLink}>← 返回扫码大屏</Link>
                </header>

                <div style={S.tabs}>
                    {TABS.map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            style={{
                                ...S.tabBtn,
                                ...(tab === t.key ? S.tabBtnActive : null),
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {tab === 'reservations' ? <ReservationsTab /> : <LogsTab />}
            </div>
        </div>
    );
}

/* ============================================================
 * 预约名单
 * ============================================================ */
function ReservationsTab() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const [newPlate, setNewPlate] = useState('');
    const [newParking, setNewParking] = useState('北一门');
    const [newReserved, setNewReserved] = useState(true);

    const [editingId, setEditingId] = useState(null);
    const [editDraft, setEditDraft] = useState({});

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set('search', search.trim());
            const res = await fetch(`/api/reservations?${params.toString()}`);
            const data = await res.json();
            if (data.success) setItems(data.reservations);
        } catch (err) {
            setMessage({ ok: false, text: `加载失败：${err.message}` });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { reload(); }, [reload]);

    const handleAdd = async () => {
        if (!newPlate.trim()) return;
        try {
            const res = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plate: newPlate.trim(),
                    parkingLot: newParking || null,
                    isReserved: newReserved,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setNewPlate('');
                setMessage({ ok: true, text: '已添加' });
                reload();
            } else {
                setMessage({ ok: false, text: data.message || '添加失败' });
            }
        } catch (err) {
            setMessage({ ok: false, text: err.message });
        }
    };

    const handleDelete = async (id, plate) => {
        if (!confirm(`确认删除预约 ${plate}？`)) return;
        try {
            const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) reload();
            else setMessage({ ok: false, text: data.message || '删除失败' });
        } catch (err) {
            setMessage({ ok: false, text: err.message });
        }
    };

    const handleClearAll = async () => {
        if (!confirm(`⚠️ 确认清空全部 ${items.length} 条预约信息？此操作不可恢复！`)) return;
        try {
            const res = await fetch('/api/reservations', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                setMessage({ ok: true, text: '已清空全部预约' });
                reload();
            } else {
                setMessage({ ok: false, text: data.message || '清空失败' });
            }
        } catch (err) {
            setMessage({ ok: false, text: err.message });
        }
    };

    const startEdit = (item) => {
        setEditingId(item.id);
        setEditDraft({ ...item, parkingLot: item.parkingLot ?? '' });
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDraft({});
    };

    const saveEdit = async () => {
        try {
            const res = await fetch(`/api/reservations/${editingId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    plate: editDraft.plate,
                    parkingLot: editDraft.parkingLot || null,
                    isReserved: editDraft.isReserved,
                }),
            });
            const data = await res.json();
            if (data.success) {
                cancelEdit();
                reload();
            } else {
                setMessage({ ok: false, text: data.message || '保存失败' });
            }
        } catch (err) {
            setMessage({ ok: false, text: err.message });
        }
    };

    return (
        <section>
            {/* 新增 */}
            <div style={S.card}>
                <h3 style={S.cardTitle}>➕ 新增预约</h3>
                <div style={S.formRow}>
                    <input
                        style={S.input}
                        placeholder="车牌号（如 粤A12345）"
                        value={newPlate}
                        onChange={e => setNewPlate(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <select style={S.input} value={newParking} onChange={e => setNewParking(e.target.value)}>
                        {PARKING_OPTIONS.map(o => (
                            <option key={o} value={o}>{o || '（无）'}</option>
                        ))}
                    </select>
                    <label style={S.checkLabel}>
                        <input
                            type="checkbox"
                            checked={newReserved}
                            onChange={e => setNewReserved(e.target.checked)}
                        />
                        已预约
                    </label>
                    <button style={S.primaryBtn} onClick={handleAdd}>添加</button>
                </div>
            </div>

            {/* 搜索 */}
            <div style={S.toolbar}>
                <input
                    style={{ ...S.input, flex: 1 }}
                    placeholder="搜索车牌号..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button style={S.secondaryBtn} onClick={reload}>{loading ? '加载中...' : '刷新'}</button>
                <button style={S.dangerBtn} onClick={handleClearAll} disabled={items.length === 0}>
                    一键清空全部预约
                </button>
                <span style={S.countBadge}>共 {items.length} 条</span>
            </div>

            {message && (
                <div style={{ ...S.alert, ...(message.ok ? S.alertOk : S.alertErr) }}>
                    {message.text}
                </div>
            )}

            {/* 表格 */}
            <div style={S.tableWrap}>
                <table style={S.table}>
                    <thead>
                        <tr>
                            <th style={S.th}>ID</th>
                            <th style={S.th}>车牌号</th>
                            <th style={S.th}>停车区域</th>
                            <th style={S.th}>状态</th>
                            <th style={S.th}>创建时间</th>
                            <th style={S.th}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan={6} style={S.emptyCell}>暂无数据</td></tr>
                        ) : items.map(item => editingId === item.id ? (
                            <tr key={item.id} style={S.editingRow}>
                                <td style={S.td}>{item.id}</td>
                                <td style={S.td}>
                                    <input
                                        style={S.cellInput}
                                        value={editDraft.plate}
                                        onChange={e => setEditDraft({ ...editDraft, plate: e.target.value })}
                                    />
                                </td>
                                <td style={S.td}>
                                    <select
                                        style={S.cellInput}
                                        value={editDraft.parkingLot}
                                        onChange={e => setEditDraft({ ...editDraft, parkingLot: e.target.value })}
                                    >
                                        {PARKING_OPTIONS.map(o => (
                                            <option key={o} value={o}>{o || '（无）'}</option>
                                        ))}
                                    </select>
                                </td>
                                <td style={S.td}>
                                    <label style={S.checkLabel}>
                                        <input
                                            type="checkbox"
                                            checked={!!editDraft.isReserved}
                                            onChange={e => setEditDraft({ ...editDraft, isReserved: e.target.checked })}
                                        />
                                        已预约
                                    </label>
                                </td>
                                <td style={S.td}>{formatTimestamp(item.createdAt)}</td>
                                <td style={S.td}>
                                    <button style={S.primaryBtnSm} onClick={saveEdit}>保存</button>
                                    <button style={S.ghostBtnSm} onClick={cancelEdit}>取消</button>
                                </td>
                            </tr>
                        ) : (
                            <tr key={item.id}>
                                <td style={S.td}>{item.id}</td>
                                <td style={{ ...S.td, fontWeight: 700, color: '#60a5fa' }}>{item.plate}</td>
                                <td style={S.td}>{item.parkingLot || '—'}</td>
                                <td style={S.td}>
                                    <span style={item.isReserved ? S.badgeOk : S.badgeMute}>
                                        {item.isReserved ? '已预约' : '未预约'}
                                    </span>
                                </td>
                                <td style={S.td}>{formatTimestamp(item.createdAt)}</td>
                                <td style={S.td}>
                                    <button style={S.secondaryBtnSm} onClick={() => startEdit(item)}>编辑</button>
                                    <button style={S.dangerBtnSm} onClick={() => handleDelete(item.id, item.plate)}>删除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/* ============================================================
 * 识别日志
 * ============================================================ */
function LogsTab() {
    const [items, setItems] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);

    const reload = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (search.trim()) params.set('plate', search.trim().toUpperCase());
            params.set('limit', '1000');
            const res = await fetch(`/api/logs?${params.toString()}`);
            const data = await res.json();
            if (data.success) setItems(data.records);
        } catch (err) {
            setMessage({ ok: false, text: err.message });
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { reload(); }, [reload]);

    const handleDelete = async (id, plate) => {
        if (!confirm(`确认删除 ${plate} 的这条日志？`)) return;
        try {
            const res = await fetch(`/api/logs/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) reload();
            else setMessage({ ok: false, text: data.message || '删除失败' });
        } catch (err) {
            setMessage({ ok: false, text: err.message });
        }
    };

    const handleClearAll = async () => {
        if (!confirm('确认清空所有识别日志？此操作不可恢复！')) return;
        try {
            const res = await fetch('/api/logs', { method: 'DELETE' });
            const data = await res.json();
            if (data.success) reload();
            else setMessage({ ok: false, text: data.message || '清空失败' });
        } catch (err) {
            setMessage({ ok: false, text: err.message });
        }
    };

    return (
        <section>
            <div style={S.toolbar}>
                <input
                    style={{ ...S.input, flex: 1 }}
                    placeholder="搜索车牌号..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
                <button style={S.secondaryBtn} onClick={reload}>{loading ? '加载中...' : '刷新'}</button>
                <button style={S.dangerBtn} onClick={handleClearAll} disabled={items.length === 0}>清空全部</button>
                <span style={S.countBadge}>共 {items.length} 条</span>
            </div>

            {message && (
                <div style={{ ...S.alert, ...(message.ok ? S.alertOk : S.alertErr) }}>
                    {message.text}
                </div>
            )}

            <div style={S.tableWrap}>
                <table style={S.table}>
                    <thead>
                        <tr>
                            <th style={S.th}>时间</th>
                            <th style={S.th}>车牌号</th>
                            <th style={S.th}>状态</th>
                            <th style={S.th}>车区</th>
                            <th style={S.th}>来源</th>
                            <th style={S.th}>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.length === 0 ? (
                            <tr><td colSpan={6} style={S.emptyCell}>暂无数据</td></tr>
                        ) : items.map(log => (
                            <tr key={log.id}>
                                <td style={S.td}>{formatTimestamp(log.timestamp)}</td>
                                <td style={{ ...S.td, fontWeight: 700, color: '#60a5fa' }}>{log.plate}</td>
                                <td style={S.td}>
                                    <span style={log.isReserved ? S.badgeOk : S.badgeMute}>
                                        {log.isReserved ? '已预约' : '未预约'}
                                    </span>
                                </td>
                                <td style={S.td}>{log.parkingLot || '—'}</td>
                                <td style={S.td}>{log.source || '—'}</td>
                                <td style={S.td}>
                                    <button style={S.dangerBtnSm} onClick={() => handleDelete(log.id, log.plate)}>删除</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

/* ============================================================
 * 样式
 * ============================================================ */
const S = {
    page: {
        minHeight: '100vh',
        background: 'radial-gradient(circle at top left, #1e1b4b, transparent 40%), radial-gradient(circle at bottom right, #064e3b, transparent 40%), #0f172a',
        padding: '24px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#f8fafc',
    },
    shell: {
        maxWidth: 1280,
        margin: '0 auto',
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 20,
        padding: 28,
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 24,
    },
    title: {
        fontSize: '1.6rem',
        fontWeight: 800,
        background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
    },
    subtitle: { color: '#94a3b8', marginTop: 4, fontSize: '0.9rem' },
    backLink: {
        color: '#cbd5e1',
        textDecoration: 'none',
        padding: '8px 14px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 10,
        fontSize: '0.9rem',
    },
    tabs: { display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.08)' },
    tabBtn: {
        padding: '10px 18px',
        background: 'transparent',
        border: 'none',
        color: '#94a3b8',
        cursor: 'pointer',
        fontSize: '1rem',
        borderBottom: '2px solid transparent',
        marginBottom: -1,
    },
    tabBtnActive: {
        color: '#60a5fa',
        borderBottom: '2px solid #60a5fa',
        fontWeight: 700,
    },
    card: {
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    cardTitle: { fontSize: '1rem', marginBottom: 12, color: '#cbd5e1', fontWeight: 600 },
    formRow: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
    toolbar: { display: 'flex', gap: 10, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' },
    countBadge: {
        marginLeft: 'auto',
        color: '#94a3b8',
        fontSize: '0.85rem',
        background: 'rgba(255,255,255,0.05)',
        padding: '4px 12px',
        borderRadius: 999,
    },
    input: {
        padding: '8px 12px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        color: '#e2e8f0',
        borderRadius: 8,
        fontSize: '0.95rem',
        outline: 'none',
        minWidth: 120,
    },
    cellInput: {
        padding: '4px 8px',
        background: 'rgba(15, 23, 42, 0.8)',
        border: '1px solid rgba(148, 163, 184, 0.25)',
        color: '#e2e8f0',
        borderRadius: 6,
        fontSize: '0.9rem',
        outline: 'none',
        width: '100%',
    },
    checkLabel: { display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1', fontSize: '0.9rem' },
    primaryBtn: {
        padding: '8px 16px',
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        color: '#fff',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: 600,
    },
    primaryBtnSm: {
        padding: '4px 12px',
        background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        fontWeight: 600,
        marginRight: 6,
        fontSize: '0.85rem',
    },
    secondaryBtn: {
        padding: '8px 16px',
        background: 'rgba(255,255,255,0.08)',
        color: '#e2e8f0',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 8,
        cursor: 'pointer',
    },
    secondaryBtnSm: {
        padding: '4px 12px',
        background: 'rgba(255,255,255,0.08)',
        color: '#e2e8f0',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        cursor: 'pointer',
        marginRight: 6,
        fontSize: '0.85rem',
    },
    ghostBtnSm: {
        padding: '4px 12px',
        background: 'transparent',
        color: '#94a3b8',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: '0.85rem',
    },
    dangerBtn: {
        padding: '8px 16px',
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#fca5a5',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 8,
        cursor: 'pointer',
    },
    dangerBtnSm: {
        padding: '4px 12px',
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#fca5a5',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderRadius: 6,
        cursor: 'pointer',
        fontSize: '0.85rem',
    },
    alert: {
        padding: '10px 14px',
        borderRadius: 8,
        marginBottom: 12,
        fontSize: '0.9rem',
    },
    alertOk: {
        background: 'rgba(16, 185, 129, 0.1)',
        border: '1px solid rgba(16, 185, 129, 0.3)',
        color: '#34d399',
    },
    alertErr: {
        background: 'rgba(239, 68, 68, 0.1)',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        color: '#f87171',
    },
    tableWrap: {
        overflowX: 'auto',
        background: 'rgba(15, 23, 42, 0.4)',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.05)',
    },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: 720 },
    th: {
        textAlign: 'left',
        padding: '10px 14px',
        fontSize: '0.85rem',
        color: '#94a3b8',
        fontWeight: 600,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
    },
    td: {
        padding: '10px 14px',
        fontSize: '0.92rem',
        color: '#e2e8f0',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
    },
    emptyCell: {
        padding: '40px',
        textAlign: 'center',
        color: '#64748b',
    },
    editingRow: {
        background: 'rgba(96, 165, 250, 0.08)',
    },
    badgeOk: {
        padding: '2px 10px',
        borderRadius: 999,
        background: 'rgba(16, 185, 129, 0.15)',
        color: '#34d399',
        fontSize: '0.8rem',
        fontWeight: 600,
    },
    badgeMute: {
        padding: '2px 10px',
        borderRadius: 999,
        background: 'rgba(148, 163, 184, 0.15)',
        color: '#94a3b8',
        fontSize: '0.8rem',
        fontWeight: 600,
    },
};
