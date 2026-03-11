// ====================================================================
// ** Firebase Configuration **
// ====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyAs-Actual-Key-Will-Be-Handled-By-Firebase-Studio", 
    authDomain: "cherrychoice-test1w-8469-a2886.firebaseapp.com",
    projectId: "cherrychoice-test1w-8469-a2886",
    storageBucket: "cherrychoice-test1w-8469-a2886.appspot.com",
    messagingSenderId: "467241546268",
    appId: "1:467241546268:web:a29ce5496c0e817d94e5d9"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const auth = firebase.auth();
const db = firebase.firestore();

// ====================================================================
// ** Web Component: <closet-item> **
// ====================================================================
class ClosetItem extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
        const imageSrc = this.getAttribute('image-src');
        const name = this.getAttribute('name');
        const category = this.getAttribute('category');

        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .product-card {
                    display: flex;
                    flex-direction: column;
                    cursor: pointer;
                    transition: 0.3s;
                    background: var(--card-bg, #fff);
                    border-radius: 12px;
                    padding: 8px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.05);
                    border: 1px solid var(--border-color, #eee);
                }
                .image-container {
                    position: relative;
                    width: 100%;
                    padding-bottom: 125%; 
                    background-color: #f1f1f1;
                    border-radius: 8px;
                    overflow: hidden;
                    margin-bottom: 12px;
                }
                .image-container img {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transition: 0.5s;
                }
                .product-card:hover img {
                    transform: scale(1.05);
                }
                .info {
                    display: flex;
                    flex-direction: column;
                    gap: 4px;
                    padding: 4px;
                }
                .category {
                    font-size: 0.75rem;
                    font-weight: 700;
                    color: #777;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .name {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-main, #1a1a1a);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .delete-btn {
                    margin-top: 8px;
                    font-size: 0.7rem;
                    color: #ff4d4d;
                    background: none;
                    border: none;
                    cursor: pointer;
                    text-align: left;
                    padding: 0;
                    opacity: 0.6;
                }
                .delete-btn:hover {
                    opacity: 1;
                    text-decoration: underline;
                }
            </style>
            <div class="product-card">
                <div class="image-container">
                    <img src="${imageSrc}" alt="${name}">
                </div>
                <div class="info">
                    <span class="category">${category}</span>
                    <span class="name">${name}</span>
                    <button class="delete-btn">삭제하기</button>
                </div>
            </div>
        `;

        this.shadowRoot.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.dispatchEvent(new CustomEvent('delete-item', {
                bubbles: true,
                composed: true,
                detail: { id: this.getAttribute('item-id') }
            }));
        });
    }
}
if (!customElements.get('closet-item')) {
    customElements.define('closet-item', ClosetItem);
}

// ====================================================================
// ** Main Application Logic **
// ====================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const form = document.getElementById('add-item-form');
    const gallery = document.getElementById('closet-gallery');
    const themeToggle = document.getElementById('theme-toggle');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('item-image');
    const nameInput = document.getElementById('item-name');
    const categoryInput = document.getElementById('item-category');
    const analysisContent = document.getElementById('analysis-content');
    const colorPalette = document.getElementById('color-palette');
    const filterButtons = document.querySelectorAll('.gallery-filters span');
    
    // Auth elements
    const authBtn = document.getElementById('auth-btn');
    const userInfo = document.getElementById('user-info');
    const authModal = document.getElementById('auth-modal');
    const closeModal = document.querySelector('.close-modal');
    const authForm = document.getElementById('auth-form');
    const authEmail = document.getElementById('auth-email');
    const authPassword = document.getElementById('auth-password');
    const authSubmit = document.getElementById('auth-submit');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const switchToSignup = document.getElementById('switch-to-signup');
    const modalTitle = document.getElementById('modal-title');
    
    const THEME_KEY = 'closetTheme_v2';
    const TRIAL_KEY = 'closetTrialItems_v1';
    const TRIAL_LIMIT = 10;

    let net = null;
    let isModelLoading = true;
    let currentUser = null;
    let isSignupMode = false;
    let currentCategoryFilter = '전체';
    let analyzedColors = [];

    // --- AI Model Management ---
    const loadModel = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            isModelLoading = false;
            if (dropZone.querySelector('p')) {
                dropZone.querySelector('p').textContent = '이미지를 업로드하세요 (AI 분석 준비 완료)';
            }
        } catch (err) {
            console.error('Model failed to load', err);
            isModelLoading = false;
        }
    };
    loadModel();

    // --- UI Helpers: Toast Notification ---
    const showToast = (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">
                <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'}"></i>
                <span>${message}</span>
            </div>
        `;
        document.body.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };

    // --- Auth Logic ---
    authBtn.addEventListener('click', () => {
        if (currentUser) {
            auth.signOut();
        } else {
            authModal.style.display = 'block';
        }
    });

    closeModal.addEventListener('click', () => authModal.style.display = 'none');
    
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        isSignupMode = !isSignupMode;
        modalTitle.textContent = isSignupMode ? '회원가입' : '로그인';
        authSubmit.textContent = isSignupMode ? '가입하기' : '로그인';
        switchToSignup.textContent = isSignupMode ? '로그인으로 돌아가기' : '회원가입';
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = authEmail.value;
        const password = authPassword.value;

        try {
            authSubmit.disabled = true;
            authSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 처리 중...';
            
            if (isSignupMode) {
                await auth.createUserWithEmailAndPassword(email, password);
                showToast('회원가입 완료! 체험판 데이터가 클라우드로 동기화됩니다.', 'success');
                await syncTrialToCloud();
            } else {
                await auth.signInWithEmailAndPassword(email, password);
                showToast('성공적으로 로그인했습니다.', 'success');
            }
            authModal.style.display = 'none';
        } catch (error) {
            showToast(`인증 오류: ${error.message}`, 'error');
        } finally {
            authSubmit.disabled = false;
            authSubmit.textContent = isSignupMode ? '가입하기' : '로그인';
        }
    });

    googleLoginBtn.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            await auth.signInWithPopup(provider);
            showToast('Google 로그인 성공!', 'success');
            await syncTrialToCloud();
            authModal.style.display = 'none';
        } catch (error) {
            showToast(`Google 로그인 오류: ${error.message}`, 'error');
        }
    });

    auth.onAuthStateChanged((user) => {
        currentUser = user;
        if (user) {
            authBtn.textContent = '로그아웃';
            userInfo.textContent = `${user.displayName || user.email.split('@')[0]} 님`;
            loadItems();
        } else {
            authBtn.textContent = '로그인';
            userInfo.textContent = '';
            loadItems();
        }
    });

    // --- Trial & Cloud Data Management ---
    const getTrialItems = () => JSON.parse(localStorage.getItem(TRIAL_KEY) || '[]');
    
    const saveTrialItem = (itemData) => {
        const items = getTrialItems();
        if (items.length >= TRIAL_LIMIT) {
            showToast('체험판 한도(10개)에 도달했습니다. 로그인하여 무제한으로 사용하세요!', 'error');
            authModal.style.display = 'block';
            return false;
        }
        items.push({ ...itemData, id: 'trial_' + Date.now(), createdAt: new Date().toISOString() });
        localStorage.setItem(TRIAL_KEY, JSON.stringify(items));
        return true;
    };

    const syncTrialToCloud = async () => {
        const trialItems = getTrialItems();
        if (trialItems.length === 0 || !currentUser) return;
        
        showToast('체험판 데이터를 동기화 중입니다...', 'info');
        for (const item of trialItems) {
            delete item.id;
            await saveItemToCloud(item);
        }
        localStorage.removeItem(TRIAL_KEY);
        loadItems();
    };

    const loadItems = async () => {
        gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px;"><i class="fa-solid fa-spinner fa-spin"></i> 로딩 중...</div>';
        
        let items = [];
        if (currentUser) {
            try {
                let q = db.collection('wardrobes').doc(currentUser.uid).collection('items').orderBy('createdAt', 'desc');
                if (currentCategoryFilter !== '전체') {
                    const engCategory = categoryMap[currentCategoryFilter] || currentCategoryFilter;
                    q = q.where('category', '==', engCategory);
                }
                const snapshot = await q.get();
                snapshot.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
            } catch (err) {
                console.error(err);
                showToast('데이터 로딩 중 오류가 발생했습니다.', 'error');
            }
        } else {
            items = getTrialItems();
            if (currentCategoryFilter !== '전체') {
                const engCategory = categoryMap[currentCategoryFilter] || currentCategoryFilter;
                items = items.filter(i => i.category === engCategory);
            }
        }

        gallery.innerHTML = '';
        if (items.length === 0) {
            gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 80px 40px; color: #999; border: 2px dashed var(--border-color); border-radius: 20px;">아이템이 없습니다.</div>';
            return;
        }

        items.forEach(itemData => {
            const item = document.createElement('closet-item');
            item.setAttribute('name', itemData.name);
            item.setAttribute('category', itemData.category);
            item.setAttribute('image-src', itemData.imageSrc);
            item.setAttribute('item-id', itemData.id);
            gallery.appendChild(item);
        });
    };

    const saveItemToCloud = async (itemData) => {
        if (!currentUser) return;
        await db.collection('wardrobes').doc(currentUser.uid).collection('items').add({
            ...itemData,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    };

    const deleteItem = async (id) => {
        if (id.startsWith('trial_')) {
            const items = getTrialItems().filter(i => i.id !== id);
            localStorage.setItem(TRIAL_KEY, JSON.stringify(items));
            loadItems();
        } else if (currentUser) {
            await db.collection('wardrobes').doc(currentUser.uid).collection('items').doc(id).delete();
            loadItems();
        }
    };

    document.addEventListener('delete-item', (e) => {
        if (confirm('이 아이템을 삭제할까요?')) deleteItem(e.detail.id);
    });

    // --- AI Fashion Analysis Logic ---
    const analyzeImage = async (imgElement) => {
        analysisContent.innerHTML = `<div class="placeholder-text"><i class="fa-solid fa-spinner fa-spin"></i> AI 분석 중...</div>`;
        if (!net) return;

        const predictions = await net.classify(imgElement);
        const results = { category: 'Acc', name: '새로운 아이템', confidence: 0, season: 'All Season', occasion: 'Casual' };

        if (predictions && predictions.length > 0) {
            const topResult = predictions[0];
            results.name = topResult.className.split(',')[0];
            results.confidence = Math.round(topResult.probability * 100);

            const label = topResult.className.toLowerCase();
            if (label.match(/shirt|t-shirt|sweater|jersey|blouse|cardigan/)) {
                results.category = 'Top';
                results.occasion = label.match(/shirt|blouse/) ? 'Formal/Office' : 'Casual';
                results.season = label.match(/sweater|cardigan/) ? 'Winter/Autumn' : 'Summer/Spring';
            } else if (label.match(/jean|pant|short|skirt|trouser/)) {
                results.category = 'Bottom';
            } else if (label.match(/coat|jacket|suit|parka/)) {
                results.category = 'Outer';
                results.season = 'Winter/Autumn';
            } else if (label.match(/dress|gown|robe/)) {
                results.category = 'Dress';
            } else if (label.match(/shoe|sneaker|boot|sandal/)) {
                results.category = 'Shoes';
            }
        }

        analyzedColors = extractColors(imgElement);
        renderAnalysis(results, analyzedColors);
        categoryInput.value = results.category;
        nameInput.value = results.name;
    };

    const renderAnalysis = (data, colors) => {
        analysisContent.innerHTML = `
            <div class="analysis-item"><span class="analysis-label">분석된 명칭</span><span class="analysis-value">${data.name}</span></div>
            <div class="analysis-item"><span class="analysis-label">카테고리 추정</span><span class="analysis-value">${data.category}</span></div>
            <div class="analysis-item"><span class="analysis-label">추천 시즌</span><span class="analysis-value">${data.season}</span></div>
            <div class="analysis-item"><span class="analysis-label">스타일리스트 팁</span><span class="analysis-value" style="color:#ffaa00; font-size:0.85rem;">${getStylingTip(data.category)}</span></div>
        `;
        colorPalette.innerHTML = '';
        colors.forEach(color => {
            const chip = document.createElement('div');
            chip.className = 'color-chip';
            chip.style.backgroundColor = color;
            chip.setAttribute('data-hex', color);
            colorPalette.appendChild(chip);
        });
    };

    const getStylingTip = (cat) => {
        const tips = { 'Top': '와이드 팬츠와 매치해보세요.', 'Bottom': '깔끔한 상의와 밸런스를 맞춰보세요.', 'Outer': '이너를 심플하게 입는 것을 추천합니다.' };
        return tips[cat] || '당신만의 스타일로 코디해보세요!';
    };

    const extractColors = (img) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100; canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);
        const imageData = ctx.getImageData(0, 0, 100, 100).data;
        const colorCounts = {};
        for (let i = 0; i < imageData.length; i += 40) {
            const hex = `#${((1 << 24) + (imageData[i] << 16) + (imageData[i+1] << 8) + imageData[i+2]).toString(16).slice(1)}`;
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
        return Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]).slice(0, 5);
    };

    // --- File & Form Handling ---
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = () => {
                dropZone.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
                analyzeImage(img);
            };
        };
        reader.readAsDataURL(file);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentImg = dropZone.querySelector('img');
        if (!currentImg) return showToast('이미지를 업로드해주세요.', 'error');

        const newItemData = {
            name: nameInput.value,
            category: categoryInput.value,
            imageSrc: currentImg.src,
            colors: analyzedColors
        };

        if (currentUser) {
            await saveItemToCloud(newItemData);
            loadItems();
        } else {
            if (saveTrialItem(newItemData)) loadItems();
        }

        form.reset();
        dropZone.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><p>이미지를 업로드하세요</p>`;
        analysisContent.innerHTML = `<div class="placeholder-text">이미지 분석 결과가 여기에 표시됩니다.</div>`;
        colorPalette.innerHTML = '';
    });

    // --- Filtering Logic ---
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCategoryFilter = btn.textContent;
            loadItems();
        });
    });

    // --- Theme Handling ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        if (savedTheme === 'light') document.body.classList.add('light-mode');
    };
    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        localStorage.setItem(THEME_KEY, isLight ? 'light' : 'dark');
    });
    initTheme();

    const categoryMap = { '상의': 'Top', '하의': 'Bottom', '아우터': 'Outer', '원피스': 'Dress', '신발': 'Shoes', '액세서리': 'Acc' };
});
