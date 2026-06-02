// 识别日志数据访问层 —— 已从 JSON 文件迁移到 SQLite。
// 公开接口（getRecognitionLogs / appendRecognitionLog / clearRecognitionLogs）保持不变。

import { getDb } from './db';

function rowToEntry(row) {
    if (!row) return null;
    return {
        id: row.id,
        timestamp: row.timestamp,
        plate: row.plate,
        isReserved: Boolean(row.isReserved),
        parkingLot: row.parkingLot ?? null,
        source: row.source ?? 'unknown',
    };
}

/**
 * 读取所有识别记录（按时间倒序，最新在前）
 * @returns {Promise<Array>} 识别记录数组
 */
export async function getRecognitionLogs() {
    const db = getDb();
    const rows = db
        .prepare('SELECT id, timestamp, plate, isReserved, parkingLot, source FROM recognition_logs ORDER BY timestamp DESC')
        .all();
    return rows.map(rowToEntry);
}

/**
 * 追加一条识别记录。
 * 同一车牌已存在记录时不再重复写入，直接返回最早那条（与旧 JSON 行为一致）。
 *
 * @param {object} record
 * @param {string} record.plate
 * @param {boolean} [record.isReserved]
 * @param {string} [record.parkingLot]
 * @param {string} [record.source]
 */
export async function appendRecognitionLog(record) {
    const db = getDb();
    const plate = record.plate;

    // 已存在则直接返回
    const existing = db
        .prepare('SELECT id, timestamp, plate, isReserved, parkingLot, source FROM recognition_logs WHERE plate = ? ORDER BY timestamp ASC LIMIT 1')
        .get(plate);
    if (existing) return rowToEntry(existing);

    const entry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        plate,
        isReserved: record.isReserved ?? false,
        parkingLot: record.parkingLot ?? null,
        source: record.source ?? 'unknown',
    };

    db.prepare(
        'INSERT INTO recognition_logs (id, timestamp, plate, isReserved, parkingLot, source) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(
        entry.id,
        entry.timestamp,
        entry.plate,
        entry.isReserved ? 1 : 0,
        entry.parkingLot,
        entry.source
    );

    return entry;
}

/**
 * 清空所有识别记录
 */
export async function clearRecognitionLogs() {
    const db = getDb();
    db.exec('DELETE FROM recognition_logs');
}

/**
 * 删除单条识别记录（新增能力，供 /peek 管理使用）
 */
export async function deleteRecognitionLog(id) {
    const db = getDb();
    const info = db.prepare('DELETE FROM recognition_logs WHERE id = ?').run(id);
    return info.changes > 0;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
