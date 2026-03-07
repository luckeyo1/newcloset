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
                    color: var(--accent-color, #333);
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .name {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: #1a1a1a;
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
customElements.define('closet-item', ClosetItem);

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
    
    const STORAGE_KEY = 'virtualClosetItems_v2';
    const THEME_KEY = 'closetTheme_v2';

    let net = null;

    // Load MobileNet Model
    const loadModel = async () => {
        dropZone.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i><p>AI 모델 로딩 중...</p>`;
        try {
            net = await mobilenet.load();
            dropZone.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><p>모델 로드 완료! 사진을 올려주세요</p>`;
        } catch (err) {
            console.error('Model failed to load', err);
            dropZone.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i><p>AI 모델 로드 실패</p>`;
        }
    };
    loadModel();

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

    // --- AI Categorization Logic ---
    const categorizeImage = async (imgElement) => {
        if (!net) return;
        
        dropZone.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles fa-beat"></i><p>AI 분석 중...</p>`;
        
        const result = await net.classify(imgElement);
        console.log('AI Results:', result);
        
        // Simple mapping from MobileNet to our categories
        const topResult = result[0].className.toLowerCase();
        let detectedCategory = "";

        if (topResult.includes('shirt') || topResult.includes('jersey') || topResult.includes('sweater') || topResult.includes('cardigan')) {
            detectedCategory = "Top";
        } else if (topResult.includes('jean') || topResult.includes('pant') || topResult.includes('short') || topResult.includes('skirt')) {
            detectedCategory = "Bottom";
        } else if (topResult.includes('coat') || topResult.includes('jacket') || topResult.includes('suit')) {
            detectedCategory = "Outer";
        } else if (topResult.includes('shoe') || topResult.includes('sneaker') || topResult.includes('boot')) {
            detectedCategory = "Shoes";
        } else if (topResult.includes('dress') || topResult.includes('gown')) {
            detectedCategory = "Dress";
        } else {
            detectedCategory = "Acc";
        }

        categoryInput.value = detectedCategory;
        nameInput.value = result[0].className.split(',')[0]; // Suggest a name
    };

    // --- File Handling ---
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
        const files = e.dataTransfer.files;
        if (files.length) {
            fileInput.files = files;
            handleFileSelect(files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        handleFileSelect(e.target.files[0]);
    });

    const handleFileSelect = (file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;
            img.onload = async () => {
                // Show preview in drop zone
                dropZone.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
                await categorizeImage(img);
            };
        };
        reader.readAsDataURL(file);
    };

    // --- Data Management ---
    const loadItems = () => {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        gallery.innerHTML = '';
        if (items.length === 0) {
            gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 80px 40px; color: #999; border: 2px dashed #eee; border-radius: 20px;">옷장이 비어있습니다. AI의 도움을 받아 옷장을 채워보세요!</div>';
            return;
        }
        items.forEach(itemData => {
            gallery.appendChild(createClosetItem(itemData));
        });
    };

    const createClosetItem = (itemData) => {
        const item = document.createElement('closet-item');
        item.setAttribute('name', itemData.name);
        item.setAttribute('category', itemData.category);
        item.setAttribute('image-src', itemData.imageSrc);
        item.setAttribute('item-id', itemData.id);
        return item;
    };

    const saveItem = (itemData) => {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        items.unshift(itemData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    };

    const deleteItem = (id) => {
        let items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        items = items.filter(item => item.id.toString() !== id.toString());
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        loadItems();
    };

    document.addEventListener('delete-item', (e) => {
        if (confirm('이 아이템을 옷장에서 삭제할까요?')) {
            deleteItem(e.detail.id);
        }
    });

    // --- Form Submission ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();
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

    loadItems();
});
