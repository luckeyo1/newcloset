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
                    box-shadow: 0 10px 30px rgba(0,0,0,0.03); border: 1px solid #eee;
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
                .info { padding: 5px; }
                .category { font-size: 0.7rem; font-weight: 800; color: #ff3366; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px; display: block; }
                .name { font-size: 1rem; font-weight: 700; color: #1a1a1a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .delete-btn { margin-top: 12px; font-size: 0.75rem; color: #ff4d4d; border: none; background: none; cursor: pointer; opacity: 0.4; transition: 0.3s; }
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
    let allLoadedItems = [];

    // --- AI Model Management ---
    const loadModel = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'Ready to Analyze (Fashion AI Online)';
        } catch (err) { console.error('AI Load Error', err); }
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
        } catch (error) { showToast('인증 오류가 발생했습니다.', 'error'); }
        finally { authSubmit.disabled = false; }
    });

    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            authBtn.textContent = '로그아웃';
            userInfo.textContent = `${user.email.split('@')[0]} 님`;
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
            // Pick random pair for demo
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
                    <p>${top.name}와 ${bottom.name}의 매칭입니다. ${getCoordinationTip(top, bottom)}</p>
                </div>
            `;
            coordContainer.appendChild(coordCard);
        } else {
            coordContainer.innerHTML = '<p style="color:#666; font-size:0.9rem;">더 많은 상의와 하의를 등록하면 AI 코디 제안이 활성화됩니다.</p>';
        }
    };

    const getCoordinationTip = (top, bottom) => {
        const topColor = top.colors ? top.colors[0] : '#fff';
        return "전체적으로 균형 잡힌 실루엣을 강조한 스타일링입니다. 깔끔한 스니커즈로 마무리해보세요.";
    };

    // --- Image Analysis & Extract Colors ---
    const analyzeImage = async (imgElement) => {
        analysisContent.innerHTML = `<div class="placeholder-text"><i class="fa-solid fa-wand-magic-sparkles fa-beat"></i> 스타일 분석 중...</div>`;
        if (!net) return;

        const predictions = await net.classify(imgElement);
        let results = { category: 'Acc', name: '새로운 패션 아이템', confidence: 0, season: 'All Season' };

        if (predictions && predictions.length > 0) {
            const topResult = predictions[0];
            const label = topResult.className.toLowerCase();
            results.name = topResult.className.split(',')[0];
            
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
    };

    const renderAnalysis = (category, name, colors) => {
        analysisContent.innerHTML = `
            <div class="analysis-item"><span class="analysis-label">디렉터 추정 명칭</span><span class="analysis-value">${name}</span></div>
            <div class="analysis-item"><span class="analysis-label">AI 카테고리</span><span class="analysis-value">${category}</span></div>
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
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        canvas.width = 100; canvas.height = 100; ctx.drawImage(img, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100).data;
        const colorCounts = {};
        for (let i = 0; i < imageData.length; i += 40) {
            const rgb = `rgb(${imageData[i]},${imageData[i+1]},${imageData[i+2]})`;
            colorCounts[rgb] = (colorCounts[rgb] || 0) + 1;
        }
        return Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]).slice(0, 4);
    };

    // --- Core Operations ---
    const loadItems = async () => {
        gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 60px; opacity:0.5;">Updating Closet...</div>';
        let items = [];
        if (currentUser) {
            const snapshot = await db.collection('wardrobes').doc(currentUser.uid).collection('items').orderBy('createdAt', 'desc').get();
            snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
        } else {
            items = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]');
        }
        
        allLoadedItems = items;
        const filtered = currentCategoryFilter === '전체' ? items : items.filter(i => (categoryMap[currentCategoryFilter] || currentCategoryFilter) === i.category);
        
        gallery.innerHTML = '';
        if (filtered.length === 0) {
            gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 80px; color:#999;">아이템이 없습니다. 새로운 옷을 등록해보세요!</div>';
        } else {
            filtered.forEach(itemData => {
                const item = document.createElement('closet-item');
                item.setAttribute('name', itemData.name); item.setAttribute('category', itemData.category);
                item.setAttribute('image-src', itemData.imageSrc); item.setAttribute('item-id', itemData.id);
                gallery.appendChild(item);
            });
        }
        generateSmartCoordination(items);
    };

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-scissors fa-beat" style="font-size:3rem; color:#ff3366;"></i><p style="margin-top:15px; font-weight:700;">AI 배경 제거 및 분석 중...</p></div>`;
        
        // Remove Background Simulation / Call
        const formData = new FormData(); formData.append('image_file', file);
        const bgResponse = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': REMOVE_BG_API_KEY }, body: formData }).catch(() => null);
        
        const blob = bgResponse && bgResponse.ok ? await bgResponse.blob() : file;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image(); img.src = ev.target.result;
            img.onload = () => {
                dropZone.innerHTML = `<img src="${ev.target.result}" style="width:100%; height:100%; object-fit:contain; border-radius:20px;">`;
                analyzeImage(img);
            };
        };
        reader.readAsDataURL(blob);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const img = dropZone.querySelector('img');
        if (!img) return showToast('이미지를 먼저 업로드하세요.', 'error');
        
        const itemData = { name: nameInput.value, category: categoryInput.value, imageSrc: img.src, colors: analyzedColors, createdAt: Date.now() };
        
        if (currentUser) {
            await db.collection('wardrobes').doc(currentUser.uid).collection('items').add({ ...itemData, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
        } else {
            const items = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]');
            if (items.length >= TRIAL_LIMIT) return showToast('체험판 한도 초과! 가입 후 무제한으로 사용하세요.');
            items.push({ ...itemData, id: 'trial_' + Date.now() });
            localStorage.setItem(TRIAL_KEY, JSON.stringify(items));
        }
        
        showToast('옷장에 성공적으로 보관되었습니다.', 'success');
        form.reset(); dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>New Item</p>';
        loadItems();
    });

    document.addEventListener('delete-item', async (e) => {
        if (!confirm('정말 삭제할까요?')) return;
        const id = e.detail.id;
        if (id.startsWith('trial_')) {
            const items = JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]').filter(i => i.id !== id);
            localStorage.setItem(TRIAL_KEY, JSON.stringify(items));
        } else {
            await db.collection('wardrobes').doc(currentUser.uid).collection('items').doc(id).delete();
        }
        loadItems();
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

    const categoryMap = { '상의': 'Top', '하의': 'Bottom', '아우터': 'Outer', '원피스': 'Dress', '신발': 'Shoes', '액세서리': 'Acc' };
});
