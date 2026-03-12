// ====================================================================
// ** Firebase Configuration **
// ====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDK1kimYUSskgWDm2IinbqSeIT3yXt8EV8", 
    authDomain: "cherrychoice-test1w-8469-a2886.firebaseapp.com",
    projectId: "cherrychoice-test1w-8469-a2886",
    storageBucket: "cherrychoice-test1w-8469-a2886.appspot.com",
    messagingSenderId: "467241546268",
    appId: "1:467241546268:web:a29ce5496c0e817d94e5d9"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ====================================================================
// ** Web Component: <closet-item> **
// ====================================================================
class ClosetItem extends HTMLElement {
    constructor() { super(); this.attachShadow({ mode: 'open' }); }
    connectedCallback() {
        const imageSrc = this.getAttribute('image-src');
        const name = this.getAttribute('name');
        const category = this.getAttribute('category');
        this.shadowRoot.innerHTML = `
            <style>
                :host { display: block; animation: fadeIn 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .product-card {
                    display: flex; flex-direction: column; cursor: pointer; transition: 0.4s;
                    background: var(--card-bg, #fff); border-radius: 24px; padding: 15px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #eee; height: 100%;
                }
                .product-card:hover { transform: translateY(-10px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); border-color: #ff336633; }
                .image-container {
                    position: relative; width: 100%; padding-bottom: 120%; border-radius: 18px; overflow: hidden; margin-bottom: 15px;
                    background: radial-gradient(circle at 50% 50%, #f9f9f9 0%, #f0f0f0 100%);
                }
                .image-container img {
                    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
                    max-width: 85%; max-height: 85%; object-fit: contain; filter: drop-shadow(0 10px 15px rgba(0,0,0,0.1));
                }
                .info { padding: 5px; flex: 1; display: flex; flex-direction: column; }
                .category { font-size: 0.7rem; font-weight: 800; color: #ff3366; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; display: block; }
                .name { font-size: 1rem; font-weight: 700; color: #1a1a1a; margin-bottom: 10px; }
                .delete-btn { margin-top: auto; font-size: 0.75rem; color: #ff4d4d; border: none; background: none; cursor: pointer; opacity: 0.4; transition: 0.3s; text-align: left; padding: 0; }
                .delete-btn:hover { opacity: 1; text-decoration: underline; }
            </style>
            <div class="product-card">
                <div class="image-container"><img src="${imageSrc}" alt="${name}" loading="lazy"></div>
                <div class="info">
                    <span class="category">${category}</span>
                    <div class="name">${name}</div>
                    <button class="delete-btn">아이템 삭제</button>
                </div>
            </div>
        `;
        this.shadowRoot.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('delete-item', { bubbles: true, composed: true, detail: { id: this.getAttribute('item-id') } }));
        });
    }
}
if (!customElements.get('closet-item')) customElements.define('closet-item', ClosetItem);

