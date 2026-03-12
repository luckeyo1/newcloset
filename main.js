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
                    box-shadow: 0 10px 30px rgba(0,0,0,0.02); border: 1px solid #f0f0f0;
                }
                .card:hover { transform: translateY(-10px) scale(1.02); box-shadow: 0 20px 50px rgba(0,0,0,0.08); border-color: #E8B4A0; }
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
customElements.define('closet-item', ClosetItem);

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
    const analysisContent = document.getElementById('analysis-content');
    const colorPalette = document.getElementById('color-palette');
    const gallery = document.getElementById('closet-gallery');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Auth
    const authBtn = document.getElementById('auth-btn');
    const authModal = document.getElementById('auth-modal');
    const authForm = document.getElementById('auth-form');
    const authIdInput = document.getElementById('auth-id');
    const authPassword = document.getElementById('auth-password');
    const switchToSignup = document.getElementById('switch-to-signup');

    const REMOVE_BG_API_KEY = '5Ayb2PWWmbR9L6WTUe8kebWG';
    let net = null;
    let currentUser = null;
    let analyzedColors = [];

    // --- AI Load ---
    const loadAI = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            dropZone.querySelector('p').textContent = 'AI READY — UPLOAD IMAGE';
        } catch (e) { console.error('AI Load Error'); }
    };
    loadAI();

    // --- UI Toast ---
    const showToast = (msg) => {
        const t = document.createElement('div');
        t.className = 'toast show';
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
    };

    // --- Auth Logic ---
    authBtn.addEventListener('click', () => {
        if (currentUser) { auth.signOut(); showToast('LOGGED OUT'); }
        else authModal.style.display = 'flex';
    });

    document.querySelector('.close-modal')?.addEventListener('click', () => authModal.style.display = 'none');

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = authIdInput.value;
        const email = `${id.trim().toLowerCase()}@mycloset.com`;
        const pw = authPassword.value;
        try {
            if (authBtn.textContent === 'LOGIN') {
                await auth.signInWithEmailAndPassword(email, pw);
            } else {
                await auth.createUserWithEmailAndPassword(email, pw);
            }
            authModal.style.display = 'none';
        } catch (err) { showToast('AUTH ERROR: ' + err.message); }
    });

    auth.onAuthStateChanged(user => {
        currentUser = user;
        authBtn.textContent = user ? 'LOGOUT' : 'LOGIN';
        document.getElementById('user-info').textContent = user ? user.email.split('@')[0].toUpperCase() : '';
        loadItems();
    });

    // --- File & Analysis ---
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-sparkles fa-spin" style="font-size:40px; color:#E8B4A0;"></i><p style="margin-top:15px; font-weight:700;">AI ANALYZING STYLE...</p></div>`;
        
        try {
            // Remove BG
            const formData = new FormData();
            formData.append('image_file', file);
            const resp = await fetch('https://api.remove.bg/v1.0/removebg', { method: 'POST', headers: { 'X-Api-Key': REMOVE_BG_API_KEY }, body: formData }).catch(() => null);
            
            const blob = (resp && resp.ok) ? await resp.blob() : file;
            const imgUrl = URL.createObjectURL(blob);
            
            const img = new Image();
            img.src = imgUrl;
            img.onload = async () => {
                dropZone.innerHTML = `<img src="${imgUrl}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px;">`;
                
                // AI Classify
                if (net) {
                    const predictions = await net.classify(img);
                    const top = predictions[0];
                    nameInput.value = top.className.split(',')[0].toUpperCase();
                    
                    const label = top.className.toLowerCase();
                    if (label.match(/shirt|t-shirt|sweater|jersey/)) categoryInput.value = 'Top';
                    else if (label.match(/jean|pant|short|skirt/)) categoryInput.value = 'Bottom';
                    else if (label.match(/coat|jacket|suit/)) categoryInput.value = 'Outer';
                    else if (label.match(/shoe|sneaker/)) categoryInput.value = 'Shoes';
                    
                    analysisContent.innerHTML = `<div class="info-row"><span class="info-label">AI PREDICTION</span><span class="info-value">${nameInput.value}</span></div>
                                               <div class="info-row"><span class="info-label">CATEGORY</span><span class="info-value">${categoryInput.value}</span></div>`;
                    
                    extractColors(img);
                }
            };
        } catch (err) { showToast('ANALYSIS ERROR'); }
    });

    const extractColors = (img) => {
        const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d');
        canvas.width = 100; canvas.height = 100; ctx.drawImage(img, 0, 0, 100, 100);
        const data = ctx.getImageData(0, 0, 100, 100).data;
        const counts = {};
        for (let i = 0; i < data.length; i += 40) {
            const rgb = `rgb(${data[i]},${data[i+1]},${data[i+2]})`;
            counts[rgb] = (counts[rgb] || 0) + 1;
        }
        analyzedColors = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 4);
        colorPalette.innerHTML = analyzedColors.map(c => `<div style="width:24px; height:24px; border-radius:50%; background:${c}; border:2px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.1);"></div>`).join('');
    };

    // --- DB Operations ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const img = dropZone.querySelector('img');
        if (!img) return showToast('UPLOAD IMAGE FIRST');
        
        const itemData = { name: nameInput.value, category: categoryInput.value, imageSrc: img.src, colors: analyzedColors, createdAt: Date.now() };
        
        try {
            if (currentUser) {
                await db.collection('wardrobes').doc(currentUser.uid).collection('items').add(itemData);
            } else {
                const items = JSON.parse(localStorage.getItem('closet_v3') || '[]');
                items.push({ ...itemData, id: 'trial_' + Date.now() });
                localStorage.setItem('closet_v3', JSON.stringify(items));
            }
            showToast('ADDED TO COLLECTION');
            form.reset(); dropZone.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i><p>READY TO ANALYZE</p>';
            loadItems();
        } catch (err) { showToast('SAVE ERROR'); }
    });

    const loadItems = async () => {
        gallery.innerHTML = '<p style="grid-column:1/-1; text-align:center; opacity:0.5;">REFINING COLLECTION...</p>';
        let items = [];
        if (currentUser) {
            const snap = await db.collection('wardrobes').doc(currentUser.uid).collection('items').get();
            snap.forEach(doc => items.push({ ...doc.data(), id: doc.id }));
        } else {
            items = JSON.parse(localStorage.getItem('closet_v3') || '[]');
        }
        
        gallery.innerHTML = '';
        items.forEach(data => {
            const el = document.createElement('closet-item');
            el.setAttribute('name', data.name); el.setAttribute('category', data.category);
            el.setAttribute('image-src', data.imageSrc); el.setAttribute('item-id', data.id);
            gallery.appendChild(el);
        });
        
        // Smart Look Engine
        const tops = items.filter(i => i.category === 'Top');
        const bots = items.filter(i => i.category === 'Bottom');
        if (tops.length > 0 && bots.length > 0) {
            const t = tops[0]; const b = bots[0];
            document.getElementById('smart-coord-grid').innerHTML = `
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <img src="${t.imageSrc}" style="width:60px; height:60px; border-radius:10px; object-fit:cover;">
                    <img src="${b.imageSrc}" style="width:60px; height:60px; border-radius:10px; object-fit:cover;">
                </div>
                <p style="font-size:13px; font-weight:700; color:#1C1C1E;">DAILY LUXE MATCH</p>
                <p style="font-size:12px; color:#8C8378; line-height:1.4;">${t.name}와 ${b.name}의 우아한 조화입니다. 전체적으로 정갈한 실루엣을 강조합니다.</p>
            `;
        }
    };

    document.addEventListener('delete-item', async (e) => {
        if (!confirm('REMOVE THIS ITEM?')) return;
        const id = e.detail.id;
        if (id.startsWith('trial_')) {
            const items = JSON.parse(localStorage.getItem('closet_v3') || '[]').filter(i => i.id !== id);
            localStorage.setItem('closet_v3', JSON.stringify(items));
        } else {
            await db.collection('wardrobes').doc(currentUser.uid).collection('items').doc(id).delete();
        }
        loadItems();
    });

    themeToggle.addEventListener('click', () => {
        const isL = document.body.classList.toggle('light-mode');
        localStorage.setItem('theme_v3', isL ? 'light' : 'dark');
    });
});
