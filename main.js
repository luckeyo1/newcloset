// ====================================================================
// ** Firebase & Configuration **
// ====================================================================
const firebaseConfig = {
    apiKey: "AIzaSyDK1kimYUSskgWDm2IinbqSeIT3yXt8EV8", 
    // 기본 firebaseapp.com 도메인을 우선 사용하여 승인 지연 해결 시도
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
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 5000);
    };

    // AI Load
    const loadAI = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            dropZone.querySelector('p').textContent = 'AI ONLINE — UPLOAD IMAGE';
        } catch (e) { console.error('AI Load Failed'); }
    };
    loadAI();

    const compressImage = (imgElement) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 450; 
            let width = imgElement.width; let height = imgElement.height;
            if (width > MAX_WIDTH) { height = (MAX_WIDTH / width) * height; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.55));
        });
    };

    // --- Google Login (Bypass Cache & Error Handle) ---
    googleLoginBtn?.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        // 승인 지연 시 더 안정적인 설정을 위해 prompt 추가
        provider.setCustomParameters({ prompt: 'select_account' });
        
        try {
            showToast('구글 인증을 시도합니다...', 'info');
            const result = await auth.signInWithPopup(provider);
            showToast(`환영합니다, ${result.user.displayName}님!`, 'success');
            authModal.style.display = 'none';
        } catch (error) {
            console.error('GOOGLE_ERROR:', error);
            if (error.code === 'auth/unauthorized-domain') {
                showToast('도메인 승인이 지연되고 있습니다. 창을 완전히 닫고 1분 후 다시 접속해 보세요.', 'error');
            } else {
                showToast(`로그인 실패: ${error.code}`, 'error');
            }
        }
    });

    // --- Auth Interaction ---
    authBtn.addEventListener('click', () => {
        if (currentUser) auth.signOut().then(() => {
            showToast('로그아웃 되었습니다.');
            location.reload(); // 도메인 설정 반영을 위한 강제 새로고침
        });
        else authModal.style.display = 'flex';
    });

    closeModal?.addEventListener('click', () => authModal.style.display = 'none');

    // --- Core Sync & Load ---
    auth.onAuthStateChanged(async (user) => {
        currentUser = user;
        authBtn.textContent = user ? 'LOGOUT' : 'LOGIN';
        const userDisplay = document.getElementById('user-info');
        if (userDisplay) userDisplay.textContent = user ? (user.displayName || user.email.split('@')[0]).toUpperCase() : '';
        
        if (user) {
            const trialItems = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]');
            if (trialItems.length > 0) {
                for (const item of trialItems) {
                    delete item.id;
                    await db.collection('closets').add({ ...item, userId: user.uid, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
                }
                localStorage.removeItem(CLOSET_KEY);
            }
        }
        loadItems();
    });

    // --- Other Logic (Image Process, Save, Load) ---
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-sparkles fa-spin" style="font-size:40px; color:#E8B4A0;"></i><p style="margin-top:15px;">ANALYZING...</p></div>`;
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
                showToast('임시 저장 완료.', 'success');
            }
            form.reset(); optimizedBase64Image = null;
            dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>READY TO ANALYZE</p>';
            loadItems();
        } catch (err) { showToast(`저장 실패: ${err.code}`, 'error'); }
    });

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
        } catch (e) { gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; color:red;">데이터 로드 실패</p>'; }
    };

    const renderGallery = () => {
        const filtered = currentFilter === '전체' ? allItems : allItems.filter(i => i.category === currentFilter);
        gallery.innerHTML = '';
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
            grid.innerHTML = `<div style="display:flex; gap:10px; margin-bottom:15px;"><img src="${tops[0].imageSrc}" style="width:60px; height:60px; border-radius:10px; object-fit:cover;"><img src="${bots[0].imageSrc}" style="width:60px; height:60px; border-radius:10px; object-fit:cover;"></div><p style="font-size:13px; font-weight:700;">DAILY ARCHIVE LOOK</p><p style="font-size:12px; color:var(--stone); line-height:1.4;">${tops[0].name} + ${bots[0].name}</p>`;
        }
    };

    document.addEventListener('delete-item', async (e) => {
        if (!confirm('정말 삭제할까요?')) return;
        const id = e.detail.id;
        try {
            if (id.startsWith('trial_')) { const items = JSON.parse(localStorage.getItem(CLOSET_KEY) || '[]').filter(i => i.id !== id); localStorage.setItem(CLOSET_KEY, JSON.stringify(items)); }
            else if (currentUser) { await db.collection('closets').doc(id).delete(); }
            loadItems();
        } catch (err) { showToast('삭제 실패', 'error'); }
    });

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('auth-id').value;
        const email = `${id.trim().toLowerCase()}@mycloset.com`;
        const pw = document.getElementById('auth-password').value;
        const isSignUp = document.getElementById('auth-submit').textContent.includes('Sign Up');
        try {
            if (isSignUp) await auth.createUserWithEmailAndPassword(email, pw);
            else await auth.signInWithEmailAndPassword(email, pw);
            authModal.style.display = 'none';
        } catch (err) { showToast(`인증 실패: ${err.code}`, 'error'); }
    });
});
