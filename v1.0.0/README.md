# Embed your Unicorn Studio projects

## Include the script

Add the script tag to the `<head>` of your page
```html
<script src="https://cdn.unicorn.studio/v1/unicornStudio.umd.js"></script>
```

or import into your component
```js
import * as UnicornStudio from './path/to/unicornStudio.umd.js'
```

## Initialize your scene:

```html
<div class="unicorn-embed" id="unicorn"></div>
<script>
  UnicornStudio.addScene({
    elementId: 'unicorn', // id of the HTML element to render your scene in (the scene will use its dimensions)
    fps: 60, // frames per second (0-120) [optional]
    scale: 1, // rendering scale, use smaller values for performance boost (0.25-1) [optional]
    dpi: 1, // pixel ratio [optional]
    projectId: 'YOUR_PROJECT_EMBED_ID', // the id string for your embed (get this from "embed" export)
    interactivity: { // [optional]
      mouse: {
        disableMobile: true, // disable touch movement on mobile
        momentum: 1.1 // mouse movement momentum
      },
      scroll: {
        disableMobile: true, // disable scroll effects on mobile
        momentum: 1.1 // scroll momentum
      }
    }
  }).then(() => {
    // Scene is ready
  }).catch((err) => {
    console.error(err);
  });
</script>
```
Any values set in the UI will be overridden by values defined in the optional params. 

## Live example
https://codepen.io/georgehastings/pen/ExGrqMJ
