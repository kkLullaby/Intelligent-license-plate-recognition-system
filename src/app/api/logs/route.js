import { NextResponse } from 'next/server';
import { getRecognitionLogs, appendRecognitionLog, clearRecognitionLogs } from '@/lib/recognitionLog';

/**
 * GET /api/logs - 获取所有识别记录
 * 支持查询参数：
 *   - limit: 返回条数（默认 100）
 *   - plate: 按车牌号筛选（模糊匹配）
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
        const plateFilter = (searchParams.get('plate') || '').trim().toUpperCase();

        let logs = await getRecognitionLogs();

        // 按车牌号筛选
        if (plateFilter) {
            logs = logs.filter(entry => entry.plate && entry.plate.includes(plateFilter));
        }

        // 截取条数
        logs = logs.slice(0, limit);

        return NextResponse.json({
            success: true,
            total: logs.length,
            records: logs,
        });
    } catch (error) {
        console.error('读取识别日志失败:', error);
        return NextResponse.json(
            { success: false, message: error.message || '读取日志失败' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/logs - 手动添加一条识别记录
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { plate, isReserved, parkingLot, source } = body;

        if (!plate) {
            return NextResponse.json(
                { success: false, message: '缺少车牌号' },
                { status: 400 }
            );
        }

        const entry = await appendRecognitionLog({
            plate,
            isReserved: isReserved ?? false,
            parkingLot: parkingLot ?? null,
            source: source || 'manual',
        });

        return NextResponse.json({ success: true, record: entry });
    } catch (error) {
        console.error('写入识别日志失败:', error);
        return NextResponse.json(
            { success: false, message: error.message || '写入日志失败' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/logs - 清空所有识别记录
 */
export async function DELETE() {
    try {
        await clearRecognitionLogs();
        return NextResponse.json({ success: true, message: '日志已清空' });
    } catch (error) {
        console.error('清空识别日志失败:', error);
        return NextResponse.json(
            { success: false, message: error.message || '清空日志失败' },
            { status: 500 }
        );
    }
}
