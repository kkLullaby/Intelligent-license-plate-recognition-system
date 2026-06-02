import { NextResponse } from 'next/server';
import { getRecognitionLogs } from '@/lib/recognitionLog';
import { listReservations } from '@/lib/reservations';

/**
 * 判断 parkingLot 字符串属于哪个门
 * 北一门：contains "北一门" / "北门" / "北1门"
 * 北二门：contains "北二门" / "北2门"
 */
function matchGate(parkingLot) {
    if (!parkingLot) return null;
    const s = parkingLot;

    // 先判断北二门（更具体），避免"北二门"被"北门"规则误匹配
    if (s.includes('北二门') || s.includes('北2门')) return '北二门';
    if (s.includes('北一门') || s.includes('北门') || s.includes('北1门')) return '北一门';

    return null;
}

/**
 * GET /api/stats - 获取各门的到场/预约统计
 */
export async function GET() {
    try {
        const logs = await getRecognitionLogs();

        // 统计各门的预约总数
        const reservedCount = { '北一门': 0, '北二门': 0 };
        const reservations = listReservations();
        for (const r of reservations) {
            const gate = matchGate(r.parkingLot);
            if (gate) reservedCount[gate]++;
        }

        // 统计各门已到现场的车牌数（去重：同一车牌只算一次）
        const arrivedPlates = { '北一门': new Set(), '北二门': new Set() };
        for (const log of logs) {
            if (!log.isReserved || !log.parkingLot) continue;
            const gate = matchGate(log.parkingLot);
            if (gate && log.plate) {
                arrivedPlates[gate].add(log.plate);
            }
        }

        const stats = {
            '北一门': {
                arrived: arrivedPlates['北一门'].size,
                reserved: reservedCount['北一门'],
            },
            '北二门': {
                arrived: arrivedPlates['北二门'].size,
                reserved: reservedCount['北二门'],
            },
        };

        return NextResponse.json({ success: true, stats });
    } catch (error) {
        console.error('统计数据获取失败:', error);
        return NextResponse.json(
            { success: false, message: error.message || '统计失败' },
            { status: 500 }
        );
    }
}
