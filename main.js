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
                }
                .image-container {
                    position: relative;
                    width: 100%;
                    padding-bottom: 125%; /* 4:5 Aspect Ratio - Trendy for fashion */
                    background-color: #f1f1f1;
                    border-radius: 12px;
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
                }
                .category {
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: #707070;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .name {
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: var(--text-main, #1a1a1a);
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .action-btn {
                    margin-top: 8px;
                    font-size: 0.75rem;
                    color: #999;
                    text-decoration: underline;
                    background: none;
                    border: none;
                    padding: 0;
                    cursor: pointer;
                    width: fit-content;
                }
            </style>
            <div class="product-card">
                <div class="image-container">
                    <img src="${imageSrc}" alt="${name}">
                </div>
                <div class="info">
                    <span class="category">${category}</span>
                    <span class="name">${name}</span>
                    <button class="action-btn">상세보기</button>
                </div>
            </div>
        `;
    }
}
customElements.define('closet-item', ClosetItem);

// ====================================================================
// ** Main Application Logic **
// ====================================================================
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('add-item-form');
    const gallery = document.getElementById('closet-gallery');
    const themeToggle = document.getElementById('theme-toggle');
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('item-image');
    
    const STORAGE_KEY = 'virtualClosetItems_v2';
    const THEME_KEY = 'closetTheme_v2';

    // --- Theme Handling ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'light';
        if (savedTheme === 'light') {
            document.body.classList.add('light-mode');
            updateThemeIcon('light');
        }
    };

    const updateThemeIcon = (theme) => {
        const icon = themeToggle.querySelector('i');
        if (theme === 'light') {
            icon.classList.replace('fa-moon', 'fa-sun');
        } else {
            icon.classList.replace('fa-sun', 'fa-moon');
        }
    };

    themeToggle.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-mode');
        const theme = isLight ? 'light' : 'dark';
        localStorage.setItem(THEME_KEY, theme);
        updateThemeIcon(theme);
    });

    initTheme();

    // --- Drag & Drop Handling ---
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = 'var(--accent-color)';
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = 'var(--border-color)';
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        fileInput.files = e.dataTransfer.files;
        handleFileSelect(e.dataTransfer.files[0]);
    });

    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });

    const handleFileSelect = (file) => {
        if (file) {
            dropZone.innerHTML = `<i class="fa-solid fa-check"></i><p>${file.name} 선택됨</p>`;
        }
    };

    // --- Load Items ---
    const loadItems = () => {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        gallery.innerHTML = '';
        if (items.length === 0) {
            gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;">옷장이 비어있습니다. 첫 번째 아이템을 추가해보세요.</div>';
            return;
        }
        items.forEach(itemData => {
            gallery.appendChild(createClosetItem(itemData));
        });
    };

    // --- Form Submission ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('item-name');
        const categoryInput = document.getElementById('item-category');
        const file = fileInput.files[0];

        if (!file) return alert('이미지를 선택해주세요.');

        const reader = new FileReader();
        reader.onloadend = () => {
            const newItemData = {
                id: Date.now(),
                name: nameInput.value,
                category: categoryInput.value,
                imageSrc: reader.result
            };

            saveItem(newItemData);
            loadItems();
            form.reset();
            dropZone.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><p>클릭하거나 이미지를 드래그하세요</p>`;
        };
        reader.readAsDataURL(file);
    });

    const createClosetItem = (itemData) => {
        const item = document.createElement('closet-item');
        item.setAttribute('name', itemData.name);
        item.setAttribute('category', itemData.category);
        item.setAttribute('image-src', itemData.imageSrc);
        return item;
    };

    const saveItem = (itemData) => {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        items.unshift(itemData); // 최신 항목이 위로
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    };

    loadItems();
});
