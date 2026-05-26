const API_KEY = process.env.BAIDU_OCR_API_KEY;
const SECRET_KEY = process.env.BAIDU_OCR_SECRET_KEY;

let cachedToken = "";
let tokenExpiresAt = 0;

function assertBaiduOcrConfig() {
    if (!API_KEY || !SECRET_KEY) {
        throw new Error("百度OCR配置缺失，请设置 BAIDU_OCR_API_KEY 和 BAIDU_OCR_SECRET_KEY");
    }
}

/**
 * 获取百度API Access Token
 */
export async function getAccessToken() {
    assertBaiduOcrConfig();

    if (cachedToken && Date.now() < tokenExpiresAt) {
        return cachedToken;
    }
    const url = `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${API_KEY}&client_secret=${SECRET_KEY}`;
    
    const response = await fetch(url, { 
        method: "POST", 
        headers: { 
            "Content-Type": "application/json", 
            "Accept": "application/json" 
        } 
    });
    const data = await response.json();
    
    if (data.access_token) {
        cachedToken = data.access_token;
        // expires_in 是秒为单位（通常是 30 天 2592000 秒）
        tokenExpiresAt = Date.now() + (data.expires_in * 1000) - 60000; // 提前一分钟过期
        return cachedToken;
    }
    throw new Error("获取百度API Access Token失败: " + JSON.stringify(data));
}

/**
 * 识别车牌号
 * @param {string} base64Image - 不带 data:image/jpeg;base64, 头的 base64 字符串
 */
export async function recognizeLicensePlate(base64Image) {
    const token = await getAccessToken();
    const url = `https://aip.baidubce.com/rest/2.0/ocr/v1/license_plate?access_token=${token}`;
    
    const body = new URLSearchParams();
    body.append('image', base64Image);
    
    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
    });
    
    const data = await response.json();
    
    if (data.error_code) {
        throw new Error(data.error_msg || "车牌识别接口报错");
    }
    
    return data;
}
