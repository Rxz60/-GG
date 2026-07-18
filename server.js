const express = require('express');
const crypto = require('crypto');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// قاعدة بيانات وهمية في الذاكرة لتخزين السكربتات (يمكنك ربطها بملف أو قاعدة بيانات لاحقاً)
let secureDb = {};

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// مفتاح تشفير سري وقوي جداً خاص بك لا يمكن لأحد معرفته
const SECRET_KEY = "TRX_HUB_ULTRA_SECRET_KEY_2026_PROTECT"; 

// 1. خوارزمية تشفير متطورة وحماية قوية جداً (AES-256-CBC)
function encryptLua(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', crypto.scryptSync(SECRET_KEY, 'salt', 32), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // دمج الـ IV مع الكود المشفر وتعميته بالكامل وتحويله لصيغة بايتات معماة
    return iv.toString('hex') + ':' + encrypted;
}

// دالة فك التشفير الآمنة التي يقرأها لودر اللوا فقط عند التشغيل
function decryptLua(encryptedText) {
    try {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts.shift(), 'hex');
        const encrypted = parts.join(':');
        const decipher = crypto.createDecipheriv('aes-256-cbc', crypto.scryptSync(SECRET_KEY, 'salt', 32), iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (e) {
        return "-- [PROTECTION]: ACCESS DENIED. INVALID DECRYPTION LAYER. --";
    }
}

// 2. نظام روابط الـ RAW الحقيقي والذكي (/raw/اسم-السكربت)
app.get('/raw/:scriptName', (req, res) => {
    const name = req.params.scriptName;
    const script = secureDb[name];

    if (!script) {
        return res.status(404).send('404 : Page Not Found');
    }

    // هنا السحر والحماية الذكية:
    // نتحقق من العميل (User-Agent) الذي يطلب الرابط
    const userAgent = req.headers['user-agent'] || '';

    // إذا كان الطلب جاي من متصفح عادي (شخص يحاول يسرق أو يشوف الكود)
    if (userAgent.includes('Mozilla') || userAgent.includes('Chrome') || userAgent.includes('Safari')) {
        // نرسل له شاشة سوداء تماماً مع تمويه الـ 404 الشهير في أعلى اليسار والكود مخفي بالكامل بلون أسود
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>404 Not Found</title>
                <style>
                    body { background-color: #000000; color: #151515; font-family: monospace; padding: 20px; user-select: none; }
                    .error { position: fixed; top: 20px; left: 20px; color: #444; font-size: 16px; font-weight: bold; }
                    .content { margin-top: 60px; word-break: break-all; font-size: 10px; pointer-events: none; opacity: 0.02; }
                </style>
            </head>
            <body>
                <div class="error">404 : Page Not Found</div>
                <div class="content">${script.protectedCode}</div>
            </body>
            </html>
        `);
    } else {
        // إذا كان الطلب جاي من سكربت تشغيل أو أداة حقن أو لودر (مثل طلبات اللوا المباشرة)
        // نقوم بفك التشفير اللحظي في الذاكرة ونرسل له الكود الأصلي الصافي مئة بالمئة ليعمل بدون أي حجب!
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(decryptLua(script.protectedCode));
    }
});

// 3. صفحة الواجهة الرئيسية للموقع (لوحة التحكم وتسجيل الدخول)
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
        <meta charset="UTF-8">
        <title>لوحة تحكم TRX l HUB</title>
        <style>
            body { background-color: #0d0d10; color: #fff; font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; }
            .box { background: #141419; padding: 30px; border-radius: 12px; border: 1px solid #24242c; width: 100%; max-width: 500px; }
            input, textarea, button { width: 100%; padding: 12px; margin-top: 10px; border-radius: 6px; border: 1px solid #24242c; background: #1c1c22; color: #fff; box-sizing: border-box; }
            button { background: #007aff; font-weight: bold; cursor: pointer; border: none; }
            .script-item { background: #1c1c22; padding: 12px; border-radius: 6px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center; }
            .btn-del { background: #ff3b30; width: auto; padding: 5px 10px; font-size: 12px; }
            .raw-link { color: #34c759; text-decoration: none; font-size: 14px; font-weight: bold; }
        </style>
    </head>
    <body>
        <!-- نظام تسجيل الدخول ببياناتك -->
        <div class="box" id="loginBox">
            <h2>تسجيل الدخول للنظام</h2>
            <input type="text" id="user" placeholder="اسم المستخدم" value="نظام">
            <input type="password" id="pass" placeholder="كلمة المرور" value="التراكسي">
            <button onclick="checkLogin()" style="margin-top:15px;">دخول</button>
        </div>

        <!-- لوحة التحكم الحقيقية لتوليد الروابط -->
        <div class="box" id="dashBox" style="display:none;">
            <h2>إضافة سكربت جديد ومحمّي</h2>
            <input type="text" id="scrName" placeholder="اسم السكربت (سيكون جزء من الرابط)">
            <textarea id="scrCode" rows="6" placeholder="-- ضع كود اللوا هنا..."></textarea>
            <input type="file" id="fileInp" accept=".lua,.txt" onchange="uploadFile(this)">
            <button onclick="saveScript()" style="margin-top:15px;">توليد رابط RAW حقيقي ومحمي</button>
            
            <h3 style="margin-top:25px;">الروابط النشطة:</h3>
            <div id="list"></div>
        </div>

        <script>
            let currentScripts = {};

            function checkLogin() {
                if(document.getElementById('user').value === "نظام" && document.getElementById('pass').value === "التراكسي") {
                    document.getElementById('loginBox').style.display = 'none';
                    document.getElementById('dashBox').style.display = 'block';
                } else { alert('خطأ في البيانات'); }
            }

            function uploadFile(input) {
                const file = input.files[0];
                if (file) {
                    document.getElementById('scrName').value = file.name.replace(/\.[^/.]+$/, "").replace(/\s+/g, '-');
                    const reader = new FileReader();
                    reader.onload = e => document.getElementById('scrCode').value = e.target.result;
                    reader.readAsText(file);
                }
            }

            async function saveScript() {
                const name = document.getElementById('scrName').value.trim().replace(/\s+/g, '-');
                const code = document.getElementById('scrCode').value.trim();
                if(!name || !code) return alert('اكمل الحقول');

                const res = await fetch('/add-script', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ name, code })
                });
                const data = await res.json();
                if(data.success) {
                    alert('تم توليد الـ RAW الحقيقي بنجاح وبأعلى حماية!');
                    loadScripts();
                }
            }

            async function loadScripts() {
                const res = await fetch('/get-scripts');
                const data = await res.json();
                const list = document.getElementById('list');
                list.innerHTML = '';
                for(let key in data) {
                    list.innerHTML += \`
                        <div class="script-item">
                            <div>
                                <strong>\${key}</strong><br>
                                <a class="raw-link" href="/raw/\${key}" target="_blank">نسخ رابط الـ RAW الحقيقي</a>
                            </div>
                            <button class="btn-del" onclick="deleteScript('\${key}')">حذف</button>
                        </div>
                    \`;
                }
            }

            async function deleteScript(name) {
                if(confirm('حذف؟')) {
                    await fetch('/del-script', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ name })
                    });
                    loadScripts();
                }
            }
        </script>
    </body>
    </html>
    `);
});

// ممرات الـ API الخاصة بالـ Backend لإدارة السكربتات وتشفيرها
app.post('/add-script', (req, res) => {
    const { name, code } = req.body;
    const encrypted = encryptLua(code);
    secureDb[name] = { protectedCode: encrypted };
    res.json({ success: true });
});

app.get('/get-scripts', (req, res) => { res.json(secureDb); });
app.post('/del-script', (req, res) => {
    const { name } = req.body;
    delete secureDb[name];
    res.json({ success: true });
});

app.listen(PORT, () => {
    console.log(`السيرفر شغال على الرابط: http://localhost:${PORT}`);
});
