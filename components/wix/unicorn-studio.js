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

  // Ensure that the document head is available and then load the Unicorn Studio script
  loadUnicornStudioScript() {
    let version = "1.3.1";
    return new Promise((resolve, reject) => {
      console.log("Checking if Unicorn Studio script is already present...");
      const existingScript = document.querySelector(
        `script[src^="https://cdn.unicorn.studio/v${version}/unicornStudio.umd.js"]`
      );

      if (existingScript) {
        console.log("Unicorn Studio script already present.");
        if (window.UnicornStudio) {
          resolve();
        } else {
          existingScript.addEventListener("load", resolve);
          existingScript.addEventListener("error", reject);
        }
      } else {
        console.log(
          "Unicorn Studio script not found, adding new script to the document..."
        );

        const appendScriptToHead = () => {
          const script = document.createElement("script");
          script.src = `https://cdn.unicorn.studio/v${version}/unicornStudio.umd.js`;
          script.onload = () => {
            console.log("Unicorn Studio script loaded successfully.");
            resolve();
          };
          script.onerror = () => {
            console.error("Error loading Unicorn Studio script.");
            reject();
          };
          document.head.appendChild(script); // Append the script to the head
        };

        // Check if the head exists or if it's not ready, wait for the document to load
        if (document.head) {
          appendScriptToHead();
        } else {
          console.log(
            "Document head not available, waiting for DOM to load..."
          );
          document.addEventListener("DOMContentLoaded", appendScriptToHead);
        }
      }
    });
  }

  // Initialize the Unicorn Studio scene inside the custom element
  initializeUnicornStudio() {
    this.loadUnicornStudioScript()
      .then(() => {
        console.log("Attempting to initialize Unicorn Studio...");
        if (
          window.UnicornStudio &&
          typeof window.UnicornStudio.addScene === "function"
        ) {
          console.log(
            "Unicorn Studio is available and addScene is a function."
          );
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
          this.innerHTML = container;
          this.shadowRoot.appendChild(container);

          console.log(container);

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
