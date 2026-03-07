# **Project Blueprint: My Virtual Closet (AI Enhanced)**

## **1. Project Overview**
A modern, AI-powered digital closet application that allows users to upload, categorize, and manage their clothing items. The app uses machine learning to automatically suggest categories based on uploaded images.

## **2. Key Features**
- **AI-Powered Categorization:** Uses TensorFlow.js (MobileNet) to analyze uploaded images and suggest categories (Top, Bottom, Outer, etc.).
- **Digital Wardrobe Management:** Save items to local storage with names, categories, and images.
- **Responsive & Modern UI:** A "premium" minimalist design using CSS Container Queries and modern color spaces.
- **Dark/Light Mode:** Seamless theme switching.
- **Web Components:** Encapsulated UI elements for clean and maintainable code.
- **Firebase Deployment:** Hosted on Firebase for global access.

## **3. Technology Stack**
- **Frontend:** HTML5, CSS3 (Modern Baseline), Vanilla JavaScript (ES Modules).
- **AI/ML:** TensorFlow.js + MobileNet model.
- **Icons:** Font Awesome.
- **Fonts:** Pretendard (Korean optimized).
- **Storage:** Browser `localStorage`.
- **Hosting:** Firebase Hosting.

## **4. Planned Enhancements (Current Phase)**
- [ ] **AI Integration:** Add TensorFlow.js to `index.html` and implement classification logic in `main.js`.
- [ ] **Instant Preview:** Show the uploaded image immediately in the drop zone.
- [ ] **Auto-Categorization:** Automatically select the category dropdown based on AI results.
- [ ] **UI Polish:** Add subtle textures, better shadows, and improved layout responsiveness.
- [ ] **Firebase Setup:** Create `.idx/mcp.json` for Firebase tools and initialize hosting.

## **5. File Structure**
- `index.html`: Main structure and library imports.
- `main.js`: Application logic, Web Components, and AI integration.
- `style.css`: Modern, responsive styling.
- `GEMINI.md`: Development mandates.
- `blueprint.md`: Project documentation and roadmap.
