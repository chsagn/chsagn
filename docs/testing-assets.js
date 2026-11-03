/* 测试素材在本地浏览器生成，不上传文件或填写内容。 */
(() => {
    'use strict';
    const MAX_FILE = 100 * 1024 * 1024;
    const MAX_BATCH = 150 * 1024 * 1024;
    const MAX_PIXELS = 16 * 1024 * 1024;
    const groups = { image: [], file: [] };
    const zipUrls = { image: null, file: null };
    const $ = id => document.getElementById(id);
    const pause = () => new Promise(resolve => setTimeout(resolve, 0));

    function message(kind, text, error = false) {
        const el = $(kind + 'AssetStatus');
        el.textContent = text;
        el.classList.toggle('error', error);
        el.setAttribute('role', error ? 'alert' : 'status');
    }

    function integer(id, min, max, title) {
        const raw = $(id).value.trim();
        const value = Number(raw);
        if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < min || value > max) {
            throw new Error(title + '必须是 ' + min + '～' + max + ' 的整数');
        }
        return value;
    }

    function baseName(value, fallback) {
        const name = value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/[. ]+$/g, '').slice(0, 60);
        return name || fallback;
    }

    function sizeLabel(bytes) {
        if (bytes >= 1048576) return (bytes / 1048576).toFixed(3) + ' MiB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(3) + ' KiB';
        return bytes + ' B';
    }

    function clearGroup(kind) {
        groups[kind].forEach(item => URL.revokeObjectURL(item.url));
        groups[kind] = [];
        if (zipUrls[kind]) URL.revokeObjectURL(zipUrls[kind]);
        zipUrls[kind] = null;
        $(kind + 'AssetResults').replaceChildren();
        $(kind + 'AssetZip').hidden = true;
    }

    function addResult(kind, blob, name, detail) {
        const item = { blob, name, url: URL.createObjectURL(blob) };
        groups[kind].push(item);
        const card = document.createElement('div');
        card.className = 'asset-card';
        if (kind === 'image') {
            const preview = document.createElement('div');
            preview.className = 'asset-preview';
            const img = document.createElement('img');
            img.src = item.url;
            img.alt = name;
            preview.append(img);
            card.append(preview);
        }
        const title = document.createElement('div');
        title.className = 'asset-name';
        title.textContent = name;
        const meta = document.createElement('div');
        meta.className = 'asset-meta';
        meta.textContent = detail + ' · ' + sizeLabel(blob.size) + '（' + blob.size.toLocaleString('en-US') + ' 字节）';
        const link = document.createElement('a');
        link.className = 'asset-download';
        link.href = item.url;
        link.download = name;
        link.textContent = '下载文件';
        card.append(title, meta, link);
        $(kind + 'AssetResults').append(card);
        $(kind + 'AssetZip').hidden = false;
    }

    function lock(kind, busy) {
        document.querySelectorAll('#' + kind + '-asset-section button').forEach(button => { button.disabled = busy; });
        document.querySelectorAll('#' + kind + '-asset-section input, #' + kind + '-asset-section select').forEach(input => { input.disabled = busy; });
        if (!busy && kind === 'file') $('assetFileContent').disabled = $('assetFileType').value === 'txt';
    }

    async function generateImages() {
        lock('image', true);
        try {
            const width = integer('assetImageWidth', 1, 8192, '宽度');
            const height = integer('assetImageHeight', 1, 8192, '高度');
            const count = integer('assetImageCount', 1, 20, '数量');
            if (width * height > MAX_PIXELS) throw new Error('单张图片不得超过 16,777,216 像素，请减小宽高');
            if (width * height * count > MAX_PIXELS * 4) throw new Error('本批图片总像素过多，请减少数量或尺寸');
            const format = $('assetImageFormat').value;
            const background = $('assetImageBackground').value;
            if (background === 'transparent' && format === 'jpeg') throw new Error('JPEG 不支持透明背景，请选择 PNG 或 WebP');
            const quality = integer('assetImageQuality', 1, 100, '质量') / 100;
            const name = baseName($('assetImageName').value, 'test-image');
            const color = $('assetImageColor').value;
            const label = $('assetImageLabel').checked;
            const custom = $('assetImageText').value.trim().slice(0, 80);
            const mime = 'image/' + format;
            clearGroup('image');
            let totalBytes = 0;
            for (let i = 1; i <= count; i++) {
                message('image', '正在生成 ' + i + ' / ' + count + '…');
                await pause();
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                try {
                    const ctx = canvas.getContext('2d');
                    if (!ctx) throw new Error('浏览器无法创建画布，请减小尺寸重试');
                    if (background === 'solid') {
                        ctx.fillStyle = color;
                        ctx.fillRect(0, 0, width, height);
                    } else if (background === 'gradient') {
                        const gradient = ctx.createLinearGradient(0, 0, width, height);
                        gradient.addColorStop(0, color);
                        gradient.addColorStop(1, '#e9d5ff');
                        ctx.fillStyle = gradient;
                        ctx.fillRect(0, 0, width, height);
                    } else if (background === 'noise') {
                        const pixels = ctx.createImageData(width, height);
                        for (let p = 0; p < pixels.data.length; p += 4) {
                            pixels.data[p] = Math.floor(Math.random() * 256);
                            pixels.data[p + 1] = Math.floor(Math.random() * 256);
                            pixels.data[p + 2] = Math.floor(Math.random() * 256);
                            pixels.data[p + 3] = 255;
                        }
                        ctx.putImageData(pixels, 0, 0);
                    }
                    if (label) {
                        const fontSize = Math.max(1, Math.floor(Math.min(width / 16, height / 9, 54)));
                        const lines = [custom || 'TEST IMAGE', width + ' × ' + height, '#' + String(i).padStart(2, '0')];
                        const lineHeight = fontSize * 1.5;
                        ctx.fillStyle = 'rgba(255,255,255,0.88)';
                        ctx.fillRect(0, height / 2 - lineHeight * 2, width, lineHeight * 4);
                        ctx.fillStyle = '#24324b';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.font = '600 ' + fontSize + 'px Arial, sans-serif';
                        lines.forEach((text, n) => ctx.fillText(text, width / 2, height / 2 + (n - 1) * lineHeight, Math.max(1, width * 0.9)));
                    }
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, quality));
                    if (!blob) throw new Error('图片导出失败，请减小尺寸重试');
                    if (blob.type !== mime) throw new Error('当前浏览器不支持导出 ' + format.toUpperCase() + '，请选择 PNG 或 JPEG');
                    totalBytes += blob.size;
                    if (totalBytes > MAX_BATCH) throw new Error('本批图片文件超过 150 MiB，请减少数量或尺寸');
                    const ext = format === 'jpeg' ? 'jpg' : format;
                    addResult('image', blob, name + '_' + width + 'x' + height + '_' + String(i).padStart(2, '0') + '.' + ext, width + ' × ' + height + ' px · ' + format.toUpperCase());
                } finally {
                    canvas.width = 0;
                    canvas.height = 0;
                }
            }
            message('image', '已生成 ' + count + ' 张图片，共 ' + sizeLabel(totalBytes) + '。可单独下载或打包 ZIP。');
        } catch (error) {
            message('image', error.message + (groups.image.length ? '；当前保留 ' + groups.image.length + ' 张结果。' : ''), true);
        } finally { lock('image', false); }
    }

    // 用整数运算转换单位，避免小数乘法导致文件大小偏差。
    function parseBytes(value, unit) {
        const match = /^(\d+)(?:\.(\d{1,6}))?$/.exec(value.trim());
        if (!match) throw new Error('文件大小请输入非负数字，最多保留 6 位小数');
        const units = { B: 1n, KB: 1000n, KiB: 1024n, MB: 1000000n, MiB: 1048576n };
        if (!units[unit]) throw new Error('不支持的大小单位');
        const fraction = match[2] || '';
        const scale = 10n ** BigInt(fraction.length);
        const numerator = (BigInt(match[1]) * scale + BigInt(fraction || '0')) * units[unit];
        if (numerator % scale !== 0n) throw new Error('该大小不是整数个字节，请改用 B 单位输入准确字节数');
        const bytes = numerator / scale;
        if (bytes > BigInt(MAX_FILE)) throw new Error('单个文件最大为 100 MiB（104,857,600 字节）');
        return Number(bytes);
    }

    function showByteCount() {
        try {
            const bytes = parseBytes($('assetFileSize').value, $('assetFileUnit').value);
            $('assetByteCount').textContent = '目标大小：' + bytes.toLocaleString('en-US') + ' 字节（' + sizeLabel(bytes) + '）';
        } catch (error) { $('assetByteCount').textContent = error.message; }
    }

    async function createSizedBlob(bytes, type, content) {
        const chunkSize = Math.min(bytes, 1024 * 1024);
        const chunk = new Uint8Array(chunkSize);
        if (type === 'txt') {
            const pattern = new TextEncoder().encode('TEST FILE - upload boundary sample\r\n');
            for (let i = 0; i < chunkSize; i++) chunk[i] = pattern[i % pattern.length];
        }
        const parts = [];
        for (let offset = 0; offset < bytes; offset += chunkSize) {
            const length = Math.min(chunkSize, bytes - offset);
            if (type === 'bin' && content === 'random') {
                const random = new Uint8Array(length);
                for (let i = 0; i < length; i += 65536) crypto.getRandomValues(random.subarray(i, Math.min(i + 65536, length)));
                parts.push(random);
            } else parts.push(chunk.subarray(0, length));
            if (offset % (8 * 1024 * 1024) === 0) await pause();
        }
        const blob = new Blob(parts, { type: type === 'txt' ? 'text/plain;charset=utf-8' : 'application/octet-stream' });
        if (blob.size !== bytes) throw new Error('生成结果大小校验失败，请重试');
        return blob;
    }

    async function generateFiles(boundary) {
        lock('file', true);
        try {
            const bytes = parseBytes($('assetFileSize').value, $('assetFileUnit').value);
            const sizes = boundary ? [bytes - 1, bytes, bytes + 1] : [bytes];
            if (sizes.some(size => size < 0 || size > MAX_FILE)) throw new Error('边界模式要求上限至少 1 字节，且“上限 + 1”不得超过 100 MiB');
            if (sizes.reduce((sum, size) => sum + size, 0) > MAX_BATCH) throw new Error('本批总大小不得超过 150 MiB，请减小上限或单独生成');
            const type = $('assetFileType').value;
            const content = $('assetFileContent').value;
            const name = baseName($('assetFileName').value, 'test-file');
            clearGroup('file');
            for (let i = 0; i < sizes.length; i++) {
                message('file', '正在生成 ' + (i + 1) + ' / ' + sizes.length + '…');
                const blob = await createSizedBlob(sizes[i], type, content);
                const suffix = boundary ? ['below', 'equal', 'above'][i] : 'exact';
                addResult('file', blob, name + '_' + suffix + '_' + sizes[i] + 'B.' + type, type === 'txt' ? '有效纯文本 · UTF-8（ASCII 内容，无 BOM）' : '二进制大小测试样本');
            }
            message('file', '已生成 ' + sizes.length + ' 个文件，实际字节数校验通过。' + (boundary ? '三个文件依次为上限 − 1、上限、上限 + 1 字节。' : ''));
        } catch (error) {
            message('file', error.message + (groups.file.length ? '；当前保留 ' + groups.file.length + ' 个结果。' : ''), true);
        } finally { lock('file', false); }
    }

    // 使用 ZIP 的 Store 模式打包，无外部依赖，不重复压缩图片。
    const crcTable = Array.from({ length: 256 }, (_, n) => {
        let c = n;
        for (let k = 0; k < 8; k++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        return c >>> 0;
    });
    function crc32(bytes) {
        let crc = 0xffffffff;
        for (const byte of bytes) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    }
    function header(length) {
        const bytes = new Uint8Array(length);
        return { bytes, view: new DataView(bytes.buffer) };
    }
    async function zipGroup(kind) {
        lock(kind, true);
        try {
            if (!groups[kind].length) throw new Error('请先生成文件');
            message(kind, '正在打包 ZIP…');
            await pause();
            const local = [], central = [];
            let offset = 0, centralSize = 0;
            const now = new Date();
            const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
            const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
            for (const item of groups[kind]) {
                const name = new TextEncoder().encode(item.name);
                const bytes = new Uint8Array(await item.blob.arrayBuffer());
                const crc = crc32(bytes);
                const l = header(30);
                l.view.setUint32(0, 0x04034b50, true);
                l.view.setUint16(4, 20, true);
                l.view.setUint16(6, 0x0800, true);
                l.view.setUint16(10, time, true);
                l.view.setUint16(12, date, true);
                l.view.setUint32(14, crc, true);
                l.view.setUint32(18, bytes.length, true);
                l.view.setUint32(22, bytes.length, true);
                l.view.setUint16(26, name.length, true);
                local.push(l.bytes, name, item.blob);
                const c = header(46);
                c.view.setUint32(0, 0x02014b50, true);
                c.view.setUint16(4, 20, true);
                c.view.setUint16(6, 20, true);
                c.view.setUint16(8, 0x0800, true);
                c.view.setUint16(12, time, true);
                c.view.setUint16(14, date, true);
                c.view.setUint32(16, crc, true);
                c.view.setUint32(20, bytes.length, true);
                c.view.setUint32(24, bytes.length, true);
                c.view.setUint16(28, name.length, true);
                c.view.setUint32(42, offset, true);
                central.push(c.bytes, name);
                offset += 30 + name.length + bytes.length;
                centralSize += 46 + name.length;
                await pause();
            }
            const end = header(22);
            end.view.setUint32(0, 0x06054b50, true);
            end.view.setUint16(8, groups[kind].length, true);
            end.view.setUint16(10, groups[kind].length, true);
            end.view.setUint32(12, centralSize, true);
            end.view.setUint32(16, offset, true);
            const zip = new Blob([...local, ...central, end.bytes], { type: 'application/zip' });
            if (zipUrls[kind]) URL.revokeObjectURL(zipUrls[kind]);
            zipUrls[kind] = URL.createObjectURL(zip);
            const link = document.createElement('a');
            link.href = zipUrls[kind];
            link.download = 'test-' + kind + '-samples.zip';
            document.body.append(link);
            link.click();
            link.remove();
            message(kind, 'ZIP 已生成，共 ' + groups[kind].length + ' 个文件。');
        } catch (error) { message(kind, error.message, true); }
        finally { lock(kind, false); }
    }

    function init() {
        $('imageAssetGenerate').addEventListener('click', generateImages);
        $('fileAssetGenerate').addEventListener('click', () => generateFiles(false));
        $('fileAssetBoundary').addEventListener('click', () => generateFiles(true));
        ['image', 'file'].forEach(kind => {
            $(kind + 'AssetZip').addEventListener('click', () => zipGroup(kind));
            $(kind + 'AssetClear').addEventListener('click', () => { clearGroup(kind); message(kind, '结果已清空'); });
        });
        document.querySelectorAll('[data-image-preset]').forEach(button => button.addEventListener('click', () => {
            const [width, height] = button.dataset.imagePreset.split('x');
            $('assetImageWidth').value = width;
            $('assetImageHeight').value = height;
        }));
        document.querySelectorAll('[data-file-preset]').forEach(button => button.addEventListener('click', () => {
            $('assetFileSize').value = button.dataset.filePreset;
            $('assetFileUnit').value = button.dataset.fileUnit || 'MiB';
            showByteCount();
        }));
        ['assetFileSize', 'assetFileUnit'].forEach(id => $(id).addEventListener('input', showByteCount));
        $('assetFileType').addEventListener('change', () => {
            $('assetFileContent').disabled = $('assetFileType').value === 'txt';
        });
        $('assetFileContent').disabled = $('assetFileType').value === 'txt';
        showByteCount();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
