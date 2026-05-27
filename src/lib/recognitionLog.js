import { promises as fs } from 'fs';
import path from 'path';

// 日志文件存储在项目根目录的 data 文件夹中
const LOG_DIR = path.join(process.cwd(), 'recognition_logs');
const LOG_FILE = path.join(LOG_DIR, 'records.json');

/**
 * 确保日志目录和文件存在
 */
async function ensureLogFile() {
    try {
        await fs.mkdir(LOG_DIR, { recursive: true });
    } catch {
        // 目录可能已存在
    }

    try {
        await fs.access(LOG_FILE);
    } catch {
        // 文件不存在，创建空数组
        await fs.writeFile(LOG_FILE, JSON.stringify([], null, 2), 'utf-8');
    }
}

/**
 * 读取所有识别记录
 * @returns {Promise<Array>} 识别记录数组
 */
export async function getRecognitionLogs() {
    await ensureLogFile();
    const raw = await fs.readFile(LOG_FILE, 'utf-8');
    try {
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

/**
 * 追加一条识别记录
 * @param {object} record - 识别记录
 * @param {string} record.plate - 车牌号
 * @param {boolean} record.isReserved - 是否已预约
 * @param {string} [record.parkingLot] - 分配车区
 * @param {string} [record.source] - 来源（realtime / upload / manual）
 */
export async function appendRecognitionLog(record) {
    const logs = await getRecognitionLogs();

    const entry = {
        id: generateId(),
        timestamp: new Date().toISOString(),
        plate: record.plate,
        isReserved: record.isReserved ?? false,
        parkingLot: record.parkingLot ?? null,
        source: record.source ?? 'unknown',
    };

    logs.unshift(entry); // 最新记录在最前面

    await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
    return entry;
}

/**
 * 清空所有识别记录
 */
export async function clearRecognitionLogs() {
    await ensureLogFile();
    await fs.writeFile(LOG_FILE, JSON.stringify([], null, 2), 'utf-8');
}

/**
 * 生成简易唯一 ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
