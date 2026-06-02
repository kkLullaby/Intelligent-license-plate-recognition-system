import { NextResponse } from 'next/server';
import { recognizeLicensePlate } from '@/lib/baiduOcr';
import { appendRecognitionLog } from '@/lib/recognitionLog';
import { findReservationByPlate, normalizePlate } from '@/lib/reservations';

export async function POST(request) {
    try {
        const { image, source } = await request.json();

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

        // 在预约表中查找
        const reservation = findReservationByPlate(plateNumber);
        const isReserved = Boolean(reservation);
        const parkingLot = reservation?.parkingLot ?? null;

        // 记录识别日志
        try {
            await appendRecognitionLog({
                plate: plateNumber,
                isReserved,
                parkingLot,
                source: source || 'ocr',
            });
        } catch (logErr) {
            console.error('写入识别日志失败:', logErr);
            // 日志写入失败不影响主流程
        }

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
