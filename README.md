# Embed your Unicorn Studio projects

## Include the script

Add the script tag to the `<head>` of your page
```html
<script src="https://cdn.unicorn.studio/v1.0.0/unicornStudio.umd.js"></script>
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
    // These params are required;
    elementId: 'unicorn', // id of the HTML element to render your scene in (the scene will use its dimensions)
    projectId: 'YOUR_PROJECT_EMBED_ID', // the id string for your embed (get this from "embed" export)

    // These params are optional;
    fps: 60, // frames per second (0-120)
    scale: 1, // rendering scale, use smaller values for performance boost (0.25-1)
    dpi: 1, // pixel ratio
    interactivity: {
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

## Tips
The `div` or element you attach your scene to should be empty and sized with CSS. One effective way to do this without setting hard coded values is with the `aspect-ratio` property. If your scene is 16:9, then use `aspect-ratio: 1.77`.

## Live example
https://codepen.io/georgehastings/pen/ExGrqMJ

