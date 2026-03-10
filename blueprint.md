# **Project Blueprint: My Virtual Closet (AI Enhanced)**

## **1. Project Overview**
A modern, AI-powered digital closet application that allows users to upload, categorize, and manage their clothing items. The app uses advanced computer vision APIs to perform deep analysis of fashion items, including type, color, and style detection.

## **2. Key Features**
- **Advanced Fashion Analysis (API):** Integration with a specialized Fashion API (Clarifai/Hugging Face) to detect specific clothing details (e.g., sleeve length, neck type, material).
- **Auto-Color Extraction:** Analyzes the uploaded image to extract the dominant color palette and suggest matching colors.
- **Smart Categorization:** Automatically assigns categories and suggests descriptive names based on AI confidence.
- **Digital Wardrobe Management:** Save items to local storage with names, categories, and AI-generated metadata.
- **Premium UI/UX:** High-end aesthetic with glassmorphism, smooth micro-interactions, and responsive container queries.
- **Dark/Light Mode:** Seamless theme switching with persistent memory.
- **Web Components:** Encapsulated UI elements for a scalable architecture.

## **3. Technology Stack**
- **Frontend:** HTML5, CSS3 (Modern Baseline: :has(), Container Queries, OKLCH), Vanilla JS.
- **AI/ML (API):** Clarifai Fashion Model or Hugging Face Inference API.
- **AI/ML (Local):** TensorFlow.js (as fallback/preprocessing).
- **Icons:** Font Awesome 6.
- **Fonts:** Pretendard (Korean optimized).
- **Storage:** Browser `localStorage`.

## **4. Current Progress & Roadmap**
- [x] **Basic Structure:** HTML/CSS/JS scaffolding complete.
- [x] **Local AI:** MobileNet integration for basic categorization.
- [x] **AdSense Optimization:** Essential pages (About, Contact, Privacy, Terms) and professional footer added.
- [ ] **API Integration:** Connect to a specialized Fashion Analysis API for "Deep Analysis".
- [ ] **Color Palette:** Implement canvas-based color extraction.
- [ ] **UI/UX Enhancement:** Apply premium shadows, glassmorphism, and "Glow" effects.
- [ ] **Analysis Dashboard:** Add a dedicated UI to show detailed AI analysis results.

## **6. AdSense Compliance Features**
- **Navigation:** Clear header and footer navigation menus.
- **Essential Pages:**
    - `about.html`: Description of the service and mission.
    - `contact.html`: Contact form and contact information.
    - `privacy.html`: Data usage, cookies, and user privacy protection policy.
    - `terms.html`: Terms of service and usage guidelines.
- **SEO & Meta Tags:** Proper description, keywords, and Open Graph tags for better indexability.
- **Content-First Design:** Clear headings and readable text for better crawling.

## **5. File Structure**
- `index.html`: Entry point with library imports and UI structure.
- `main.js`: Core logic, API calls, and Web Component definitions.
- `style.css`: Advanced styling using modern CSS features.
- `GEMINI.md`: Development mandates.
- `blueprint.md`: Documentation and roadmap.
