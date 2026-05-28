import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        let csvText = '';
        
        const contentType = request.headers.get('content-type') || '';
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData().catch(() => null);
            if (formData && formData.has('file')) {
                const file = formData.get('file');
                csvText = await file.text();
            }
        } else {
            csvText = await request.text();
        }

        if (!csvText) {
            return NextResponse.json({ success: false, message: '未收到有效数据' }, { status: 400 });
        }

        const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length === 0) {
            return NextResponse.json({ success: false, message: 'CSV 文件为空' }, { status: 400 });
        }

        const newReservations = [];
        
        for (const line of lines) {
            const parts = line.split(',');
            if (!parts || parts.length === 0) continue;
            
            let rawPlate = parts[0].trim();
            if (!rawPlate) continue;
            
            // 跳过可能的表头
            if (rawPlate.includes('plate') || rawPlate.includes('车牌') || rawPlate.includes('Plate')) {
                continue;
            }
            
            let plate = rawPlate.replace(/['"]/g, '');
            plate = String(plate).replace(/[\s·.\-]/g, '').toUpperCase();
            
            let parkingLot = "北一门"; // 默认
            let isReserved = true;

            for (let i = 1; i < parts.length; i++) {
                const p = parts[i].trim();
                if (p.includes('北一门') || p.includes('北门') || p.includes('北1门')) {
                    parkingLot = '北一门';
                } else if (p.includes('北二门') || p.includes('北2门')) {
                    parkingLot = '北二门';
                }
                if (p === 'false' || p === '否') {
                    isReserved = false;
                }
            }

            // 避免重复车牌
            if (!newReservations.find(r => r.plate === plate)) {
                newReservations.push({
                    plate,
                    parkingLot,
                    isReserved
                });
            }
        }
        
        const dataPath = path.join(process.cwd(), 'src/data/reservations.json');
        await fs.writeFile(dataPath, JSON.stringify(newReservations, null, 2), 'utf-8');

        return NextResponse.json({ success: true, message: '转换并覆盖成功', count: newReservations.length });

    } catch (error) {
        console.error('转换错误:', error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
