class UnicornStudioEmbed extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  // Called when the element is added to the DOM
  connectedCallback() {
    this.initializeUnicornStudio();
  }

  // Called when the element is removed from the DOM
  disconnectedCallback() {
    if (window.UnicornStudio) {
      window.UnicornStudio.destroy();
    }
  }

  // Load the Unicorn Studio script if it hasn't already been loaded
  loadUnicornStudioScript() {
    return new Promise((resolve, reject) => {
      const existingScript = document.querySelector(
        'script[src^="https://cdn.unicorn.studio"]'
      );
      if (existingScript) {
        // If the script is present, but UnicornStudio is not ready, wait for the script to finish loading
        if (window.UnicornStudio) {
          resolve();
        } else {
          existingScript.addEventListener("load", resolve);
          existingScript.addEventListener("error", reject);
        }
      } else {
        const script = document.createElement("script");
        script.src = "https://cdn.unicorn.studio/v1.3.1/unicornStudio.umd.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      }
    });
  }

  // Initialize the Unicorn Studio scene inside the custom element
  initializeUnicornStudio() {
    this.loadUnicornStudioScript()
      .then(() => {
        // Check if UnicornStudio is available after the script loads
        if (
          window.UnicornStudio &&
          typeof window.UnicornStudio.addScene === "function"
        ) {
          const projectId =
            this.getAttribute("project-id") || "YOUR_PROJECT_EMBED_ID";
          const dpi = this.getAttribute("dpi") || 1.5;
          const scale = this.getAttribute("scale") || 1;
          const lazyLoad = this.getAttribute("lazy-load") === "true";
          const altText =
            this.getAttribute("alt-text") || "Welcome to Unicorn Studio";
          const ariaLabel =
            this.getAttribute("aria-label") || "This is a canvas scene";

          // Create a div container for the Unicorn scene and append it to the Shadow DOM
          const container = document.createElement("div");
          container.classList.add("unicorn-embed");
          container.style.width = "100%";
          container.style.height = "100%";
          this.shadowRoot.appendChild(container);

          // Initialize the Unicorn Studio scene with the specified options
          UnicornStudio.addScene({
            elementId: container, // Element in which to render the scene
            projectId, // Project ID from attribute
            dpi, // DPI setting
            scale, // Scale setting
            lazyLoad, // Lazy load option
            altText, // Alt text for SEO
            ariaLabel, // Aria label for accessibility
          })
            .then((scene) => {
              console.log("Unicorn Studio scene loaded:", scene);
            })
            .catch((err) => {
              console.error("Error loading Unicorn Studio scene:", err);
            });
        } else {
          console.error(
            "Unicorn Studio is not available or addScene is not a function"
          );
        }
      })
      .catch((err) => {
        console.error("Error loading Unicorn Studio script:", err);
      });
  }
}

// Define the custom element
customElements.define("unicorn-studio-embed", UnicornStudioEmbed);
