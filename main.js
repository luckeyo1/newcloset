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
                .card:hover { transform: translateY(-10px); box-shadow: 0 20px 50px rgba(0,0,0,0.08); border-color: #E8B4A0; }
                .img-box {
                    width: 100%; aspect-ratio: 1; background: #FAF7F2;
                    border-radius: 18px; overflow: hidden; display: flex; align-items: center; justify-content: center;
                }
                img { max-width: 90%; max-height: 90%; object-fit: contain; }
                .info { padding: 12px 4px; flex: 1; display: flex; flex-direction: column; }
                .cat { font-size: 10px; font-weight: 800; color: #8C8378; text-transform: uppercase; letter-spacing: 1.5px; }
                .name { font-size: 14px; font-weight: 700; color: #1C1C1E; margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
    const moodButtons = document.querySelectorAll('.mood-btn');
    
    const REMOVE_BG_API_KEY = '5Ayb2PWWmbR9L6WTUe8kebWG';
    let net = null;
    let currentUser = null;
    let currentBase64Image = null;
    let allItems = [];
    let currentFilter = '전체';
    let currentMood = 'Confidence';

    // AI Load
    const loadAI = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI ONLINE — START ANALYSIS';
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

    // --- Mood Selection ---
    moodButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            moodButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentMood = btn.getAttribute('data-mood');
            showToast(`오늘의 목표: ${currentMood} 모드 활성화`, 'info');
            updateSmartLook(allItems);
        });
    });

    // --- Image Processing & Psychological Analysis ---
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-sparkles fa-spin" style="font-size:40px; color:#E8B4A0;"></i><p style="margin-top:15px;">이미지 최적화 및 심리 분석 중...</p></div>`;
        
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
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 600;
                    let width = img.width; let height = img.height;
                    if (width > MAX_WIDTH) { height = (MAX_WIDTH/width)*height; width = MAX_WIDTH; }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, width, height);
                    currentBase64Image = canvas.toDataURL('image/jpeg', 0.7);
                    
                    dropZone.innerHTML = `<img src="${currentBase64Image}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px;">`;
                    if (net) analyzePsychology(img);
                };
            };
            reader.readAsDataURL(blob);
        } catch (err) { showToast('이미지 처리 실패', 'error'); }
    });

    const analyzePsychology = async (img) => {
        const predictions = await net.classify(img);
        const top = predictions[0];
        const label = top.className.toLowerCase();
        nameInput.value = top.className.split(',')[0].toUpperCase();
        
        if (label.match(/shirt|t-shirt|sweater|jersey|polo/)) categoryInput.value = 'Top';
        else if (label.match(/jean|pant|short|skirt|trouser/)) categoryInput.value = 'Bottom';
        else if (label.match(/coat|jacket|suit|blazer/)) categoryInput.value = 'Outer';
        else if (label.match(/shoe|sneaker|boot/)) categoryInput.value = 'Shoes';
        else if (label.match(/dress|gown/)) categoryInput.value = 'Dress';
        else categoryInput.value = 'Acc';

        const cat = categoryInput.value;
        const mindsetTips = {
            'Top': '상체에 힘을 주는 이 아이템은 대화 시 상대방에게 안정감을 줍니다.',
            'Bottom': '하체의 실루엣을 잡아주는 이 옷은 당신의 발걸음에 확신을 더할 것입니다.',
            'Outer': '외부로부터 당신을 보호하는 이 아우터는 전문적인 권위를 상징합니다.',
            'Dress': '한 벌로 완성되는 원피스는 복잡한 생각을 정리하고 본연의 매력에 집중하게 합니다.',
            'Shoes': '좋은 신발은 당신을 더 나은 장소로 데려가며, 자존감의 기초가 됩니다.'
        };

        document.getElementById('analysis-content').innerHTML = `
            <div class="info-row"><span class="info-label">AI PREDICTION</span><span class="info-value">${nameInput.value}</span></div>
            <div class="info-row" style="background:rgba(232,180,160,0.1); border-radius:12px; padding:15px; margin-top:10px;">
                <p style="font-size:12px; color:var(--deep); font-weight:600;">🧠 Mindset Tip:</p>
                <p style="font-size:12px; color:var(--stone); line-height:1.5;">${mindsetTips[cat] || '오늘 당신의 기분을 전환해줄 소중한 아이템입니다.'}</p>
            </div>
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
                showToast('클라우드에 안전하게 저장되었습니다.', 'success');
            } else {
                const items = JSON.parse(localStorage.getItem('closet_v3') || '[]');
                items.push({ ...itemData, id: 'trial_' + Date.now() });
                localStorage.setItem('closet_v3', JSON.stringify(items));
                showToast('체험판으로 저장되었습니다.', 'success');
            }
            form.reset(); currentBase64Image = null;
            dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>READY TO ANALYZE</p>';
            loadItems();
        } catch (err) { showToast('저장 실패', 'error'); }
    });

    // --- Sync & Render ---
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
            updateSmartLook(allItems);
        } catch (e) { console.error('Load Error'); }
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

    filterContainer.addEventListener('click', (e) => {
        const target = e.target.closest('span'); if (!target) return;
        document.querySelectorAll('#category-filters span').forEach(s => {
            s.classList.remove('active'); s.style.background = '#fff'; s.style.color = '#000';
        });
        target.classList.add('active'); target.style.background = 'var(--charcoal)'; target.style.color = 'var(--cream)';
        currentFilter = target.getAttribute('data-filter');
        renderGallery();
    });

    const updateSmartLook = (items) => {
        const grid = document.getElementById('smart-coord-grid');
        const tops = items.filter(i => i.category === 'Top');
        const bots = items.filter(i => i.category === 'Bottom');
        
        if (tops.length > 0 && bots.length > 0) {
            const t = tops[0]; const b = bots[0];
            const moodMessages = {
                'Confidence': `이 조합은 오늘 당신을 더 단단하고 강력한 전문가로 인지하게 합니다. 중요한 결정을 앞두고 있다면 적극 추천합니다.`,
                'Calm': `부드러운 실루엣의 조화로 마음의 평온을 찾으세요. 오늘은 당신의 내면에 집중하기 좋은 날입니다.`,
                'Creative': `고정관념을 깨는 믹스매치로 새로운 영감을 얻으세요. 주변 사람들에게도 창의적인 자극을 줄 것입니다.`,
                'Social': `상대방에게 신뢰와 따뜻함을 동시에 주는 조합입니다. 새로운 사람과의 만남에서 긍정적인 첫인상을 남기세요.`
            };

            grid.innerHTML = `
                <div style="display:flex; gap:10px; margin-bottom:20px;">
                    <img src="${t.imageSrc}" style="width:80px; height:80px; border-radius:15px; object-fit:cover; border:2px solid var(--accent);">
                    <img src="${b.imageSrc}" style="width:80px; height:80px; border-radius:15px; object-fit:cover; border:2px solid var(--accent);">
                </div>
                <p style="font-size:14px; font-weight:700; color:var(--deep); margin-bottom:10px;">✨ FOR YOUR ${currentMood.toUpperCase()}</p>
                <p style="font-size:12px; color:var(--stone); line-height:1.6;">${moodMessages[currentMood]}</p>
            `;
        }
    };

    const syncTrialToCloud = async () => {
        const items = JSON.parse(localStorage.getItem('closet_v3') || '[]');
        if (items.length > 0 && currentUser) {
            for (const item of items) {
                delete item.id;
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').add(item);
            }
            localStorage.removeItem('closet_v3');
            loadItems();
        }
    };

    // Auth Modal Handlers
    authBtn.addEventListener('click', () => {
        if (currentUser) { auth.signOut(); showToast('LOGGED OUT'); }
        else authModal.style.display = 'flex';
    });
    document.querySelector('.close-modal')?.addEventListener('click', () => authModal.style.display = 'none');
    document.getElementById('auth-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('auth-id').value;
        const email = `${id.trim().toLowerCase()}@mycloset.com`;
        const pw = document.getElementById('auth-password').value;
        const isLogin = document.getElementById('auth-submit').textContent === 'Sign In';
        try {
            if (isLogin) await auth.signInWithEmailAndPassword(email, pw);
            else await auth.createUserWithEmailAndPassword(email, pw);
            authModal.style.display = 'none';
        } catch (err) { showToast(err.message, 'error'); }
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
