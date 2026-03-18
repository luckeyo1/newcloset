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
        const imageSrc = this.getAttribute('image-src');
        const name = this.getAttribute('name');
        const category = this.getAttribute('category');
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; animation: slideUp 0.4s ease-out; }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .card {
                    background: #fff; border-radius: 24px; padding: 12px;
                    transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid #f0f0f0;
                }
                .card:hover { transform: translateY(-5px); border-color: #E8B4A0; box-shadow: 0 20px 50px rgba(0,0,0,0.08); }
                .img-box {
                    width: 100%; aspect-ratio: 1; background: #FAF7F2;
                    border-radius: 18px; overflow: hidden; display: flex; align-items: center; justify-content: center;
                }
                img { max-width: 85%; max-height: 85%; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.05)); }
                .info { padding: 12px 4px; }
                .cat { font-size: 10px; font-weight: 800; color: #8C8378; text-transform: uppercase; letter-spacing: 1.5px; }
                .name { font-size: 14px; font-weight: 700; color: #1C1C1E; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .del { margin-top: 10px; font-size: 11px; color: #E8B4A0; cursor: pointer; border: none; background: none; font-weight: 700; }
            </style>
            <div class="card">
                <div class="img-box"><img src="${imageSrc}"></div>
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

    // AI Load
    const loadAI = async () => {
        try {
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI 모델 로딩 중...';
            if (window.tf) await tf.ready();
            
            // Load MobileNet for classification
            net = await mobilenet.load();
            
            // Load BodyPix for background removal
            bodyPixNet = await bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                multiplier: 0.75,
                quantBytes: 2
            });
            
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI READY — UPLOAD IMAGE';
        } catch (e) { 
            console.warn('AI Load Error (Local):', e); 
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI 모델 로드 실패 (새로고침 권장)';
        }
    };
    loadAI();

    // --- Background Removal using BodyPix ---
    const removeBackground = async (imgElement) => {
        if (!bodyPixNet) return imgElement.src;
        
        try {
            const segmentation = await bodyPixNet.segmentPerson(imgElement, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7
            });

            const canvas = document.createElement('canvas');
            canvas.width = imgElement.width;
            canvas.height = imgElement.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixelData = imageData.data;
            
            let count = 0;
            for (let i = 0; i < pixelData.length; i += 4) {
                if (segmentation.data[i / 4] === 0) {
                    pixelData[i + 3] = 0; // Set alpha to 0 (transparent)
                } else {
                    count++;
                }
            }
            
            // If no person detected, return original
            if (count === 0) {
                console.warn("No person detected by BodyPix, skipping background removal.");
                return imgElement.src;
            }
            
            ctx.putImageData(imageData, 0, 0);
            return canvas.toDataURL('image/png');
        } catch (e) {
            console.error("BodyPix Error:", e);
            return imgElement.src;
        }
    };

    const showToast = (msg) => {
        const t = document.createElement('div');
        t.className = 'toast show';
        t.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#333; color:white; padding:12px 24px; border-radius:50px; z-index:9999; font-size:14px; box-shadow:0 10px 20px rgba(0,0,0,0.2); transition: 0.3s opacity;";
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
    };

    // --- Image Compression (Crucial for Firestore 1MB limit) ---
    const compressImage = (imgElement, format = 'image/png') => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 450;
            let width = imgElement.width;
            let height = imgElement.height;
            if (width > MAX_WIDTH) { height = (MAX_WIDTH / width) * height; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, width, height);
            resolve(canvas.toDataURL(format, 0.7)); 
        });
    };

    // --- Google Login ---
    const handleGoogleLogin = async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        googleLoginBtn.disabled = true;
        googleLoginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CONNECTING...';
        try {
            await auth.signInWithPopup(provider);
            authModal.style.display = 'none';
        } catch (error) {
            console.warn("Popup blocked or closed, trying redirect:", error);
            if (error.code === 'auth/popup-blocked') {
                await auth.signInWithRedirect(provider);
            } else {
                showToast('AUTH ERROR: ' + error.message);
                googleLoginBtn.disabled = false;
                googleLoginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18"> Continue with Google';
            }
        }
    };

    googleLoginBtn?.addEventListener('click', handleGoogleLogin);

    auth.getRedirectResult().then((result) => {
        if (result && result.user) { showToast('WELCOME BACK'); authModal.style.display = 'none'; }
    });

    // --- Auth Logic ---
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('auth-submit');
        const id = authIdInput.value.trim();
        const pw = authPassword.value;
        const isSignUp = document.getElementById('modal-title').textContent.includes('Account');
        let email = id.includes('@') ? id : `${id.toLowerCase()}@mycloset.com`;

        try {
            submitBtn.disabled = true;
            if (isSignUp) await auth.createUserWithEmailAndPassword(email, pw);
            else await auth.signInWithEmailAndPassword(email, pw);
            authModal.style.display = 'none';
        } catch (err) {
            showToast(err.message);
        } finally { submitBtn.disabled = false; }
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

    // --- AI Category Mapping ---
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

    // --- Image Upload ---
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-magic-sparkles fa-spin" style="font-size:40px; color:#E8B4A0;"></i><p style="margin-top:15px;">AI가 배경 제거 및 스타일 분석 중...</p></div>`;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.src = reader.result;
            img.onload = async () => {
                try {
                    let processedImageSrc = reader.result;
                    let bgRemoved = false;
                    if (bodyPixNet) {
                        const removed = await removeBackground(img);
                        if (removed !== reader.result) {
                            processedImageSrc = removed;
                            bgRemoved = true;
                        }
                    }

                    const processedImg = new Image();
                    processedImg.src = processedImageSrc;
                    processedImg.onload = async () => {
                        optimizedBase64Image = await compressImage(processedImg, 'image/png');
                        dropZone.innerHTML = `<img src="${optimizedBase64Image}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px;">`;
                        
                        if (net) {
                            const predictions = await net.classify(processedImg);
                            const topResult = predictions[0];
                            const label = topResult.className.toLowerCase().split(',')[0];
                            const confidence = Math.round(topResult.probability * 100);

                            const translatedName = TRANSLATION_MAP[label] || label.toUpperCase();
                            nameInput.value = translatedName;

                            for (const [key, value] of Object.entries(CATEGORY_MAP)) {
                                if (label.includes(key)) {
                                    categoryInput.value = value;
                                    break;
                                }
                            }

                            const analysisContent = document.getElementById('analysis-content');
                            if (analysisContent) {
                                analysisContent.innerHTML = `
                                    <div style="background:var(--cream); padding:20px; border-radius:16px; margin-top:10px;">
                                        <div style="display:flex; justify-content:space-between; margin-bottom:12px;">
                                            <span style="font-size:12px; color:var(--stone); font-weight:700;">분석 결과</span>
                                            <span style="font-size:12px; color:var(--blush); font-weight:800;">AI 신뢰도: ${confidence}%</span>
                                        </div>
                                        <div style="font-size:18px; font-weight:700; color:var(--deep); margin-bottom:4px;">${translatedName}</div>
                                        <div style="font-size:12px; color:var(--stone); margin-bottom:10px;">감지된 스타일: ${label}</div>
                                        <div style="padding:10px; background:white; border-radius:10px; font-size:11px; color:var(--sage); border:1px solid rgba(155,173,154,0.2);">
                                            <i class="fa-solid fa-check-circle"></i> ${bgRemoved ? '배경이 성공적으로 제거되었습니다.' : '이미지가 분석되었습니다.'}
                                        </div>
                                        <div style="margin-top:15px; padding-top:15px; border-top:1px solid rgba(0,0,0,0.05);">
                                            <p style="font-size:12px; line-height:1.6; color:var(--stone);">
                                                이 아이템은 <strong>${categoryInput.options[categoryInput.selectedIndex].text}</strong>(으)로 분류되었습니다.
                                            </p>
                                        </div>
                                    </div>
                                `;
                            }
                        }
                    };
                } catch (err) {
                    console.error("AI Processing Error:", err);
                    showToast("분석 중 오류가 발생했습니다.");
                    dropZone.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><p>다시 시도해주세요</p>`;
                }
            };
        };
        reader.readAsDataURL(file);
    });

    // --- Collection Management ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('button[type="submit"]');
        if (!optimizedBase64Image) return showToast('UPLOAD IMAGE FIRST');
        
        const itemData = { 
            name: nameInput.value || 'UNTITLED ITEM', 
            category: categoryInput.value, 
            imageSrc: optimizedBase64Image, 
            createdAt: Date.now() 
        };
        
        try {
            submitBtn.disabled = true;
            submitBtn.textContent = 'SAVING...';
            
            if (currentUser) {
                if (optimizedBase64Image.length > 1000000) {
                    throw new Error("이미지 용량이 너무 큽니다. 더 작은 사진을 사용해주세요.");
                }
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').add(itemData);
            } else {
                const items = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]');
                items.push({ ...itemData, id: 'trial_' + Date.now() });
                localStorage.setItem(CLOSET_KEY, JSON.stringify(items));
            }
            
            showToast('ADDED TO COLLECTION');
            form.reset();
            optimizedBase64Image = null;
            dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>READY TO ANALYZE</p>';
            const analysisContent = document.getElementById('analysis-content');
            if (analysisContent) analysisContent.innerHTML = '<p style="color:var(--stone); font-size:14px;">이미지를 업로드하면 AI가 실루엣과 카테고리를 분석합니다.</p>';
            await loadItems();
        } catch (err) {
            console.error('Save Error:', err);
            alert('저장에 실패했습니다: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'ADD TO COLLECTION';
        }
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
                    gallery.appendChild(el);
                });
            }
            const countEl = document.getElementById('item-count');
            const progressBar = document.getElementById('progress-bar');
            const progressPercent = document.getElementById('progress-percent');
            
            if (countEl) countEl.textContent = items.length;
            
            if (progressBar && progressPercent) {
                const percentage = Math.min(Math.round((items.length / 50) * 100), 100);
                progressBar.style.width = percentage + '%';
                progressPercent.textContent = percentage + '%';
            }
        } catch (e) { 
            console.error("Load Error:", e);
            gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:red;">로딩 오류가 발생했습니다.</p>';
        }
    };

    authBtn.addEventListener('click', async () => {
        if (currentUser) { 
            if (confirm('로그아웃 하시겠습니까?')) {
                await auth.signOut(); 
                location.reload(); 
            }
        }
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
            } else {
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').doc(id).delete();
            }
            loadItems();
        } catch (err) { alert('삭제 실패: ' + err.message); }
    });
});
