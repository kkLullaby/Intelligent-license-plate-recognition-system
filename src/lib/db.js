// SQLite 数据库单例 —— 使用 Node 24 自带的 node:sqlite，
// 无需原生编译。首次启动时自动建表，并从既有 JSON 文件迁移数据。

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'app.db');

// 旧版 JSON 数据路径（用于一次性迁移）
const LEGACY_RESERVATIONS_JSON = path.join(process.cwd(), 'src/data/reservations.json');
const LEGACY_LOGS_JSON = path.join(process.cwd(), 'recognition_logs/records.json');

let dbInstance = null;

function initSchema(db) {
    db.exec(`
        CREATE TABLE IF NOT EXISTS reservations (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            plate       TEXT NOT NULL UNIQUE,
            parkingLot  TEXT,
            isReserved  INTEGER NOT NULL DEFAULT 1,
            createdAt   TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_reservations_plate ON reservations(plate);

        CREATE TABLE IF NOT EXISTS recognition_logs (
            id          TEXT PRIMARY KEY,
            timestamp   TEXT NOT NULL,
            plate       TEXT NOT NULL,
            isReserved  INTEGER NOT NULL DEFAULT 0,
            parkingLot  TEXT,
            source      TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_logs_plate ON recognition_logs(plate);
        CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON recognition_logs(timestamp DESC);

        CREATE TABLE IF NOT EXISTS meta (
            key   TEXT PRIMARY KEY,
            value TEXT
        );
    `);
}

/**
 * 把旧 JSON 数据迁入 SQLite（仅在 meta 标记不存在时执行一次）
 */
function migrateLegacyData(db) {
    const flagRow = db
        .prepare("SELECT value FROM meta WHERE key = 'legacy_migrated'")
        .get();
    if (flagRow) return;

    db.exec('BEGIN');
    try {
        // 迁移预约
        if (fs.existsSync(LEGACY_RESERVATIONS_JSON)) {
            try {
                const raw = fs.readFileSync(LEGACY_RESERVATIONS_JSON, 'utf-8');
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    const stmt = db.prepare(
                        'INSERT OR IGNORE INTO reservations (plate, parkingLot, isReserved) VALUES (?, ?, ?)'
                    );
                    for (const r of list) {
                        if (!r || !r.plate) continue;
                        stmt.run(
                            String(r.plate),
                            r.parkingLot ?? null,
                            r.isReserved === false ? 0 : 1
                        );
                    }
                }
            } catch (err) {
                console.warn('迁移 reservations.json 失败：', err.message);
            }
        }

        // 迁移日志
        if (fs.existsSync(LEGACY_LOGS_JSON)) {
            try {
                const raw = fs.readFileSync(LEGACY_LOGS_JSON, 'utf-8');
                const list = JSON.parse(raw);
                if (Array.isArray(list)) {
                    const stmt = db.prepare(
                        'INSERT OR IGNORE INTO recognition_logs (id, timestamp, plate, isReserved, parkingLot, source) VALUES (?, ?, ?, ?, ?, ?)'
                    );
                    for (const log of list) {
                        if (!log || !log.id || !log.plate) continue;
                        stmt.run(
                            log.id,
                            log.timestamp || new Date().toISOString(),
                            log.plate,
                            log.isReserved ? 1 : 0,
                            log.parkingLot ?? null,
                            log.source ?? null
                        );
                    }
                }
            } catch (err) {
                console.warn('迁移 records.json 失败：', err.message);
            }
        }

        db.prepare("INSERT INTO meta (key, value) VALUES ('legacy_migrated', ?)")
            .run(new Date().toISOString());

        db.exec('COMMIT');
    } catch (err) {
        db.exec('ROLLBACK');
        throw err;
    }
}

/**
 * 获取（或创建）数据库单例
 */
export function getDb() {
    if (dbInstance) return dbInstance;

    fs.mkdirSync(DB_DIR, { recursive: true });

    const db = new DatabaseSync(DB_FILE);
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    initSchema(db);
    migrateLegacyData(db);

    dbInstance = db;
    return db;
}
