// ====================================================================
// ** Firebase & Configuration **
// ====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDK1kimYUSskgWDm2IinbqSeIT3yXt8EV8", 
    authDomain: "cherrychoice-test1w-8469-a2886.firebaseapp.com",
    projectId: "cherrychoice-test1w-8469-a2886",
    storageBucket: "cherrychoice-test1w-8469-a2886.appspot.com",
    messagingSenderId: "467241546268",
    appId: "1:467241546268:web:a29ce5496c0e817d94e5d9"
};

// Initialize Firebase with safety check
let auth, db;
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    auth = firebase.auth();
    db = firebase.firestore();
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
} catch (e) {
    console.error("Firebase Initialization Error:", e);
}

// ====================================================================
// ** Premium Closet Item Component **
// ====================================================================
class ClosetItem extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); }
    connectedCallback() {
        const imageSrc = this.getAttribute('image-src') || '';
        const name = this.getAttribute('name') || 'Unnamed Item';
        const category = this.getAttribute('category') || 'Item';
        const color = this.getAttribute('color') || '#ffffff';
        
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; animation: slideUp 0.4s ease-out; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .card {
                    background: #fff; border-radius: 24px; padding: 12px;
                    transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid #f0f0f0;
                    position: relative; cursor: pointer;
                }
                .card:hover { transform: translateY(-5px); border-color: #E8B4A0; box-shadow: 0 20px 50px rgba(0,0,0,0.08); }
                .img-box {
                    width: 100%; aspect-ratio: 1; background: #FAF7F2;
                    border-radius: 18px; overflow: hidden; display: flex; align-items: center; justify-content: center;
                    position: relative;
                }
                /* Fallback emoji styling */
                .img-box::before {
                    content: '✨'; font-size: 40px; position: absolute; opacity: 0.1;
                }
                img { 
                    width: 100%; height: 100%; object-fit: contain; 
                    filter: drop-shadow(0 10px 15px rgba(0,0,0,0.05)); 
                    transition: 0.3s opacity;
                    position: relative; z-index: 1;
                }
                .info { padding: 12px 4px; }
                .cat { font-size: 10px; font-weight: 800; color: #8C8378; text-transform: uppercase; letter-spacing: 1.5px; }
                .name { font-size: 14px; font-weight: 700; color: #1C1C1E; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .del { margin-top: 10px; font-size: 11px; color: #E8B4A0; cursor: pointer; border: none; background: none; font-weight: 700; }
                .color-tag {
                    position: absolute; top: 20px; right: 20px;
                    width: 14px; height: 14px; border-radius: 50%;
                    border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                    background: ${color};
                    z-index: 5;
                }
            </style>
            <div class="card">
                <div class="color-tag" title="Detected Dominant Color"></div>
                <div class="img-box">
                    <img src="${imageSrc}" onerror="this.style.opacity='0'; this.parentElement.style.background='#F5F0E8';">
                </div>
                <div class="info">
                    <div class="cat">${category}</div>
                    <div class="name">${name}</div>
                    <button class="del">REMOVE</button>
                </div>
            </div>
        `;
        this.shadowRoot.querySelector('.del').addEventListener('click', (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('delete-item', { bubbles: true, composed: true, detail: { id: this.getAttribute('item-id') } }));
        });
    }
}
if (!customElements.get('closet-item')) customElements.define('closet-item', ClosetItem);

// ====================================================================
// ** Main Application **
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // Elements
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('item-image');
    const form = document.getElementById('add-item-form');
    const nameInput = document.getElementById('item-name');
    const categoryInput = document.getElementById('item-category');
    const gallery = document.getElementById('closet-gallery');
    
    // Auth Elements
    const authBtn = document.getElementById('auth-btn');
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authIdInput = document.getElementById('auth-id');
    const authPassword = document.getElementById('auth-password');
    const switchToSignup = document.getElementById('switch-to-signup');
    const googleLoginBtn = document.getElementById('google-login-btn');

    const CLOSET_KEY = 'closet_v3';
    let net = null;
    let bodyPixNet = null;
    let currentUser = null;
    let optimizedBase64Image = null;
    let detectedColorHex = '#FFFFFF';

    // AI Load
    const loadAI = async () => {
        try {
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI 모델 로딩 중...';
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            bodyPixNet = await bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 16, multiplier: 0.75, quantBytes: 2
            });
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI READY — UPLOAD IMAGE';
        } catch (e) { 
            console.warn('AI Load Error (Local):', e); 
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI 모델 로드 실패 (새로고침 권장)';
        }
    };
    loadAI();

    // --- Color Extraction Logic ---
    const extractDominantColor = (imgElement) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 50; canvas.height = 50;
        ctx.drawImage(imgElement, 0, 0, 50, 50);
        
        const imageData = ctx.getImageData(0, 0, 50, 50).data;
        let r = 0, g = 0, b = 0, count = 0;
        
        for (let i = 0; i < imageData.length; i += 4) {
            // Only count non-transparent pixels
            if (imageData[i + 3] > 128) {
                r += imageData[i];
                g += imageData[i + 1];
                b += imageData[i + 2];
                count++;
            }
        }
        
        if (count === 0) return '#FFFFFF';
        
        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);
        
        const toHex = (c) => c.toString(16).padStart(2, '0');
        return `#${toHex(avgR)}${toHex(avgG)}${toHex(avgB)}`.toUpperCase();
    };

    // Simple Coordination Suggestions
    const getColorCoordination = (hex) => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        // 1. Complementary (Opposite)
        const comp = `#${(255-r).toString(16).padStart(2,'0')}${(255-g).toString(16).padStart(2,'0')}${(255-b).toString(16).padStart(2,'0')}`;
        // 2. Neutral Grey/Stone
        const neutral = '#8C8378';
        // 3. Warm White/Cream
        const warm = '#F5F0E8';
        // 4. Deep Charcoal
        const charcoal = '#1C1C1E';
        
        return [comp, neutral, warm, charcoal];
    };

    // --- Background Removal using BodyPix ---
    const removeBackground = async (imgElement) => {
        if (!bodyPixNet) return imgElement.src;
        try {
            const segmentation = await bodyPixNet.segmentPerson(imgElement, {
                internalResolution: 'medium', segmentationThreshold: 0.7
            });
            const canvas = document.createElement('canvas');
            canvas.width = imgElement.width; canvas.height = imgElement.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixelData = imageData.data;
            let count = 0;
            for (let i = 0; i < pixelData.length; i += 4) {
                if (segmentation.data[i / 4] === 0) { pixelData[i + 3] = 0; }
                else count++;
            }
            if (count === 0) return imgElement.src;
            ctx.putImageData(imageData, 0, 0);
            return canvas.toDataURL('image/png');
        } catch (e) { return imgElement.src; }
    };

    const showToast = (msg) => {
        const t = document.createElement('div');
        t.className = 'toast show';
        t.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#333; color:white; padding:12px 24px; border-radius:50px; z-index:9999; font-size:14px; box-shadow:0 10px 20px rgba(0,0,0,0.2); transition: 0.3s opacity;";
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
    };

    const compressImage = (imgElement, format = 'image/png') => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 450;
            let width = imgElement.width, height = imgElement.height;
            if (width > MAX_WIDTH) { height = (MAX_WIDTH / width) * height; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, width, height);
            resolve(canvas.toDataURL(format, 0.7)); 
        });
    };

    const handleGoogleLogin = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        googleLoginBtn.disabled = true;
        googleLoginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CONNECTING...';
        try {
            await auth.signInWithPopup(provider);
            authModal.style.display = 'none';
        } catch (error) {
            if (error.code === 'auth/popup-blocked') await auth.signInWithRedirect(provider);
            else { showToast('AUTH ERROR: ' + error.message); googleLoginBtn.disabled = false; }
        }
    };
    googleLoginBtn?.addEventListener('click', handleGoogleLogin);

    auth.getRedirectResult().then((result) => {
        if (result && result.user) { showToast('WELCOME BACK'); authModal.style.display = 'none'; }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('auth-submit');
        const id = authIdInput.value.trim(), pw = authPassword.value;
        const isSignUp = document.getElementById('modal-title').textContent.includes('Account');
        let email = id.includes('@') ? id : `${id.toLowerCase()}@mycloset.com`;
        try {
            submitBtn.disabled = true;
            if (isSignUp) await auth.createUserWithEmailAndPassword(email, pw);
            else await auth.signInWithEmailAndPassword(email, pw);
            authModal.style.display = 'none';
        } catch (err) { showToast(err.message); } finally { submitBtn.disabled = false; }
    });

    auth.onAuthStateChanged(user => {
        currentUser = user;
        authBtn.textContent = user ? 'LOGOUT' : 'LOGIN';
        if (googleLoginBtn) {
            googleLoginBtn.disabled = false;
            googleLoginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18"> Continue with Google';
        }
        const userDisplay = document.getElementById('user-info');
        if (userDisplay) userDisplay.textContent = user ? (user.displayName || user.email.split('@')[0]).toUpperCase() : '';
        loadItems();
    });

    const CATEGORY_MAP = {
        'coat': 'Outer', 'jacket': 'Outer', 'trench coat': 'Outer', 'parka': 'Outer', 'windbreaker': 'Outer', 'cloak': 'Outer',
        'jersey': 'Top', 't-shirt': 'Top', 'shirt': 'Top', 'sweater': 'Top', 'sweatshirt': 'Top', 'cardigan': 'Top', 'vest': 'Top',
        'jean': 'Bottom', 'skirt': 'Bottom', 'short': 'Bottom', 'trouser': 'Bottom', 'pant': 'Bottom',
        'gown': 'Dress', 'dress': 'Dress',
        'shoe': 'Shoes', 'sneaker': 'Shoes', 'sandal': 'Shoes', 'boot': 'Shoes', 'loafer': 'Shoes',
        'hat': 'Acc', 'tie': 'Acc', 'belt': 'Acc', 'bag': 'Acc', 'sunglass': 'Acc', 'watch': 'Acc'
    };
    const TRANSLATION_MAP = {
        'jersey': '티셔츠/저지', 'shirt': '셔츠', 'jean': '청바지', 'skirt': '스커트', 'coat': '코트', 'jacket': '자켓',
        'dress': '원피스', 'shoe': '신발', 'sneaker': '운동화', 'hat': '모자', 'bag': '가방', 'sweater': '스웨터'
    };

    const RECOMMENDATION_MAP = {
        'Top': {
            items: [
                { name: '슬랙스 (Slacks)', reason: '깔끔한 핏의 슬랙스는 상의의 실루엣을 강조하며 정돈된 느낌을 줍니다.' },
                { name: '첼시 부츠 (Chelsea Boots)', reason: '세련된 발끝 마무리를 통해 전체적인 룩의 완성도를 높여줍니다.' },
                { name: '클래식 블레이저 (Blazer)', reason: '포멀한 무드를 더해 비즈니스와 캐주얼을 넘나드는 스타일을 완성합니다.' }
            ],
            guide: '상체에 시선이 머무는 코디입니다. 하의는 가급적 심플한 무채색 계열의 슬랙스를 추천하며, 가죽 소재의 신발로 고급스러움을 더해보세요.',
            keywords: ['minimal', 'office-look', 'casual-chic']
        },
        'Bottom': {
            items: [
                { name: '니트 스웨터 (Knit Sweater)', reason: '하의의 질감과 대비되는 부드러운 니트는 따뜻하고 편안한 인상을 줍니다.' },
                { name: '가죽 로퍼 (Loafers)', reason: '클래식한 로퍼는 하의의 핏을 더욱 돋보이게 하는 완벽한 파트너입니다.' },
                { name: '미니멀 트렌치 코트', reason: '길게 떨어지는 코트 라인이 하의와 연결되어 비율이 좋아 보이는 효과를 줍니다.' }
            ],
            guide: '하의가 주인공이 되는 룩입니다. 상의는 가벼운 소재보다는 어느 정도 무게감이 있는 니트나 셔츠를 레이어드하여 균형을 맞추는 것이 좋습니다.',
            keywords: ['street-style', 'autumn-vibes', 'modern-look']
        },
        'Outer': {
            items: [
                { name: '스트레이트 데님 (Jeans)', reason: '아우터의 볼륨감을 중화시켜 활동적이고 트렌디한 무드를 연출합니다.' },
                { name: '베이직 화이트 티셔츠', reason: '심플한 이너는 아우터 고유의 디자인과 색상을 가장 잘 살려줍니다.' },
                { name: '클린 스니커즈', reason: '가벼운 스니커즈로 마무리하여 부담스럽지 않은 데일리 고프코어 룩을 완성하세요.' }
            ],
            guide: '아우터의 색감이 강하다면 이너와 하의는 최대한 절제된 톤으로 맞추는 것이 핵심입니다. 레이어드를 통해 깊이감을 더해보세요.',
            keywords: ['utility-wear', 'street-fashion', 'layering']
        },
        'Dress': {
            items: [
                { name: '소프트 가디건', reason: '원피스의 라인을 부드럽게 감싸주어 여성스럽고 편안한 분위기를 자아냅니다.' },
                { name: '스틸레토 힐 (Heels)', reason: '수직적인 라인을 강조하여 다리가 길어 보이고 우아한 실루엣을 완성합니다.' },
                { name: '미니멀 클러치 백', reason: '작지만 확실한 포인트로 전체적인 코디에 긴장감과 세련미를 부여합니다.' }
            ],
            guide: '원피스는 단벌로도 완성도가 높으므로, 액세서리와 신발의 선택이 중요합니다. 전체적으로 톤온톤 배색을 활용해 정돈된 느낌을 주거나, 보색 대비로 포인트를 주세요.',
            keywords: ['romantic', 'date-night', 'elegant']
        },
        'Shoes': {
            items: [
                { name: '테이퍼드 치노 팬츠', reason: '신발의 실루엣이 잘 드러나도록 발목으로 갈수록 좁아지는 팬츠를 추천합니다.' },
                { name: '옥스퍼드 셔츠', reason: '깔끔한 셔츠는 신발이 주는 신뢰감 있는 인상을 한층 강화해줍니다.' },
                { name: '브라운 가죽 벨트', reason: '신발의 소재나 색상과 통일감을 주어 안정적인 코디 밸런스를 잡아줍니다.' }
            ],
            guide: '신발의 스타일(포멀 vs 캐주얼)에 따라 하의의 기장감을 조절해보세요. 양말의 색상이나 패턴으로 위트를 더하는 것도 좋은 방법입니다.',
            keywords: ['classic-style', 'heritage', 'gentleman']
        },
        'Acc': {
            items: [
                { name: '모노톤 수트 셋업', reason: '미니멀한 배경이 되어 액세서리가 가진 디테일과 가치를 가장 잘 드러냅니다.' },
                { name: '프리미엄 가죽 벨트', reason: '액세서리와 소재감을 통일하여 룩의 전체적인 퀄리티를 상향 평준화합니다.' },
                { name: '실크 스카프', reason: '자칫 밋밋할 수 있는 코디에 부드러운 질감과 우아한 포인트를 추가합니다.' }
            ],
            guide: '액세서리는 "과유불급"입니다. 메인 아이템을 돋보이게 할 수 있도록 의상은 심플하게 유지하고, 시선이 분산되지 않도록 주의하세요.',
            keywords: ['high-fashion', 'jewelry', 'detail']
        }
    };

    // --- 공용 분석 패널 업데이트 함수 ---
    const updateAnalysisPanel = (data) => {
        const { name, category, color, confidence = 100 } = data;
        const suggestions = getColorCoordination(color);
        const recs = RECOMMENDATION_MAP[category] || RECOMMENDATION_MAP['Top'];
        
        const analysisContent = document.getElementById('analysis-content');
        const coordinationList = document.getElementById('coordination-list');
        const stylingGuideText = document.getElementById('styling-guide-text');
        const moodGallery = document.getElementById('mood-gallery');
        const aiStylingSections = document.getElementById('ai-styling-sections');

        if (analysisContent) {
            analysisContent.innerHTML = `
                <div style="background:var(--cream); padding:20px; border-radius:16px; margin-top:10px; animation: fadeIn 0.5s ease-out;">
                    <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                        <span style="font-size:12px; color:var(--stone); font-weight:700;">분석 결과</span>
                        <span style="font-size:12px; color:var(--blush); font-weight:800;">AI 신뢰도: ${confidence}%</span>
                    </div>
                    <div style="font-size:18px; font-weight:700; color:var(--deep); margin-bottom:4px;">${name}</div>
                    
                    <div style="margin-top:15px; display:flex; align-items:center; gap:10px;">
                        <div style="width:24px; height:24px; border-radius:50%; background:${color}; border:2px solid white; box-shadow:0 2px 5px rgba(0,0,0,0.1);"></div>
                        <span style="font-size:12px; color:var(--stone); font-weight:600;">검출된 색상: ${color}</span>
                    </div>

                    <div style="margin-top:20px; padding-top:15px; border-top:1px solid rgba(0,0,0,0.05);">
                        <p style="font-size:11px; color:var(--stone); margin-bottom:10px; font-weight:700;">추택 매칭 컬러 (코디 팁)</p>
                        <div style="display:flex; gap:8px;">
                            ${suggestions.map(c => `<div style="width:20px; height:20px; border-radius:4px; background:${c}; border:1px solid #eee;"></div>`).join('')}
                        </div>
                    </div>
                </div>
            `;
        }

        if (coordinationList && stylingGuideText && aiStylingSections) {
            coordinationList.innerHTML = recs.items.map(item => `
                <div class="recommendation-item" style="background:#fff; padding:20px; border-radius:20px; border:1px solid var(--border-soft); box-shadow:0 4px 15px rgba(0,0,0,0.03); transition:0.3s;">
                    <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
                        <div style="width:32px; height:32px; border-radius:10px; background:rgba(232,180,160,0.15); display:flex; align-items:center; justify-content:center; color:var(--blush);">
                            <i class="fa-solid fa-check" style="font-size:14px;"></i>
                        </div>
                        <span style="font-size:15px; font-weight:700; color:var(--deep);">${item.name}</span>
                    </div>
                    <p style="font-size:12px; color:var(--stone); line-height:1.5; padding-left:44px;">${item.reason}</p>
                </div>
            `).join('');
            
            stylingGuideText.textContent = recs.guide;
            
            if (moodGallery && recs.keywords) {
                moodGallery.innerHTML = recs.keywords.map(keyword => `
                    <img src="https://picsum.photos/seed/${keyword}/400/400" class="mood-img" alt="${keyword}" loading="lazy">
                `).join('');
            }
            
            aiStylingSections.style.display = 'block';
            
            // 모바일 배려: 분석 패널로 부드럽게 스크롤
            if (window.innerWidth < 1100) {
                document.getElementById('ai-analysis-panel').scrollIntoView({ behavior: 'smooth' });
            }
        }
    };

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-magic-sparkles fa-spin" style="font-size:40px; color:#E8B4A0;"></i><p style="margin-top:15px;">AI가 스타일 분석 중...</p></div>`;
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.src = reader.result;
            img.onload = async () => {
                try {
                    // 배경 제거 로직 비활성화: 원본 이미지 바로 사용
                    const processedImageSrc = reader.result;
                    
                    const processedImg = new Image();
                    processedImg.src = processedImageSrc;
                    processedImg.onload = async () => {
                        optimizedBase64Image = await compressImage(processedImg, 'image/png');
                        dropZone.innerHTML = `<img src="${optimizedBase64Image}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px;">`;
                        
                        detectedColorHex = extractDominantColor(processedImg);

                        if (net) {
                            const predictions = await net.classify(processedImg);
                            const topResult = predictions[0];
                            const label = topResult.className.toLowerCase().split(',')[0];
                            const confidence = Math.round(topResult.probability * 100);
                            const translatedName = TRANSLATION_MAP[label] || label.toUpperCase();
                            nameInput.value = translatedName;

                            let detectedCategory = 'Top';
                            for (const [key, value] of Object.entries(CATEGORY_MAP)) {
                                if (label.includes(key)) { 
                                    categoryInput.value = value; 
                                    detectedCategory = value;
                                    break; 
                                }
                            }

                            // 공용 함수 호출하여 패널 업데이트
                            updateAnalysisPanel({
                                name: translatedName,
                                category: detectedCategory,
                                color: detectedColorHex,
                                confidence: confidence
                            });
                        }
                    };
                } catch (err) { 
                    console.error(err);
                    showToast("분석 중 오류가 발생했습니다."); 
                }
            };
        };
        reader.readAsDataURL(file);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (!optimizedBase64Image) return showToast('UPLOAD IMAGE FIRST');
        const itemData = { 
            name: nameInput.value || 'UNTITLED ITEM', 
            category: categoryInput.value, 
            imageSrc: optimizedBase64Image, 
            color: detectedColorHex,
            createdAt: Date.now() 
        };
        try {
            submitBtn.disabled = true; submitBtn.textContent = 'SAVING...';
            if (currentUser) {
                if (optimizedBase64Image.length > 1000000) throw new Error("이미지 용량이 너무 큽니다.");
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').add(itemData);
            } else {
                const items = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]');
                items.push({ ...itemData, id: 'trial_' + Date.now() });
                localStorage.setItem(CLOSET_KEY, JSON.stringify(items));
            }
            showToast('ADDED TO COLLECTION');
            form.reset(); optimizedBase64Image = null;
            dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>READY TO ANALYZE</p>';
            await loadItems();
        } catch (err) { alert('저장에 실패했습니다: ' + err.message); } finally { submitBtn.disabled = false; submitBtn.textContent = 'ADD TO COLLECTION'; }
    });

    const loadItems = async () => {
        if (!gallery) return;
        gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.5;">REFINING COLLECTION...</p>';
        let items = [];
        try {
            if (currentUser) {
                const snap = await db.collection('wardrobes').doc(currentUser.uid).collection('items').orderBy('createdAt', 'desc').get();
                snap.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
            } else {
                items = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]');
            }
            gallery.innerHTML = '';
            if (items.length === 0) {
                gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:40px;">저장된 아이템이 없습니다.</p>';
            } else {
                items.forEach(data => {
                    const el = document.createElement('closet-item');
                    el.setAttribute('name', data.name); el.setAttribute('category', data.category);
                    el.setAttribute('image-src', data.imageSrc); el.setAttribute('item-id', data.id);
                    el.setAttribute('color', data.color || '#ffffff');
                    
                    // 아이템 클릭 시 AI 스타일 추천 업데이트
                    el.addEventListener('click', () => {
                        updateAnalysisPanel({
                            name: data.name,
                            category: data.category,
                            color: data.color || '#ffffff',
                            confidence: 100 // 저장된 아이템은 100% 신뢰도로 표시
                        });
                        
                        // 시각적 피드백: 업로드 영역에도 해당 이미지 표시
                        if (dropZone) {
                            dropZone.innerHTML = `<img src="${data.imageSrc}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px; animation: fadeIn 0.5s ease-out;">`;
                        }
                    });

                    gallery.appendChild(el);
                });
            }
            const countEl = document.getElementById('item-count'), progressBar = document.getElementById('progress-bar'), progressPercent = document.getElementById('progress-percent');
            if (countEl) countEl.textContent = items.length;
            if (progressBar && progressPercent) {
                const percentage = Math.min(Math.round((items.length / 50) * 100), 100);
                progressBar.style.width = percentage + '%'; progressPercent.textContent = percentage + '%';
            }
        } catch (e) { gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:red;">로딩 오류가 발생했습니다.</p>'; }
    };

    authBtn.addEventListener('click', async () => {
        if (currentUser) { if (confirm('로그아웃 하시겠습니까?')) { await auth.signOut(); location.reload(); } }
        else authModal.style.display = 'flex';
    });
    document.querySelector('.close-modal')?.addEventListener('click', () => authModal.style.display = 'none');
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        const submit = document.getElementById('auth-submit');
        const isLogin = submit.textContent === 'Sign In';
        submit.textContent = isLogin ? 'Sign Up' : 'Sign In';
        document.getElementById('modal-title').textContent = isLogin ? 'Create Account' : 'Login';
        e.target.textContent = isLogin ? 'Login here' : 'Create an account';
    });
    document.addEventListener('delete-item', async (e) => {
        if (!confirm('아이템을 삭제하시겠습니까?')) return;
        const id = e.detail.id;
        try {
            if (id.startsWith('trial_')) {
                const items = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]').filter(i => i.id !== id);
                localStorage.setItem(CLOSET_KEY, JSON.stringify(items));
            } else { await db.collection('wardrobes').doc(currentUser.uid).collection('items').doc(id).delete(); }
            loadItems();
        } catch (err) { alert('삭제 실패: ' + err.message); }
    });

    // --- Theme Toggle Logic ---
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.body.classList.toggle('light-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            showToast(isDark ? 'DARK MODE ON' : 'LIGHT MODE ON');
        });
        // Initial Theme
        if (localStorage.getItem('theme') === 'dark') document.body.classList.add('light-mode');
    }
});
