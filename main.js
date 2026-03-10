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
    const analysisContent = document.getElementById('analysis-content');
    const colorPalette = document.getElementById('color-palette');
    
    const STORAGE_KEY = 'virtualClosetItems_v3';
    const THEME_KEY = 'closetTheme_v2';

    let net = null;
    let isModelLoading = true;

    // --- AI Model Management ---
    const loadModel = async () => {
        try {
            console.log('Loading AI models...');
            // Wait for TFJS to be ready
            if (window.tf) await tf.ready();
            
            // Load MobileNet
            net = await mobilenet.load();
            
            isModelLoading = false;
            console.log('AI models loaded successfully.');
            
            // Update UI to show ready status
            if (dropZone.querySelector('p')) {
                dropZone.querySelector('p').textContent = '이미지를 업로드하세요 (AI 분석 준비 완료)';
            }
        } catch (err) {
            console.error('Model failed to load', err);
            isModelLoading = false;
            analysisContent.innerHTML = `<div class="placeholder-text" style="color: #ff4d4d;"><i class="fa-solid fa-circle-exclamation"></i> AI 모델 로딩 실패. 새로고침을 해주세요.</div>`;
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

    // --- AI Fashion Analysis Logic ---
    const analyzeImage = async (imgElement) => {
        analysisContent.innerHTML = `<div class="placeholder-text"><i class="fa-solid fa-spinner fa-spin"></i> AI 분석 중...</div>`;
        
        // Wait if model is still loading
        let attempts = 0;
        while (isModelLoading && attempts < 50) {
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }

        if (!net) {
            analysisContent.innerHTML = `<div class="placeholder-text"><i class="fa-solid fa-circle-exclamation"></i> 모델이 로드되지 않았습니다.</div>`;
            return;
        }

        try {
            const results = {
                category: 'Acc',
                name: '새로운 아이템',
                confidence: 0,
                tags: []
            };

            // 1. Local Analysis (MobileNet)
            const predictions = await net.classify(imgElement);
            if (predictions && predictions.length > 0) {
                const topResult = predictions[0];
                results.name = topResult.className.split(',')[0];
                results.confidence = Math.round(topResult.probability * 100);
                results.tags = predictions.slice(0, 3).map(p => p.className.split(',')[0]);

                // Mapping to categories
                const label = topResult.className.toLowerCase();
                if (label.includes('shirt') || label.includes('t-shirt') || label.includes('sweater') || label.includes('jersey') || label.includes('blouse') || label.includes('cardigan')) results.category = 'Top';
                else if (label.includes('jean') || label.includes('pant') || label.includes('short') || label.includes('skirt') || label.includes('trouser')) results.category = 'Bottom';
                else if (label.includes('coat') || label.includes('jacket') || label.includes('suit') || label.includes('parka')) results.category = 'Outer';
                else if (label.includes('dress') || label.includes('gown') || label.includes('robe')) results.category = 'Dress';
                else if (label.includes('shoe') || label.includes('sneaker') || label.includes('boot') || label.includes('sandal')) results.category = 'Shoes';
                else if (label.includes('hat') || label.includes('bag') || label.includes('watch') || label.includes('sunglass') || label.includes('scarf')) results.category = 'Acc';
            }

            // 2. Color Extraction
            const colors = extractColors(imgElement);
            
            // Update UI
            renderAnalysis(results, colors);
            
            // Auto-fill form
            categoryInput.value = results.category;
            nameInput.value = results.name;
            
        } catch (error) {
            console.error('Analysis Error:', error);
            analysisContent.innerHTML = `<div class="placeholder-text"><i class="fa-solid fa-circle-exclamation"></i> 분석 중 오류가 발생했습니다.</div>`;
        }
    };

    const renderAnalysis = (data, colors) => {
        analysisContent.innerHTML = `
            <div class="analysis-item">
                <span class="analysis-label">분석된 명칭</span>
                <span class="analysis-value">${data.name}</span>
            </div>
            <div class="analysis-item">
                <span class="analysis-label">카테고리 추정</span>
                <span class="analysis-value">${data.category}</span>
            </div>
            <div class="analysis-item">
                <span class="analysis-label">AI 신뢰도</span>
                <span class="analysis-value">${data.confidence}%</span>
            </div>
            <div class="analysis-item">
                <span class="analysis-label">주요 키워드</span>
                <span class="analysis-value" style="font-size: 0.75rem; text-align: right;">${data.tags.join(', ')}</span>
            </div>
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

    const extractColors = (img) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);
        
        const imageData = ctx.getImageData(0, 0, 100, 100).data;
        const colorCounts = {};
        
        for (let i = 0; i < imageData.length; i += 40) { // Step to speed up
            const r = imageData[i];
            const g = imageData[i+1];
            const b = imageData[i+2];
            
            // Quantize to reduce noise (group similar colors)
            const qr = Math.round(r / 10) * 10;
            const qg = Math.round(g / 10) * 10;
            const qb = Math.round(b / 10) * 10;
            
            const hex = `#${((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1)}`;
            colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
        
        return Object.keys(colorCounts)
            .sort((a, b) => colorCounts[b] - colorCounts[a])
            .slice(0, 5);
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
                // Show preview
                dropZone.innerHTML = `<img src="${e.target.result}" style="width:100%; height:100%; object-fit:contain; border-radius:8px;">`;
                // Start Analysis
                await analyzeImage(img);
            };
        };
        reader.readAsDataURL(file);
    };

    // --- Data Management ---
    const loadItems = () => {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        gallery.innerHTML = '';
        if (items.length === 0) {
            gallery.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 80px 40px; color: #999; border: 2px dashed var(--border-color); border-radius: 20px;">옷장이 비어있습니다. 사진을 업로드하여 채워보세요!</div>';
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

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const file = fileInput.files[0];
        if (!file && !dropZone.querySelector('img')) return alert('이미지를 업로드해주세요.');

        // If file exists, save it
        const currentImg = dropZone.querySelector('img');
        const newItemData = {
            id: Date.now(),
            name: nameInput.value,
            category: categoryInput.value,
            imageSrc: currentImg ? currentImg.src : ''
        };

        saveItem(newItemData);
        loadItems();
        form.reset();
        dropZone.innerHTML = `<i class="fa-solid fa-cloud-arrow-up"></i><p>이미지를 업로드하세요</p>`;
        analysisContent.innerHTML = `<div class="placeholder-text">이미지를 업로드하면 분석 결과가 여기에 표시됩니다.</div>`;
        colorPalette.innerHTML = '';
    });

    loadItems();
});
