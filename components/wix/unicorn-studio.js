class UnicornStudioEmbed extends HTMLElement {
  constructor() {
    super();
    // Attach Shadow DOM to encapsulate the component's style and behavior
    this.attachShadow({ mode: "open" });
  }

  // Called when the element is added to the DOM
  connectedCallback() {
    // Initialize the Unicorn Studio project when the element is added
    this.initializeUnicornStudio();
  }

  // Called when the element is removed from the DOM
  disconnectedCallback() {
    // Clean up by destroying the Unicorn Studio scene
    if (window.UnicornStudio) {
      window.UnicornStudio.destroy();
    }
  }

  // Load the Unicorn Studio script if it hasn't already been loaded
  loadUnicornStudioScript() {
    return new Promise((resolve, reject) => {
      // Check if the script is already in the document to prevent loading it multiple times
      const existingScript = document.querySelector(
        'script[src^="https://cdn.unicorn.studio"]'
      );
      if (existingScript) {
        resolve(); // Script already loaded, resolve immediately
      } else {
        // Create a new script element and load it
        const script = document.createElement("script");
        script.src = "https://cdn.unicorn.studio/v1.3.1/unicornStudio.umd.js";
        script.onload = resolve; // Resolve when script loads
        script.onerror = reject; // Reject if script fails to load
        document.head.appendChild(script); // Append the script to the head
      }
    });
  }

  // Initialize the Unicorn Studio scene inside the custom element
  initializeUnicornStudio() {
    // Load the Unicorn Studio script and initialize the scene once loaded
    this.loadUnicornStudioScript()
      .then(() => {
        // Get attributes or use default values if not provided
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
      })
      .catch((err) => {
        console.error("Error loading Unicorn Studio script:", err);
      });
  }
}

// Define the custom element
customElements.define("unicorn-studio-embed", UnicornStudioEmbed);
