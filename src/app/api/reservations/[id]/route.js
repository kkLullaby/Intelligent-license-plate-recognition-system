import { NextResponse } from 'next/server';
import { updateReservation, deleteReservation } from '@/lib/reservations';

export async function PATCH(request, { params }) {
    try {
        const { id } = await params;
        const numericId = Number(id);
        if (!Number.isInteger(numericId)) {
            return NextResponse.json({ success: false, message: '无效的 id' }, { status: 400 });
        }
        const body = await request.json();
        const reservation = updateReservation(numericId, body);
        if (!reservation) {
            return NextResponse.json({ success: false, message: '记录不存在' }, { status: 404 });
        }
        return NextResponse.json({ success: true, reservation });
    } catch (error) {
        console.error('更新预约失败:', error);
        const msg = /UNIQUE/i.test(error.message) ? '该车牌已存在' : (error.message || '更新失败');
        return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
}

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params;
        const numericId = Number(id);
        if (!Number.isInteger(numericId)) {
            return NextResponse.json({ success: false, message: '无效的 id' }, { status: 400 });
        }
        const ok = deleteReservation(numericId);
        return NextResponse.json({ success: ok });
    } catch (error) {
        console.error('删除预约失败:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
