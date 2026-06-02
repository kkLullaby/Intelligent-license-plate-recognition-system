import { NextResponse } from 'next/server';
import {
    listReservations,
    findReservationByPlate,
    addReservation,
    replaceAllReservations,
} from '@/lib/reservations';

/**
 * GET /api/reservations
 *   ?plate=xxx  -> 查询单条（返回 { success, reservation: ... | null }）
 *   ?search=xx  -> 列表模糊搜索
 *   无参数      -> 全量列表
 */
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const plate = searchParams.get('plate');
        const search = searchParams.get('search') ?? '';

        if (plate) {
            const reservation = findReservationByPlate(plate);
            return NextResponse.json({ success: true, reservation });
        }

        const reservations = listReservations({ search });
        return NextResponse.json({ success: true, total: reservations.length, reservations });
    } catch (error) {
        console.error('查询预约失败:', error);
        return NextResponse.json(
            { success: false, message: error.message || '查询失败' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/reservations - 添加一条预约
 */
export async function POST(request) {
    try {
        const body = await request.json();
        const { plate, parkingLot, isReserved } = body;
        if (!plate) {
            return NextResponse.json(
                { success: false, message: '缺少车牌号' },
                { status: 400 }
            );
        }
        const reservation = addReservation({ plate, parkingLot, isReserved });
        return NextResponse.json({ success: true, reservation });
    } catch (error) {
        // 唯一约束冲突等
        console.error('添加预约失败:', error);
        const msg = /UNIQUE/i.test(error.message) ? '该车牌已存在' : (error.message || '添加失败');
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
}

/**
 * DELETE /api/reservations - 一键清空所有预约
 */
export async function DELETE() {
    try {
        replaceAllReservations([]);
        return NextResponse.json({ success: true, message: '所有预约已清空' });
    } catch (error) {
        console.error('清空预约失败:', error);
        return NextResponse.json(
            { success: false, message: error.message || '清空失败' },
            { status: 500 }
        );
    }
}
