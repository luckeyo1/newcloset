
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
                }
                .card {
                    background-color: var(--surface-color, oklch(35% 0.05 240));
                    border-radius: 12px;
                    box-shadow: 0 8px 25px var(--shadow-color, oklch(20% 0.05 240 / 40%));
                    overflow: hidden;
                    transition: all 0.3s ease;
                    cursor: pointer;
                    border: 1px solid var(--primary-color, transparent);
                }
                .card:hover {
                    transform: translateY(-5px) scale(1.02);
                    box-shadow: 0 12px 35px var(--glow-color, oklch(20% 0.05 240 / 60%));
                }
                .card-image {
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                    display: block;
                }
                .card-content {
                    padding: 1rem;
                }
                .card-name {
                    font-size: 1.1rem;
                    font-weight: bold;
                    margin: 0 0 0.5rem 0;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    color: var(--text-color, oklch(98% 0.01 240));
                }
                .card-category {
                    font-size: 0.9rem;
                    color: var(--secondary-color, oklch(75% 0.2 240));
                    background-color: var(--background-color, oklch(25% 0.05 240 / 80%));
                    padding: 0.25rem 0.5rem;
                    border-radius: 6px;
                    display: inline-block;
                }
            </style>
            <div class="card">
                <img src="${imageSrc}" alt="${name}" class="card-image">
                <div class="card-content">
                    <h3 class="card-name">${name}</h3>
                    <p class="card-category">${category}</p>
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
    const STORAGE_KEY = 'virtualClosetItems';
    const THEME_KEY = 'closetTheme';

    // --- 0. Theme Handling ---
    const initTheme = () => {
        const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
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

    // --- 1. Load existing items from localStorage ---
    const loadItems = () => {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        gallery.innerHTML = ''; // Clear gallery before loading
        if (items.length === 0) {
            gallery.innerHTML = '<p style="color: oklch(75% 0.2 240);">Your closet is empty. Add your first item!</p>';
        }
        items.forEach(itemData => {
            const itemElement = createClosetItem(itemData);
            gallery.appendChild(itemElement);
        });
    };

    // --- 2. Handle form submission ---
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const nameInput = document.getElementById('item-name');
        const categoryInput = document.getElementById('item-category');
        const imageInput = document.getElementById('item-image');

        const file = imageInput.files[0];
        if (!file) {
            alert('Please select an image file.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            const newItemData = {
                id: Date.now(), // Simple unique ID
                name: nameInput.value,
                category: categoryInput.value,
                imageSrc: reader.result // Base64 encoded image string
            };

            saveItem(newItemData);
            const newItemElement = createClosetItem(newItemData);
            
            // If it was the first item, remove the "empty" message
            if (gallery.querySelector('p')) {
                gallery.innerHTML = '';
            }
            gallery.appendChild(newItemElement);

            form.reset();
        };
        reader.readAsDataURL(file);
    });

    // --- 3. Helper to create a <closet-item> element ---
    const createClosetItem = (itemData) => {
        const item = document.createElement('closet-item');
        item.setAttribute('name', itemData.name);
        item.setAttribute('category', itemData.category);
        item.setAttribute('image-src', itemData.imageSrc);
        item.dataset.id = itemData.id;
        return item;
    };

    // --- 4. Helper to save an item to localStorage ---
    const saveItem = (itemData) => {
        const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        items.push(itemData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    };

    // --- Initial Load ---
    loadItems();
});
