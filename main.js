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
                @keyframes slideUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                .card { background: #fff; border-radius: 24px; padding: 12px; border: 1px solid #f0f0f0; transition: 0.3s; height: 100%; display: flex; flex-direction: column; }
                .card:hover { transform: translateY(-5px); border-color: #E8B4A0; box-shadow: 0 10px 30px rgba(0,0,0,0.05); }
                .img-box { width: 100%; aspect-ratio: 1; background: #FAF7F2; border-radius: 18px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
                img { max-width: 90%; max-height: 90%; object-fit: contain; }
                .info { padding: 10px 4px; flex: 1; display: flex; flex-direction: column; }
                .cat { font-size: 10px; font-weight: 800; color: #8C8378; text-transform: uppercase; }
                .name { font-size: 13px; font-weight: 700; color: #1C1C1E; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
    
    const REMOVE_BG_API_KEY = '5Ayb2PWWmbR9L6WTUe8kebWG';
    let net = null;
    let currentUser = null;
    let optimizedBase64Image = null;
    let allItems = [];
    let currentFilter = '전체';

    // AI Load
    const loadAI = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI ONLINE — UPLOAD IMAGE';
        } catch (e) { console.error('AI Load Failed'); }
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

    // --- Image Optimization ---
    const compressImage = (imgElement) => {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 500;
            let width = imgElement.width;
            let height = imgElement.height;
            if (width > MAX_WIDTH) { height = (MAX_WIDTH / width) * height; width = MAX_WIDTH; }
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(imgElement, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.6));
        });
    };

    // --- Rendering Helpers ---
    const renderSingleItem = (data, atTop = false) => {
        const el = document.createElement('closet-item');
        el.setAttribute('name', data.name);
        el.setAttribute('category', data.category);
        el.setAttribute('image-src', data.imageSrc);
        el.setAttribute('item-id', data.id || 'temp_' + Date.now());
        if (atTop) gallery.prepend(el);
        else gallery.appendChild(el);
    };

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
            if (isSignUp) await auth.createUserWithEmailAndPassword(email, pw);
            else await auth.signInWithEmailAndPassword(email, pw);
            authModal.style.display = 'none';
        } catch (err) { showToast(err.message, 'error'); }
    });

    auth.onAuthStateChanged(user => {
        currentUser = user;
        authBtn.textContent = user ? 'LOGOUT' : 'LOGIN';
        const userDisplay = document.getElementById('user-info');
        if (userDisplay) userDisplay.textContent = user ? user.email.split('@')[0].toUpperCase() : '';
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
                const img = new Image();
                img.src = reader.result;
                img.onload = async () => {
                    optimizedBase64Image = await compressImage(img);
                    dropZone.innerHTML = `<img src="${optimizedBase64Image}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px;">`;
                    if (net) analyze(img);
                };
            };
            reader.readAsDataURL(blob);
        } catch (err) { showToast('이미지 처리 실패', 'error'); }
    });

    const analyze = async (img) => {
        const predictions = await net.classify(img);
        const top = predictions[0];
        nameInput.value = top.className.split(',')[0].toUpperCase();
        const label = top.className.toLowerCase();
        if (label.match(/shirt|t-shirt|sweater|jersey|polo/)) categoryInput.value = 'Top';
        else if (label.match(/jean|pant|short|skirt|trouser/)) categoryInput.value = 'Bottom';
        else if (label.match(/coat|jacket|suit|blazer/)) categoryInput.value = 'Outer';
        else if (label.match(/shoe|sneaker|boot/)) categoryInput.value = 'Shoes';
        else if (label.match(/dress|gown/)) categoryInput.value = 'Dress';
        else categoryInput.value = 'Acc';

        document.getElementById('analysis-content').innerHTML = `
            <div class="info-row"><span class="info-label">AI PREDICTION</span><span class="info-value">${nameInput.value}</span></div>
            <div class="info-row" style="background:rgba(232,180,160,0.1); border-radius:12px; padding:15px; margin-top:10px;">
                <p style="font-size:12px; color:var(--stone); line-height:1.5;">심리 분석: 오늘 이 옷은 당신에게 확신을 줄 것입니다.</p>
            </div>
        `;
    };

    // --- Core Save Logic (OPTIMIZED FOR SPEED) ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!optimizedBase64Image) return showToast('이미지를 먼저 업로드하세요.', 'error');
        
        const itemData = { 
            name: nameInput.value || 'NEW ITEM', 
            category: categoryInput.value, 
            imageSrc: optimizedBase64Image, 
            createdAt: Date.now() 
        };
        
        // --- Optimistic Update (화면에 먼저 표시) ---
        showToast('옷장에 즉시 추가하는 중...', 'info');
        renderSingleItem(itemData, true); // 서버 응답 전 화면 상단에 즉시 추가
        
        try {
            if (currentUser) {
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').add(itemData);
                showToast('아이디 저장 완료!', 'success');
            } else {
                const items = JSON.parse(localStorage.getItem('closet_v3') || '[]');
                items.push({ ...itemData, id: 'trial_' + Date.now() });
                localStorage.setItem('closet_v3', JSON.stringify(items));
                showToast('체험판 저장 완료!', 'success');
            }
            form.reset(); optimizedBase64Image = null;
            dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>READY TO ANALYZE</p>';
            // loadItems()를 호출하지 않고 내부 리스트만 업데이트하여 속도 향상
            allItems.unshift(itemData);
            document.getElementById('item-count').textContent = allItems.length;
        } catch (err) { 
            showToast(`저장 실패: ${err.message}`, 'error'); 
            loadItems(); // 실패 시에만 전체 다시 불러오기
        }
    });

    const loadItems = async () => {
        try {
            if (currentUser) {
                const snap = await db.collection('wardrobes').doc(currentUser.uid).collection('items').orderBy('createdAt', 'desc').get();
                allItems = [];
                snap.forEach(doc => allItems.push({ ...doc.data(), id: doc.id }));
            } else {
                allItems = JSON.parse(localStorage.getItem('closet_v3') || '[]');
            }
            document.getElementById('item-count').textContent = allItems.length;
            renderGallery();
        } catch (e) { console.error('Load Error:', e); }
    };

    const renderGallery = () => {
        const filtered = currentFilter === '전체' ? allItems : allItems.filter(i => i.category === currentFilter);
        gallery.innerHTML = '';
        if (filtered.length === 0) {
            gallery.innerHTML = `<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:40px;">등록된 아이템이 없습니다.</p>`;
            return;
        }
        filtered.forEach(data => renderSingleItem(data));
    };

    filterContainer.addEventListener('click', (e) => {
        const target = e.target.closest('span'); if (!target) return;
        document.querySelectorAll('#category-filters span').forEach(s => s.classList.remove('active'));
        target.classList.add('active');
        currentFilter = target.getAttribute('data-filter');
        renderGallery();
    });

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
            showToast('삭제되었습니다.');
            loadItems();
        } catch (err) { showToast('삭제 실패', 'error'); }
    });

    document.getElementById('switch-to-signup').addEventListener('click', (e) => {
        e.preventDefault();
        const submit = document.getElementById('auth-submit');
        const isLogin = submit.textContent === 'Sign In';
        submit.textContent = isLogin ? 'Sign Up' : 'Sign In';
        document.getElementById('modal-title').textContent = isLogin ? 'Create Account' : 'Login';
        e.target.textContent = isLogin ? 'Login here' : 'Create an account';
    });
});
