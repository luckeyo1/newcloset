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
        console.log("Firebase Initialized Successfully");
    }
    auth = firebase.auth();
    db = firebase.firestore();
    
    // Set persistence to LOCAL (Persistent session)
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
} catch (e) {
    console.error("Firebase Initialization Error:", e);
    alert("서버 연결에 실패했습니다. API 키 또는 네트워크 설정을 확인해주세요.");
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

    const REMOVE_BG_API_KEY = '5Ayb2PWWmbR9L6WTUe8kebWG';
    const CLOSET_KEY = 'closet_v3';
    let net = null;
    let currentUser = null;
    let optimizedBase64Image = null;

    // AI Load
    const loadAI = async () => {
        try {
            if (window.tf) await tf.ready();
            net = await mobilenet.load();
            if (dropZone.querySelector('p')) dropZone.querySelector('p').textContent = 'AI READY — UPLOAD IMAGE';
        } catch (e) { console.warn('AI Load Error (Local):', e); }
    };
    loadAI();

    const showToast = (msg) => {
        const t = document.createElement('div');
        t.className = 'toast show';
        t.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#333; color:white; padding:12px 24px; border-radius:50px; z-index:9999; font-size:14px; box-shadow:0 10px 20px rgba(0,0,0,0.2);";
        t.textContent = msg;
        document.body.appendChild(t);
        setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 500); }, 3000);
    };

    // --- Google Login (Popup with Redirect Fallback) ---
    googleLoginBtn?.addEventListener('click', async () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        googleLoginBtn.disabled = true;
        googleLoginBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> CONNECTING...';
        
        try {
            // First try Popup (faster, better UX)
            const result = await auth.signInWithPopup(provider);
            if (result.user) {
                showToast('WELCOME, ' + (result.user.displayName || 'USER'));
                authModal.style.display = 'none';
            }
        } catch (error) {
            console.warn('Popup blocked or failed, trying Redirect...', error.code);
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
                // Fallback to Redirect
                await auth.signInWithRedirect(provider);
            } else {
                console.error('Auth Error:', error);
                showToast('AUTH ERROR: ' + error.message);
                googleLoginBtn.disabled = false;
                googleLoginBtn.innerHTML = '<img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18"> Continue with Google';
            }
        }
    });

    // Handle Redirect Result
    auth.getRedirectResult().then((result) => {
        if (result && result.user) {
            showToast('WELCOME BACK, ' + (result.user.displayName || 'USER'));
            authModal.style.display = 'none';
        }
    }).catch((error) => {
        console.error('Redirect Result Error:', error);
        if (error.code === 'auth/unauthorized-domain') {
            alert('현재 도메인이 Firebase 승인 도메인에 등록되지 않았습니다.');
        }
    });

    // --- Auth Logic (Email/Pass) ---
    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('auth-submit');
        const id = authIdInput.value.trim();
        const pw = authPassword.value;
        const isSignUp = document.getElementById('modal-title').textContent.includes('Account');

        if (!id || pw.length < 6) {
            return showToast('아이디와 6자리 이상의 비밀번호를 입력해주세요.');
        }

        let email = id.includes('@') ? id : `${id.toLowerCase()}@mycloset.com`;

        try {
            submitBtn.disabled = true;
            submitBtn.textContent = isSignUp ? 'CREATING...' : 'SIGNING IN...';

            if (isSignUp) {
                await auth.createUserWithEmailAndPassword(email, pw);
                showToast('ACCOUNT CREATED SUCCESS');
            } else {
                await auth.signInWithEmailAndPassword(email, pw);
                showToast('WELCOME BACK');
            }
            authModal.style.display = 'none';
        } catch (err) {
            console.error('Auth Error:', err.code, err.message);
            let msg = '인증 오류가 발생했습니다.';
            if (err.code === 'auth/email-already-in-use') msg = '이미 사용 중인 아이디입니다.';
            else if (err.code === 'auth/weak-password') msg = '비밀번호가 너무 취약합니다 (6자 이상 권장).';
            else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') msg = '아이디 또는 비밀번호가 틀렸습니다.';
            else if (err.code === 'auth/invalid-email') msg = '올바르지 않은 이메일 형식입니다.';
            showToast(msg);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = isSignUp ? 'Sign Up' : 'Sign In';
        }
    });

    auth.onAuthStateChanged(user => {
        currentUser = user;
        authBtn.textContent = user ? 'LOGOUT' : 'LOGIN';
        const userDisplay = document.getElementById('user-info');
        if (userDisplay) userDisplay.textContent = user ? (user.displayName || user.email.split('@')[0]).toUpperCase() : '';
        loadItems();
    });

    // --- Image Upload & Load Items (Simplified for focus on Auth) ---
    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        dropZone.innerHTML = `<div style="text-align:center;"><i class="fa-solid fa-wand-sparkles fa-spin" style="font-size:40px; color:#E8B4A0;"></i><p style="margin-top:15px;">ANALYZING...</p></div>`;
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const img = new Image();
            img.src = reader.result;
            img.onload = async () => {
                optimizedBase64Image = reader.result; // Simplified
                dropZone.innerHTML = `<img src="${optimizedBase64Image}" style="max-height:100%; max-width:100%; object-fit:contain; border-radius:15px;">`;
                if (net) {
                    const predictions = await net.classify(img);
                    nameInput.value = predictions[0].className.split(',')[0].toUpperCase();
                }
            };
        };
        reader.readAsDataURL(file);
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
            gallery.innerHTML = items.length ? '' : '<p style="grid-column:1/-1; text-align:center; opacity:0.5; padding:40px;">저장된 아이템이 없습니다.</p>';
            items.forEach(data => {
                const el = document.createElement('closet-item');
                el.setAttribute('name', data.name); el.setAttribute('category', data.category);
                el.setAttribute('image-src', data.imageSrc); el.setAttribute('item-id', data.id);
                gallery.appendChild(el);
            });
        } catch (e) { console.error("Load Error:", e); }
    };

    authBtn.addEventListener('click', () => {
        if (currentUser) { auth.signOut(); currentUser = null; loadItems(); }
        else authModal.style.display = 'flex';
    });
    
    document.querySelector('.close-modal')?.addEventListener('click', () => authModal.style.display = 'none');
    
    switchToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        const isLogin = document.getElementById('auth-submit').textContent === 'Sign In';
        document.getElementById('auth-submit').textContent = isLogin ? 'Sign Up' : 'Sign In';
        document.getElementById('modal-title').textContent = isLogin ? 'Create Account' : 'Login';
        e.target.textContent = isLogin ? 'Login here' : 'Create an account';
    });
});