// ====================================================================
// ** Main Application Logic **
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('item-image');
    const form = document.getElementById('add-item-form');
    const nameInput = document.getElementById('item-name');
    const categoryInput = document.getElementById('item-category');
    const analysisContent = document.getElementById('analysis-content');
    const colorPalette = document.getElementById('color-palette');
    const gallery = document.getElementById('closet-gallery');
    const filterButtons = document.querySelectorAll('.gallery-filters span');
    
    // Auth & Theme
    const authBtn = document.getElementById('auth-btn');
    const userInfo = document.getElementById('user-info');
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.querySelector('.close-modal');
    const authForm = document.getElementById('auth-form');
    const authIdInput = document.getElementById('auth-id');
    const authPassword = document.getElementById('auth-password');
    const authSubmit = document.getElementById('auth-submit');
    const switchToSignup = document.getElementById('switch-to-signup');
    const modalTitle = document.getElementById('modal-title');
    const themeToggle = document.getElementById('theme-toggle');

    const THEME_KEY = 'closetTheme_v3';
    const TRIAL_KEY = 'closetTrialItems_v2';
    const TRIAL_LIMIT = 15;
    const REMOVE_BG_API_KEY = '5Ayb2PWWmbR9L6WTUe8kebWG';

    let net = null;
    let currentUser = null;
    let isSignupMode = false;
    let currentCategoryFilter = '전체';
    let analyzedColors = [];
    let lastAiAnalysis = null;

    // --- AI Model Management ---
    const loadModel = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI 분석 준비 완료 (이미지를 올려주세요)';
            console.log('MobileNet Model Loaded Successfully');
        } catch (err) { 
            console.error('AI Load Error', err); 
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI 로드 실패 (새로고침 하세요)';
        }
    };
    loadModel();

    // --- UI Helpers ---
    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast show toast-${type}`;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 500); }, 3000);
    };

    // --- Auth Logic ---
    const idToEmail = (id) => `${id.trim().toLowerCase()}@mycloset.com`;

    authBtn.addEventListener('click', () => {
        if (currentUser) { auth.signOut(); showToast('로그아웃 되었습니다.'); }
        else authModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => authModal.style.display = 'none');
    
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        modalTitle.textContent = isSignupMode ? 'Create Account' : 'Welcome Back';
        authSubmit.textContent = isSignupMode ? 'Sign Up' : 'Login';
        switchToSignup.textContent = isSignupMode ? 'Login instead' : 'Create an account';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = authIdInput.value;
        const email = idToEmail(id);
        const password = authPassword.value;
        try {
            authSubmit.disabled = true;
            if (isSignupMode) {
                await auth.createUserWithEmailAndPassword(email, password);
                showToast(`환영합니다, ${id}님!`, 'success');
            } else {
                await auth.signInWithEmailAndPassword(email, password);
                showToast(`${id}님, 반가워요!`, 'success');
            }
            authModal.style.display = 'none';
        } catch (error) { 
            console.error('Auth Error', error);
            showToast('인증 오류가 발생했습니다: ' + error.message, 'error'); 
        } finally { authSubmit.disabled = false; }
    });

    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            authBtn.textContent = '로그아웃';
            userInfo.textContent = `${user.email.split('@')[0]} 님`;
            syncTrialToCloud();
        } else {
            authBtn.textContent = '로그인';
            userInfo.textContent = '';
        }
        loadItems();
    });

    // --- AI Coordination Matching Engine ---
    const generateSmartCoordination = (items) => {
        const coordContainer = document.getElementById('smart-coord-grid');
        if (!coordContainer) return;
        
        coordContainer.innerHTML = '';
        const tops = items.filter(i => i.category === 'Top');
        const bottoms = items.filter(i => i.category === 'Bottom');

        if (tops.length > 0 && bottoms.length > 0) {
            const top = tops[Math.floor(Math.random() * tops.length)];
            const bottom = bottoms[Math.floor(Math.random() * bottoms.length)];

            const coordCard = document.createElement('div');
            coordCard.className = 'coord-card';
            coordCard.innerHTML = `
                <div class="coord-visual">
                    <img src="${top.imageSrc}" class="coord-item-img">
                    <img src="${bottom.imageSrc}" class="coord-item-img">
                </div>
                <div class="coord-info">
                    <h4>AI 데일리 추천 코디</h4>
                    <p>${top.name}와 ${bottom.name}의 매칭입니다. 전체적으로 균형 잡힌 실루엣을 강조한 스타일링입니다.</p>
                </div>
            `;
            coordContainer.appendChild(coordCard);
        } else {
            coordContainer.innerHTML = '<p style="color:#666; font-size:0.9rem;">더 많은 상의와 하의를 등록하면 AI 코디 제안이 활성화됩니다.</p>';
        }
    };

    // --- Image Analysis & Extract Colors ---
    const analyzeImage = async (imgElement) => {
        analysisContent.innerHTML = `<div class="placeholder-text"><i class="fa-solid fa-wand-magic-sparkles fa-beat"></i> AI 스타일 분석 중...</div>`;
        
        if (!net) {
            console.warn('AI Model not yet loaded');
            analysisContent.innerHTML = `<p style="color:red; font-size:0.8rem;">모델 로딩 중입니다. 잠시만 기다려주세요.</p>`;
            return;
        }

        try {
            const predictions = await net.classify(imgElement);
            let results = { category: 'Acc', name: '새로운 패션 아이템', confidence: 0 };

            if (predictions && predictions.length > 0) {
                const topResult = predictions[0];
                const label = topResult.className.toLowerCase();
                results.name = topResult.className.split(',')[0].toUpperCase();
                
                if (label.match(/shirt|t-shirt|sweater|jersey|blouse|cardigan/)) results.category = 'Top';
                else if (label.match(/jean|pant|short|skirt|trouser/)) results.category = 'Bottom';
                else if (label.match(/coat|jacket|suit|parka/)) results.category = 'Outer';
                else if (label.match(/shoe|sneaker|boot|sandal/)) results.category = 'Shoes';
                else if (label.match(/dress|gown|robe/)) results.category = 'Dress';
            }

            lastAiAnalysis = results;
            analyzedColors = extractColors(imgElement);
            
            nameInput.value = results.name;
            categoryInput.value = results.category;
            
            renderAnalysis(results.category, results.name, analyzedColors);
        } catch (err) { 
            console.error('Analysis Error', err);
            analysisContent.innerHTML = `<p style="color:red; font-size:0.8rem;">분석 중 오류 발생</p>`;
        }
    };

    const renderAnalysis = (category, name, colors) => {
        analysisContent.innerHTML = `
            <div class="analysis-item"><span class="analysis-label">분석된 명칭</span><span class="analysis-value">${name}</span></div>
            <div class="analysis-item"><span class="analysis-label">추정 카테고리</span><span class="analysis-value">${category}</span></div>
            <div style="margin-top:20px; padding:20px; background:#ff33660a; border-radius:18px; border-left:4px solid #ff3366;">
                <strong style="display:block; margin-bottom:8px; font-size:0.85rem; color:#ff3366;">Personal Stylist Note</strong>
                <p style="font-size:0.9rem; margin:0; line-height:1.5;">${getStylingTip(category)}</p>
            </div>
        `;
        colorPalette.innerHTML = '';
        colors.forEach(color => {
            const chip = document.createElement('div');
            chip.className = 'color-chip'; chip.style.backgroundColor = color;
            chip.setAttribute('data-hex', color); colorPalette.appendChild(chip);
        });
    };

    const getStylingTip = (cat) => {
        const tips = {
            'Top': '이 상의는 와이드 실루엣의 팬츠와 매치했을 때 가장 트렌디한 무드를 낼 수 있습니다.',
            'Bottom': '상의를 깔끔하게 넣어 입는(Tuck-in) 스타일링으로 다리가 길어 보이는 실루엣을 연출해보세요.',
            'Outer': '이너를 톤온톤(Tone-on-tone)으로 맞춰 입으면 정갈하고 세련된 인상을 줄 수 있습니다.',
            'Dress': '슈즈를 톤다운된 컬러로 선택하여 원피스 본연의 매력을 살려주는 것이 좋습니다.',
            'Shoes': '전체적인 룩의 키 컬러를 슈즈와 맞추면 훨씬 완성도 높은 코디가 완성됩니다.'
        };
        return tips[cat] || '당신만의 감각적인 믹스매치로 새로운 스타일을 시도해보세요!';
    };

    const extractColors = (img) => {
        try {
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
            canvas.width = 100; canvas.height = 100; ctx.drawImage(img, 0, 0, 100, 100);
            const imageData = ctx.getImageData(0, 0, 100, 100).data;
            const colorCounts = {};
            for (let i = 0; i < imageData.length; i += 40) {
                const rgb = `rgb(${imageData[i]},${imageData[i+1]},${imageData[i+2]})`;
                colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
            }
            return Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]).slice(0, 4);
        } catch (err) { return ['#ccc']; }
    };

    // --- Core Operations ---
    const loadItems = async () => {
        gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; opacity:0.5;"><i class="fa-solid fa-spinner fa-spin"></i> 로딩 중...</div>';
        let items = [];
        try {
            if (currentUser) {
                const snapshot = await db.collection('wardrobes').doc(currentUser.uid).collection('items').orderBy('createdAt', 'desc').get();
                snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
            } else {
                items = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]');
            }
            
            const filtered = currentCategoryFilter === '전체' ? items : items.filter(i => {
                const map = { '상의': 'Top', '하의': 'Bottom', '아우터': 'Outer', '원피스': 'Dress', '신발': 'Shoes', '액세서리': 'Acc' };
                return (map[currentCategoryFilter] || currentCategoryFilter) === i.category;
            });
            
            gallery.innerHTML = '';
            if (filtered.length === 0) {
                gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 80px; color:#999;">아이템이 없습니다. 새로운 옷을 등록해보세요!</div>';
            } else {
                filtered.forEach(itemData => {
                    const item = document.createElement('closet-item');
                    item.setAttribute('name', itemData.name || 'No Name');
                    item.setAttribute('category', itemData.category || 'Acc');
                    item.setAttribute('image-src', itemData.imageSrc);
                    item.setAttribute('item-id', itemData.id);
                    gallery.appendChild(item);
                });
            }
            generateSmartCoordination(items);
        } catch (err) {
            console.error('Load Error', err);
            gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color:red;">데이터 로드 중 오류 발생</div>';
        }
    };

    const syncTrialToCloud = async () => {
        const items = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]');
        if (items.length > 0 && currentUser) {
            try {
                for (const item of items) {
                    delete item.id;
                    await db.collection('wardrobes').doc(currentUser.uid).collection('items').add({
                        ...item, createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                localStorage.removeItem(TRIAL_KEY);
                loadItems();
            } catch (err) { console.error('Sync Error', err); }
        }
    };

    // --- File Handling (Upload & Process) ---
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset inputs
        nameInput.value = '';
        categoryInput.value = '';
        analysisContent.innerHTML = `<p style="text-align:center; padding:20px;">이미지 분석 대기 중...</p>`;

        // UI Feedback
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-sparkles fa-beat" style="font-size:3rem; color:#ff3366;"></i><p style="margin-top:15px; font-weight:700;">배경 제거 및 스타일 분석 중...</p></div>`;
        
        try {
            // Attempt Background Removal
            const formData = new FormData();
            formData.append('image_file', file);
            formData.append('size', 'auto');
            
            const bgResponse = await fetch('https://api.remove.bg/v1.0/removebg', {
                method: 'POST',
                headers: { 'X-Api-Key': REMOVE_BG_API_KEY },
                body: formData
            }).catch(() => null);

            let imageToUse;
            if (bgResponse && bgResponse.ok) {
                const blob = await bgResponse.blob();
                imageToUse = URL.createObjectURL(blob);
                showToast('AI 배경 제거 완료!', 'success');
            } else {
                console.warn('Background removal failed or skipped');
                imageToUse = URL.createObjectURL(file);
                showToast('배경 제거 없이 분석을 진행합니다.', 'info');
            }

            // Load Image for Analysis
            const img = new Image();
            img.src = imageToUse;
            img.onload = () => {
                dropZone.innerHTML = `<img src="${imageToUse}" style="width:100%; height:100%; object-fit:contain; border-radius:20px;">`;
                analyzeImage(img);
            };
            img.onerror = () => {
                showToast('이미지 로딩 중 오류 발생', 'error');
                dropZone.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><p>다시 시도해주세요</p>`;
            };

        } catch (err) {
            console.error('Processing Error', err);
            showToast('이미지 처리 중 오류가 발생했습니다.', 'error');
            dropZone.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><p>업로드 오류</p>`;
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentImg = dropZone.querySelector('img');
        if (!currentImg) return showToast('먼저 사진을 업로드하고 분석을 완료해주세요.', 'error');
        
        const itemData = { 
            name: nameInput.value || '새 아이템', 
            category: categoryInput.value || 'Acc', 
            imageSrc: currentImg.src, 
            colors: analyzedColors
        };
        
        try {
            authSubmit.disabled = true;
            if (currentUser) {
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').add({ 
                    ...itemData, 
                    createdAt: firebase.firestore.FieldValue.serverTimestamp() 
                });
            } else {
                const items = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]');
                if (items.length >= TRIAL_LIMIT) {
                    showToast('체험판 저장 한도 도달! 로그인 해주세요.', 'error');
                    authModal.style.display = 'block';
                    return;
                }
                items.push({ ...itemData, id: 'trial_' + Date.now(), createdAt: new Date().toISOString() });
                localStorage.setItem(TRIAL_KEY, JSON.stringify(items));
            }
            
            showToast('성공적으로 저장되었습니다!', 'success');
            form.reset(); 
            dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>이미지를 업로드하세요</p>';
            analysisContent.innerHTML = `<div class="placeholder-text">이미지를 업로드하면 분석 결과가 여기에 표시됩니다.</div>`;
            colorPalette.innerHTML = '';
            loadItems();
        } catch (err) {
            console.error('Save Error', err);
            showToast('저장 실패: ' + err.message, 'error');
        } finally { authSubmit.disabled = false; }
    });

    document.addEventListener('delete-item', async (e) => {
        if (!confirm('정말 삭제할까요?')) return;
        const id = e.detail.id;
        try {
            if (id.startsWith('trial_')) {
                const items = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]').filter(i => i.id !== id);
                localStorage.setItem(TRIAL_KEY, JSON.stringify(items));
            } else if (currentUser) {
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').doc(id).delete();
            }
            loadItems();
        } catch (err) { showToast('삭제 중 오류가 발생했습니다.', 'error'); }
    });

    filterButtons.forEach(btn => btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('active')); btn.classList.add('active');
        currentCategoryFilter = btn.textContent; loadItems();
    }));

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
    });
    if (localStorage.getItem(THEME_KEY) === 'light') document.body.classList.add('light-mode');
});
