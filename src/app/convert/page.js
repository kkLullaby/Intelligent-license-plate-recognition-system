'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';

export default function ConvertPage() {
    const [file, setFile] = useState(null);
    const [encoding, setEncoding] = useState('GBK');
    const [previewLines, setPreviewLines] = useState([]);
    const [decodedText, setDecodedText] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const inputRef = useRef(null);

    // 当文件或编码改变时，重新读取并生成预览
    useEffect(() => {
        if (!file) {
            setPreviewLines([]);
            setDecodedText('');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            setDecodedText(text);
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            setPreviewLines(lines.slice(0, 5)); // 预览前5行
        };
        reader.onerror = () => {
            setMessage('读取文件失败，请重试');
            setSuccess(false);
        };
        reader.readAsText(file, encoding);
    }, [file, encoding]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setMessage('');
            setSuccess(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setMessage('');
            setSuccess(false);
        }
    };

    const handleConvert = async () => {
        if (!decodedText) {
            setMessage('请先选择一个有效的 CSV 文件');
            setSuccess(false);
            return;
        }

        setLoading(true);
        setMessage('');

        try {
            // 直接发送解码后的纯文本给后端
            const response = await fetch('/api/convert', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain; charset=utf-8' },
                body: decodedText,
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
                setMessage(`🎉 转换成功！共处理 ${result.count} 条车辆预约记录。`);
            } else {
                setSuccess(false);
                setMessage(`❌ 转换失败：${result.message}`);
            }
        } catch (error) {
            setSuccess(false);
            setMessage(`❌ 请求错误：${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at top left, #1e1b4b, transparent 40%), radial-gradient(circle at bottom right, #064e3b, transparent 40%), #0f172a',
            padding: '20px',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
            <div style={{
                width: '100%',
                maxWidth: '680px',
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '40px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                textAlign: 'center',
                color: '#f8fafc'
            }}>
                <h1 style={{
                    fontSize: '2rem',
                    fontWeight: '800',
                    marginBottom: '1rem',
                    background: 'linear-gradient(to right, #60a5fa, #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                }}>CSV 预约数据转换</h1>
                <p style={{
                    color: '#94a3b8',
                    fontSize: '1rem',
                    lineHeight: '1.6',
                    marginBottom: '20px'
                }}>
                    上传包含车牌数据的 CSV 文件，选择正确的编码以防乱码。转换将自动解析并覆盖系统数据库。
                </p>
                
                {/* 编码选择 */}
                <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    <label style={{ color: '#cbd5e1', fontWeight: '600' }}>文件编码：</label>
                    <select 
                        value={encoding} 
                        onChange={(e) => setEncoding(e.target.value)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            background: 'rgba(15, 23, 42, 0.6)',
                            border: '1px solid rgba(148, 163, 184, 0.3)',
                            color: '#e2e8f0',
                            fontSize: '1rem',
                            outline: 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <option value="GBK">GBK (Windows Excel 默认)</option>
                        <option value="UTF-8">UTF-8</option>
                        <option value="GB2312">GB2312</option>
                        <option value="Big5">Big5</option>
                    </select>
                </div>

                <div 
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => inputRef.current?.click()}
                    style={{ 
                        border: `2px dashed ${dragActive ? '#60a5fa' : 'rgba(255,255,255,0.2)'}`, 
                        borderRadius: '16px', 
                        padding: '30px 20px', 
                        background: dragActive ? 'rgba(96, 165, 250, 0.1)' : 'rgba(15, 23, 42, 0.5)',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        marginBottom: '20px',
                        position: 'relative'
                    }}
                >
                    <input 
                        ref={inputRef}
                        type="file" 
                        accept=".csv" 
                        onChange={handleFileChange} 
                        style={{ display: 'none' }}
                    />
                    <div style={{ fontSize: '3rem', marginBottom: '15px', transform: dragActive ? 'translateY(-5px)' : 'none', transition: 'transform 0.3s' }}>
                        {file ? '📄' : '📤'}
                    </div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: file ? '#60a5fa' : '#e2e8f0' }}>
                        {file ? file.name : '点击或拖拽上传 CSV 文件'}
                    </div>
                </div>

                {/* 预览区域 */}
                {file && previewLines.length > 0 && (
                    <div style={{
                        textAlign: 'left',
                        background: 'rgba(0, 0, 0, 0.3)',
                        borderRadius: '12px',
                        padding: '16px',
                        marginBottom: '30px',
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                    }}>
                        <div style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                            <span>数据预览（前 5 行）</span>
                            <span style={{ color: '#60a5fa' }}>如遇乱码，请尝试切换上方编码</span>
                        </div>
                        <div style={{
                            fontFamily: 'monospace',
                            fontSize: '0.9rem',
                            color: '#e2e8f0',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            lineHeight: '1.5'
                        }}>
                            {previewLines.map((line, idx) => (
                                <div key={idx} style={{ 
                                    padding: '6px 8px', 
                                    background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                                    borderRadius: '4px'
                                }}>
                                    {line}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <button 
                    onClick={handleConvert}
                    disabled={loading || !file}
                    style={{
                        width: '100%',
                        padding: '16px',
                        background: (loading || !file) ? '#334155' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
                        color: (loading || !file) ? '#94a3b8' : '#ffffff',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        cursor: (loading || !file) ? 'not-allowed' : 'pointer',
                        boxShadow: (loading || !file) ? 'none' : '0 8px 20px rgba(59, 130, 246, 0.4)',
                        transition: 'all 0.3s ease'
                    }}
                    onMouseOver={(e) => {
                        if(!loading && file) e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseOut={(e) => {
                        if(!loading && file) e.currentTarget.style.transform = 'none'
                    }}
                >
                    {loading ? '正在解析转换中...' : '确认无误，开始覆盖'}
                </button>

                {message && (
                    <div style={{ 
                        marginTop: '24px', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        background: success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                        border: `1px solid ${success ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                        color: success ? '#34d399' : '#f87171',
                        fontSize: '1rem',
                        fontWeight: '600',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        {message}
                    </div>
                )}
                
                <div style={{ marginTop: '30px' }}>
                    <Link href="/" style={{ 
                        color: '#94a3b8', 
                        textDecoration: 'none', 
                        fontSize: '0.95rem',
                        transition: 'color 0.2s',
                        display: 'inline-block',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)'
                    }}
                    onMouseOver={(e) => e.target.style.color = '#fff'}
                    onMouseOut={(e) => e.target.style.color = '#94a3b8'}
                    >
                        ← 返回扫码大屏
                    </Link>
                </div>
            </div>
            <style jsx global>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                select option {
                    background: #1e293b;
                    color: #e2e8f0;
                }
            `}</style>
        </div>
    );
}
