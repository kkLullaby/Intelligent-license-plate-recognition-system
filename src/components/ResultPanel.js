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
            <div className="glass-panel result-card scanning-card">
                <div className="scanning-spinner-wrap">
                    <div className="scanning-spinner"></div>
                </div>
                <h3 className="text-gradient scanning-title">
                    正在扫描车牌...
                </h3>
                <p className="scanning-hint">
                    请将手机对准来访车辆的车牌<br/>系统自动识别
                </p>
                <ManualLookupForm onManualLookup={onManualLookup} />
            </div>
        );
    }

    if (!result) return null;

    const { success, plate, isReserved, parkingLot, message, source } = result;

    return (
        <div className="glass-panel result-card">
            <div className="result-heading">
                <h2 className="result-title">
                    {source === 'manual' ? '查询结果' : '识别结果'}
                </h2>
                {source === 'manual' && <span className="result-source">手动</span>}
            </div>
            
            {success && plate ? (
                <>
                    <div className="result-plate-row">
                        <div className="plate-badge">{plate}</div>
                    </div>
                    
                    <div className="result-status-row">
                        <span className="result-status-label">预约状态</span>
                        <span className={`status-badge ${isReserved ? 'status-success' : 'status-warning'}`}>
                            {isReserved ? '✓ 已预约' : '⚠ 未预约'}
                        </span>
                    </div>

                    <div className="result-parking-box">
                        <span className="result-parking-label">分配车区</span>
                        <div className={`action-text ${isReserved ? 'action-success' : 'action-warning'}`}>
                            {parkingLot || '未预约'}
                        </div>
                    </div>
                </>
            ) : (
                <div className="result-fail">
                    <div className="result-fail-icon">✗</div>
                    <p>{message || "识别失败，请重试"}</p>
                </div>
            )}

            <div className="result-actions">
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
