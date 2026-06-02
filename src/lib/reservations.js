// 预约名单数据访问层 —— SQLite 实现
import { getDb } from './db';

export function normalizePlate(value) {
    return String(value ?? '')
        .trim()
        .replace(/[\s·.\-]/g, '')
        .toUpperCase();
}

function rowToReservation(row) {
    if (!row) return null;
    return {
        id: row.id,
        plate: row.plate,
        parkingLot: row.parkingLot ?? null,
        isReserved: Boolean(row.isReserved),
        createdAt: row.createdAt,
    };
}

export function listReservations({ search } = {}) {
    const db = getDb();
    let rows;
    if (search && search.trim()) {
        const like = `%${search.trim().toUpperCase()}%`;
        rows = db
            .prepare('SELECT * FROM reservations WHERE UPPER(plate) LIKE ? ORDER BY id ASC')
            .all(like);
    } else {
        rows = db.prepare('SELECT * FROM reservations ORDER BY id ASC').all();
    }
    return rows.map(rowToReservation);
}

export function findReservationByPlate(plate) {
    const db = getDb();
    const row = db
        .prepare('SELECT * FROM reservations WHERE plate = ?')
        .get(normalizePlate(plate));
    return rowToReservation(row);
}

export function addReservation({ plate, parkingLot, isReserved }) {
    const db = getDb();
    const normalized = normalizePlate(plate);
    if (!normalized) throw new Error('车牌号不能为空');

    db.prepare(
        'INSERT INTO reservations (plate, parkingLot, isReserved) VALUES (?, ?, ?)'
    ).run(normalized, parkingLot ?? null, isReserved === false ? 0 : 1);

    return findReservationByPlate(normalized);
}

export function updateReservation(id, { plate, parkingLot, isReserved }) {
    const db = getDb();
    const fields = [];
    const values = [];
    if (plate !== undefined) {
        fields.push('plate = ?');
        values.push(normalizePlate(plate));
    }
    if (parkingLot !== undefined) {
        fields.push('parkingLot = ?');
        values.push(parkingLot ?? null);
    }
    if (isReserved !== undefined) {
        fields.push('isReserved = ?');
        values.push(isReserved ? 1 : 0);
    }
    if (!fields.length) return null;

    values.push(id);
    db.prepare(`UPDATE reservations SET ${fields.join(', ')} WHERE id = ?`).run(...values);

    const row = db.prepare('SELECT * FROM reservations WHERE id = ?').get(id);
    return rowToReservation(row);
}

export function deleteReservation(id) {
    const db = getDb();
    const info = db.prepare('DELETE FROM reservations WHERE id = ?').run(id);
    return info.changes > 0;
}

/**
 * 整体替换预约名单（用于 CSV 导入）。事务保证原子性。
 * @param {Array<{plate:string, parkingLot?:string, isReserved?:boolean}>} reservations
 * @returns {number} 实际插入条数
 */
export function replaceAllReservations(reservations) {
    const db = getDb();
    db.exec('BEGIN');
    try {
        db.exec('DELETE FROM reservations');
        const stmt = db.prepare(
            'INSERT OR IGNORE INTO reservations (plate, parkingLot, isReserved) VALUES (?, ?, ?)'
        );
        let count = 0;
        for (const r of reservations) {
            const plate = normalizePlate(r.plate);
            if (!plate) continue;
            const info = stmt.run(
                plate,
                r.parkingLot ?? null,
                r.isReserved === false ? 0 : 1
            );
            if (info.changes) count++;
        }
        db.exec('COMMIT');
        return count;
    } catch (err) {
        db.exec('ROLLBACK');
        throw err;
    }
}
