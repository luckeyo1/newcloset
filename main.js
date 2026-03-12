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
                :host { display: block; animation: slideUp 0.6s cubic-bezier(0.23, 1, 0.32, 1); }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .card {
                    background: #fff; border-radius: 24px; padding: 12px;
                    transition: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid #f0f0f0; height: 100%; display: flex; flex-direction: column;
                }
                .card:hover { transform: translateY(-10px) scale(1.02); box-shadow: 0 20px 50px rgba(0,0,0,0.08); border-color: #E8B4A0; }
                .img-box {
                    width: 100%; aspect-ratio: 1; background: #FAF7F2;
                    border-radius: 18px; overflow: hidden; display: flex; align-items: center; justify-content: center;
                }
                img { max-width: 90%; max-height: 90%; object-fit: contain; }
                .info { padding: 12px 4px; flex: 1; display: flex; flex-direction: column; }
                .cat { font-size: 10px; font-weight: 800; color: #8C8378; text-transform: uppercase; letter-spacing: 1.5px; }
                .name { font-size: 14px; font-weight: 700; color: #1C1C1E; margin-top: 4px; }
                .del { margin-top: auto; padding-top: 10px; font-size: 11px; color: #E8B4A0; cursor: pointer; border: none; background: none; font-weight: 700; text-align: left; }
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
    const switchToSignup = document.getElementById('switch-to-signup');
    
    const REMOVE_BG_API_KEY = '5Ayb2PWWmbR9L6WTUe8kebWG';
    let net = null;
    let currentUser = null;
    let currentBase64Image = null;
    let allItems = [];
    let currentFilter = '전체';

    // --- AI Load ---
    const loadAI = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI READY — UPLOAD IMAGE';
        } catch (e) { console.error('AI Load Error'); }
    };
    loadAI();

    const showToast = (msg, type = 'info') => {
        const t = document.createElement('div');
        t.className = 'toast show';
        t.style.background = type === 'error' ? '#ff4d4d' : (type === 'success' ? '#4CAF50' : '#1C1C1E');
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
    };

    // --- Auth UI Toggle ---
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        const submit = document.getElementById('auth-submit');
        const title = document.getElementById('modal-title');
        const desc = document.getElementById('modal-desc');
        const switchText = document.getElementById('switch-text');
        
        const isLogin = submit.textContent === 'Sign In';
        
        if (isLogin) {
            submit.textContent = 'Sign Up';
            title.textContent = 'Create Account';
            desc.textContent = '새로운 계정을 만들고 나만의 옷장을 클라우드에 저장하세요.';
            switchText.textContent = '이미 계정이 있으신가요?';
            e.target.textContent = 'Login here';
        } else {
            submit.textContent = 'Sign In';
            title.textContent = 'Login';
            desc.textContent = '서비스 이용을 위해 아이디와 비밀번호를 입력해주세요.';
            switchText.textContent = '계정이 없으신가요?';
            e.target.textContent = 'Create an account';
        }
    });

    // --- Auth Logic ---
    authBtn.addEventListener('click', () => {
        if (currentUser) { auth.signOut(); showToast('로그아웃 되었습니다.'); }
        else authModal.style.display = 'flex';
    });

    document.querySelector('.close-modal')?.addEventListener('click', () => authModal.style.display = 'none');

    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('auth-id').value;
        const email = `${id.trim().toLowerCase()}@mycloset.com`;
        const pw = document.getElementById('auth-password').value;
        const isSignUp = document.getElementById('auth-submit').textContent === 'Sign Up';
        
        try {
            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, pw);
                showToast('회원가입을 환영합니다!', 'success');
            } else {
                await auth.signInWithEmailAndPassword(email, pw);
                showToast('반갑습니다, ' + id + '님!', 'success');
            }
            authModal.style.display = 'none';
        } catch (err) { 
            let errorMsg = '인증 오류가 발생했습니다.';
            if (err.code === 'auth/weak-password') errorMsg = '비밀번호는 6자 이상이어야 합니다.';
            else if (err.code === 'auth/email-already-in-use') errorMsg = '이미 존재하는 아이디입니다.';
            else if (err.code === 'auth/invalid-email') errorMsg = '아이디 형식이 올바르지 않습니다.';
            else if (err.code === 'auth/user-not-found') errorMsg = '존재하지 않는 계정입니다.';
            else if (err.code === 'auth/wrong-password') errorMsg = '비밀번호가 틀렸습니다.';
            
            showToast(errorMsg, 'error'); 
        }
    });

    auth.onAuthStateChanged(user => {
        currentUser = user;
        authBtn.textContent = user ? 'LOGOUT' : 'LOGIN';
        const userDisplay = document.getElementById('user-info');
        if (userDisplay) userDisplay.textContent = user ? user.email.split('@')[0].toUpperCase() : '';
        if (user) syncTrialToCloud();
        loadItems();
    });

    // --- Image Processing ---
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-sparkles fa-spin" style="font-size:40px; color:#E8B4A0;"></i><p style="margin-top:15px;">ANALYZING STYLE...</p></div>`;
        
        try {
            const formData = new FormData();
            formData.append('image_file', file);
            const resp = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': REMOVE_BG_API_KEY }, body: formData }).catch(() => null);
            const blob = (resp && resp.ok) ? await resp.blob() : file;
            
            const reader = new FileReader();
            reader.onloadend = () => {
                currentBase64Image = reader.result;
                const img = new Image();
                img.src = currentBase64Image;
                img.onload = () => {
                    dropZone.innerHTML = `<img src="${currentBase64Image}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px;">`;
                    if (net) analyze(img);
                };
            };
            reader.readAsDataURL(blob);
        } catch (err) { showToast('이미지 처리 중 오류 발생', 'error'); }
    });

    const analyze = async (img) => {
        const predictions = await net.classify(img);
        const top = predictions[0];
        const label = top.className.toLowerCase();
        
        nameInput.value = top.className.split(',')[0].toUpperCase();
        
        if (label.match(/shirt|t-shirt|sweater|jersey|polo|tank top/)) categoryInput.value = 'Top';
        else if (label.match(/jean|pant|short|skirt|trouser|legging/)) categoryInput.value = 'Bottom';
        else if (label.match(/coat|jacket|suit|parka|blazer/)) categoryInput.value = 'Outer';
        else if (label.match(/shoe|sneaker|boot|sandal|loaf/)) categoryInput.value = 'Shoes';
        else if (label.match(/dress|gown|robe/)) categoryInput.value = 'Dress';
        else categoryInput.value = 'Acc';

        document.getElementById('analysis-content').innerHTML = `
            <div class="info-row"><span class="info-label">AI PREDICTION</span><span class="info-value">${nameInput.value}</span></div>
            <div class="info-row"><span class="info-label">CATEGORY</span><span class="info-value">${categoryInput.value}</span></div>
        `;
    };

    // --- Core Save Logic ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentBase64Image) return showToast('이미지를 먼저 업로드하세요.', 'error');
        
        const itemData = { 
            name: nameInput.value || 'NEW ITEM', 
            category: categoryInput.value, 
            imageSrc: currentBase64Image, 
            createdAt: Date.now() 
        };
        
        try {
            if (currentUser) {
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').add(itemData);
            } else {
                const trialItems = JSON.parse(localStorage.getItem('closet_v3') || '[]');
                trialItems.push({ ...itemData, id: 'trial_' + Date.now() });
                localStorage.setItem('closet_v3', JSON.stringify(trialItems));
            }
            showToast('옷장에 저장되었습니다!', 'success');
            form.reset(); 
            currentBase64Image = null;
            dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>READY TO ANALYZE</p>';
            loadItems();
        } catch (err) { showToast('저장 중 오류 발생', 'error'); }
    });

    // --- Filter & Render Logic ---
    const loadItems = async () => {
        gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.5;">REFINING COLLECTION...</p>';
        try {
            if (currentUser) {
                const snap = await db.collection('wardrobes').doc(currentUser.uid).collection('items').orderBy('createdAt', 'desc').get();
                allItems = [];
                snap.forEach(doc => allItems.push({ ...doc.data(), id: doc.id }));
            } else {
                allItems = JSON.parse(localStorage.getItem('closet_v3') || '[]');
            }
            renderGallery();
            updateSmartLook(allItems);
        } catch (e) { gallery.innerHTML = '데이터 로딩 중 오류 발생'; }
    };

    const renderGallery = () => {
        const filtered = currentFilter === '전체' ? allItems : allItems.filter(i => i.category === currentFilter);
        gallery.innerHTML = '';
        if (filtered.length === 0) {
            gallery.innerHTML = `<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:40px;">등록된 아이템이 없습니다.</p>`;
            return;
        }
        filtered.forEach(data => {
            const el = document.createElement('closet-item');
            el.setAttribute('name', data.name); el.setAttribute('category', data.category);
            el.setAttribute('image-src', data.imageSrc); el.setAttribute('item-id', data.id);
            gallery.appendChild(el);
        });
    };

    filterContainer.addEventListener('click', (e) => {
        const target = e.target.closest('span');
        if (!target) return;
        
        document.querySelectorAll('#category-filters span').forEach(s => {
            s.classList.remove('active');
            s.style.background = '#fff'; s.style.color = '#000';
        });
        
        target.classList.add('active');
        target.style.background = 'var(--charcoal)'; target.style.color = 'var(--cream)';
        
        currentFilter = target.getAttribute('data-filter');
        renderGallery();
    });

    const syncTrialToCloud = async () => {
        const items = JSON.parse(localStorage.getItem('closet_v3') || '[]');
        if (items.length > 0 && currentUser) {
            try {
                for (const item of items) {
                    delete item.id;
                    await db.collection('wardrobes').doc(currentUser.uid).collection('items').add(item);
                }
                localStorage.removeItem('closet_v3');
                loadItems();
            } catch (err) { console.error('Sync error'); }
        }
    };

    const updateSmartLook = (items) => {
        const grid = document.getElementById('smart-coord-grid');
        const tops = items.filter(i => i.category === 'Top');
        const bots = items.filter(i => i.category === 'Bottom');
        if (tops.length > 0 && bots.length > 0) {
            grid.innerHTML = `
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <img src="${tops[0].imageSrc}" style="width:60px; height:60px; border-radius:10px; object-fit:cover;">
                    <img src="${bots[0].imageSrc}" style="width:60px; height:60px; border-radius:10px; object-fit:cover;">
                </div>
                <p style="font-size:13px; font-weight:700; color:var(--deep);">DAILY LUXE MATCH</p>
                <p style="font-size:12px; color:var(--stone); line-height:1.4;">${tops[0].name}와 ${bots[0].name}의 우아한 조화입니다.</p>`;
        }
    };

    document.addEventListener('delete-item', async (e) => {
        if (!confirm('삭제하시겠습니까?')) return;
        const id = e.detail.id;
        try {
            if (id.startsWith('trial_')) {
                const items = JSON.parse(localStorage.getItem('closet_v3') || '[]').filter(i => i.id !== id);
                localStorage.setItem('closet_v3', JSON.stringify(items));
            } else {
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').doc(id).delete();
            }
            loadItems();
        } catch (err) { showToast('삭제 실패', 'error'); }
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
    });
});
