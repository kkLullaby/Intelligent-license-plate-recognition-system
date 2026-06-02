import { NextResponse } from 'next/server';
import { deleteRecognitionLog } from '@/lib/recognitionLog';

export async function DELETE(_request, { params }) {
    try {
        const { id } = await params;
        if (!id) {
            return NextResponse.json({ success: false, message: '无效的 id' }, { status: 400 });
        }
        const ok = await deleteRecognitionLog(id);
        return NextResponse.json({ success: ok });
    } catch (error) {
        console.error('删除日志失败:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
