
# Blueprint: My Virtual Closet

## **Project Overview**

This project is a web application that allows users to create a digital version of their real-world closet. Users can upload photos of their clothing items, add details and descriptions, and view their entire collection in a visually appealing gallery. The goal is to provide a simple and intuitive way for users to manage and showcase their wardrobe.
## **Core Features & Design (v2)**

### **Layout & Style**

*   **Dark/Light Mode:** Added a theme toggle feature.
    *   **Default Theme:** Dark mode (for a premium look).
    *   **Light Mode:** Accessible via a sun/moon toggle button in the header.
    *   **Persistence:** Theme preference is saved in `localStorage`.
    *   **Component Sync:** The `<closet-item>` Web Component automatically syncs with the current theme using CSS variables.
*   **Responsive Design:** The application remains fully responsive.
...
*   **Modern Aesthetics:** It will feature a clean, modern design with a focus on visual balance and intuitive user experience.
*   **Color Palette:** A vibrant and energetic color palette will be used to create a welcoming look and feel.
*   **Typography:** Expressive typography will be used to create a clear visual hierarchy and emphasize key information.
*   **Visual Effects:** Subtle drop shadows and "glow" effects on interactive elements will be used to create a sense of depth and interactivity. A gentle noise texture will be applied to the background for a premium feel.
*   **Iconography:** Icons will be used to enhance understanding and navigation.

### **Functionality**

*   **Clothing Item Component (`<closet-item>`):**
    *   A Web Component will be used to display each clothing item.
    *   It will show the item's image, name, and category.
    *   The component will be encapsulated using the Shadow DOM.
*   **Image Upload Form:**
    *   A form will allow users to upload an image of a clothing item.
    *   Input fields will be provided for the item's name and category (e.g., shirt, pants, shoes).
*   **Data Persistence:**
    *   Uploaded clothing data (image as a data URL, name, category) will be saved to the browser's `localStorage`.
    *   This ensures that the user's closet persists even after they close the browser window.
*   **Closet Gallery:**
    *   Clothing items will be displayed in a responsive grid layout.

## **Current Task: Initial Build**

1.  **Update `index.html`:**
    *   Set up the basic page structure including a header, a main content area for the form and the gallery.
2.  **Update `style.css`:**
    *   Implement the modern design, including layout, colors, typography, and visual effects described above.
3.  **Update `main.js`:**
    *   Create the `<closet-item>` Web Component.
    *   Implement the logic for handling the image upload form.
    *   Implement saving to and loading from `localStorage`.
