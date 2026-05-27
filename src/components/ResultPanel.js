'use client';

import { useState } from 'react';

function ManualLookupForm({ onManualLookup }) {
    const [plate, setPlate] = useState('');

    const handleSubmit = (event) => {
        event.preventDefault();
        const trimmedPlate = plate.trim();
        if (!trimmedPlate) return;

        onManualLookup(trimmedPlate);
        setPlate('');
    };

    return (
        <form className="manual-lookup" onSubmit={handleSubmit}>
            <input
                className="manual-input"
                value={plate}
                maxLength={12}
                placeholder="输入车牌号"
                autoCapitalize="characters"
                onChange={(event) => setPlate(event.target.value)}
            />
            <button className="manual-submit" type="submit" disabled={!plate.trim()}>
                查询
            </button>
        </form>
    );
}

export default function ResultPanel({ result, isScanning, onResumeScan, onManualLookup }) {
    if (isScanning) {
        return (
            <div className="glass-panel result-card" style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                    <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        border: '4px solid rgba(255,255,255,0.1)',
                        borderTopColor: '#3b82f6',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                    }}></div>
                    <style>{`
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                    `}</style>
                </div>
                <h3 className="text-gradient" style={{ marginTop: '20px', fontSize: '1.2rem' }}>
                    正在扫描车牌...
                </h3>
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', textAlign: 'center' }}>
                    请将手机对准来访车辆的车牌<br/>系统自动识别
                </p>
                <ManualLookupForm onManualLookup={onManualLookup} />
            </div>
        );
    }

    if (!result) return null;

    const { success, plate, isReserved, parkingLot, message, source } = result;

    return (
        <div className="glass-panel result-card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="result-heading">
                <h2 style={{ fontSize: '1.5rem' }}>
                    {source === 'manual' ? '查询结果' : '识别结果'}
                </h2>
                {source === 'manual' && <span className="result-source">手动</span>}
            </div>
            
            {success && plate ? (
                <>
                    <div style={{ textAlign: 'center', margin: '15px 0' }}>
                        <div className="plate-badge">{plate}</div>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '10px 0' }}>
                        <span style={{ color: '#cbd5e1' }}>预约状态</span>
                        <span className={`status-badge ${isReserved ? 'status-success' : 'status-warning'}`}>
                            {isReserved ? '✓ 已预约' : '⚠ 未预约'}
                        </span>
                    </div>

                    <div style={{ background: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '8px', margin: '10px 0' }}>
                        <span style={{ color: '#cbd5e1', fontSize: '0.9rem' }}>分配车区</span>
                        <div className={`action-text ${isReserved ? 'action-success' : 'action-warning'}`}>
                            {parkingLot || '未预约'}
                        </div>
                    </div>
                </>
            ) : (
                <div style={{ textAlign: 'center', padding: '20px 0', color: '#ef4444' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>✗</div>
                    <p>{message || "识别失败，请重试"}</p>
                </div>
            )}

            <div style={{ marginTop: 'auto', paddingTop: '20px' }}>
                <button 
                    className="btn btn-primary" 
                    style={{ width: '100%' }}
                    onClick={onResumeScan}
                >
                    扫描下一辆车
                </button>
            </div>
            <ManualLookupForm onManualLookup={onManualLookup} />
        </div>
    );
}
