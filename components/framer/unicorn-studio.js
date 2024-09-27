import { useEffect, useRef } from "react";
import { addPropertyControls, ControlType, RenderTarget } from "framer";

/**
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 * @framerIntrinsicHeight 400
 * @framerIntrinsicWidth 800
 */
export default function UnicornStudioEmbed(props) {
  const elementRef = useRef(null);

  useEffect(() => {
    const isEditingOrPreviewing = ["CANVAS", "PREVIEW"].includes(
      RenderTarget.current()
    );

    const initializeScript = (callback) => {
      const existingScript = document.querySelector(
        'script[src^="https://cdn.unicorn.studio"]'
      );
      if (!existingScript) {
        const script = document.createElement("script");
        script.src = "https://cdn.unicorn.studio/v1.3.1/unicornStudio.umd.js";
        script.onload = callback;
        document.head.appendChild(script);
      } else {
        callback();
      }
    };

    const initializeUnicornStudio = () => {
      const projectId = props.projectId.split("?")[0];
      const cacheBuster = isEditingOrPreviewing
        ? "?update=" + Math.random()
        : "";
      elementRef.current.setAttribute(
        "data-us-project",
        projectId + cacheBuster
      );

      if (window.UnicornStudio) {
        window.UnicornStudio.destroy();
        window.UnicornStudio.init().then((scenes) => {
          console.log(scenes);
        });
      }
    };

    if (props.projectId) {
      if (window.UnicornStudio) {
        initializeUnicornStudio();
      } else {
        initializeScript(initializeUnicornStudio);
      }
    }

    return () => {
      if (window.UnicornStudio) {
        window.UnicornStudio.destroy();
      }
    };
  }, [props.projectId]);

  return (
    <div
      ref={elementRef}
      data-us-dpi={props.dpi}
      data-us-scale={props.scale}
      data-us-fps={props.fps}
      data-us-altText={props.altText}
      data-us-ariaLabel={props.ariaLabel}
      data-us-lazyload={props.lazyLoad ? "true" : ""}
      style={{ width: "100%", height: "100%", ...props.style }}
    >
      {props.header && (
        <h1
          style={{
            width: "1px",
            height: "1px",
            margin: "-1px",
            padding: "0",
            overflow: "hidden",
            clip: "rect(0, 0, 0, 0)",
            border: "0",
          }}
        >
          {props.header}
        </h1>
      )}
    </div>
  );
}

UnicornStudioEmbed.displayName = "Unicorn Studio Embed";

addPropertyControls(UnicornStudioEmbed, {
  projectId: {
    type: ControlType.String,
    title: "Project ID",
  },
  scale: {
    type: ControlType.Number,
    title: "Scale",
    defaultValue: 1,
    min: 0.25,
    max: 1,
    step: 0.01,
  },
  dpi: {
    type: ControlType.Number,
    title: "DPI",
    defaultValue: 1.5,
    min: 0.5,
    max: 2,
    step: 0.1,
  },
  fps: {
    type: ControlType.Number,
    title: "FPS",
    defaultValue: 60,
    min: 10,
    max: 120,
    step: 5,
  },
  header: {
    type: ControlType.String,
    title: "H1 text",
  },
  altText: {
    type: ControlType.String,
    title: "Alt text",
  },
  ariaLabel: {
    type: ControlType.String,
    title: "Aria label",
  },
  lazyLoad: {
    type: ControlType.Boolean,
    title: "Lazy Load",
    defaultValue: false,
  },
});
