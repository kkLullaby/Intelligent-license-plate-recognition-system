import { NextResponse } from 'next/server';
import { recognizeLicensePlate } from '@/lib/baiduOcr';
import reservations from '@/data/reservations.json';

function normalizePlate(value) {
    return String(value ?? '')
        .trim()
        .replace(/[\s·.\-]/g, '')
        .toUpperCase();
}

export async function POST(request) {
    try {
        const { image } = await request.json();
        
        if (!image) {
            return NextResponse.json({ error: '请提供图像数据' }, { status: 400 });
        }

        // 去除 Base64 头部
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        
        // 调用百度 API 识别车牌
        const result = await recognizeLicensePlate(base64Data);
        
        if (!result.words_result || !result.words_result.number) {
            return NextResponse.json({ 
                success: false, 
                message: '未能识别到车牌，请重新扫描' 
            });
        }
        
        const plateNumber = normalizePlate(result.words_result.number);
        
        // 在预约列表中查找
        const reservation = reservations.find(r => normalizePlate(r.plate) === plateNumber);
        
        if (reservation) {
            return NextResponse.json({
                success: true,
                plate: plateNumber,
                isReserved: true,
                parkingLot: reservation.parkingLot
            });
        } else {
            return NextResponse.json({
                success: true,
                plate: plateNumber,
                isReserved: false
            });
        }
    } catch (error) {
        console.error('OCR API Error:', error);
        return NextResponse.json({ 
            success: false, 
            message: error.message || '服务器处理错误' 
        });
    }
}
