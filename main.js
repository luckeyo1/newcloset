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

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ====================================================================
// ** Closet Item Component **
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
                .card { background: #fff; border-radius: 24px; padding: 12px; border: 1px solid #f0f0f0; transition: 0.3s; height: 100%; display: flex; flex-direction: column; }
                .card:hover { transform: translateY(-5px); border-color: #E8B4A0; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                .img-box { width: 100%; aspect-ratio: 1; background: #FAF7F2; border-radius: 18px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                img { max-width: 90%; max-height: 90%; object-fit: contain; }
                .info { padding: 10px 4px; flex: 1; display: flex; flex-direction: column; }
                .cat { font-size: 10px; font-weight: 800; color: #8C8378; text-transform: uppercase; letter-spacing: 1px; }
                .name { font-size: 13px; font-weight: 700; color: #1C1C1E; margin-top: 4px; }
                .del { margin-top: auto; padding-top: 10px; font-size: 10px; color: #E8B4A0; cursor: pointer; border: none; background: none; font-weight: 700; text-align: left; }
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
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('item-image');
    const form = document.getElementById('add-item-form');
    const nameInput = document.getElementById('item-name');
    const categoryInput = document.getElementById('item-category');
    const gallery = document.getElementById('closet-gallery');
    const authBtn = document.getElementById('auth-btn');
    const authModal = document.getElementById('auth-modal');
    const filterContainer = document.getElementById('category-filters');
    const googleLoginBtn = document.getElementById('google-login-btn');
    const closeModal = document.querySelector('.close-modal');
    const switchToSignup = document.getElementById('switch-to-signup');
    
    const REMOVE_BG_API_KEY = '5Ayb2PWWmbR9L6WTUe8kebWG';
    const CLOSET_KEY = 'closet_v3';
    let net = null;
    let currentUser = null;
    let optimizedBase64Image = null;
    let allItems = [];
    let currentFilter = '전체';

    const showToast = (msg, type = 'info') => {
        const t = document.createElement('div');
        t.className = 'toast show';
        t.style.background = type === 'error' ? '#ff4d4d' : (type === 'success' ? '#4CAF50' : '#1C1C1E');
        t.textContent = msg;
        document.body.appendChild(t);
        // 에러면 더 오래 표시
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, type === 'error' ? 6000 : 3000);
    };

    // AI Load
    const loadAI = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI ONLINE — UPLOAD IMAGE';
        } catch (e) { console.error('AI Load Failed'); }
    };
    loadAI();

    // --- Image Compression ---
    const compressImage = (imgElement) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 450; 
            let width = imgElement.width;
            let height = imgElement.height;
            if (width > MAX_WIDTH) { height = (MAX_WIDTH / width) * height; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.55));
        });
    };

    // --- Auth UI Logic ---
    authBtn.addEventListener('click', () => {
        if (currentUser) { auth.signOut().then(() => showToast('로그아웃 되었습니다.', 'success')); }
        else authModal.style.display = 'flex';
    });

    closeModal?.addEventListener('click', () => authModal.style.display = 'none');

    switchToSignup?.addEventListener('click', (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('auth-submit');
        const modalTitle = document.getElementById('modal-title');
        const isLogin = submitBtn.textContent === 'Sign In';
        submitBtn.textContent = isLogin ? 'Sign Up' : 'Sign In';
        modalTitle.textContent = isLogin ? 'Create Account' : 'Connect';
        e.target.textContent = isLogin ? 'Login here' : 'Create a secure account';
    });

    // --- Google Login (With Detailed Alerts) ---
    googleLoginBtn?.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            showToast('구글 로그인 중...', 'info');
            await auth.signInWithPopup(provider);
            showToast('반갑습니다!', 'success');
            authModal.style.display = 'none';
        } catch (error) {
            console.error('GOOGLE_AUTH_ERROR:', error);
            let msg = `구글 로그인 실패: ${error.code}`;
            if (error.code === 'auth/operation-not-allowed') msg = '콘솔에서 Google 로그인을 활성화해야 합니다.';
            if (error.code === 'auth/unauthorized-domain') msg = '도메인이 승인되지 않았습니다. 콘솔 설정을 확인하세요.';
            showToast(msg, 'error');
        }
    });

    // --- Auth State ---
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        authBtn.textContent = user ? 'LOGOUT' : 'LOGIN';
        const userDisplay = document.getElementById('user-info');
        if (userDisplay) userDisplay.textContent = user ? (user.displayName || user.email.split('@')[0]).toUpperCase() : '';
        
        if (user) {
            const trialItems = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]');
            if (trialItems.length > 0) {
                showToast('데이터 동기화 중...', 'info');
                for (const item of trialItems) {
                    delete item.id;
                    await db.collection('closets').add({ ...item, userId: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                }
                localStorage.removeItem(CLOSET_KEY);
            }
        }
        loadItems();
    });

    // --- Image Upload & Process ---
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-sparkles fa-spin" style="font-size:40px; color:#E8B4A0;"></i><p style="margin-top:15px;">ANALYZING STYLE...</p></div>`;
        try {
            const formData = new FormData(); formData.append('image_file', file);
            const resp = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': REMOVE_BG_API_KEY }, body: formData }).catch(() => null);
            const blob = (resp && resp.ok) ? await resp.blob() : file;
            const reader = new FileReader();
            reader.onloadend = () => {
                const img = new Image(); img.src = reader.result;
                img.onload = async () => {
                    optimizedBase64Image = await compressImage(img);
                    dropZone.innerHTML = `<img src="${optimizedBase64Image}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px;">`;
                    if (net) {
                        const predictions = await net.classify(img);
                        const top = predictions[0];
                        nameInput.value = top.className.split(',')[0].toUpperCase();
                        const label = top.className.toLowerCase();
                        if (label.match(/shirt|t-shirt|sweater|jersey/)) categoryInput.value = 'Top';
                        else if (label.match(/jean|pant|short|skirt/)) categoryInput.value = 'Bottom';
                        else if (label.match(/coat|jacket|suit/)) categoryInput.value = 'Outer';
                        else if (label.match(/shoe|sneaker/)) categoryInput.value = 'Shoes';
                        else if (label.match(/dress|gown/)) categoryInput.value = 'Dress';
                        else categoryInput.value = 'Acc';
                        document.getElementById('analysis-content').innerHTML = `<div class="info-row"><span class="info-label">AI PREDICTION</span><span class="info-value">${nameInput.value}</span></div><div class="info-row"><span class="info-label">CATEGORY</span><span class="info-value">${categoryInput.value}</span></div>`;
                    }
                };
            };
            reader.readAsDataURL(blob);
        } catch (err) { showToast('이미지 처리 실패', 'error'); }
    });

    // --- SAVE ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!optimizedBase64Image) return showToast('이미지를 먼저 업로드하세요.', 'error');
        const itemData = { name: nameInput.value || 'NEW ITEM', category: categoryInput.value, imageSrc: optimizedBase64Image, createdAt: firebase.firestore.Timestamp.now() };
        try {
            if (currentUser) {
                await db.collection('closets').add({ ...itemData, userId: currentUser.uid });
                showToast('옷장에 저장되었습니다!', 'success');
            } else {
                const items = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]');
                items.push({ ...itemData, id: 'trial_' + Date.now(), createdAt: Date.now() });
                localStorage.setItem(CLOSET_KEY, JSON.stringify(items));
                showToast('임시 옷장에 저장됨.', 'success');
            }
            form.reset(); optimizedBase64Image = null;
            dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>READY TO ANALYZE</p>';
            loadItems();
        } catch (err) { showToast('저장 오류: ' + err.code, 'error'); }
    });

    // --- LOAD ---
    const loadItems = async () => {
        gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:40px;">REFRESHING DATA...</p>';
        try {
            if (currentUser) {
                const snap = await db.collection('closets').where("userId", "==", currentUser.uid).get();
                allItems = []; snap.forEach(doc => allItems.push({ ...doc.data(), id: doc.id }));
            } else { allItems = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]'); }
            allItems.sort((a, b) => (b.createdAt?.seconds || b.createdAt) - (a.createdAt?.seconds || a.createdAt));
            document.getElementById('item-count').textContent = allItems.length;
            renderGallery();
            updateSmartLook(allItems);
        } catch (e) { gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:red;">로드 실패</p>'; }
    };

    const renderGallery = () => {
        const filtered = currentFilter === '전체' ? allItems : allItems.filter(i => i.category === currentFilter);
        gallery.innerHTML = '';
        if (filtered.length === 0) { gallery.innerHTML = `<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:40px;">등록된 아이템이 없습니다.</p>`; return; }
        filtered.forEach(data => {
            const el = document.createElement('closet-item');
            el.setAttribute('name', data.name); el.setAttribute('category', data.category);
            el.setAttribute('image-src', data.imageSrc); el.setAttribute('item-id', data.id);
            gallery.appendChild(el);
        });
    };

    filterContainer?.addEventListener('click', (e) => {
        const target = e.target.closest('span'); if (!target) return;
        document.querySelectorAll('#category-filters span').forEach(s => { s.classList.remove('active'); s.style.background = '#fff'; s.style.color = '#000'; });
        target.classList.add('active'); target.style.background = 'var(--charcoal)'; target.style.color = 'var(--cream)';
        currentFilter = target.getAttribute('data-filter');
        renderGallery();
    });

    const updateSmartLook = (items) => {
        const grid = document.getElementById('smart-coord-grid');
        const tops = items.filter(i => i.category === 'Top'); const bots = items.filter(i => i.category === 'Bottom');
        if (tops.length > 0 && bots.length > 0) {
            grid.innerHTML = `<div style="display:flex; gap:10px; margin-bottom:15px;"><img src="${tops[0].imageSrc}" style="width:60px; height:60px; border-radius:10px; object-fit:cover;"><img src="${bots[0].imageSrc}" style="width:60px; height:60px; border-radius:10px; object-fit:cover;"></div><p style="font-size:13px; font-weight:700;">DAILY LOOK</p><p style="font-size:12px; color:var(--stone); line-height:1.4;">${tops[0].name} + ${bots[0].name}</p>`;
        }
    };

    document.addEventListener('delete-item', async (e) => {
        if (!confirm('삭제하시겠습니까?')) return;
        const id = e.detail.id;
        try {
            if (id.startsWith('trial_')) { const items = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]').filter(i => i.id !== id); localStorage.setItem(CLOSET_KEY, JSON.stringify(items)); }
            else if (currentUser) { await db.collection('closets').doc(id).delete(); }
            loadItems();
        } catch (err) { showToast('삭제 실패', 'error'); }
    });

    // --- Email Auth Handle (Strong Error Feedback) ---
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('auth-id').value;
        const email = `${id.trim().toLowerCase()}@mycloset.com`;
        const pw = document.getElementById('auth-password').value;
        const isSignUp = document.getElementById('auth-submit').textContent.includes('Sign Up');
        
        try {
            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, pw);
                showToast('회원가입 성공!', 'success');
            } else {
                await auth.signInWithEmailAndPassword(email, pw);
                showToast('로그인 성공!', 'success');
            }
            authModal.style.display = 'none';
        } catch (err) { 
            console.error('AUTH_ERROR:', err);
            let msg = `인증 실패: ${err.code}`;
            if (err.code === 'auth/weak-password') msg = '비밀번호가 너무 짧습니다. (6자 이상)';
            if (err.code === 'auth/email-already-in-use') msg = '이미 사용 중인 아이디입니다.';
            if (err.code === 'auth/wrong-password') msg = '비밀번호가 틀렸습니다.';
            if (err.code === 'auth/user-not-found') msg = '존재하지 않는 계정입니다.';
            showToast(msg, 'error'); 
        }
    });
});
