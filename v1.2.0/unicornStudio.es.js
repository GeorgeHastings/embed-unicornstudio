var Ce = Object.defineProperty;
var Ie = (n, e, t) => e in n ? Ce(n, e, { enumerable: !0, configurable: !0, writable: !0, value: t }) : n[e] = t;
var z = (n, e, t) => (Ie(n, typeof e != "symbol" ? e + "" : e, t), t);
let re = 0;
function g() {
  if (!(re > 100)) {
    if (re === 100)
      console.warn("Curtains: too many warnings thrown, stop logging.");
    else {
      const n = Array.prototype.slice.call(arguments);
      console.warn.apply(console, n);
    }
    re++;
  }
}
function O() {
  const n = Array.prototype.slice.call(arguments);
  console.error.apply(console, n);
}
function he() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (n) => {
    let e = Math.random() * 16 | 0;
    return (n === "x" ? e : e & 3 | 8).toString(16).toUpperCase();
  });
}
function N(n) {
  return (n & n - 1) === 0;
}
function De(n, e, t) {
  return (1 - t) * n + t * e;
}
let Oe = class {
  constructor(e) {
    if (this.type = "Scene", !e || e.type !== "Renderer")
      O(this.type + ": Renderer not passed as first argument", e);
    else if (!e.gl) {
      O(this.type + ": Renderer WebGL context is undefined", e);
      return;
    }
    this.renderer = e, this.gl = e.gl, this.initStacks();
  }
  /***
   Init our Scene stacks object
   ***/
  initStacks() {
    this.stacks = {
      // planes
      pingPong: [],
      renderTargets: [],
      opaque: [],
      transparent: [],
      // post processing
      renderPasses: [],
      scenePasses: []
    };
  }
  /*** RESET STACKS ***/
  /***
   Reset the plane stacks (used when disposing a plane)
   ***/
  resetPlaneStacks() {
    this.stacks.pingPong = [], this.stacks.renderTargets = [], this.stacks.opaque = [], this.stacks.transparent = [];
    for (let e = 0; e < this.renderer.planes.length; e++)
      this.addPlane(this.renderer.planes[e]);
  }
  /***
   Reset the shader pass stacks (used when disposing a shader pass)
   ***/
  resetShaderPassStacks() {
    this.stacks.scenePasses = [], this.stacks.renderPasses = [];
    for (let e = 0; e < this.renderer.shaderPasses.length; e++)
      this.renderer.shaderPasses[e].index = e, this.renderer.shaderPasses[e]._isScenePass ? this.stacks.scenePasses.push(this.renderer.shaderPasses[e]) : this.stacks.renderPasses.push(this.renderer.shaderPasses[e]);
    this.stacks.scenePasses.length === 0 && (this.renderer.state.scenePassIndex = null);
  }
  /*** ADDING PLANES ***/
  /***
       Add a plane to our renderTargets stack
  
       params:
       @plane (Plane object): plane to add to our stack
       ***/
  addToRenderTargetsStack(e) {
    const t = this.renderer.planes.filter((i) => i.type !== "PingPongPlane" && i.target && i.uuid !== e.uuid);
    let s = -1;
    if (e.target._depth) {
      for (let i = t.length - 1; i >= 0; i--)
        if (t[i].target.uuid === e.target.uuid) {
          s = i + 1;
          break;
        }
    } else
      s = t.findIndex((i) => i.target.uuid === e.target.uuid);
    s = Math.max(0, s), t.splice(s, 0, e), e.target._depth ? (t.sort((i, r) => i.index - r.index), t.sort((i, r) => r.renderOrder - i.renderOrder)) : (t.sort((i, r) => r.index - i.index), t.sort((i, r) => i.renderOrder - r.renderOrder)), t.sort((i, r) => i.target.index - r.target.index), this.stacks.renderTargets = t;
  }
  /***
       Rebuilds our regular stack (transparent or opaque) with our plane added, geometry IDs and then indexes (first added first drawn)
  
       params:
       @plane (Plane object): plane to add to our stack
  
       returns:
       @planeStack (array): our transparent or opaque stack ready to be applied custom sorting filter
       ***/
  addToRegularPlaneStack(e) {
    const t = this.renderer.planes.filter((i) => i.type !== "PingPongPlane" && !i.target && i._transparent === e._transparent && i.uuid !== e.uuid);
    let s = -1;
    for (let i = t.length - 1; i >= 0; i--)
      if (t[i]._geometry.definition.id === e._geometry.definition.id) {
        s = i + 1;
        break;
      }
    return s = Math.max(0, s), t.splice(s, 0, e), t.sort((i, r) => i.index - r.index), t;
  }
  /***
       This function will add a plane into one of our 4 stacks : pingPong, renderTargets, transparent and opaque
       - pingPong is just a simple array (ordered by order of creation)
       - renderTargets array is ordered by render target creation order, planes renderOrder value and then planes indexes (order of creation)
       - transparent array is ordered by renderOrder, Z positions, geometry IDs and then indexes (first added first drawn)
       - opaque array is ordered by renderOrder, geometry IDs and then indexes (first added first drawn)
  
       This is done to improve speed and reduce GL calls
  
       params:
       @plane (Plane object): plane to add to our scene
       ***/
  addPlane(e) {
    if (e.type === "PingPongPlane")
      this.stacks.pingPong.push(e);
    else if (e.target)
      this.addToRenderTargetsStack(e);
    else if (e._transparent) {
      const t = this.addToRegularPlaneStack(e);
      t.sort((s, i) => i.relativeTranslation.z - s.relativeTranslation.z), t.sort((s, i) => i.renderOrder - s.renderOrder), this.stacks.transparent = t;
    } else {
      const t = this.addToRegularPlaneStack(e);
      t.sort((s, i) => i.renderOrder - s.renderOrder), this.stacks.opaque = t;
    }
  }
  /***
       This function will remove a plane from our scene. This just reset the plane stacks for now.
       Useful if we'd want to change the way our draw stacks work and keep the logic separated from our renderer
  
       params:
       @plane (Plane object): plane to remove from our scene
       ***/
  removePlane(e) {
    e.type === "PingPongPlane" ? this.stacks.pingPong = this.stacks.pingPong.filter((t) => t.uuid !== e.uuid) : e.target ? this.stacks.renderTargets = this.stacks.renderTargets.filter((t) => t.uuid !== e.uuid) : e._transparent ? this.stacks.transparent = this.stacks.transparent.filter((t) => t.uuid !== e.uuid) : this.stacks.opaque = this.stacks.opaque.filter((t) => t.uuid !== e.uuid);
  }
  /***
       Changing the position of a plane inside the correct plane stack to render it on above or behind the other planes
  
       params:
       @plane (Plane object): the plane that had its renderOrder property updated
       ***/
  setPlaneRenderOrder(e) {
    if (e.type === "ShaderPass")
      this.sortShaderPassStack(e._isScenePass ? this.stacks.scenePasses : this.stacks.renderPasses);
    else if (e.type === "PingPongPlane")
      return;
    if (e.target)
      e.target._depth ? (this.stacks.renderTargets.sort((t, s) => t.index - s.index), this.stacks.renderTargets.sort((t, s) => s.renderOrder - t.renderOrder)) : (this.stacks.renderTargets.sort((t, s) => s.index - t.index), this.stacks.renderTargets.sort((t, s) => t.renderOrder - s.renderOrder)), this.stacks.renderTargets.sort((t, s) => t.target.index - s.target.index);
    else {
      const t = e._transparent ? this.stacks.transparent : this.stacks.opaque, s = this.stacks.scenePasses.find((i, r) => i._isScenePass && !i._depth && r === 0);
      !this.renderer.depth || s ? (t.sort((i, r) => r.index - i.index), e._transparent && t.sort((i, r) => i.relativeTranslation.z - r.relativeTranslation.z), t.sort((i, r) => i.renderOrder - r.renderOrder)) : (t.sort((i, r) => i.index - r.index), e._transparent && t.sort((i, r) => r.relativeTranslation.z - i.relativeTranslation.z), t.sort((i, r) => r.renderOrder - i.renderOrder));
    }
  }
  /*** ADDING POST PROCESSING ***/
  /***
       Add a shader pass to the stack
  
       params:
       @shaderPass (ShaderPass object): shaderPass to add to our scene
       ***/
  addShaderPass(e) {
    e._isScenePass ? (this.stacks.scenePasses.push(e), this.sortShaderPassStack(this.stacks.scenePasses)) : (this.stacks.renderPasses.push(e), this.sortShaderPassStack(this.stacks.renderPasses));
  }
  /***
       This function will remove a shader pass from our scene. This just reset the shaderPass stacks for now.
       Useful if we'd want to change the way our draw stacks work and keep the logic separated from our renderer
  
       params:
       @shaderPass (ShaderPass object): shader pass to remove from our scene
       ***/
  removeShaderPass(e) {
    this.resetShaderPassStacks();
  }
  /***
       Sorts the shader pass stack by index then by renderOrder property
  
       params:
       @passStack (array): which shader pass stack (scenePasses or renderPasses) to sort
       ***/
  sortShaderPassStack(e) {
    e.sort((t, s) => t.index - s.index), e.sort((t, s) => t.renderOrder - s.renderOrder);
  }
  /*** DRAWING SCENE ***/
  /***
   Enable the first Shader pass scene pass
   ***/
  enableShaderPass() {
    this.stacks.scenePasses.length && this.stacks.renderPasses.length === 0 && this.renderer.planes.length && (this.renderer.state.scenePassIndex = 0, this.renderer.bindFrameBuffer(this.stacks.scenePasses[0].target));
  }
  /***
   Draw the render passes
   ***/
  drawRenderPasses() {
    this.stacks.scenePasses.length && this.stacks.renderPasses.length && this.renderer.planes.length && (this.renderer.state.scenePassIndex = 0, this.renderer.bindFrameBuffer(this.stacks.scenePasses[0].target));
    for (let e = 0; e < this.stacks.renderPasses.length; e++)
      this.stacks.renderPasses[e]._startDrawing(), this.renderer.clearDepth();
  }
  /***
   Draw the scene passes
   ***/
  drawScenePasses() {
    for (let e = 0; e < this.stacks.scenePasses.length; e++)
      this.stacks.scenePasses[e]._startDrawing();
  }
  /***
   Loop through the special ping pong planes stack and draw its planes
   ***/
  drawPingPongStack() {
    for (let e = 0; e < this.stacks.pingPong.length; e++) {
      const t = this.stacks.pingPong[e];
      t && t._startDrawing();
    }
  }
  /***
   Loop through one of our stack (renderTargets, opaque or transparent objects) and draw its planes
   ***/
  drawStack(e) {
    for (let t = 0; t < this.stacks[e].length; t++) {
      const s = this.stacks[e][t];
      s && s._startDrawing();
    }
  }
  /***
   Draw our scene content
   ***/
  draw() {
    this.drawPingPongStack(), this.enableShaderPass(), this.drawStack("renderTargets"), this.drawRenderPasses(), this.renderer.setBlending(!1), this.drawStack("opaque"), this.stacks.transparent.length && (this.renderer.setBlending(!0), this.drawStack("transparent")), this.drawScenePasses();
  }
};
class Le {
  constructor() {
    this.geometries = [], this.clear();
  }
  /***
   Clear WebGL context depending cache arrays (used on init and context restoration)
   ***/
  clear() {
    this.textures = [], this.programs = [];
  }
  /*** GEOMETRIES ***/
  /***
       Check if this geometry is already in our cached geometries array
  
       params:
       @definitionID (integer): the geometry ID
       ***/
  getGeometryFromID(e) {
    return this.geometries.find((t) => t.id === e);
  }
  /***
       Add a geometry to our cache if not already in it
  
       params:
       @definitionID  (integer): the geometry ID to add to our cache
       @vertices (array): vertices coordinates array to add to our cache
       @uvs (array): uvs coordinates array to add to our cache
       ***/
  addGeometry(e, t, s) {
    this.geometries.push({
      id: e,
      vertices: t,
      uvs: s
    });
  }
  /*** PROGRAMS ***/
  /***
       Compare two shaders strings to detect whether they are equal or not
  
       params:
       @firstShader (string): shader code
       @secondShader (string): shader code
  
       returns:
       @isSameShader (bool): whether both shaders are equal or not
       ***/
  isSameShader(e, t) {
    return e.localeCompare(t) === 0;
  }
  /***
       Returns a program from our cache if this program's vertex and fragment shaders code are the same as the one provided
  
       params:
       @vsCode (string): vertex shader code
       @fsCode (string): fragment shader code
  
       returns:
       @program (Program class object or null): our program if it has been found
       ***/
  getProgramFromShaders(e, t) {
    return this.programs.find((s) => this.isSameShader(s.vsCode, e) && this.isSameShader(s.fsCode, t));
  }
  /***
       Add a program to our cache
  
       params :
       @program (Program class object) : program to add to our cache
       ***/
  addProgram(e) {
    this.programs.push(e);
  }
  /*** TEXTURES ***/
  /***
       Check if this source is already in our cached textures array
  
       params :
       @source (HTML element) : html image, video or canvas element (only images for now)
       ***/
  getTextureFromSource(e) {
    const t = typeof e == "string" ? e : e.src;
    return this.textures.find((s) => s.source && s.source.src === t);
  }
  /***
       Add a texture to our cache if not already in it
  
       params :
       @texture (Texture class object) : texture to add to our cache
       ***/
  addTexture(e) {
    this.getTextureFromSource(e.source) || this.textures.push(e);
  }
  /***
       Removes a texture from the cache array
  
       params :
       @texture (Texture class object) : texture to remove from our cache
       ***/
  removeTexture(e) {
    this.textures = this.textures.filter((t) => t.uuid !== e.uuid);
  }
}
class ze {
  constructor() {
    this.clear();
  }
  /***
   Clears our queue array (used on init)
   ***/
  clear() {
    this.queue = [];
  }
  /***
       Adds a callback to our queue list with a timeout of 0
  
       params:
       @callback (function): the callback to execute on next render call
       @keep (bool): whether to keep calling that callback on each rendering call or not (act as a setInterval). Default to false
  
       returns:
       @queueItem: the queue item. Allows to keep a track of it and set its keep property to false when needed
       ***/
  add(e, t = !1) {
    const s = {
      callback: e,
      keep: t,
      timeout: null
      // keep a reference to the timeout so we can safely delete if afterwards
    };
    return s.timeout = setTimeout(() => {
      this.queue.push(s);
    }, 0), s;
  }
  /***
   Executes all callbacks in the queue and remove the ones that have their keep property set to false.
   Called at the beginning of each render call
   ***/
  execute() {
    this.queue.map((e) => {
      e.callback && e.callback(), clearTimeout(this.queue.timeout);
    }), this.queue = this.queue.filter((e) => e.keep);
  }
}
class ke {
  constructor({
    // inherited from Curtains class object
    alpha: e,
    antialias: t,
    premultipliedAlpha: s,
    depth: i,
    failIfMajorPerformanceCaveat: r,
    preserveDrawingBuffer: a,
    stencil: h,
    container: o,
    pixelRatio: l,
    renderingScale: d,
    production: c,
    // callbacks passed by the Curtains class object on instantiation
    onError: u,
    onSuccess: f,
    onContextLost: y,
    onContextRestored: _,
    onDisposed: v,
    onSceneChange: x
  }) {
    this.type = "Renderer", this.alpha = e, this.antialias = t, this.premultipliedAlpha = s, this.depth = i, this.failIfMajorPerformanceCaveat = r, this.preserveDrawingBuffer = a, this.stencil = h, this.container = o, this.pixelRatio = l, this._renderingScale = d, this.production = c, this.onError = u, this.onSuccess = f, this.onContextLost = y, this.onContextRestored = _, this.onDisposed = v, this.onSceneChange = x, this.initState(), this.canvas = document.createElement("canvas");
    const p = {
      alpha: this.alpha,
      premultipliedAlpha: this.premultipliedAlpha,
      antialias: this.antialias,
      depth: this.depth,
      failIfMajorPerformanceCaveat: this.failIfMajorPerformanceCaveat,
      preserveDrawingBuffer: this.preserveDrawingBuffer,
      stencil: this.stencil
    };
    if (this.gl = this.canvas.getContext("webgl2", p), this._isWebGL2 = !!this.gl, this.gl || (this.gl = this.canvas.getContext("webgl", p) || this.canvas.getContext("experimental-webgl", p)), this.gl)
      this.onSuccess && this.onSuccess();
    else {
      this.production || g(this.type + ": WebGL context could not be created"), this.state.isActive = !1, this.onError && this.onError();
      return;
    }
    this.initRenderer();
  }
  /***
   Set/reset our context state object
   ***/
  initState() {
    this.state = {
      // if we are currently rendering
      isActive: !0,
      isContextLost: !0,
      drawingEnabled: !0,
      forceRender: !1,
      // current program ID
      currentProgramID: null,
      // current geometry drawn
      currentGeometryID: null,
      // whether we should force buffer bindings update
      forceBufferUpdate: !1,
      // if we're using depth test or not
      depthTest: null,
      // blending
      blending: null,
      // face culling
      cullFace: null,
      // current frame buffer ID
      frameBufferID: null,
      // current scene pass ID
      scenePassIndex: null,
      // textures
      activeTexture: null,
      unpackAlignment: null,
      flipY: null,
      premultiplyAlpha: null
    };
  }
  /***
   Add a callback queueing manager (execute functions on the next render call, see CallbackQueueManager class object)
   ***/
  initCallbackQueueManager() {
    this.nextRender = new ze();
  }
  /***
   Init our renderer
   ***/
  initRenderer() {
    this.planes = [], this.renderTargets = [], this.shaderPasses = [], this.state.isContextLost = !1, this.state.maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE), this.initCallbackQueueManager(), this.setBlendFunc(), this.setDepthFunc(), this.setDepthTest(!0), this.cache = new Le(), this.scene = new Oe(this), this.getExtensions(), this._contextLostHandler = this.contextLost.bind(this), this.canvas.addEventListener("webglcontextlost", this._contextLostHandler, !1), this._contextRestoredHandler = this.contextRestored.bind(this), this.canvas.addEventListener("webglcontextrestored", this._contextRestoredHandler, !1);
  }
  /***
   Get all available WebGL extensions based on WebGL used version
   Called on init and on context restoration
   ***/
  getExtensions() {
    this.extensions = [], this._isWebGL2 ? (this.extensions.EXT_color_buffer_float = this.gl.getExtension("EXT_color_buffer_float"), this.extensions.OES_texture_float_linear = this.gl.getExtension("OES_texture_float_linear"), this.extensions.EXT_texture_filter_anisotropic = this.gl.getExtension("EXT_texture_filter_anisotropic"), this.extensions.WEBGL_lose_context = this.gl.getExtension("WEBGL_lose_context")) : (this.extensions.OES_vertex_array_object = this.gl.getExtension("OES_vertex_array_object"), this.extensions.OES_texture_float = this.gl.getExtension("OES_texture_float"), this.extensions.OES_texture_float_linear = this.gl.getExtension("OES_texture_float_linear"), this.extensions.OES_texture_half_float = this.gl.getExtension("OES_texture_half_float"), this.extensions.OES_texture_half_float_linear = this.gl.getExtension("OES_texture_half_float_linear"), this.extensions.EXT_texture_filter_anisotropic = this.gl.getExtension("EXT_texture_filter_anisotropic"), this.extensions.OES_element_index_uint = this.gl.getExtension("OES_element_index_uint"), this.extensions.OES_standard_derivatives = this.gl.getExtension("OES_standard_derivatives"), this.extensions.EXT_sRGB = this.gl.getExtension("EXT_sRGB"), this.extensions.WEBGL_depth_texture = this.gl.getExtension("WEBGL_depth_texture"), this.extensions.WEBGL_draw_buffers = this.gl.getExtension("WEBGL_draw_buffers"), this.extensions.WEBGL_lose_context = this.gl.getExtension("WEBGL_lose_context"));
  }
  /*** HANDLING CONTEXT LOST/RESTORE ***/
  /***
   Called when the WebGL context is lost
   ***/
  contextLost(e) {
    this.state.isContextLost = !0, this.state.isActive && (e.preventDefault(), this.nextRender.add(() => this.onContextLost && this.onContextLost()));
  }
  /***
   Call this method to restore your context
   ***/
  restoreContext() {
    this.state.isActive && (this.initState(), this.gl && this.extensions.WEBGL_lose_context ? this.extensions.WEBGL_lose_context.restoreContext() : (!this.gl && !this.production ? g(this.type + ": Could not restore the context because the context is not defined") : !this.extensions.WEBGL_lose_context && !this.production && g(this.type + ": Could not restore the context because the restore context extension is not defined"), this.onError && this.onError()));
  }
  /***
       Check that all objects and textures have been restored
  
       returns:
       @isRestored (bool): whether everything has been restored or not
       ***/
  isContextexFullyRestored() {
    let e = !0;
    for (let t = 0; t < this.renderTargets.length; t++) {
      this.renderTargets[t].textures[0]._canDraw || (e = !1);
      break;
    }
    if (e)
      for (let t = 0; t < this.planes.length; t++)
        if (this.planes[t]._canDraw) {
          for (let s = 0; s < this.planes[t].textures.length; s++)
            if (!this.planes[t].textures[s]._canDraw) {
              e = !1;
              break;
            }
        } else {
          e = !1;
          break;
        }
    if (e)
      for (let t = 0; t < this.shaderPasses.length; t++)
        if (this.shaderPasses[t]._canDraw) {
          for (let s = 0; s < this.shaderPasses[t].textures.length; s++)
            if (!this.shaderPasses[t].textures[s]._canDraw) {
              e = !1;
              break;
            }
        } else {
          e = !1;
          break;
        }
    return e;
  }
  /***
   Called when the WebGL context is restored
   ***/
  contextRestored() {
    this.getExtensions(), this.setBlendFunc(), this.setDepthFunc(), this.setDepthTest(!0), this.cache.clear(), this.scene.initStacks();
    for (let t = 0; t < this.renderTargets.length; t++)
      this.renderTargets[t]._restoreContext();
    for (let t = 0; t < this.planes.length; t++)
      this.planes[t]._restoreContext();
    for (let t = 0; t < this.shaderPasses.length; t++)
      this.shaderPasses[t]._restoreContext();
    const e = this.nextRender.add(() => {
      this.isContextexFullyRestored() && (e.keep = !1, this.state.isContextLost = !1, this.onContextRestored && this.onContextRestored(), this.onSceneChange(), this.needRender());
    }, !0);
  }
  /*** SIZING ***/
  /***
   Updates pixelRatio property
   ***/
  setPixelRatio(e) {
    this.pixelRatio = e;
  }
  /***
   Set/reset container sizes and WebGL viewport sizes
   ***/
  setSize() {
    if (!this.gl)
      return;
    const e = this.container.getBoundingClientRect();
    this._boundingRect = {
      width: e.width * this.pixelRatio,
      height: e.height * this.pixelRatio,
      top: e.top * this.pixelRatio,
      left: e.left * this.pixelRatio
    };
    const t = !!navigator.userAgent.match(/Version\/[\d\.]+.*Safari/), s = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (t && s) {
      let i = function(r) {
        let a = 0;
        for (; r && !isNaN(r.offsetTop); )
          a += r.offsetTop - r.scrollTop, r = r.offsetParent;
        return a;
      };
      this._boundingRect.top = i(this.container) * this.pixelRatio;
    }
    this.canvas.style.width = Math.floor(this._boundingRect.width / this.pixelRatio) + "px", this.canvas.style.height = Math.floor(this._boundingRect.height / this.pixelRatio) + "px", this.canvas.width = Math.floor(this._boundingRect.width * this._renderingScale), this.canvas.height = Math.floor(this._boundingRect.height * this._renderingScale), this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight);
  }
  /***
   Resize all our elements: planes, shader passes and render targets
   Their textures will be resized as well
   ***/
  resize() {
    for (let e = 0; e < this.planes.length; e++)
      this.planes[e]._canDraw && this.planes[e].resize();
    for (let e = 0; e < this.shaderPasses.length; e++)
      this.shaderPasses[e]._canDraw && this.shaderPasses[e].resize();
    for (let e = 0; e < this.renderTargets.length; e++)
      this.renderTargets[e].resize();
    this.needRender();
  }
  /*** CLEAR SCENE ***/
  /***
   Clear our WebGL scene colors and depth
   ***/
  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);
  }
  /***
   Clear our WebGL scene depth
   ***/
  clearDepth() {
    this.gl.clear(this.gl.DEPTH_BUFFER_BIT);
  }
  /***
   Clear our WebGL scene colors and depth
   ***/
  clearColor() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }
  /*** FRAME BUFFER OBJECTS ***/
  /***
       Called to bind or unbind a FBO
  
       params:
       @frameBuffer (frameBuffer): if frameBuffer is not null, bind it, unbind it otherwise
       @cancelClear (bool / undefined): if we should cancel clearing the frame buffer (typically on init & resize)
       ***/
  bindFrameBuffer(e, t) {
    let s = null;
    e ? (s = e.index, s !== this.state.frameBufferID && (this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, e._frameBuffer), this.gl.viewport(0, 0, e._size.width, e._size.height), e._shouldClear && !t && this.clear())) : this.state.frameBufferID !== null && (this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null), this.gl.viewport(0, 0, this.gl.drawingBufferWidth, this.gl.drawingBufferHeight)), this.state.frameBufferID = s;
  }
  /*** DEPTH ***/
  /***
       Called to set whether the renderer will handle depth test or not
       Depth test is enabled by default
  
       params:
       @setDepth (boolean): if we should enable or disable the depth test
       ***/
  setDepthTest(e) {
    e && !this.state.depthTest ? (this.state.depthTest = e, this.gl.enable(this.gl.DEPTH_TEST)) : !e && this.state.depthTest && (this.state.depthTest = e, this.gl.disable(this.gl.DEPTH_TEST));
  }
  /***
   Called to set the depth buffer behavior
   Only available option is gl.LEQUAL at the moment
   (see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/depthFunc)
   ***/
  setDepthFunc() {
    this.gl.depthFunc(this.gl.LEQUAL);
  }
  /*** BLENDING ***/
  /***
       Whether we should enable or disable the blending state
       Used to draw transparent planes
  
       params:
       @enableBlending (boolean): if we should enable or disable the blending (default to false)
       ***/
  setBlending(e = !1) {
    e && !this.state.blending ? (this.state.blending = e, this.gl.enable(this.gl.BLEND)) : !e && this.state.blending && (this.state.blending = e, this.gl.disable(this.gl.BLEND));
  }
  /***
   Called to set the blending function (transparency)
   ***/
  setBlendFunc() {
    this.gl.enable(this.gl.BLEND), this.premultipliedAlpha ? this.gl.blendFuncSeparate(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA) : this.gl.blendFuncSeparate(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA, this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);
  }
  /*** FACE CULLING ***/
  /***
       Called to set whether we should cull an object face or not
  
       params:
       @cullFace (boolean): what face we should cull
       ***/
  setFaceCulling(e) {
    if (this.state.cullFace !== e)
      if (this.state.cullFace = e, e === "none")
        this.gl.disable(this.gl.CULL_FACE);
      else {
        const t = e === "front" ? this.gl.FRONT : this.gl.BACK;
        this.gl.enable(this.gl.CULL_FACE), this.gl.cullFace(t);
      }
  }
  /***
       Tell WebGL to use the specified program if it's not already in use
  
       params:
       @program (object): a program object
       ***/
  useProgram(e) {
    (this.state.currentProgramID === null || this.state.currentProgramID !== e.id) && (this.gl.useProgram(e.program), this.state.currentProgramID = e.id);
  }
  /*** PLANES ***/
  /***
       Removes a Plane element (that has already been disposed) from the scene and the planes array
  
       params:
       @plane (Plane object): the plane to remove
       ***/
  removePlane(e) {
    this.gl && (this.planes = this.planes.filter((t) => t.uuid !== e.uuid), this.scene.removePlane(e), e = null, this.gl && this.clear(), this.onSceneChange());
  }
  /*** POST PROCESSING ***/
  /***
       Completely remove a RenderTarget element
  
       params:
       @renderTarget (RenderTarget object): the render target to remove
       ***/
  removeRenderTarget(e) {
    if (!this.gl)
      return;
    let t = this.planes.find((s) => s.type !== "PingPongPlane" && s.target && s.target.uuid === e.uuid);
    for (let s = 0; s < this.planes.length; s++)
      this.planes[s].target && this.planes[s].target.uuid === e.uuid && (this.planes[s].target = null);
    this.renderTargets = this.renderTargets.filter((s) => s.uuid !== e.uuid);
    for (let s = 0; s < this.renderTargets.length; s++)
      this.renderTargets[s].index = s;
    e = null, this.gl && this.clear(), t && this.scene.resetPlaneStacks(), this.onSceneChange();
  }
  /*** SHADER PASSES ***/
  /***
       Removes a ShaderPass element (that has already been disposed) from the scene and the shaderPasses array
  
       params:
       @shaderPass (ShaderPass object): the shader pass to remove
       ***/
  removeShaderPass(e) {
    this.gl && (this.shaderPasses = this.shaderPasses.filter((t) => t.uuid !== e.uuid), this.scene.removeShaderPass(e), e = null, this.gl && this.clear(), this.onSceneChange());
  }
  /***
   Enables the render loop
   ***/
  enableDrawing() {
    this.state.drawingEnabled = !0;
  }
  /***
   Disables the render loop
   ***/
  disableDrawing() {
    this.state.drawingEnabled = !1;
  }
  /***
   Forces the rendering of the next frame, even if disabled
   ***/
  needRender() {
    this.state.forceRender = !0;
  }
  /***
   Called at each draw call to render our scene and its content
   Also execute our nextRender callback queue
   ***/
  render() {
    this.gl && (this.clear(), this.state.currentGeometryID = null, this.scene.draw());
  }
  /*** DISPOSING ***/
  /***
   Delete all cached programs
   ***/
  deletePrograms() {
    for (let e = 0; e < this.cache.programs.length; e++) {
      const t = this.cache.programs[e];
      this.gl.deleteProgram(t.program);
    }
  }
  /***
   Dispose our WebGL context and all its objects
   ***/
  dispose() {
    if (!this.gl)
      return;
    for (this.state.isActive = !1; this.planes.length > 0; )
      this.removePlane(this.planes[0]);
    for (; this.shaderPasses.length > 0; )
      this.removeShaderPass(this.shaderPasses[0]);
    for (; this.renderTargets.length > 0; )
      this.removeRenderTarget(this.renderTargets[0]);
    let e = this.nextRender.add(() => {
      this.planes.length === 0 && this.shaderPasses.length === 0 && this.renderTargets.length === 0 && (e.keep = !1, this.deletePrograms(), this.clear(), this.canvas.removeEventListener("webgllost", this._contextLostHandler, !1), this.canvas.removeEventListener("webglrestored", this._contextRestoredHandler, !1), this.gl && this.extensions.WEBGL_lose_context && this.extensions.WEBGL_lose_context.loseContext(), this.canvas.width = this.canvas.width, this.gl = null, this.container.removeChild(this.canvas), this.container = null, this.canvas = null, this.onDisposed && this.onDisposed());
    }, !0);
  }
}
class Fe {
  constructor({
    xOffset: e = 0,
    yOffset: t = 0,
    lastXDelta: s = 0,
    lastYDelta: i = 0,
    shouldWatch: r = !0,
    onScroll: a = () => {
    }
  } = {}) {
    this.xOffset = e, this.yOffset = t, this.lastXDelta = s, this.lastYDelta = i, this.shouldWatch = r, this.onScroll = a, this.handler = this.scroll.bind(this, !0), this.shouldWatch && window.addEventListener("scroll", this.handler, {
      passive: !0
    });
  }
  /***
   Called by the scroll event listener
   ***/
  scroll() {
    this.updateScrollValues(window.pageXOffset, window.pageYOffset);
  }
  /***
       Updates the scroll manager X and Y scroll values as well as last X and Y deltas
       Internally called by the scroll handler
       Could be called externally as well if the user wants to handle the scroll by himself
  
       params:
       @x (float): scroll value along X axis
       @y (float): scroll value along Y axis
       ***/
  updateScrollValues(e, t) {
    const s = this.xOffset;
    this.xOffset = e, this.lastXDelta = s - this.xOffset;
    const i = this.yOffset;
    this.yOffset = t, this.lastYDelta = i - this.yOffset, this.onScroll && this.onScroll(this.lastXDelta, this.lastYDelta);
  }
  /***
   Dispose our scroll manager (just remove our event listner if it had been added previously)
   ***/
  dispose() {
    this.shouldWatch && window.removeEventListener("scroll", this.handler, {
      passive: !0
    });
  }
}
class Ue {
  constructor({
    // renderer container
    container: e,
    // webgl params
    alpha: t = !0,
    premultipliedAlpha: s = !1,
    antialias: i = !0,
    depth: r = !0,
    failIfMajorPerformanceCaveat: a = !0,
    preserveDrawingBuffer: h = !1,
    stencil: o = !1,
    autoResize: l = !0,
    autoRender: d = !0,
    watchScroll: c = !0,
    pixelRatio: u = window.devicePixelRatio || 1,
    renderingScale: f = 1,
    production: y = !1
  } = {}) {
    this.type = "Curtains", this._autoResize = l, this._autoRender = d, this._watchScroll = c, this.pixelRatio = u, f = isNaN(f) ? 1 : parseFloat(f), this._renderingScale = Math.max(0.25, Math.min(1, f)), this.premultipliedAlpha = s, this.alpha = t, this.antialias = i, this.depth = r, this.failIfMajorPerformanceCaveat = a, this.preserveDrawingBuffer = h, this.stencil = o, this.production = y, this.errors = !1, e ? this.setContainer(e) : this.production || g(this.type + ": no container provided in the initial parameters. Use setContainer() method to set one later and initialize the WebGL context");
  }
  /***
       Set up our Curtains container and start initializing everything
       Called on Curtains instancing if a params container has been provided, could be call afterwards else
       Useful with JS frameworks to init our Curtains class globally and then set the container in a canvas component afterwards to fully instantiate everything
  
       params:
       @container (HTML element or string): the container HTML element or ID that will hold our canvas
       ***/
  setContainer(e) {
    if (e)
      if (typeof e == "string")
        if (e = document.getElementById(e), e)
          this.container = e;
        else {
          let t = document.createElement("div");
          t.setAttribute("id", "curtains-canvas"), document.body.appendChild(t), this.container = t, this.production || g('Curtains: no valid container HTML element or ID provided, created a div with "curtains-canvas" ID instead');
        }
      else
        e instanceof Element && (this.container = e);
    else {
      let t = document.createElement("div");
      t.setAttribute("id", "curtains-canvas"), document.body.appendChild(t), this.container = t, this.production || g('Curtains: no valid container HTML element or ID provided, created a div with "curtains-canvas" ID instead');
    }
    this._initCurtains();
  }
  /***
   Initialize everything that the class will need: WebGL renderer, scroll manager, sizes, listeners
   Then starts our animation frame loop if needed
   ***/
  _initCurtains() {
    this.planes = [], this.renderTargets = [], this.shaderPasses = [], this._initRenderer(), this.gl && (this._initScroll(), this._setSize(), this._addListeners(), this.container.appendChild(this.canvas), this._animationFrameID = null, this._autoRender && this._animate());
  }
  /*** WEBGL CONTEXT ***/
  /***
   Initialize the Renderer class object
   ***/
  _initRenderer() {
    this.renderer = new ke({
      alpha: this.alpha,
      antialias: this.antialias,
      premultipliedAlpha: this.premultipliedAlpha,
      depth: this.depth,
      failIfMajorPerformanceCaveat: this.failIfMajorPerformanceCaveat,
      preserveDrawingBuffer: this.preserveDrawingBuffer,
      stencil: this.stencil,
      container: this.container,
      pixelRatio: this.pixelRatio,
      renderingScale: this._renderingScale,
      production: this.production,
      onError: () => this._onRendererError(),
      onSuccess: () => this._onRendererSuccess(),
      onContextLost: () => this._onRendererContextLost(),
      onContextRestored: () => this._onRendererContextRestored(),
      onDisposed: () => this._onRendererDisposed(),
      // keep sync between renderer planes, shader passes and render targets arrays and the Curtains ones
      onSceneChange: () => this._keepSync()
    }), this.gl = this.renderer.gl, this.canvas = this.renderer.canvas;
  }
  /***
   Force our renderer to restore the WebGL context
   ***/
  restoreContext() {
    this.renderer.restoreContext();
  }
  /***
   This just handles our drawing animation frame
   ***/
  _animate() {
    this.render(), this._animationFrameID = window.requestAnimationFrame(this._animate.bind(this));
  }
  /*** RENDERING ***/
  /***
   Enables rendering
   ***/
  enableDrawing() {
    this.renderer.enableDrawing();
  }
  /***
   Disables rendering
   ***/
  disableDrawing() {
    this.renderer.disableDrawing();
  }
  /***
   Forces the rendering of the next frame, even if disabled
   ***/
  needRender() {
    this.renderer.needRender();
  }
  /***
       Executes a callback on next frame
  
       params:
       @callback (function): callback to execute on next frame
       @keep (bool): whether to keep calling that callback on each rendering call or not (act as a setInterval). Default to false
  
       returns:
       @queueItem: the queue item. Allows to keep a track of it and set its keep property to false when needed
       ***/
  nextRender(e, t = !1) {
    return this.renderer.nextRender.add(e, t);
  }
  /***
   Clear our WebGL renderer colors and depth buffers
   ***/
  clear() {
    this.renderer && this.renderer.clear();
  }
  /***
   Clear our WebGL renderer depth buffer
   ***/
  clearDepth() {
    this.renderer && this.renderer.clearDepth();
  }
  /***
   Clear our WebGL renderer color buffer
   ***/
  clearColor() {
    this.renderer && this.renderer.clearColor();
  }
  /***
       Check whether the created context is WebGL2
  
       return:
       @isWebGL2 (bool): whether the created WebGL context is 2.0 or not
       ***/
  isWebGL2() {
    return this.gl ? this.renderer._isWebGL2 : !1;
  }
  /***
   Tells our renderer to render the scene if the drawing is enabled
   ***/
  render() {
    this.renderer.nextRender.execute(), !(!this.renderer.state.drawingEnabled && !this.renderer.state.forceRender) && (this.renderer.state.forceRender && (this.renderer.state.forceRender = !1), this._onRenderCallback && this._onRenderCallback(), this.renderer.render());
  }
  /*** LISTENERS ***/
  /***
   Adds our resize event listener if needed
   ***/
  _addListeners() {
    this._resizeHandler = null, this._autoResize && (this._resizeHandler = this.resize.bind(this, !0), window.addEventListener("resize", this._resizeHandler, !1));
  }
  /*** SIZING ***/
  /***
   Set the pixel ratio property and update everything by calling the resize() method
   ***/
  setPixelRatio(e, t) {
    this.pixelRatio = parseFloat(Math.max(e, 1)) || 1, this.renderer.setPixelRatio(e), this.resize(t);
  }
  /***
   Set our renderer container and canvas sizes and update the scroll values
   ***/
  _setSize() {
    this.renderer.setSize(), this._scrollManager.shouldWatch && (this._scrollManager.xOffset = window.pageXOffset, this._scrollManager.yOffset = window.pageYOffset);
  }
  /***
       Useful to get our container bounding rectangle without triggering a reflow/layout
  
       returns :
       @boundingRectangle (object): an object containing our container bounding rectangle (width, height, top and left properties)
       ***/
  getBoundingRect() {
    return this.renderer._boundingRect;
  }
  /***
       Resize our container and the renderer
  
       params:
       @triggerCallback (bool): Whether we should trigger onAfterResize callback
       ***/
  resize(e) {
    this.gl && (this._setSize(), this.renderer.resize(), this.nextRender(() => {
      this._onAfterResizeCallback && e && this._onAfterResizeCallback();
    }));
  }
  /*** SCROLL ***/
  /***
   Init our ScrollManager class object
   ***/
  _initScroll() {
    this._scrollManager = new Fe({
      // init values
      xOffset: window.pageXOffset,
      yOffset: window.pageYOffset,
      lastXDelta: 0,
      lastYDelta: 0,
      shouldWatch: this._watchScroll,
      onScroll: (e, t) => this._updateScroll(e, t)
    });
  }
  /***
   Handles the different values associated with a scroll event (scroll and delta values)
   If no plane watch the scroll then those values won't be retrieved to avoid unnecessary reflow calls
   If at least a plane is watching, update all watching planes positions based on the scroll values
   And force render for at least one frame to actually update the scene
   ***/
  _updateScroll(e, t) {
    for (let s = 0; s < this.planes.length; s++)
      this.planes[s].watchScroll && this.planes[s].updateScrollPosition(e, t);
    this.renderer.needRender(), this._onScrollCallback && this._onScrollCallback();
  }
  /***
       Updates the scroll manager X and Y scroll values as well as last X and Y deltas
       Internally called by the scroll handler if at least one plane is watching the scroll
       Could be called externally as well if the user wants to handle the scroll by himself
  
       params:
       @x (float): scroll value along X axis
       @y (float): scroll value along Y axis
       ***/
  updateScrollValues(e, t) {
    this._scrollManager.updateScrollValues(e, t);
  }
  /***
       Returns last delta scroll values
  
       returns:
       @delta (object): an object containing X and Y last delta values
       ***/
  getScrollDeltas() {
    return {
      x: this._scrollManager.lastXDelta,
      y: this._scrollManager.lastYDelta
    };
  }
  /***
       Returns last window scroll values
  
       returns:
       @scrollValues (object): an object containing X and Y last scroll values
       ***/
  getScrollValues() {
    return {
      x: this._scrollManager.xOffset,
      y: this._scrollManager.yOffset
    };
  }
  /*** ADDING / REMOVING OBJECTS TO THE RENDERER ***/
  /***
   Always keep sync between renderer and Curtains scene objects when adding/removing objects
   ***/
  _keepSync() {
    this.planes = this.renderer.planes, this.shaderPasses = this.renderer.shaderPasses, this.renderTargets = this.renderer.renderTargets;
  }
  /*** UTILS ***/
  /***
   Linear interpolation helper defined in utils
   ***/
  lerp(e, t, s) {
    return De(e, t, s);
  }
  /*** EVENTS ***/
  /***
       This is called each time our container has been resized
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our Curtains element to handle chaining
       ***/
  onAfterResize(e) {
    return e && (this._onAfterResizeCallback = e), this;
  }
  /***
       This is called when an error has been detected
  
       params:
       @callback (function): a function to execute
  
       returns:
       @this: our Curtains element to handle chaining
       ***/
  onError(e) {
    return e && (this._onErrorCallback = e), this;
  }
  /***
   This triggers the onError callback and is called by the renderer when an error has been detected
   ***/
  _onRendererError() {
    setTimeout(() => {
      this._onErrorCallback && !this.errors && this._onErrorCallback(), this.errors = !0;
    }, 0);
  }
  /***
       This is called when the WebGL context has been successfully created
  
       params:
       @callback (function): a function to execute
  
       returns:
       @this: our Curtains element to handle chaining
       ***/
  onSuccess(e) {
    return e && (this._onSuccessCallback = e), this;
  }
  /***
   This triggers the onSuccess callback and is called by the renderer when the context has been successfully created
   ***/
  _onRendererSuccess() {
    setTimeout(() => {
      this._onSuccessCallback && this._onSuccessCallback();
    }, 0);
  }
  /***
       This is called once our context has been lost
  
       params:
       @callback (function): a function to execute
  
       returns:
       @this: our Curtains element to handle chaining
       ***/
  onContextLost(e) {
    return e && (this._onContextLostCallback = e), this;
  }
  /***
   This triggers the onContextLost callback and is called by the renderer when the context has been lost
   ***/
  _onRendererContextLost() {
    this._onContextLostCallback && this._onContextLostCallback();
  }
  /***
       This is called once our context has been restored
  
       params:
       @callback (function): a function to execute
  
       returns:
       @this: our Curtains element to handle chaining
       ***/
  onContextRestored(e) {
    return e && (this._onContextRestoredCallback = e), this;
  }
  /***
   This triggers the onContextRestored callback and is called by the renderer when the context has been restored
   ***/
  _onRendererContextRestored() {
    this._onContextRestoredCallback && this._onContextRestoredCallback();
  }
  /***
       This is called once at each request animation frame call
  
       params:
       @callback (function): a function to execute
  
       returns:
       @this: our Curtains element to handle chaining
       ***/
  onRender(e) {
    return e && (this._onRenderCallback = e), this;
  }
  /***
       This is called each time window is scrolled and if our scrollManager is active
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our Curtains element to handle chaining
       ***/
  onScroll(e) {
    return e && (this._onScrollCallback = e), this;
  }
  /*** DESTROYING ***/
  /***
   Dispose everything
   ***/
  dispose() {
    this.renderer.dispose();
  }
  /***
   This is called when the renderer has finished disposing all the WebGL stuff
   ***/
  _onRendererDisposed() {
    this._animationFrameID && window.cancelAnimationFrame(this._animationFrameID), this._resizeHandler && window.removeEventListener("resize", this._resizeHandler, !1), this._scrollManager && this._scrollManager.dispose();
  }
}
class Ve {
  constructor(e, t, s) {
    if (this.type = "Uniforms", !e || e.type !== "Renderer")
      O(this.type + ": Renderer not passed as first argument", e);
    else if (!e.gl) {
      O(this.type + ": Renderer WebGL context is undefined", e);
      return;
    }
    if (this.renderer = e, this.gl = e.gl, this.program = t, this.uniforms = {}, s)
      for (const i in s) {
        const r = s[i];
        this.uniforms[i] = {
          name: r.name,
          type: r.type,
          // clone value if possible, use original value else
          value: r.value.clone && typeof r.value.clone == "function" ? r.value.clone() : r.value,
          update: null
        };
      }
  }
  /***
       Set uniforms WebGL function based on their types
  
       params :
       @uniform (object): the uniform
       ***/
  handleUniformSetting(e) {
    switch (e.type) {
      case "1i":
        e.update = this.setUniform1i.bind(this);
        break;
      case "1iv":
        e.update = this.setUniform1iv.bind(this);
        break;
      case "1f":
        e.update = this.setUniform1f.bind(this);
        break;
      case "1fv":
        e.update = this.setUniform1fv.bind(this);
        break;
      case "2i":
        e.update = this.setUniform2i.bind(this);
        break;
      case "2iv":
        e.update = this.setUniform2iv.bind(this);
        break;
      case "2f":
        e.update = this.setUniform2f.bind(this);
        break;
      case "2fv":
        e.update = this.setUniform2fv.bind(this);
        break;
      case "3i":
        e.update = this.setUniform3i.bind(this);
        break;
      case "3iv":
        e.update = this.setUniform3iv.bind(this);
        break;
      case "3f":
        e.update = this.setUniform3f.bind(this);
        break;
      case "3fv":
        e.update = this.setUniform3fv.bind(this);
        break;
      case "4i":
        e.update = this.setUniform4i.bind(this);
        break;
      case "4iv":
        e.update = this.setUniform4iv.bind(this);
        break;
      case "4f":
        e.update = this.setUniform4f.bind(this);
        break;
      case "4fv":
        e.update = this.setUniform4fv.bind(this);
        break;
      case "mat2":
        e.update = this.setUniformMatrix2fv.bind(this);
        break;
      case "mat3":
        e.update = this.setUniformMatrix3fv.bind(this);
        break;
      case "mat4":
        e.update = this.setUniformMatrix4fv.bind(this);
        break;
      default:
        this.renderer.production || g(this.type + ": This uniform type is not handled : ", e.type);
    }
  }
  /***
       Auto detect the format of the uniform (check if its a float, an integer, a Vector, a Matrix, an array...)
       Also set a lastValue property that we'll use to compare to our value property and update the uniform if it changed
  
       params :
       @uniform (object): the uniform
       ***/
  setInternalFormat(e) {
    e.value.type === "Vec2" ? (e._internalFormat = "Vec2", e.lastValue = e.value.clone()) : e.value.type === "Vec3" ? (e._internalFormat = "Vec3", e.lastValue = e.value.clone()) : e.value.type === "Mat4" ? (e._internalFormat = "Mat4", e.lastValue = e.value.clone()) : e.value.type === "Quat" ? (e._internalFormat = "Quat", e.lastValue = e.value.clone()) : Array.isArray(e.value) ? (e._internalFormat = "array", e.lastValue = Array.from(e.value)) : e.value.constructor === Float32Array ? (e._internalFormat = "mat", e.lastValue = e.value) : (e._internalFormat = "float", e.lastValue = e.value);
  }
  /***
   This inits our uniforms
   Sets its internal format and type if not provided then upload the uniform
   ***/
  setUniforms() {
    if (this.uniforms)
      for (const e in this.uniforms) {
        let t = this.uniforms[e];
        t.location = this.gl.getUniformLocation(this.program, t.name), t._internalFormat || this.setInternalFormat(t), t.type || (t._internalFormat === "Vec2" ? t.type = "2f" : t._internalFormat === "Vec3" ? t.type = "3f" : t._internalFormat === "Mat4" ? t.type = "mat4" : t._internalFormat === "array" ? t.value.length === 4 ? (t.type = "4f", this.renderer.production || g(this.type + ": No uniform type declared for " + t.name + ", applied a 4f (array of 4 floats) uniform type")) : t.value.length === 3 ? (t.type = "3f", this.renderer.production || g(this.type + ": No uniform type declared for " + t.name + ", applied a 3f (array of 3 floats) uniform type")) : t.value.length === 2 && (t.type = "2f", this.renderer.production || g(this.type + ": No uniform type declared for " + t.name + ", applied a 2f (array of 2 floats) uniform type")) : t._internalFormat === "mat" ? t.value.length === 16 ? (t.type = "mat4", this.renderer.production || g(this.type + ": No uniform type declared for " + t.name + ", applied a mat4 (4x4 matrix array) uniform type")) : t.value.length === 9 ? (t.type = "mat3", this.renderer.production || g(this.type + ": No uniform type declared for " + t.name + ", applied a mat3 (3x3 matrix array) uniform type")) : t.value.length === 4 && (t.type = "mat2", this.renderer.production || g(this.type + ": No uniform type declared for " + t.name + ", applied a mat2 (2x2 matrix array) uniform type")) : (t.type = "1f", this.renderer.production || g(this.type + ": No uniform type declared for " + t.name + ", applied a 1f (float) uniform type"))), this.handleUniformSetting(t), t.update && t.update(t);
      }
  }
  /***
   This updates all uniforms of an object that were set by the user
   It is called at each draw call
   ***/
  updateUniforms() {
    if (this.uniforms)
      for (const e in this.uniforms) {
        const t = this.uniforms[e];
        let s = !1;
        t._internalFormat === "Vec2" || t._internalFormat === "Vec3" || t._internalFormat === "Quat" ? t.value.equals(t.lastValue) || (s = !0, t.lastValue.copy(t.value)) : t.value.length ? JSON.stringify(t.value) !== JSON.stringify(t.lastValue) && (s = !0, t.lastValue = Array.from(t.value)) : t.value !== t.lastValue && (s = !0, t.lastValue = t.value), s && t.update && t.update(t);
      }
  }
  /***
       Use appropriate WebGL uniform setting function based on the uniform type
  
       params :
       @uniform (object): the uniform
       ***/
  setUniform1i(e) {
    this.gl.uniform1i(e.location, e.value);
  }
  setUniform1iv(e) {
    this.gl.uniform1iv(e.location, e.value);
  }
  setUniform1f(e) {
    this.gl.uniform1f(e.location, e.value);
  }
  setUniform1fv(e) {
    this.gl.uniform1fv(e.location, e.value);
  }
  setUniform2i(e) {
    e._internalFormat === "Vec2" ? this.gl.uniform2i(e.location, e.value.x, e.value.y) : this.gl.uniform2i(e.location, e.value[0], e.value[1]);
  }
  setUniform2iv(e) {
    e._internalFormat === "Vec2" ? this.gl.uniform2iv(e.location, [e.value.x, e.value.y]) : this.gl.uniform2iv(e.location, e.value);
  }
  setUniform2f(e) {
    e._internalFormat === "Vec2" ? this.gl.uniform2f(e.location, e.value.x, e.value.y) : this.gl.uniform2f(e.location, e.value[0], e.value[1]);
  }
  setUniform2fv(e) {
    e._internalFormat === "Vec2" ? this.gl.uniform2fv(e.location, [e.value.x, e.value.y]) : this.gl.uniform2fv(e.location, e.value);
  }
  setUniform3i(e) {
    e._internalFormat === "Vec3" ? this.gl.uniform3i(e.location, e.value.x, e.value.y, e.value.z) : this.gl.uniform3i(e.location, e.value[0], e.value[1], e.value[2]);
  }
  setUniform3iv(e) {
    e._internalFormat === "Vec3" ? this.gl.uniform3iv(e.location, [e.value.x, e.value.y, e.value.z]) : this.gl.uniform3iv(e.location, e.value);
  }
  setUniform3f(e) {
    e._internalFormat === "Vec3" ? this.gl.uniform3f(e.location, e.value.x, e.value.y, e.value.z) : this.gl.uniform3f(e.location, e.value[0], e.value[1], e.value[2]);
  }
  setUniform3fv(e) {
    e._internalFormat === "Vec3" ? this.gl.uniform3fv(e.location, [e.value.x, e.value.y, e.value.z]) : this.gl.uniform3fv(e.location, e.value);
  }
  setUniform4i(e) {
    e._internalFormat === "Quat" ? this.gl.uniform4i(e.location, e.value.elements[0], e.value.elements[1], e.value.elements[2], e.value[3]) : this.gl.uniform4i(e.location, e.value[0], e.value[1], e.value[2], e.value[3]);
  }
  setUniform4iv(e) {
    e._internalFormat === "Quat" ? this.gl.uniform4iv(e.location, [e.value.elements[0], e.value.elements[1], e.value.elements[2], e.value[3]]) : this.gl.uniform4iv(e.location, e.value);
  }
  setUniform4f(e) {
    e._internalFormat === "Quat" ? this.gl.uniform4f(e.location, e.value.elements[0], e.value.elements[1], e.value.elements[2], e.value[3]) : this.gl.uniform4f(e.location, e.value[0], e.value[1], e.value[2], e.value[3]);
  }
  setUniform4fv(e) {
    e._internalFormat === "Quat" ? this.gl.uniform4fv(e.location, [e.value.elements[0], e.value.elements[1], e.value.elements[2], e.value[3]]) : this.gl.uniform4fv(e.location, e.value);
  }
  setUniformMatrix2fv(e) {
    this.gl.uniformMatrix2fv(e.location, !1, e.value);
  }
  setUniformMatrix3fv(e) {
    this.gl.uniformMatrix3fv(e.location, !1, e.value);
  }
  setUniformMatrix4fv(e) {
    e._internalFormat === "Mat4" ? this.gl.uniformMatrix4fv(e.location, !1, e.value.elements) : this.gl.uniformMatrix4fv(e.location, !1, e.value);
  }
}
const Ne = `
precision mediump float;
`, J = Ne.replace(/\n/g, ""), Be = `
attribute vec3 aVertexPosition;
attribute vec2 aTextureCoord;
`, Pe = Be.replace(/\n/g, ""), We = `
varying vec3 vVertexPosition;
varying vec2 vTextureCoord;
`, ee = We.replace(/\n/g, ""), He = J + Pe + ee + `
uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;

void main() {
    vTextureCoord = aTextureCoord;
    vVertexPosition = aVertexPosition;
    
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
}
`, Ge = He.replace(/\n/g, ""), je = J + ee + `
void main() {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`, Xe = je.replace(/\n/g, ""), Ye = J + Pe + ee + `
void main() {
    vTextureCoord = aTextureCoord;
    vVertexPosition = aVertexPosition;
    
    gl_Position = vec4(aVertexPosition, 1.0);
}
`, qe = Ye.replace(/\n/g, ""), $e = J + ee + `
uniform sampler2D uRenderTexture;

void main() {
    gl_FragColor = texture2D(uRenderTexture, vTextureCoord);
}
`, Qe = $e.replace(/\n/g, "");
let ue = 0;
class fe {
  constructor(e, {
    parent: t,
    vertexShader: s,
    fragmentShader: i
  } = {}) {
    if (this.type = "Program", !e || e.type !== "Renderer")
      O(this.type + ": Renderer not passed as first argument", e);
    else if (!e.gl) {
      O(this.type + ": Renderer WebGL context is undefined", e);
      return;
    }
    this.renderer = e, this.gl = this.renderer.gl, this.parent = t, this.defaultVsCode = this.parent.type === "Plane" ? Ge : qe, this.defaultFsCode = this.parent.type === "Plane" ? Xe : Qe, s ? this.vsCode = s : (!this.renderer.production && this.parent.type === "Plane" && g(this.parent.type + ": No vertex shader provided, will use a default one"), this.vsCode = this.defaultVsCode), i ? this.fsCode = i : (this.renderer.production || g(this.parent.type + ": No fragment shader provided, will use a default one"), this.fsCode = this.defaultFsCode), this.compiled = !0, this.setupProgram();
  }
  /***
       Compile our WebGL shaders based on our written shaders
  
       params:
       @shaderCode (string): shader code
       @shaderType (shaderType): WebGL shader type (vertex or fragment)
  
       returns:
       @shader (compiled shader): our compiled shader
       ***/
  createShader(e, t) {
    const s = this.gl.createShader(t);
    if (this.gl.shaderSource(s, e), this.gl.compileShader(s), !this.renderer.production && !this.gl.getShaderParameter(s, this.gl.COMPILE_STATUS)) {
      const i = t === this.gl.VERTEX_SHADER ? "vertex shader" : "fragment shader";
      let a = this.gl.getShaderSource(s).split(`
`);
      for (let h = 0; h < a.length; h++)
        a[h] = h + 1 + ": " + a[h];
      return a = a.join(`
`), g(this.type + ": Errors occurred while compiling the", i, `:
`, this.gl.getShaderInfoLog(s)), O(a), g(this.type + ": Will use a default", i), this.createShader(t === this.gl.VERTEX_SHADER ? this.defaultVsCode : this.defaultFsCode, t);
    }
    return s;
  }
  /***
   Compiles and creates new shaders
   ***/
  useNewShaders() {
    this.vertexShader = this.createShader(this.vsCode, this.gl.VERTEX_SHADER), this.fragmentShader = this.createShader(this.fsCode, this.gl.FRAGMENT_SHADER), (!this.vertexShader || !this.fragmentShader) && (this.renderer.production || g(this.type + ": Unable to find or compile the vertex or fragment shader"));
  }
  /***
   Checks whether the program has already been registered before creating it
   If yes, use the compiled shaders to create a new one with createProgram()
   If not, compile the shaders and call createProgram()
   ***/
  setupProgram() {
    let e = this.renderer.cache.getProgramFromShaders(this.vsCode, this.fsCode);
    e ? (this.vertexShader = e.vertexShader, this.fragmentShader = e.fragmentShader, this.activeUniforms = e.activeUniforms, this.activeAttributes = e.activeAttributes, this.createProgram()) : (this.useNewShaders(), this.compiled && (this.createProgram(), this.renderer.cache.addProgram(this)));
  }
  /***
   Used internally to set up program based on the created shaders and attach them to the program
   Sets a list of active textures that are actually used by the shaders to avoid binding unused textures during draw calls
   Add the program to the cache
   ***/
  createProgram() {
    if (ue++, this.id = ue, this.program = this.gl.createProgram(), this.gl.attachShader(this.program, this.vertexShader), this.gl.attachShader(this.program, this.fragmentShader), this.gl.linkProgram(this.program), !this.renderer.production && !this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
      g(this.type + ": Unable to initialize the shader program: " + this.gl.getProgramInfoLog(this.program)), g(this.type + ": Will use default vertex and fragment shaders"), this.vertexShader = this.createShader(this.defaultVsCode, this.gl.VERTEX_SHADER), this.fragmentShader = this.createShader(this.defaultFsCode, this.gl.FRAGMENT_SHADER), this.createProgram();
      return;
    }
    if (this.gl.deleteShader(this.vertexShader), this.gl.deleteShader(this.fragmentShader), !this.activeUniforms || !this.activeAttributes) {
      this.activeUniforms = {
        textures: [],
        textureMatrices: []
      };
      const e = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_UNIFORMS);
      for (let s = 0; s < e; s++) {
        const i = this.gl.getActiveUniform(this.program, s);
        i.type === this.gl.SAMPLER_2D && this.activeUniforms.textures.push(i.name), i.type === this.gl.FLOAT_MAT4 && i.name !== "uMVMatrix" && i.name !== "uPMatrix" && this.activeUniforms.textureMatrices.push(i.name);
      }
      this.activeAttributes = [];
      const t = this.gl.getProgramParameter(this.program, this.gl.ACTIVE_ATTRIBUTES);
      for (let s = 0; s < t; s++) {
        const i = this.gl.getActiveAttrib(this.program, s);
        this.activeAttributes.push(i.name);
      }
    }
  }
  /*** UNIFORMS ***/
  /***
       Creates and attach the uniform handlers to our program
  
       params:
       @uniforms (object): an object describing our uniforms (see Uniforms class object)
       ***/
  createUniforms(e) {
    this.uniformsManager = new Ve(this.renderer, this.program, e), this.setUniforms();
  }
  /***
   Sets our uniforms (used on init and on context restoration)
   ***/
  setUniforms() {
    this.renderer.useProgram(this), this.uniformsManager.setUniforms();
  }
  /***
   Updates our uniforms at each draw calls
   ***/
  updateUniforms() {
    this.renderer.useProgram(this), this.uniformsManager.updateUniforms();
  }
}
class Ze {
  constructor(e, {
    program: t = null,
    width: s = 1,
    height: i = 1
  } = {}) {
    if (this.type = "Geometry", !e || e.type !== "Renderer")
      O(this.type + ": Renderer not passed as first argument", e);
    else if (!e.gl) {
      O(this.type + ": Renderer WebGL context is undefined", e);
      return;
    }
    this.renderer = e, this.gl = this.renderer.gl, this.definition = {
      id: s * i + s,
      width: s,
      height: i
    }, this.setDefaultAttributes(), this.setVerticesUVs();
  }
  /*** CONTEXT RESTORATION ***/
  /***
   Used internally to handle context restoration after the program has been successfully compiled again
   Reset the default attributes, the vertices and UVs and the program
   ***/
  restoreContext(e) {
    this.program = null, this.setDefaultAttributes(), this.setVerticesUVs(), this.setProgram(e);
  }
  /*** SET DEFAULT ATTRIBUTES ***/
  /***
   Our geometry default attributes that will handle the buffers
   We're just using vertices positions and texture coordinates
   ***/
  setDefaultAttributes() {
    this.attributes = {
      vertexPosition: {
        name: "aVertexPosition",
        size: 3,
        isActive: !1
      },
      textureCoord: {
        name: "aTextureCoord",
        size: 3,
        isActive: !1
      }
    };
  }
  /***
   Set our vertices and texture coordinates array
   Get them from the cache if possible
   ***/
  setVerticesUVs() {
    const e = this.renderer.cache.getGeometryFromID(this.definition.id);
    e ? (this.attributes.vertexPosition.array = e.vertices, this.attributes.textureCoord.array = e.uvs) : (this.computeVerticesUVs(), this.renderer.cache.addGeometry(this.definition.id, this.attributes.vertexPosition.array, this.attributes.textureCoord.array));
  }
  /***
   Called on init and on context restoration to set up the attribute buffers
   Use VertexArrayObjects whenever possible
   ***/
  setProgram(e) {
    this.program = e, this.initAttributes(), this.renderer._isWebGL2 ? (this._vao = this.gl.createVertexArray(), this.gl.bindVertexArray(this._vao)) : this.renderer.extensions.OES_vertex_array_object && (this._vao = this.renderer.extensions.OES_vertex_array_object.createVertexArrayOES(), this.renderer.extensions.OES_vertex_array_object.bindVertexArrayOES(this._vao)), this.initializeBuffers();
  }
  /***
   This creates our mesh attributes and buffers by looping over it
   ***/
  initAttributes() {
    for (const e in this.attributes) {
      if (this.attributes[e].isActive = this.program.activeAttributes.includes(this.attributes[e].name), !this.attributes[e].isActive)
        return;
      this.attributes[e].location = this.gl.getAttribLocation(this.program.program, this.attributes[e].name), this.attributes[e].buffer = this.gl.createBuffer(), this.attributes[e].numberOfItems = this.definition.width * this.definition.height * this.attributes[e].size * 2;
    }
  }
  /***
   This method is used internally to create our vertices coordinates and texture UVs
   we first create our UVs on a grid from [0, 0, 0] to [1, 1, 0]
   then we use the UVs to create our vertices coords
   ***/
  computeVerticesUVs() {
    this.attributes.vertexPosition.array = [], this.attributes.textureCoord.array = [];
    const e = this.attributes.vertexPosition.array, t = this.attributes.textureCoord.array;
    for (let s = 0; s < this.definition.height; s++) {
      const i = s / this.definition.height;
      for (let r = 0; r < this.definition.width; r++) {
        const a = r / this.definition.width;
        t.push(a), t.push(i), t.push(0), e.push((a - 0.5) * 2), e.push((i - 0.5) * 2), e.push(0), t.push(a + 1 / this.definition.width), t.push(i), t.push(0), e.push((a + 1 / this.definition.width - 0.5) * 2), e.push((i - 0.5) * 2), e.push(0), t.push(a), t.push(i + 1 / this.definition.height), t.push(0), e.push((a - 0.5) * 2), e.push((i + 1 / this.definition.height - 0.5) * 2), e.push(0), t.push(a), t.push(i + 1 / this.definition.height), t.push(0), e.push((a - 0.5) * 2), e.push((i + 1 / this.definition.height - 0.5) * 2), e.push(0), t.push(a + 1 / this.definition.width), t.push(i), t.push(0), e.push((a + 1 / this.definition.width - 0.5) * 2), e.push((i - 0.5) * 2), e.push(0), t.push(a + 1 / this.definition.width), t.push(i + 1 / this.definition.height), t.push(0), e.push((a + 1 / this.definition.width - 0.5) * 2), e.push((i + 1 / this.definition.height - 0.5) * 2), e.push(0);
      }
    }
  }
  /***
   This method enables and binds our attributes buffers
   ***/
  initializeBuffers() {
    if (this.attributes) {
      for (const e in this.attributes) {
        if (!this.attributes[e].isActive)
          return;
        this.gl.enableVertexAttribArray(this.attributes[e].location), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[e].buffer), this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.attributes[e].array), this.gl.STATIC_DRAW), this.gl.vertexAttribPointer(this.attributes[e].location, this.attributes[e].size, this.gl.FLOAT, !1, 0, 0);
      }
      this.renderer.state.currentGeometryID = this.definition.id;
    }
  }
  /***
   Used inside our draw call to set the correct plane buffers before drawing it
   ***/
  bindBuffers() {
    if (this._vao)
      this.renderer._isWebGL2 ? this.gl.bindVertexArray(this._vao) : this.renderer.extensions.OES_vertex_array_object.bindVertexArrayOES(this._vao);
    else
      for (const e in this.attributes) {
        if (!this.attributes[e].isActive)
          return;
        this.gl.enableVertexAttribArray(this.attributes[e].location), this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[e].buffer), this.gl.vertexAttribPointer(this.attributes[e].location, this.attributes[e].size, this.gl.FLOAT, !1, 0, 0);
      }
    this.renderer.state.currentGeometryID = this.definition.id;
  }
  /***
   Draw a geometry
   ***/
  draw() {
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.attributes.vertexPosition.numberOfItems);
  }
  /***
   Dispose a geometry (ie delete its vertex array objects and buffers)
   ***/
  dispose() {
    this._vao && (this.renderer._isWebGL2 ? this.gl.deleteVertexArray(this._vao) : this.renderer.extensions.OES_vertex_array_object.deleteVertexArrayOES(this._vao));
    for (const e in this.attributes) {
      if (!this.attributes[e].isActive)
        return;
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.attributes[e].buffer), this.gl.bufferData(this.gl.ARRAY_BUFFER, 1, this.gl.STATIC_DRAW), this.gl.deleteBuffer(this.attributes[e].buffer);
    }
    this.attributes = null, this.renderer.state.currentGeometryID = null;
  }
}
class B {
  constructor(e = new Float32Array([
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1,
    0,
    0,
    0,
    0,
    1
  ])) {
    this.type = "Mat4", this.elements = e;
  }
  /***
       Sets the matrix values from an array
  
       params:
       @array (array): an array of at least 16 elements
  
       returns:
       @this (Mat4 class object): this matrix after being set
       ***/
  setFromArray(e) {
    for (let t = 0; t < this.elements.length; t++)
      this.elements[t] = e[t];
    return this;
  }
  /***
       Copy another Mat4
  
       params:
       @matrix (Mat4 class object): matrix to copy
  
       returns:
       @this (Mat4 class object): this matrix after copy
       ***/
  copy(e) {
    const t = e.elements;
    return this.elements[0] = t[0], this.elements[1] = t[1], this.elements[2] = t[2], this.elements[3] = t[3], this.elements[4] = t[4], this.elements[5] = t[5], this.elements[6] = t[6], this.elements[7] = t[7], this.elements[8] = t[8], this.elements[9] = t[9], this.elements[10] = t[10], this.elements[11] = t[11], this.elements[12] = t[12], this.elements[13] = t[13], this.elements[14] = t[14], this.elements[15] = t[15], this;
  }
  /***
       Clone a matrix
  
       returns:
       @clonedMatrix (Mat4 object): cloned matrix
       ***/
  clone() {
    return new B().copy(this);
  }
  /***
       Simple matrix multiplication helper
  
       params:
       @matrix (Mat4 class object): Mat4 to multiply with
  
       returns:
       @result (Mat4 class object): Mat4 after multiplication
       ***/
  multiply(e) {
    const t = this.elements, s = e.elements;
    let i = new B();
    return i.elements[0] = s[0] * t[0] + s[1] * t[4] + s[2] * t[8] + s[3] * t[12], i.elements[1] = s[0] * t[1] + s[1] * t[5] + s[2] * t[9] + s[3] * t[13], i.elements[2] = s[0] * t[2] + s[1] * t[6] + s[2] * t[10] + s[3] * t[14], i.elements[3] = s[0] * t[3] + s[1] * t[7] + s[2] * t[11] + s[3] * t[15], i.elements[4] = s[4] * t[0] + s[5] * t[4] + s[6] * t[8] + s[7] * t[12], i.elements[5] = s[4] * t[1] + s[5] * t[5] + s[6] * t[9] + s[7] * t[13], i.elements[6] = s[4] * t[2] + s[5] * t[6] + s[6] * t[10] + s[7] * t[14], i.elements[7] = s[4] * t[3] + s[5] * t[7] + s[6] * t[11] + s[7] * t[15], i.elements[8] = s[8] * t[0] + s[9] * t[4] + s[10] * t[8] + s[11] * t[12], i.elements[9] = s[8] * t[1] + s[9] * t[5] + s[10] * t[9] + s[11] * t[13], i.elements[10] = s[8] * t[2] + s[9] * t[6] + s[10] * t[10] + s[11] * t[14], i.elements[11] = s[8] * t[3] + s[9] * t[7] + s[10] * t[11] + s[11] * t[15], i.elements[12] = s[12] * t[0] + s[13] * t[4] + s[14] * t[8] + s[15] * t[12], i.elements[13] = s[12] * t[1] + s[13] * t[5] + s[14] * t[9] + s[15] * t[13], i.elements[14] = s[12] * t[2] + s[13] * t[6] + s[14] * t[10] + s[15] * t[14], i.elements[15] = s[12] * t[3] + s[13] * t[7] + s[14] * t[11] + s[15] * t[15], i;
  }
  /***
       Get matrix inverse
  
       returns:
       @result (Mat4 class object): inverted Mat4
       ***/
  getInverse() {
    const e = this.elements, t = new B(), s = t.elements;
    let i = e[0], r = e[1], a = e[2], h = e[3], o = e[4], l = e[5], d = e[6], c = e[7], u = e[8], f = e[9], y = e[10], _ = e[11], v = e[12], x = e[13], p = e[14], m = e[15], b = i * l - r * o, w = i * d - a * o, P = i * c - h * o, T = r * d - a * l, A = r * c - h * l, M = a * c - h * d, E = u * x - f * v, R = u * p - y * v, D = u * m - _ * v, V = f * p - y * x, W = f * m - _ * x, H = y * m - _ * p, C = b * H - w * W + P * V + T * D - A * R + M * E;
    return C ? (C = 1 / C, s[0] = (l * H - d * W + c * V) * C, s[1] = (a * W - r * H - h * V) * C, s[2] = (x * M - p * A + m * T) * C, s[3] = (y * A - f * M - _ * T) * C, s[4] = (d * D - o * H - c * R) * C, s[5] = (i * H - a * D + h * R) * C, s[6] = (p * P - v * M - m * w) * C, s[7] = (u * M - y * P + _ * w) * C, s[8] = (o * W - l * D + c * E) * C, s[9] = (r * D - i * W - h * E) * C, s[10] = (v * A - x * P + m * b) * C, s[11] = (f * P - u * A - _ * b) * C, s[12] = (l * R - o * V - d * E) * C, s[13] = (i * V - r * R + a * E) * C, s[14] = (x * w - v * T - p * b) * C, s[15] = (u * T - f * w + y * b) * C, t) : null;
  }
  /***
       Simple Mat4 scaling helper
  
       params :
       @vector (Vec3 class object): Vec3 representing scale along X, Y and Z axis
  
       returns :
       @result (Mat4 class object): Mat4 after scaling
       ***/
  scale(e) {
    let t = this.elements;
    return t[0] *= e.x, t[1] *= e.x, t[2] *= e.x, t[3] *= e.x, t[4] *= e.y, t[5] *= e.y, t[6] *= e.y, t[7] *= e.y, t[8] *= e.z, t[9] *= e.z, t[10] *= e.z, t[11] *= e.z, this;
  }
  /***
       Creates a matrix from a quaternion rotation, vector translation and vector scale
       Equivalent for applying translation, rotation and scale matrices but much faster
       Source code from: http://glmatrix.net/docs/mat4.js.html
  
       params :
       @translation (Vec3 class object): translation vector
       @quaternion (Quat class object): rotation quaternion
       @scale (Vec3 class object): scale vector
  
       returns :
       @this (Mat4 class object): matrix after transformations
       ***/
  compose(e, t, s) {
    let i = this.elements;
    const r = t.elements[0], a = t.elements[1], h = t.elements[2], o = t.elements[3], l = r + r, d = a + a, c = h + h, u = r * l, f = r * d, y = r * c, _ = a * d, v = a * c, x = h * c, p = o * l, m = o * d, b = o * c, w = s.x, P = s.y, T = s.z;
    return i[0] = (1 - (_ + x)) * w, i[1] = (f + b) * w, i[2] = (y - m) * w, i[3] = 0, i[4] = (f - b) * P, i[5] = (1 - (u + x)) * P, i[6] = (v + p) * P, i[7] = 0, i[8] = (y + m) * T, i[9] = (v - p) * T, i[10] = (1 - (u + _)) * T, i[11] = 0, i[12] = e.x, i[13] = e.y, i[14] = e.z, i[15] = 1, this;
  }
  /***
       Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
       Equivalent for applying translation, rotation and scale matrices but much faster
       Source code from: http://glmatrix.net/docs/mat4.js.html
  
       params :
       @translation (Vec3 class object): translation vector
       @quaternion (Quat class object): rotation quaternion
       @scale (Vec3 class object): scale vector
       @origin (Vec3 class object): origin vector around which to scale and rotate
  
       returns :
       @this (Mat4 class object): matrix after transformations
       ***/
  composeFromOrigin(e, t, s, i) {
    let r = this.elements;
    const a = t.elements[0], h = t.elements[1], o = t.elements[2], l = t.elements[3], d = a + a, c = h + h, u = o + o, f = a * d, y = a * c, _ = a * u, v = h * c, x = h * u, p = o * u, m = l * d, b = l * c, w = l * u, P = s.x, T = s.y, A = s.z, M = i.x, E = i.y, R = i.z, D = (1 - (v + p)) * P, V = (y + w) * P, W = (_ - b) * P, H = (y - w) * T, C = (1 - (f + p)) * T, oe = (x + m) * T, le = (_ + b) * A, de = (x - m) * A, ce = (1 - (f + v)) * A;
    return r[0] = D, r[1] = V, r[2] = W, r[3] = 0, r[4] = H, r[5] = C, r[6] = oe, r[7] = 0, r[8] = le, r[9] = de, r[10] = ce, r[11] = 0, r[12] = e.x + M - (D * M + H * E + le * R), r[13] = e.y + E - (V * M + C * E + de * R), r[14] = e.z + R - (W * M + oe * E + ce * R), r[15] = 1, this;
  }
}
class I {
  constructor(e = 0, t = e) {
    this.type = "Vec2", this._x = e, this._y = t;
  }
  /***
   Getters and setters (with onChange callback)
   ***/
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  set x(e) {
    const t = e !== this._x;
    this._x = e, t && this._onChangeCallback && this._onChangeCallback();
  }
  set y(e) {
    const t = e !== this._y;
    this._y = e, t && this._onChangeCallback && this._onChangeCallback();
  }
  onChange(e) {
    return e && (this._onChangeCallback = e), this;
  }
  /***
       Sets the vector from values
  
       params:
       @x (float): X component of our vector
       @y (float): Y component of our vector
  
       returns:
       @this (Vec2): this vector after being set
       ***/
  set(e, t) {
    return this._x = e, this._y = t, this;
  }
  /***
       Adds a vector to this vector
  
       params:
       @vector (Vec2): vector to add
  
       returns:
       @this (Vec2): this vector after addition
       ***/
  add(e) {
    return this._x += e.x, this._y += e.y, this;
  }
  /***
       Adds a scalar to this vector
  
       params:
       @value (float): number to add
  
       returns:
       @this (Vec2): this vector after addition
       ***/
  addScalar(e) {
    return this._x += e, this._y += e, this;
  }
  /***
       Subtracts a vector from this vector
  
       params:
       @vector (Vec2): vector to use for subtraction
  
       returns:
       @this (Vec2): this vector after subtraction
       ***/
  sub(e) {
    return this._x -= e.x, this._y -= e.y, this;
  }
  /***
       Subtracts a scalar to this vector
  
       params:
       @value (float): number to use for subtraction
  
       returns:
       @this (Vec2): this vector after subtraction
       ***/
  subScalar(e) {
    return this._x -= e, this._y -= e, this;
  }
  /***
       Multiplies a vector with this vector
  
       params:
       @vector (Vec2): vector to use for multiplication
  
       returns:
       @this (Vec2): this vector after multiplication
       ***/
  multiply(e) {
    return this._x *= e.x, this._y *= e.y, this;
  }
  /***
       Multiplies a scalar with this vector
  
       params:
       @value (float): number to use for multiplication
  
       returns:
       @this (Vec2): this vector after multiplication
       ***/
  multiplyScalar(e) {
    return this._x *= e, this._y *= e, this;
  }
  /***
       Copy a vector into this vector
  
       params:
       @vector (Vec2): vector to copy
  
       returns:
       @this (Vec2): this vector after copy
       ***/
  copy(e) {
    return this._x = e.x, this._y = e.y, this;
  }
  /***
       Clone this vector
  
       returns:
       @vector (Vec2): cloned vector
       ***/
  clone() {
    return new I(this._x, this._y);
  }
  /***
       Merges this vector with a vector when values are NaN. Mostly used internally.
  
       params:
       @vector (Vec2): vector to use for sanitization
  
       returns:
       @vector (Vec2): sanitized vector
       ***/
  sanitizeNaNValuesWith(e) {
    return this._x = isNaN(this._x) ? e.x : parseFloat(this._x), this._y = isNaN(this._y) ? e.y : parseFloat(this._y), this;
  }
  /***
       Apply max values to this vector
  
       params:
       @vector (Vec2): vector representing max values
  
       returns:
       @vector (Vec2): vector with max values applied
       ***/
  max(e) {
    return this._x = Math.max(this._x, e.x), this._y = Math.max(this._y, e.y), this;
  }
  /***
       Apply min values to this vector
  
       params:
       @vector (Vec2): vector representing min values
  
       returns:
       @vector (Vec2): vector with min values applied
       ***/
  min(e) {
    return this._x = Math.min(this._x, e.x), this._y = Math.min(this._y, e.y), this;
  }
  /***
       Checks if 2 vectors are equal
  
       params:
       @vector (Vec2): vector to compare
  
       returns:
       @isEqual (bool): whether the vectors are equals or not
       ***/
  equals(e) {
    return this._x === e.x && this._y === e.y;
  }
  /***
       Normalize this vector
  
       returns:
       @this (Vec2): normalized vector
       ***/
  normalize() {
    let e = this._x * this._x + this._y * this._y;
    return e > 0 && (e = 1 / Math.sqrt(e)), this._x *= e, this._y *= e, this;
  }
  /***
       Calculates the dot product of 2 vectors
  
       params:
       @vector (Vec2): vector to use for dot product
  
       returns:
       @dotProduct (float): dot product of the 2 vectors
       ***/
  dot(e) {
    return this._x * e.x + this._y * e.y;
  }
}
class S {
  constructor(e = 0, t = e, s = e) {
    this.type = "Vec3", this._x = e, this._y = t, this._z = s;
  }
  /***
   Getters and setters (with onChange callback)
   ***/
  get x() {
    return this._x;
  }
  get y() {
    return this._y;
  }
  get z() {
    return this._z;
  }
  set x(e) {
    const t = e !== this._x;
    this._x = e, t && this._onChangeCallback && this._onChangeCallback();
  }
  set y(e) {
    const t = e !== this._y;
    this._y = e, t && this._onChangeCallback && this._onChangeCallback();
  }
  set z(e) {
    const t = e !== this._z;
    this._z = e, t && this._onChangeCallback && this._onChangeCallback();
  }
  onChange(e) {
    return e && (this._onChangeCallback = e), this;
  }
  /***
       Sets the vector from values
  
       params:
       @x (float): X component of our vector
       @y (float): Y component of our vector
       @z (float): Z component of our vector
  
       returns:
       @this (Vec2): this vector after being set
       ***/
  set(e, t, s) {
    return this._x = e, this._y = t, this._z = s, this;
  }
  /***
       Adds a vector to this vector
  
       params:
       @vector (Vec3): vector to add
  
       returns:
       @this (Vec3): this vector after addition
       ***/
  add(e) {
    return this._x += e.x, this._y += e.y, this._z += e.z, this;
  }
  /***
       Adds a scalar to this vector
  
       params:
       @value (float): number to add
  
       returns:
       @this (Vec3): this vector after addition
       ***/
  addScalar(e) {
    return this._x += e, this._y += e, this._z += e, this;
  }
  /***
       Subtracts a vector from this vector
  
       params:
       @vector (Vec3): vector to use for subtraction
  
       returns:
       @this (Vec3): this vector after subtraction
       ***/
  sub(e) {
    return this._x -= e.x, this._y -= e.y, this._z -= e.z, this;
  }
  /***
       Subtracts a scalar to this vector
  
       params:
       @value (float): number to use for subtraction
  
       returns:
       @this (Vec3): this vector after subtraction
       ***/
  subScalar(e) {
    return this._x -= e, this._y -= e, this._z -= e, this;
  }
  /***
       Multiplies a vector with this vector
  
       params:
       @vector (Vec3): vector to use for multiplication
  
       returns:
       @this (Vec3): this vector after multiplication
       ***/
  multiply(e) {
    return this._x *= e.x, this._y *= e.y, this._z *= e.z, this;
  }
  /***
       Multiplies a scalar with this vector
  
       params:
       @value (float): number to use for multiplication
  
       returns:
       @this (Vec3): this vector after multiplication
       ***/
  multiplyScalar(e) {
    return this._x *= e, this._y *= e, this._z *= e, this;
  }
  /***
       Copy a vector into this vector
  
       params:
       @vector (Vec3): vector to copy
  
       returns:
       @this (Vec3): this vector after copy
       ***/
  copy(e) {
    return this._x = e.x, this._y = e.y, this._z = e.z, this;
  }
  /***
       Clone this vector
  
       returns:
       @vector (Vec3): cloned vector
       ***/
  clone() {
    return new S(this._x, this._y, this._z);
  }
  /***
       Merges this vector with a vector when values are NaN. Mostly used internally.
  
       params:
       @vector (Vec3): vector to use for sanitization
  
       returns:
       @vector (Vec3): sanitized vector
       ***/
  sanitizeNaNValuesWith(e) {
    return this._x = isNaN(this._x) ? e.x : parseFloat(this._x), this._y = isNaN(this._y) ? e.y : parseFloat(this._y), this._z = isNaN(this._z) ? e.z : parseFloat(this._z), this;
  }
  /***
       Apply max values to this vector
  
       params:
       @vector (Vec3): vector representing max values
  
       returns:
       @vector (Vec3): vector with max values applied
       ***/
  max(e) {
    return this._x = Math.max(this._x, e.x), this._y = Math.max(this._y, e.y), this._z = Math.max(this._z, e.z), this;
  }
  /***
       Apply min values to this vector
  
       params:
       @vector (Vec3): vector representing min values
  
       returns:
       @vector (Vec3): vector with min values applied
       ***/
  min(e) {
    return this._x = Math.min(this._x, e.x), this._y = Math.min(this._y, e.y), this._z = Math.min(this._z, e.z), this;
  }
  /***
       Checks if 2 vectors are equal
  
       returns:
       @isEqual (bool): whether the vectors are equals or not
       ***/
  equals(e) {
    return this._x === e.x && this._y === e.y && this._z === e.z;
  }
  /***
       Normalize this vector
  
       returns:
       @this (Vec3): normalized vector
       ***/
  normalize() {
    let e = this._x * this._x + this._y * this._y + this._z * this._z;
    return e > 0 && (e = 1 / Math.sqrt(e)), this._x *= e, this._y *= e, this._z *= e, this;
  }
  /***
       Calculates the dot product of 2 vectors
  
       returns:
       @dotProduct (float): dot product of the 2 vectors
       ***/
  dot(e) {
    return this._x * e.x + this._y * e.y + this._z * e.z;
  }
  /***
       Apply a matrix 4 to a point (vec3)
       Useful to convert a point position from plane local world to webgl space using projection view matrix for example
       Source code from: http://glmatrix.net/docs/vec3.js.html
  
       params :
       @matrix (array): 4x4 matrix used
  
       returns :
       @this (Vec3): this vector after matrix application
       ***/
  applyMat4(e) {
    const t = this._x, s = this._y, i = this._z, r = e.elements;
    let a = r[3] * t + r[7] * s + r[11] * i + r[15];
    return a = a || 1, this._x = (r[0] * t + r[4] * s + r[8] * i + r[12]) / a, this._y = (r[1] * t + r[5] * s + r[9] * i + r[13]) / a, this._z = (r[2] * t + r[6] * s + r[10] * i + r[14]) / a, this;
  }
  /***
       Apply a quaternion (rotation in 3D space) to this vector
  
       params :
       @quaternion (Quat): quaternion to use
  
       returns :
       @this (Vec3): this vector after applying the transformation
       ***/
  applyQuat(e) {
    const t = this._x, s = this._y, i = this._z, r = e.elements[0], a = e.elements[1], h = e.elements[2], o = e.elements[3], l = o * t + a * i - h * s, d = o * s + h * t - r * i, c = o * i + r * s - a * t, u = -r * t - a * s - h * i;
    return this._x = l * o + u * -r + d * -h - c * -a, this._y = d * o + u * -a + c * -r - l * -h, this._z = c * o + u * -h + l * -a - d * -r, this;
  }
  /***
       Project 3D coordinate to 2D point
  
       params:
       @camera (Camera): camera to use for projection
       ***/
  project(e) {
    return this.applyMat4(e.viewMatrix).applyMat4(e.projectionMatrix), this;
  }
  /***
       Unproject 2D point to 3D coordinate
  
       params:
       @camera (Camera): camera to use for projection
       ***/
  unproject(e) {
    return this.applyMat4(e.projectionMatrix.getInverse()).applyMat4(e.worldMatrix), this;
  }
}
const ae = new I(), Ke = new S(), Je = new B();
class X {
  constructor(e, {
    isFBOTexture: t = !1,
    fromTexture: s = !1,
    loader: i,
    // texture sampler name
    sampler: r,
    // floating point textures
    floatingPoint: a = "none",
    // texture parameters
    premultiplyAlpha: h = !1,
    anisotropy: o = 1,
    generateMipmap: l = null,
    wrapS: d,
    wrapT: c,
    minFilter: u,
    magFilter: f
  } = {}) {
    if (this.type = "Texture", e = e && e.renderer || e, !e || e.type !== "Renderer")
      O(this.type + ": Renderer not passed as first argument", e);
    else if (!e.gl) {
      e.production || O(this.type + ": Unable to create a " + this.type + " because the Renderer WebGL context is not defined");
      return;
    }
    if (this.renderer = e, this.gl = this.renderer.gl, this.uuid = he(), this._globalParameters = {
      // global gl context parameters
      unpackAlignment: 4,
      flipY: !t,
      premultiplyAlpha: !1,
      shouldPremultiplyAlpha: h,
      // texImage2D properties
      floatingPoint: a,
      type: this.gl.UNSIGNED_BYTE,
      internalFormat: this.gl.RGBA,
      format: this.gl.RGBA
    }, this.parameters = {
      // per texture parameters
      anisotropy: o,
      generateMipmap: l,
      wrapS: d || this.gl.CLAMP_TO_EDGE,
      wrapT: c || this.gl.CLAMP_TO_EDGE,
      minFilter: u || this.gl.LINEAR,
      magFilter: f || this.gl.LINEAR,
      _shouldUpdate: !0
    }, this._initState(), this.sourceType = t ? "fbo" : "empty", this._useCache = !0, this._samplerName = r, this._sampler = {
      isActive: !1,
      isTextureBound: !1,
      texture: this.gl.createTexture()
      // always create a gl texture
    }, this._textureMatrix = {
      matrix: new B(),
      isActive: !1
    }, this._size = {
      width: 1,
      height: 1
    }, this.scale = new I(1), this.scale.onChange(() => this.resize()), this.offset = new I(), this.offset.onChange(() => this.resize()), this._loader = i, this._sourceLoaded = !1, this._uploaded = !1, this._willUpdate = !1, this.shouldUpdate = !1, this._forceUpdate = !1, this.userData = {}, this._canDraw = !1, s) {
      this._copyOnInit = !0, this._copiedFrom = s;
      return;
    }
    this._copyOnInit = !1, this._initTexture();
  }
  /***
   Init per-texture parameters state
   Called on init and on context restoration to force parameters settings
   ***/
  _initState() {
    this._state = {
      anisotropy: 1,
      generateMipmap: !1,
      wrapS: null,
      wrapT: null,
      minFilter: null,
      magFilter: this.gl.LINEAR
      // default to gl.LINEAR
    };
  }
  /***
   Init our texture object
   ***/
  _initTexture() {
    this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture), this.sourceType === "empty" && (this._globalParameters.flipY = !1, this._updateGlobalTexParameters(), this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 1, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255])), this._canDraw = !0);
  }
  /*** RESTORING CONTEXT ***/
  /***
   Restore a WebGL texture that is a copy
   Depending on whether it's a copy from start or not, just reset its uniforms or run the full init
   And finally copy our original texture back again
   ***/
  _restoreFromTexture() {
    this._copyOnInit || this._initTexture(), this._parent && (this._setTextureUniforms(), this._setSize()), this.copy(this._copiedFrom), this._canDraw = !0;
  }
  /***
   Restore our WebGL texture
   If it is an original texture, just re run the init function and eventually reset its source
   If it is a texture set from another texture, wait for the original texture to be ready first
   ***/
  _restoreContext() {
    if (this._canDraw = !1, this._sampler.texture = this.gl.createTexture(), this._sampler.isActive = !1, this._sampler.isTextureBound = !1, this._textureMatrix.isActive = !1, this._initState(), this._state.generateMipmap = !1, this.parameters._shouldUpdate = !0, !this._copiedFrom)
      this._initTexture(), this._parent && this._setParent(), this.source && (this.setSource(this.source), this.sourceType === "image" ? this.renderer.cache.addTexture(this) : this.needUpdate()), this._canDraw = !0;
    else {
      const e = this.renderer.nextRender.add(() => {
        this._copiedFrom._canDraw && (this._restoreFromTexture(), e.keep = !1);
      }, !0);
    }
  }
  /*** ADD PARENT ***/
  /***
   Adds a parent to a texture
   Sets its index, its parent and add it to the parent textures array as well
   Then runs _setParent() to set the size and uniforms if needed
   ***/
  addParent(e) {
    if (!e || e.type !== "Plane" && e.type !== "PingPongPlane" && e.type !== "ShaderPass" && e.type !== "RenderTarget") {
      this.renderer.production || g(this.type + ": cannot add texture as a child of ", e, " because it is not a valid parent");
      return;
    }
    this._parent = e, this.index = this._parent.textures.length, this._parent.textures.push(this), this._setParent();
  }
  /***
   Sets the parent
   Basically sets the uniforms names and locations and sizes
   ***/
  _setParent() {
    if (this._sampler.name = this._samplerName || "uSampler" + this.index, this._textureMatrix.name = this._samplerName ? this._samplerName + "Matrix" : "uTextureMatrix" + this.index, this._parent._program) {
      if (!this._parent._program.compiled) {
        this.renderer.production || g(this.type + ": Unable to create the texture because the program is not valid");
        return;
      }
      if (this._setTextureUniforms(), this._copyOnInit) {
        const e = this.renderer.nextRender.add(() => {
          this._copiedFrom._canDraw && this._copiedFrom._uploaded && (this.copy(this._copiedFrom), e.keep = !1);
        }, !0);
        return;
      }
      this.source ? this._parent.loader && this._parent.loader._addSourceToParent(this.source, this.sourceType) : this._size = {
        width: this._parent._boundingRect.document.width,
        height: this._parent._boundingRect.document.height
      }, this._setSize();
    } else
      this._parent.type === "RenderTarget" && (this._size = {
        width: this._parent._size && this._parent._size.width || this.renderer._boundingRect.width,
        height: this._parent._size && this._parent._size.height || this.renderer._boundingRect.height
      }, this._upload(), this._updateTexParameters(), this._canDraw = !0);
  }
  /***
       Checks if this texture has a parent
  
       return:
       @hasParent (bool): whether this texture has a parent or not
       ***/
  hasParent() {
    return !!this._parent;
  }
  /*** SEND DATA TO THE GPU ***/
  /***
   Check if our textures is effectively used in our shaders
   If so, set it to active, get its uniform locations and bind it to our texture unit
   ***/
  _setTextureUniforms() {
    const e = this._parent._program.activeUniforms;
    for (let t = 0; t < e.textures.length; t++)
      e.textures[t] === this._sampler.name && (this._sampler.isActive = !0, this.renderer.useProgram(this._parent._program), this._sampler.location = this.gl.getUniformLocation(this._parent._program.program, this._sampler.name), e.textureMatrices.find(
        (i) => i === this._textureMatrix.name
      ) && (this._textureMatrix.isActive = !0, this._textureMatrix.location = this.gl.getUniformLocation(this._parent._program.program, this._textureMatrix.name)), this.gl.uniform1i(this._sampler.location, this.index));
  }
  /***
       This copies an already existing Texture object to our texture
  
       params:
       @texture (Texture): texture to set from
       ***/
  copy(e) {
    if (!e || e.type !== "Texture") {
      this.renderer.production || g(this.type + ": Unable to set the texture from texture:", e);
      return;
    }
    this._globalParameters = Object.assign({}, e._globalParameters), this._state = Object.assign({}, e._state), this.parameters.generateMipmap = e.parameters.generateMipmap, this._state.generateMipmap = null, this._size = e._size, !this._sourceLoaded && e._sourceLoaded && this._onSourceLoadedCallback && this._onSourceLoadedCallback(), this._sourceLoaded = e._sourceLoaded, !this._uploaded && e._uploaded && this._onSourceUploadedCallback && this._onSourceUploadedCallback(), this._uploaded = e._uploaded, this.sourceType = e.sourceType, this.source = e.source, this._videoFrameCallbackID = e._videoFrameCallbackID, this._sampler.texture = e._sampler.texture, this._copiedFrom = e, this._parent && this._parent._program && (!this._canDraw || !this._textureMatrix.matrix) && (this._setSize(), this._canDraw = !0), this._updateTexParameters(), this.renderer.needRender();
  }
  /*** LOADING SOURCES ***/
  /***
       This uses our source as texture
  
       params:
       @source (images/video/canvas): either an image, a video or a canvas
       ***/
  setSource(e) {
    this._sourceLoaded || this.renderer.nextRender.add(() => this._onSourceLoadedCallback && this._onSourceLoadedCallback());
    const t = e.tagName.toUpperCase() === "IMG" ? "image" : e.tagName.toLowerCase();
    if ((t === "video" || t === "canvas") && (this._useCache = !1), this._useCache) {
      const s = this.renderer.cache.getTextureFromSource(e);
      if (s && s.uuid !== this.uuid) {
        this._uploaded || (this.renderer.nextRender.add(() => this._onSourceUploadedCallback && this._onSourceUploadedCallback()), this._uploaded = !0), this.copy(s), this.resize();
        return;
      }
    }
    if (this.sourceType === "empty" || this.sourceType !== t)
      if (t === "video")
        this._willUpdate = !1, this.shouldUpdate = !0;
      else if (t === "canvas")
        this._willUpdate = !0, this.shouldUpdate = !0;
      else if (t === "image")
        this._willUpdate = !1, this.shouldUpdate = !1;
      else {
        this.renderer.production || g(this.type + ": this HTML tag could not be converted into a texture:", e.tagName);
        return;
      }
    this.source = e, this.sourceType = t, this._size = {
      width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
      height: this.source.naturalHeight || this.source.height || this.source.videoHeight
    }, this._sourceLoaded = !0, this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture), this.resize(), this._globalParameters.flipY = !0, this._globalParameters.premultiplyAlpha = this._globalParameters.shouldPremultiplyAlpha, this.sourceType === "image" && (this.parameters.generateMipmap = this.parameters.generateMipmap || this.parameters.generateMipmap === null, this.parameters._shouldUpdate = this.parameters.generateMipmap, this._state.generateMipmap = !1, this._upload()), this.renderer.needRender();
  }
  /*** TEXTURE PARAMETERS ***/
  /***
   Updates textures parameters that depends on global WebGL context state
   Typically unpacking, flipY and premultiplied alpha
   Usually called before uploading a texture to the GPU
   ***/
  _updateGlobalTexParameters() {
    this.renderer.state.unpackAlignment !== this._globalParameters.unpackAlignment && (this.gl.pixelStorei(this.gl.UNPACK_ALIGNMENT, this._globalParameters.unpackAlignment), this.renderer.state.unpackAlignment = this._globalParameters.unpackAlignment), this.renderer.state.flipY !== this._globalParameters.flipY && (this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, this._globalParameters.flipY), this.renderer.state.flipY = this._globalParameters.flipY), this.renderer.state.premultiplyAlpha !== this._globalParameters.premultiplyAlpha && (this.gl.pixelStorei(this.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, this._globalParameters.premultiplyAlpha), this.renderer.state.premultiplyAlpha = this._globalParameters.premultiplyAlpha), this._globalParameters.floatingPoint === "half-float" ? this.renderer._isWebGL2 && this.renderer.extensions.EXT_color_buffer_float ? (this._globalParameters.internalFormat = this.gl.RGBA16F, this._globalParameters.type = this.gl.HALF_FLOAT) : this.renderer.extensions.OES_texture_half_float ? this._globalParameters.type = this.renderer.extensions.OES_texture_half_float.HALF_FLOAT_OES : this.renderer.production || g(this.type + ": could not use half-float textures because the extension is not available") : this._globalParameters.floatingPoint === "float" && (this.renderer._isWebGL2 && this.renderer.extensions.EXT_color_buffer_float ? (this._globalParameters.internalFormat = this.gl.RGBA16F, this._globalParameters.type = this.gl.FLOAT) : this.renderer.extensions.OES_texture_float ? this._globalParameters.type = this.renderer.extensions.OES_texture_half_float.FLOAT : this.renderer.production || g(this.type + ": could not use float textures because the extension is not available"));
  }
  /***
   Updates per-textures parameters
   Wrapping, filters, anisotropy and mipmaps generation
   Usually called after uploading a texture to the GPU
   ***/
  _updateTexParameters() {
    this.index && this.renderer.state.activeTexture !== this.index && this._bindTexture(), this.parameters.wrapS !== this._state.wrapS && (!this.renderer._isWebGL2 && (!N(this._size.width) || !N(this._size.height)) && (this.parameters.wrapS = this.gl.CLAMP_TO_EDGE), this.parameters.wrapS !== this.gl.REPEAT && this.parameters.wrapS !== this.gl.CLAMP_TO_EDGE && this.parameters.wrapS !== this.gl.MIRRORED_REPEAT && (this.renderer.production || g(this.type + ": Wrong wrapS value", this.parameters.wrapS, "for this texture:", this, `
gl.CLAMP_TO_EDGE wrapping will be used instead`), this.parameters.wrapS = this.gl.CLAMP_TO_EDGE), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.parameters.wrapS), this._state.wrapS = this.parameters.wrapS), this.parameters.wrapT !== this._state.wrapT && (!this.renderer._isWebGL2 && (!N(this._size.width) || !N(this._size.height)) && (this.parameters.wrapT = this.gl.CLAMP_TO_EDGE), this.parameters.wrapT !== this.gl.REPEAT && this.parameters.wrapT !== this.gl.CLAMP_TO_EDGE && this.parameters.wrapT !== this.gl.MIRRORED_REPEAT && (this.renderer.production || g(this.type + ": Wrong wrapT value", this.parameters.wrapT, "for this texture:", this, `
gl.CLAMP_TO_EDGE wrapping will be used instead`), this.parameters.wrapT = this.gl.CLAMP_TO_EDGE), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.parameters.wrapT), this._state.wrapT = this.parameters.wrapT), this.parameters.generateMipmap && !this._state.generateMipmap && this.source && (!this.renderer._isWebGL2 && (!N(this._size.width) || !N(this._size.height)) ? this.parameters.generateMipmap = !1 : this.gl.generateMipmap(this.gl.TEXTURE_2D), this._state.generateMipmap = this.parameters.generateMipmap), this.parameters.minFilter !== this._state.minFilter && (!this.renderer._isWebGL2 && (!N(this._size.width) || !N(this._size.height)) && (this.parameters.minFilter = this.gl.LINEAR), !this.parameters.generateMipmap && this.parameters.generateMipmap !== null && (this.parameters.minFilter = this.gl.LINEAR), this.parameters.minFilter !== this.gl.LINEAR && this.parameters.minFilter !== this.gl.NEAREST && this.parameters.minFilter !== this.gl.NEAREST_MIPMAP_NEAREST && this.parameters.minFilter !== this.gl.LINEAR_MIPMAP_NEAREST && this.parameters.minFilter !== this.gl.NEAREST_MIPMAP_LINEAR && this.parameters.minFilter !== this.gl.LINEAR_MIPMAP_LINEAR && (this.renderer.production || g(this.type + ": Wrong minFilter value", this.parameters.minFilter, "for this texture:", this, `
gl.LINEAR filtering will be used instead`), this.parameters.minFilter = this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.parameters.minFilter), this._state.minFilter = this.parameters.minFilter), this.parameters.magFilter !== this._state.magFilter && (!this.renderer._isWebGL2 && (!N(this._size.width) || !N(this._size.height)) && (this.parameters.magFilter = this.gl.LINEAR), this.parameters.magFilter !== this.gl.LINEAR && this.parameters.magFilter !== this.gl.NEAREST && (this.renderer.production || g(this.type + ": Wrong magFilter value", this.parameters.magFilter, "for this texture:", this, `
gl.LINEAR filtering will be used instead`), this.parameters.magFilter = this.gl.LINEAR), this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.parameters.magFilter), this._state.magFilter = this.parameters.magFilter);
    const e = this.renderer.extensions.EXT_texture_filter_anisotropic;
    if (e && this.parameters.anisotropy !== this._state.anisotropy) {
      const t = this.gl.getParameter(e.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      this.parameters.anisotropy = Math.max(1, Math.min(this.parameters.anisotropy, t)), this.gl.texParameterf(this.gl.TEXTURE_2D, e.TEXTURE_MAX_ANISOTROPY_EXT, this.parameters.anisotropy), this._state.anisotropy = this.parameters.anisotropy;
    }
  }
  /***
       Sets the texture wrapping for the texture coordinate S
  
       params:
       @wrapS (GLenum): WebGL constant specifying the texture wrapping function for the texture coordinate S
       ***/
  setWrapS(e) {
    this.parameters.wrapS !== e && (this.parameters.wrapS = e, this.parameters._shouldUpdate = !0);
  }
  /***
       Sets the texture wrapping for the texture coordinate T
  
       params:
       @wrapT (GLenum): WebGL constant specifying the texture wrapping function for the texture coordinate T
       ***/
  setWrapT(e) {
    this.parameters.wrapT !== e && (this.parameters.wrapT = e, this.parameters._shouldUpdate = !0);
  }
  /***
       Sets the texture minifaction filter value
  
       params:
       @minFilter (GLenum): WebGL constant specifying the texture minification filter
       ***/
  setMinFilter(e) {
    this.parameters.minFilter !== e && (this.parameters.minFilter = e, this.parameters._shouldUpdate = !0);
  }
  /***
       Sets the texture magnifaction filter value
  
       params:
       @magFilter (GLenum): WebGL constant specifying the texture magnifaction filter
       ***/
  setMagFilter(e) {
    this.parameters.magFilter !== e && (this.parameters.magFilter = e, this.parameters._shouldUpdate = !0);
  }
  /***
       Sets the texture anisotropy
  
       params:
       @anisotropy (int): Texture anisotropy value
       ***/
  setAnisotropy(e) {
    e = isNaN(e) ? this.parameters.anisotropy : e, this.parameters.anisotropy !== e && (this.parameters.anisotropy = e, this.parameters._shouldUpdate = !0);
  }
  /***
   This forces a texture to be updated on the next draw call
   ***/
  needUpdate() {
    this._forceUpdate = !0;
  }
  /***
   This uses the requestVideoFrameCallback API to update the texture each time a new frame is displayed
   ***/
  _videoFrameCallback() {
    this._willUpdate = !0, this.source.requestVideoFrameCallback(() => this._videoFrameCallback());
  }
  /***
   This updloads our texture to the GPU
   Called on init or inside our drawing loop if shouldUpdate property is set to true
   Typically used by videos or canvas
   ***/
  _upload() {
    this._updateGlobalTexParameters(), this.source ? this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this._globalParameters.internalFormat, this._globalParameters.format, this._globalParameters.type, this.source) : this.sourceType === "fbo" && this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this._globalParameters.internalFormat, this._size.width, this._size.height, 0, this._globalParameters.format, this._globalParameters.type, this.source || null), this._uploaded || (this.renderer.nextRender.add(() => this._onSourceUploadedCallback && this._onSourceUploadedCallback()), this._uploaded = !0);
  }
  /*** TEXTURE SIZINGS ***/
  /***
       This is used to calculate how to crop/center an texture
  
       returns:
       @sizes (obj): an object containing plane sizes, source sizes and x and y offset to center the source in the plane
       ***/
  _getSizes() {
    if (this.sourceType === "fbo")
      return {
        parentWidth: this._parent._boundingRect.document.width,
        parentHeight: this._parent._boundingRect.document.height,
        sourceWidth: this._parent._boundingRect.document.width,
        sourceHeight: this._parent._boundingRect.document.height,
        xOffset: 0,
        yOffset: 0
      };
    const e = this._parent.scale ? ae.set(this._parent.scale.x, this._parent.scale.y) : ae.set(1, 1), t = this._parent._boundingRect.document.width * e.x, s = this._parent._boundingRect.document.height * e.y, i = this._size.width, r = this._size.height, a = i / r, h = t / s;
    let o = 0, l = 0;
    return h > a ? l = Math.min(0, s - t * (1 / a)) : h < a && (o = Math.min(0, t - s * a)), {
      parentWidth: t,
      parentHeight: s,
      sourceWidth: i,
      sourceHeight: r,
      xOffset: o,
      yOffset: l
    };
  }
  /***
       Set the texture scale and then update its matrix
  
       params:
       @scale (Vec2 object): scale to apply on X and Y axes
       ***/
  setScale(e) {
    if (!e.type || e.type !== "Vec2") {
      this.renderer.production || g(this.type + ": Cannot set scale because the parameter passed is not of Vec2 type:", e);
      return;
    }
    e.sanitizeNaNValuesWith(this.scale).max(ae.set(1e-3, 1e-3)), e.equals(this.scale) || (this.scale.copy(e), this.resize());
  }
  setOffset(e) {
    if (!e.type || e.type !== "Vec2") {
      this.renderer.production || g(this.type + ": Cannot set offset because the parameter passed is not of Vec2 type:", scale);
      return;
    }
    e.sanitizeNaNValuesWith(this.offset), e.equals(this.offset) || (this.offset.copy(e), this.resize());
  }
  /***
   Gets our texture and parent sizes and tells our texture matrix to update based on those values
   ***/
  _setSize() {
    if (this._parent && this._parent._program) {
      const e = this._getSizes();
      this._updateTextureMatrix(e);
    }
  }
  /***
   This is used to crop/center a texture
   If the texture is using texture matrix then we just have to update its matrix
   If it is a render pass texture we also upload the texture with its new size on the GPU
   ***/
  resize() {
    this.sourceType === "fbo" ? (this._size = {
      width: this._parent._size && this._parent._size.width || this._parent._boundingRect.document.width,
      height: this._parent._size && this._parent._size.height || this._parent._boundingRect.document.height
    }, this._copiedFrom || (this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture), this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this._globalParameters.internalFormat, this._size.width, this._size.height, 0, this._globalParameters.format, this._globalParameters.type, null))) : this.source && (this._size = {
      width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
      height: this.source.naturalHeight || this.source.height || this.source.videoHeight
    }), this._setSize();
  }
  /***
       This updates our textures matrix uniform based on plane and sources sizes
  
       params:
       @sizes (object): object containing plane sizes, source sizes and x and y offset to center the source in the plane
       ***/
  _updateTextureMatrix(e) {
    const t = Ke.set(
      e.parentWidth / (e.parentWidth - e.xOffset),
      e.parentHeight / (e.parentHeight - e.yOffset),
      1
    );
    t.x /= this.scale.x, t.y /= this.scale.y, this._textureMatrix.matrix = Je.setFromArray([
      t.x,
      0,
      0,
      0,
      0,
      t.y,
      0,
      0,
      0,
      0,
      1,
      0,
      (1 - t.x) / 2 + this.offset.x,
      (1 - t.y) / 2 + this.offset.y,
      0,
      1
    ]), this._updateMatrixUniform();
  }
  /***
   This updates our textures matrix GL uniform
   ***/
  _updateMatrixUniform() {
    this._textureMatrix.isActive && (this.renderer.useProgram(this._parent._program), this.gl.uniformMatrix4fv(this._textureMatrix.location, !1, this._textureMatrix.matrix.elements));
  }
  /***
   This calls our loading callback and set our media as texture source
   ***/
  _onSourceLoaded(e) {
    this.setSource(e), this.sourceType === "image" && this.renderer.cache.addTexture(this);
  }
  /*** DRAWING ***/
  /***
       This is used to set the WebGL context active texture and bind it
  
       params:
       @texture (texture object): Our texture object containing our WebGL texture and its index
       ***/
  _bindTexture() {
    this._canDraw && (this.renderer.state.activeTexture !== this.index && (this.gl.activeTexture(this.gl.TEXTURE0 + this.index), this.renderer.state.activeTexture = this.index), this.gl.bindTexture(this.gl.TEXTURE_2D, this._sampler.texture), this._sampler.isTextureBound || (this._sampler.isTextureBound = !!this.gl.getParameter(this.gl.TEXTURE_BINDING_2D), this._sampler.isTextureBound && this.renderer.needRender()));
  }
  /***
   This is called to draw the texture
   ***/
  _draw() {
    this._sampler.isActive && (this._bindTexture(), this.sourceType === "video" && this.source && !this._videoFrameCallbackID && this.source.readyState >= this.source.HAVE_CURRENT_DATA && !this.source.paused && (this._willUpdate = !0), (this._forceUpdate || this._willUpdate && this.shouldUpdate) && (this._state.generateMipmap = !1, this._upload()), this.sourceType === "video" && (this._willUpdate = !1), this._forceUpdate = !1), this.parameters._shouldUpdate && (this._updateTexParameters(), this.parameters._shouldUpdate = !1);
  }
  /*** EVENTS ***/
  /***
       This is called each time a source has been loaded for the first time
       TODO useless?
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our texture to handle chaining
       ***/
  onSourceLoaded(e) {
    return e && (this._onSourceLoadedCallback = e), this;
  }
  /***
       This is called each time a texture has been uploaded to the GPU for the first time
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our texture to handle chaining
       ***/
  onSourceUploaded(e) {
    return e && (this._onSourceUploadedCallback = e), this;
  }
  /*** DESTROYING ***/
  /***
       This is used to destroy a texture and free the memory space
       Usually used on a plane/shader pass/render target removal
  
       params:
       @force (bool, optional): force the texture to be deleted even if cached
       ***/
  _dispose(e = !1) {
    this.sourceType === "video" || this.sourceType === "image" && !this.renderer.state.isActive ? (this._loader && this._loader._removeSource(this), this.source = null) : this.sourceType === "canvas" && (this.source.width = this.source.width, this.source = null), this._parent = null, this.gl && !this._copiedFrom && (e || this.sourceType !== "image" || !this.renderer.state.isActive) && (this._canDraw = !1, this.renderer.cache.removeTexture(this), this.gl.activeTexture(this.gl.TEXTURE0 + this.index), this.gl.bindTexture(this.gl.TEXTURE_2D, null), this.gl.deleteTexture(this._sampler.texture));
  }
}
class et {
  constructor(e, t = "anonymous") {
    if (this.type = "TextureLoader", e = e && e.renderer || e, !e || e.type !== "Renderer")
      O(this.type + ": Renderer not passed as first argument", e);
    else if (!e.gl) {
      O(this.type + ": Renderer WebGL context is undefined", e);
      return;
    }
    this.renderer = e, this.gl = this.renderer.gl, this.crossOrigin = t, this.elements = [];
  }
  /***
       Keep a track of all sources loaded via this loader with an els array
       This allows to get clean refs to the event listeners to be able to remove them later
  
       params:
       @source (html element): html image, video or canvas element that has been loaded
       @texture (Texture class object): our newly created texture that will use that source
       @successCallback (function): reference to our success callback
       @errorCallback (function): reference to our error callback
       ***/
  _addElement(e, t, s, i) {
    const r = {
      source: e,
      texture: t,
      load: this._sourceLoaded.bind(this, e, t, s),
      error: this._sourceLoadError.bind(this, e, i)
    };
    return this.elements.push(r), r;
  }
  /***
       Handles media loading errors
  
       params:
       @source (html element): html image or video element that has failed to load
       @callback (function): function to execute
       @error (object): loading error
       ***/
  _sourceLoadError(e, t, s) {
    t && t(e, s);
  }
  /***
       Handles media loading success
  
       params:
       @source (html element): html image, video or canvas element that has been loaded
       @texture (Texture class object): our newly created texture that will use that source
       @callback (function): function to execute
       ***/
  _sourceLoaded(e, t, s) {
    t._sourceLoaded || (t._onSourceLoaded(e), this._parent && (this._increment && this._increment(), this.renderer.nextRender.add(() => this._parent._onLoadingCallback && this._parent._onLoadingCallback(t))), s && s(t));
  }
  /***
       Get the source type based on its file extension if it's a string or it's tag name if its a HTML element
  
       params:
       @source (html element or string): html image, video, canvas element or source url
  
       returns :
       @sourceType (string): either "image", "video", "canvas" or null if source type cannot be determined
       ***/
  _getSourceType(e) {
    let t;
    return typeof e == "string" ? e.match(/\.(jpeg|jpg|jfif|pjpeg|pjp|gif|bmp|png|webp|svg|avif|apng)$/) !== null ? t = "image" : e.match(/\.(webm|mp4|mpg|mpeg|avi|ogg|ogm|ogv|mov|av1)$/) !== null && (t = "video") : e.tagName.toUpperCase() === "IMG" ? t = "image" : e.tagName.toUpperCase() === "VIDEO" ? t = "video" : e.tagName.toUpperCase() === "CANVAS" && (t = "canvas"), t;
  }
  /***
       Create an image HTML element based on an image source url
  
       params:
       @source (string): source url
  
       returns :
       @image (HTML image element): an HTML image element
       ***/
  _createImage(e) {
    if (typeof e == "string" || !e.hasAttribute("crossOrigin")) {
      const t = new Image();
      return t.crossOrigin = this.crossOrigin, typeof e == "string" ? t.src = e : (t.src = e.src, e.hasAttribute("data-sampler") && t.setAttribute("data-sampler", e.getAttribute("data-sampler"))), t;
    } else
      return e;
  }
  /***
       Create a video HTML element based on a video source url
  
       params:
       @source (string): source url
  
       returns :
       @video (HTML video element): an HTML video element
       ***/
  _createVideo(e) {
    if (typeof e == "string" || e.getAttribute("crossOrigin") === null) {
      const t = document.createElement("video");
      return t.crossOrigin = this.crossOrigin, typeof e == "string" ? t.src = e : (t.src = e.src, e.hasAttribute("data-sampler") && t.setAttribute("data-sampler", e.getAttribute("data-sampler"))), t;
    } else
      return e;
  }
  /***
       This method loads one source
       It checks what type of source it is then use the right loader
  
       params:
       @source (html element): html image, video or canvas element
       @textureOptions (object): parameters to apply to the textures, such as sampler name, repeat wrapping, filters, anisotropy...
       @successCallback (function): function to execute when the source has been loaded
       @errorCallback (function): function to execute if the source fails to load
       ***/
  loadSource(e, t, s, i) {
    switch (this._getSourceType(e)) {
      case "image":
        this.loadImage(e, t, s, i);
        break;
      case "video":
        this.loadVideo(e, t, s, i);
        break;
      case "canvas":
        this.loadCanvas(e, t, s);
        break;
      default:
        this._sourceLoadError(e, i, "this source could not be converted into a texture: " + e);
        break;
    }
  }
  /***
       This method loads an array of sources by calling loadSource() for each one of them
  
       params:
       @sources (array of html elements / sources url): array of html images, videos, canvases element or sources url
       @texturesOptions (object): parameters to apply to the textures, such as sampler name, repeat wrapping, filters, anisotropy...
       @successCallback (function): function to execute when each source has been loaded
       @errorCallback (function): function to execute if a source fails to load
       ***/
  loadSources(e, t, s, i) {
    for (let r = 0; r < e.length; r++)
      this.loadSource(e[r], t, s, i);
  }
  /***
       This method loads an image
       Creates a new texture object right away and once the image is loaded it uses it as our WebGL texture
  
       params:
       @source (image): html image element
       @textureOptions (object): parameters to apply to the textures, such as sampler name, repeat wrapping, filters, anisotropy...
       @successCallback (function): function to execute when the source has been loaded
       @errorCallback (function): function to execute if the source fails to load
       ***/
  loadImage(e, t = {}, s, i) {
    const r = this.renderer.cache.getTextureFromSource(e);
    let a = Object.assign({}, t);
    if (this._parent && (a = Object.assign(a, this._parent._texturesOptions)), a.loader = this, r) {
      a.sampler = typeof e != "string" && e.hasAttribute("data-sampler") ? e.getAttribute("data-sampler") : a.sampler, a.fromTexture = r;
      const d = new X(this.renderer, a);
      this._sourceLoaded(r.source, d, s), this._parent && this._addToParent(d, r.source, "image");
      return;
    }
    const h = this._createImage(e);
    a.sampler = h.hasAttribute("data-sampler") ? h.getAttribute("data-sampler") : a.sampler;
    const o = new X(this.renderer, a), l = this._addElement(h, o, s, i);
    h.complete ? this._sourceLoaded(h, o, s) : h.decode ? h.decode().then(this._sourceLoaded.bind(this, h, o, s)).catch(() => {
      h.addEventListener("load", l.load, !1), h.addEventListener("error", l.error, !1);
    }) : (h.addEventListener("load", l.load, !1), h.addEventListener("error", l.error, !1)), this._parent && this._addToParent(o, h, "image");
  }
  /***
       This method loads an array of images by calling loadImage() for each one of them
  
       params:
       @sources (array of images / images url): array of html images elements or images url
       @texturesOptions (object): parameters to apply to the textures, such as sampler name, repeat wrapping, filters, anisotropy...
       @successCallback (function): function to execute when each source has been loaded
       @errorCallback (function): function to execute if a source fails to load
       ***/
  loadImages(e, t, s, i) {
    for (let r = 0; r < e.length; r++)
      this.loadImage(e[r], t, s, i);
  }
  /***
       This method loads a video
       Creates a new texture object right away and once the video has enough data it uses it as our WebGL texture
  
       params:
       @source (video): html video element
       @textureOptions (object): parameters to apply to the textures, such as sampler name, repeat wrapping, filters, anisotropy...
       @successCallback (function): function to execute when the source has been loaded
       @errorCallback (function): function to execute if the source fails to load
       ***/
  loadVideo(e, t = {}, s, i) {
    const r = this._createVideo(e);
    r.preload = !0, r.muted = !0, r.loop = !0, r.setAttribute("playsinline", ""), r.crossOrigin = this.crossOrigin;
    let a = Object.assign({}, t);
    this._parent && (a = Object.assign(t, this._parent._texturesOptions)), a.loader = this, a.sampler = r.hasAttribute("data-sampler") ? r.getAttribute("data-sampler") : a.sampler;
    const h = new X(this.renderer, a), o = this._addElement(r, h, s, i);
    r.addEventListener("canplaythrough", o.load, !1), r.addEventListener("error", o.error, !1), r.readyState >= r.HAVE_FUTURE_DATA && s && this._sourceLoaded(r, h, s), r.load(), this._addToParent && this._addToParent(h, r, "video"), "requestVideoFrameCallback" in HTMLVideoElement.prototype && (o.videoFrameCallback = h._videoFrameCallback.bind(h), h._videoFrameCallbackID = r.requestVideoFrameCallback(o.videoFrameCallback));
  }
  /***
       This method loads an array of images by calling loadVideo() for each one of them
  
       params:
       @sources (array of videos / videos url): array of html videos elements or videos url
       @texturesOptions (object): parameters to apply to the textures, such as sampler name, repeat wrapping, filters, anisotropy...
       @successCallback (function): function to execute when each source has been loaded
       @errorCallback (function): function to execute if a source fails to load
       ***/
  loadVideos(e, t, s, i) {
    for (let r = 0; r < e.length; r++)
      this.loadVideo(e[r], t, s, i);
  }
  /***
       This method loads a canvas
       Creates a new texture object right away and uses the canvas as our WebGL texture
  
       params:
       @source (canvas): html canvas element
       @textureOptions (object): parameters to apply to the textures, such as sampler name, repeat wrapping, filters, anisotropy...
       @successCallback (function): function to execute when the source has been loaded
       ***/
  loadCanvas(e, t = {}, s) {
    let i = Object.assign({}, t);
    this._parent && (i = Object.assign(t, this._parent._texturesOptions)), i.loader = this, i.sampler = e.hasAttribute("data-sampler") ? e.getAttribute("data-sampler") : i.sampler;
    const r = new X(this.renderer, i);
    this._addElement(e, r, s, null), this._sourceLoaded(e, r, s), this._parent && this._addToParent(r, e, "canvas");
  }
  /***
       This method loads an array of images by calling loadCanvas() for each one of them
  
       params:
       @sources (array of canvas): array of html canvases elements
       @texturesOptions (object): parameters to apply to the textures, such as sampler name, repeat wrapping, filters, anisotropy...
       @successCallback (function): function to execute when each source has been loaded
       ***/
  loadCanvases(e, t, s) {
    for (let i = 0; i < e.length; i++)
      this.loadCanvas(e[i], t, s);
  }
  /*** REMOVING EVENT LISTENERS ***/
  /***
       Cleanly removes a texture source by removing its associated event listeners
  
       params:
       @texture (Texture class object): The texture that contains our source
       ***/
  _removeSource(e) {
    const t = this.elements.find((s) => s.texture.uuid === e.uuid);
    t && (e.sourceType === "image" ? t.source.removeEventListener("load", t.load, !1) : e.sourceType === "video" && (t.videoFrameCallback && e._videoFrameCallbackID && t.source.cancelVideoFrameCallback(e._videoFrameCallbackID), t.source.removeEventListener("canplaythrough", t.load, !1), t.source.pause(), t.source.removeAttribute("src"), t.source.load()), t.source.removeEventListener("error", t.error, !1));
  }
}
class tt extends et {
  constructor(e, t, {
    sourcesLoaded: s = 0,
    sourcesToLoad: i = 0,
    complete: r = !1,
    onComplete: a = () => {
    }
  } = {}) {
    super(e, t.crossOrigin), this.type = "PlaneTextureLoader", this._parent = t, this._parent.type !== "Plane" && this._parent.type !== "PingPongPlane" && this._parent.type !== "ShaderPass" && (g(this.type + ": Wrong parent type assigned to this loader"), this._parent = null), this.sourcesLoaded = s, this.sourcesToLoad = i, this.complete = r, this.onComplete = a;
  }
  /*** TRACK LOADING ***/
  /***
       Sets the total number of assets to load before firing the onComplete event
  
       params:
       @size (int): our curtains object OR our curtains renderer object
       ***/
  _setLoaderSize(e) {
    this.sourcesToLoad = e, this.sourcesToLoad === 0 && (this.complete = !0, this.renderer.nextRender.add(() => this.onComplete && this.onComplete()));
  }
  /***
   Increment the number of sources loaded
   ***/
  _increment() {
    this.sourcesLoaded++, this.sourcesLoaded >= this.sourcesToLoad && !this.complete && (this.complete = !0, this.renderer.nextRender.add(() => this.onComplete && this.onComplete()));
  }
  /*** UPDATE PARENT SOURCES AND TEXTURES ARAYS ***/
  /***
       Adds the source to the correct parent assets array
  
       params:
       @source (html element): html image, video or canvas element that has been loaded
       @sourceType (string): either "image", "video" or "canvas"
       ***/
  _addSourceToParent(e, t) {
    if (t === "image") {
      const s = this._parent.images;
      !s.find((r) => r.src === e.src) && s.push(e);
    } else if (t === "video") {
      const s = this._parent.videos;
      !s.find((r) => r.src === e.src) && s.push(e);
    } else if (t === "canvas") {
      const s = this._parent.canvases;
      !s.find((r) => r.isSameNode(e)) && s.push(e);
    }
  }
  /***
       Adds the loader parent to the newly created texture
       Also adds the source to the correct parent assets array
  
       params:
       @texture (Texture class object): our newly created texture
       @source (html element): html image, video or canvas element that has been loaded
       @sourceType (string): either "image", "video" or "canvas"
       ***/
  _addToParent(e, t, s) {
    this._addSourceToParent(t, s), this._parent && e.addParent(this._parent);
  }
}
class st {
  constructor(e, t = "Mesh", {
    // program
    vertexShaderID: s,
    fragmentShaderID: i,
    vertexShader: r,
    fragmentShader: a,
    uniforms: h = {},
    // geometry
    widthSegments: o = 1,
    heightSegments: l = 1,
    // render order
    renderOrder: d = 0,
    // drawing
    depthTest: c = !0,
    cullFace: u = "back",
    // textures
    texturesOptions: f = {},
    crossOrigin: y = "anonymous"
  } = {}) {
    if (this.type = t, e = e && e.renderer || e, (!e || e.type !== "Renderer") && (O(this.type + ": Curtains not passed as first argument or Curtains Renderer is missing", e), setTimeout(() => {
      this._onErrorCallback && this._onErrorCallback();
    }, 0)), this.renderer = e, this.gl = this.renderer.gl, !this.gl) {
      this.renderer.production || O(this.type + ": Unable to create a " + this.type + " because the Renderer WebGL context is not defined"), setTimeout(() => {
        this._onErrorCallback && this._onErrorCallback();
      }, 0);
      return;
    }
    this._canDraw = !1, this.renderOrder = d, this._depthTest = c, this.cullFace = u, this.cullFace !== "back" && this.cullFace !== "front" && this.cullFace !== "none" && (this.cullFace = "back"), this.textures = [], this._texturesOptions = Object.assign({
      premultiplyAlpha: !1,
      anisotropy: 1,
      floatingPoint: "none",
      // accepts "none", "half-float" or "float"
      wrapS: this.gl.CLAMP_TO_EDGE,
      wrapT: this.gl.CLAMP_TO_EDGE,
      minFilter: this.gl.LINEAR,
      magFilter: this.gl.LINEAR
    }, f), this.crossOrigin = y, !r && s && document.getElementById(s) && (r = document.getElementById(s).innerHTML), !a && i && document.getElementById(i) && (a = document.getElementById(i).innerHTML), this._initMesh(), o = parseInt(o), l = parseInt(l), this._geometry = new Ze(this.renderer, {
      width: o,
      height: l
      // using a special ID for shader passes to avoid weird buffer binding bugs on mac devices
      //id: this.type === "ShaderPass" ? 1 : widthSegments * heightSegments + widthSegments
    }), this._program = new fe(this.renderer, {
      parent: this,
      vertexShader: r,
      fragmentShader: a
    }), this._program.compiled ? (this._program.createUniforms(h), this.uniforms = this._program.uniformsManager.uniforms, this._geometry.setProgram(this._program), this.renderer.onSceneChange()) : this.renderer.nextRender.add(() => this._onErrorCallback && this._onErrorCallback());
  }
  _initMesh() {
    this.uuid = he(), this.loader = new tt(this.renderer, this, {
      sourcesLoaded: 0,
      initSourcesToLoad: 0,
      // will change if there's any texture to load on init
      complete: !1,
      onComplete: () => {
        this._onReadyCallback && this._onReadyCallback(), this.renderer.needRender();
      }
    }), this.images = [], this.videos = [], this.canvases = [], this.userData = {}, this._canDraw = !0;
  }
  /*** RESTORING CONTEXT ***/
  /***
   Used internally to handle context restoration
   ***/
  _restoreContext() {
    this._canDraw = !1, this._matrices && (this._matrices = null), this._program = new fe(this.renderer, {
      parent: this,
      vertexShader: this._program.vsCode,
      fragmentShader: this._program.fsCode
    }), this._program.compiled && (this._geometry.restoreContext(this._program), this._program.createUniforms(this.uniforms), this.uniforms = this._program.uniformsManager.uniforms, this._programRestored());
  }
  /***
       This function adds a render target to a mesh
  
       params :
       @renderTarger (RenderTarget): the render target to add to that mesh
       ***/
  setRenderTarget(e) {
    if (!e || e.type !== "RenderTarget") {
      this.renderer.production || g(this.type + ": Could not set the render target because the argument passed is not a RenderTarget class object", e);
      return;
    }
    this.type === "Plane" && this.renderer.scene.removePlane(this), this.target = e, this.type === "Plane" && this.renderer.scene.addPlane(this);
  }
  /***
       Set the mesh render order to draw it above or behind other meshes
  
       params :
       @renderOrder (int): new render order to apply: higher number means a mesh is drawn on top of others
       ***/
  setRenderOrder(e = 0) {
    e = isNaN(e) ? this.renderOrder : parseInt(e), e !== this.renderOrder && (this.renderOrder = e, this.renderer.scene.setPlaneRenderOrder(this));
  }
  /*** IMAGES, VIDEOS AND CANVASES LOADING ***/
  /***
       This method creates a new Texture and adds it to the mesh
  
       params :
       @textureOptions (object, optional) : Parameters to apply to that texture (see Texture class). Will be merged with the mesh default textures options
  
       returns :
       @texture: our newly created texture
       ***/
  createTexture(e = {}) {
    const t = new X(this.renderer, Object.assign(e, this._texturesOptions));
    return t.addParent(this), t;
  }
  /***
   Shortcut for addParent() Texture class method
   ***/
  addTexture(e) {
    if (!e || e.type !== "Texture") {
      this.renderer.production || g(this.type + ": cannot add ", e, " to this " + this.type + " because it is not a valid texture");
      return;
    }
    e.addParent(this);
  }
  /***
       This method handles the sources loading process
  
       params :
       @sourcesArray (array): array of html images, videos or canvases elements
       @texturesOptions (object, optional) : Parameters to apply to those textures (see Texture class). Will be merged with the mesh default textures options
       @successCallback (function): callback to execute on source loading success
       @errorCallback (function): callback to execute on source loading error
       ***/
  loadSources(e, t = {}, s, i) {
    for (let r = 0; r < e.length; r++)
      this.loadSource(e[r], t, s, i);
  }
  /***
       This method loads one source using our mesh loader (see PlaneTextureLoader class)
  
       params :
       @source (html element) : html image, video or canvas element
       @textureOptions (object, optional) : Parameters to apply to that texture (see Texture class). Will be merged with the mesh default textures options
       @successCallback (function): callback to execute on source loading success
       @errorCallback (function): callback to execute on source loading error
       ***/
  loadSource(e, t = {}, s, i) {
    this.loader.loadSource(e, Object.assign(t, this._texturesOptions), (r) => {
      s && s(r);
    }, (r, a) => {
      this.renderer.production || g(this.type + ": this HTML tag could not be converted into a texture:", r.tagName), i && i(r, a);
    });
  }
  /***
       This method loads an image using our mesh loader (see PlaneTextureLoader class)
  
       params :
       @source (image) : html image element
       @textureOptions (object, optional) : Parameters to apply to that texture (see Texture class). Will be merged with the mesh default textures options
       @successCallback (function): callback to execute on source loading success
       @errorCallback (function): callback to execute on source loading error
       ***/
  loadImage(e, t = {}, s, i) {
    this.loader.loadImage(e, Object.assign(t, this._texturesOptions), (r) => {
      s && s(r);
    }, (r, a) => {
      this.renderer.production || g(this.type + `: There has been an error:
`, a, `
while loading this image:
`, r), i && i(r, a);
    });
  }
  /***
       This method loads a video using the mesh loader (see PlaneTextureLoader class)
  
       params :
       @source (video) : html video element
       @textureOptions (object, optional) : Parameters to apply to that texture (see Texture class). Will be merged with the mesh default textures options
       @successCallback (function): callback to execute on source loading success
       @errorCallback (function): callback to execute on source loading error
       ***/
  loadVideo(e, t = {}, s, i) {
    this.loader.loadVideo(e, Object.assign(t, this._texturesOptions), (r) => {
      s && s(r);
    }, (r, a) => {
      this.renderer.production || g(this.type + `: There has been an error:
`, a, `
while loading this video:
`, r), i && i(r, a);
    });
  }
  /***
       This method loads a canvas using the mesh loader (see PlaneTextureLoader class)
  
       params :
       @source (canvas) : html canvas element
       @textureOptions (object, optional) : Parameters to apply to that texture (see Texture class). Will be merged with the mesh default textures options
       @successCallback (function): callback to execute on source loading success
       ***/
  loadCanvas(e, t = {}, s) {
    this.loader.loadCanvas(e, Object.assign(t, this._texturesOptions), (i) => {
      s && s(i);
    });
  }
  /*** LOAD ARRAYS ***/
  /***
       Loads an array of images
  
       params :
       @imagesArray (array) : array of html image elements
       @texturesOptions (object, optional) : Parameters to apply to those textures (see Texture class). Will be merged with the mesh default textures options
       @successCallback (function): callback to execute on source loading success
       @errorCallback (function): callback to execute on source loading error
       ***/
  loadImages(e, t = {}, s, i) {
    for (let r = 0; r < e.length; r++)
      this.loadImage(e[r], t, s, i);
  }
  /***
       Loads an array of videos
  
       params :
       @videosArray (array) : array of html video elements
       @texturesOptions (object, optional) : Parameters to apply to those textures (see Texture class). Will be merged with the mesh default textures options
       @successCallback (function): callback to execute on source loading success
       @errorCallback (function): callback to execute on source loading error
       ***/
  loadVideos(e, t = {}, s, i) {
    for (let r = 0; r < e.length; r++)
      this.loadVideo(e[r], t, s, i);
  }
  /***
       Loads an array of canvases
  
       params :
       @canvasesArray (array) : array of html canvas elements
       @texturesOptions (object, optional) : Parameters to apply to those textures (see Texture class). Will be merged with the mesh default textures options
       @successCallback (function): callback to execute on source loading success
       @errorCallback (function): callback to execute on source loading error
       ***/
  loadCanvases(e, t = {}, s) {
    for (let i = 0; i < e.length; i++)
      this.loadCanvas(e[i], t, s);
  }
  /***
   This has to be called in order to play the planes videos
   We need this because on mobile devices we can't start playing a video without a user action
   Once the video has started playing we set an interval and update a new frame to our our texture at a 30FPS rate
   ***/
  playVideos() {
    for (let e = 0; e < this.textures.length; e++) {
      const t = this.textures[e];
      if (t.sourceType === "video") {
        const s = t.source.play();
        s !== void 0 && s.catch((i) => {
          this.renderer.production || g(this.type + ": Could not play the video : ", i);
        });
      }
    }
  }
  /*** DRAW THE PLANE ***/
  /***
   We draw the plane, ie bind the buffers, set the active textures and draw it
   ***/
  _draw() {
    this.renderer.setDepthTest(this._depthTest), this.renderer.setFaceCulling(this.cullFace), this._program.updateUniforms(), this._geometry.bindBuffers(), this.renderer.state.forceBufferUpdate = !1;
    for (let e = 0; e < this.textures.length; e++)
      if (this.textures[e]._draw(), this.textures[e]._sampler.isActive && !this.textures[e]._sampler.isTextureBound)
        return;
    this._geometry.draw(), this.renderer.state.activeTexture = null, this._onAfterRenderCallback && this._onAfterRenderCallback();
  }
  /*** EVENTS ***/
  /***
       This is called each time a mesh can't be instanciated
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onError(e) {
    return e && (this._onErrorCallback = e), this;
  }
  /***
       This is called each time a mesh's image has been loaded. Useful to handle a loader
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onLoading(e) {
    return e && (this._onLoadingCallback = e), this;
  }
  /***
       This is called when a mesh is ready to be drawn
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onReady(e) {
    return e && (this._onReadyCallback = e), this;
  }
  /***
       This is called at each requestAnimationFrame call
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onRender(e) {
    return e && (this._onRenderCallback = e), this;
  }
  /***
       This is called at each requestAnimationFrame call for each mesh after the draw call
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onAfterRender(e) {
    return e && (this._onAfterRenderCallback = e), this;
  }
  /*** DESTROYING ***/
  /***
   Remove an element by calling the appropriate renderer method
   ***/
  remove() {
    this._canDraw = !1, this.target && this.renderer.bindFrameBuffer(null), this._dispose(), this.type === "Plane" ? this.renderer.removePlane(this) : this.type === "ShaderPass" && (this.target && (this.target._shaderPass = null, this.target.remove(), this.target = null), this.renderer.removeShaderPass(this));
  }
  /***
   This deletes all our mesh webgl bindings and its textures
   ***/
  _dispose() {
    if (this.gl) {
      this._geometry && this._geometry.dispose(), this.target && this.type === "ShaderPass" && (this.renderer.removeRenderTarget(this.target), this.textures.shift());
      for (let e = 0; e < this.textures.length; e++)
        this.textures[e]._dispose();
      this.textures = [];
    }
  }
}
const pe = new I(), it = new I();
class rt extends st {
  constructor(e, t, s = "DOMMesh", {
    // Mesh params
    widthSegments: i,
    heightSegments: r,
    renderOrder: a,
    depthTest: h,
    cullFace: o,
    uniforms: l,
    vertexShaderID: d,
    fragmentShaderID: c,
    vertexShader: u,
    fragmentShader: f,
    texturesOptions: y,
    crossOrigin: _
  } = {}) {
    d = d || t && t.getAttribute("data-vs-id"), c = c || t && t.getAttribute("data-fs-id"), super(e, s, {
      widthSegments: i,
      heightSegments: r,
      renderOrder: a,
      depthTest: h,
      cullFace: o,
      uniforms: l,
      vertexShaderID: d,
      fragmentShaderID: c,
      vertexShader: u,
      fragmentShader: f,
      texturesOptions: y,
      crossOrigin: _
    }), this.gl && (this.htmlElement = t, (!this.htmlElement || this.htmlElement.length === 0) && (this.renderer.production || g(this.type + ": The HTML element you specified does not currently exists in the DOM")), this._setDocumentSizes());
  }
  /*** PLANE SIZES ***/
  /***
   Set our plane dimensions and positions relative to document
   Triggers reflow!
   ***/
  _setDocumentSizes() {
    let e = this.htmlElement.getBoundingClientRect();
    this._boundingRect || (this._boundingRect = {}), this._boundingRect.document = {
      width: e.width * this.renderer.pixelRatio,
      height: e.height * this.renderer.pixelRatio,
      top: e.top * this.renderer.pixelRatio,
      left: e.left * this.renderer.pixelRatio
    };
  }
  /*** BOUNDING BOXES GETTERS ***/
  /***
       Useful to get our plane HTML element bounding rectangle without triggering a reflow/layout
  
       returns :
       @boundingRectangle (obj): an object containing our plane HTML element bounding rectangle (width, height, top, bottom, right and left properties)
       ***/
  getBoundingRect() {
    return {
      width: this._boundingRect.document.width,
      height: this._boundingRect.document.height,
      top: this._boundingRect.document.top,
      left: this._boundingRect.document.left,
      // right = left + width, bottom = top + height
      right: this._boundingRect.document.left + this._boundingRect.document.width,
      bottom: this._boundingRect.document.top + this._boundingRect.document.height
    };
  }
  /***
   Handles each plane resizing
   used internally when our container is resized
   ***/
  resize() {
    this._setDocumentSizes(), this.type === "Plane" && (this.setPerspective(this.camera.fov, this.camera.near, this.camera.far), this._setWorldSizes(), this._applyWorldPositions());
    for (let e = 0; e < this.textures.length; e++)
      this.textures[e].resize();
    this.renderer.nextRender.add(() => this._onAfterResizeCallback && this._onAfterResizeCallback());
  }
  /*** INTERACTION ***/
  /***
       This function takes the mouse position relative to the document and returns it relative to our plane
       It ranges from -1 to 1 on both axis
  
       params :
       @mouseCoordinates (Vec2 object): coordinates of the mouse
  
       returns :
       @mousePosition (Vec2 object): the mouse position relative to our plane in WebGL space coordinates
       ***/
  mouseToPlaneCoords(e) {
    const t = this.scale ? this.scale : it.set(1, 1), s = pe.set(
      (this._boundingRect.document.width - this._boundingRect.document.width * t.x) / 2,
      (this._boundingRect.document.height - this._boundingRect.document.height * t.y) / 2
    ), i = {
      width: this._boundingRect.document.width * t.x / this.renderer.pixelRatio,
      height: this._boundingRect.document.height * t.y / this.renderer.pixelRatio,
      top: (this._boundingRect.document.top + s.y) / this.renderer.pixelRatio,
      left: (this._boundingRect.document.left + s.x) / this.renderer.pixelRatio
    };
    return pe.set(
      (e.x - i.left) / i.width * 2 - 1,
      1 - (e.y - i.top) / i.height * 2
    );
  }
  /*** EVENTS ***/
  /***
       This is called each time a plane has been resized
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onAfterResize(e) {
    return e && (this._onAfterResizeCallback = e), this;
  }
}
class at {
  constructor({
    fov: e = 50,
    near: t = 0.1,
    far: s = 150,
    width: i,
    height: r,
    pixelRatio: a = 1
  } = {}) {
    this.position = new S(), this.projectionMatrix = new B(), this.worldMatrix = new B(), this.viewMatrix = new B(), this._shouldUpdate = !1, this.setSize(), this.setPerspective(e, t, s, i, r, a);
  }
  /***
       Sets the camera field of view
       Update the camera projection matrix only if the fov actually changed
  
       params:
       @fov (float, optional): field of view to use
       ***/
  setFov(e) {
    e = isNaN(e) ? this.fov : parseFloat(e), e = Math.max(1, Math.min(e, 179)), e !== this.fov && (this.fov = e, this.setPosition(), this._shouldUpdate = !0), this.setCSSPerspective();
  }
  /***
       Sets the camera near plane value
       Update the camera projection matrix only if the near plane actually changed
  
       params:
       @near (float, optional): near plane value to use
       ***/
  setNear(e) {
    e = isNaN(e) ? this.near : parseFloat(e), e = Math.max(e, 0.01), e !== this.near && (this.near = e, this._shouldUpdate = !0);
  }
  /***
       Sets the camera far plane value
       Update the camera projection matrix only if the far plane actually changed
  
       params:
       @far (float, optional): far plane value to use
       ***/
  setFar(e) {
    e = isNaN(e) ? this.far : parseFloat(e), e = Math.max(e, 50), e !== this.far && (this.far = e, this._shouldUpdate = !0);
  }
  /***
       Sets the camera pixel ratio value
       Update the camera projection matrix only if the pixel ratio actually changed
  
       params:
       @pixelRatio (float, optional): pixelRatio value to use
       ***/
  setPixelRatio(e) {
    e !== this.pixelRatio && (this._shouldUpdate = !0), this.pixelRatio = e;
  }
  /***
       Sets the camera width and height
       Update the camera projection matrix only if the width or height actually changed
  
       params:
       @width (float, optional): width value to use
       @height (float, optional): height value to use
       ***/
  setSize(e, t) {
    (e !== this.width || t !== this.height) && (this._shouldUpdate = !0), this.width = e, this.height = t;
  }
  /***
       Sets the camera perspective
       Update the camera projection matrix if our _shouldUpdate flag is true
  
       params:
       @fov (float, optional): field of view to use
       @near (float, optional): near plane value to use
       @far (float, optional): far plane value to use
       @width (float, optional): width value to use
       @height (float, optional): height value to use
       @pixelRatio (float, optional): pixelRatio value to use
       ***/
  setPerspective(e, t, s, i, r, a) {
    this.setPixelRatio(a), this.setSize(i, r), this.setFov(e), this.setNear(t), this.setFar(s), this._shouldUpdate && this.updateProjectionMatrix();
  }
  /***
   Sets the camera position based on its fov
   Used by the Plane class objects to scale the planes with the right amount
   ***/
  setPosition() {
    this.position.set(0, 0, 1), this.worldMatrix.setFromArray([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      this.position.x,
      this.position.y,
      this.position.z,
      1
    ]), this.viewMatrix = this.viewMatrix.copy(this.worldMatrix).getInverse();
  }
  /***
   Sets a CSSPerspective property based on width, height, pixelRatio and fov
   Used to translate planes along the Z axis using pixel units as CSS would do
   Taken from: https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value
   ***/
  setCSSPerspective() {
    this.CSSPerspective = Math.pow(Math.pow(this.width / (2 * this.pixelRatio), 2) + Math.pow(this.height / (2 * this.pixelRatio), 2), 0.5) / Math.tan(this.fov * 0.5 * Math.PI / 180);
  }
  /***
       Returns visible width / height at a given z-depth from our camera parameters
  
       Taken from: https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269
       ***/
  getScreenRatiosFromFov(e = 0) {
    const t = this.position.z;
    e < t ? e -= t : e += t;
    const s = this.fov * Math.PI / 180, i = 2 * Math.tan(s / 2) * Math.abs(e);
    return {
      width: i * this.width / this.height,
      height: i
    };
  }
  /***
   Updates the camera projection matrix
   ***/
  updateProjectionMatrix() {
    const e = this.width / this.height, t = this.near * Math.tan(Math.PI / 180 * 0.5 * this.fov), s = 2 * t, i = e * s, r = -0.5 * i, a = r + i, h = t - s, o = 2 * this.near / (a - r), l = 2 * this.near / (t - h), d = (a + r) / (a - r), c = (t + h) / (t - h), u = -(this.far + this.near) / (this.far - this.near), f = -2 * this.far * this.near / (this.far - this.near);
    this.projectionMatrix.setFromArray([
      o,
      0,
      0,
      0,
      0,
      l,
      0,
      0,
      d,
      c,
      u,
      -1,
      0,
      0,
      f,
      0
    ]);
  }
  /***
   Force the projection matrix to update (used in Plane class objects context restoration)
   ***/
  forceUpdate() {
    this._shouldUpdate = !0;
  }
  /***
   Cancel the projection matrix update (used in Plane class objects after the projection matrix has been updated)
   ***/
  cancelUpdate() {
    this._shouldUpdate = !1;
  }
}
class te {
  constructor(e = new Float32Array([0, 0, 0, 1]), t = "XYZ") {
    this.type = "Quat", this.elements = e, this.axisOrder = t;
  }
  /***
       Sets the quaternion values from an array
  
       params:
       @array (array): an array of at least 4 elements
  
       returns:
       @this (Quat class object): this quaternion after being set
       ***/
  setFromArray(e) {
    return this.elements[0] = e[0], this.elements[1] = e[1], this.elements[2] = e[2], this.elements[3] = e[3], this;
  }
  /***
       Sets the quaternion axis order
  
       params:
       @axisOrder (string): an array of at least 4 elements
  
       returns:
       @this (Quat class object): this quaternion after axis order has been set
       ***/
  setAxisOrder(e) {
    switch (e = e.toUpperCase(), e) {
      case "XYZ":
      case "YXZ":
      case "ZXY":
      case "ZYX":
      case "YZX":
      case "XZY":
        this.axisOrder = e;
        break;
      default:
        this.axisOrder = "XYZ";
    }
    return this;
  }
  /***
       Copy a quaternion into this quaternion
  
       params:
       @vector (Quat): quaternion to copy
  
       returns:
       @this (Quat): this quaternion after copy
       ***/
  copy(e) {
    return this.elements = e.elements, this.axisOrder = e.axisOrder, this;
  }
  /***
       Clone a quaternion
  
       returns:
       @clonedQuaternion (Quat): cloned quaternion
       ***/
  clone() {
    return new te().copy(this);
  }
  /***
       Checks if 2 quaternions are equal
  
       returns:
       @isEqual (bool): whether the quaternions are equals or not
       ***/
  equals(e) {
    return this.elements[0] === e.elements[0] && this.elements[1] === e.elements[1] && this.elements[2] === e.elements[2] && this.elements[3] === e.elements[3] && this.axisOrder === e.axisOrder;
  }
  /***
       Sets a rotation quaternion using Euler angles and its axis order
  
       params:
       @vector (Vec3 class object): rotation vector to set our quaternion from
  
       returns :
       @this (Quat class object): quaternion after having applied the rotation
       ***/
  setFromVec3(e) {
    const t = e.x * 0.5, s = e.y * 0.5, i = e.z * 0.5, r = Math.cos(t), a = Math.cos(s), h = Math.cos(i), o = Math.sin(t), l = Math.sin(s), d = Math.sin(i);
    return this.axisOrder === "XYZ" ? (this.elements[0] = o * a * h + r * l * d, this.elements[1] = r * l * h - o * a * d, this.elements[2] = r * a * d + o * l * h, this.elements[3] = r * a * h - o * l * d) : this.axisOrder === "YXZ" ? (this.elements[0] = o * a * h + r * l * d, this.elements[1] = r * l * h - o * a * d, this.elements[2] = r * a * d - o * l * h, this.elements[3] = r * a * h + o * l * d) : this.axisOrder === "ZXY" ? (this.elements[0] = o * a * h - r * l * d, this.elements[1] = r * l * h + o * a * d, this.elements[2] = r * a * d + o * l * h, this.elements[3] = r * a * h - o * l * d) : this.axisOrder === "ZYX" ? (this.elements[0] = o * a * h - r * l * d, this.elements[1] = r * l * h + o * a * d, this.elements[2] = r * a * d - o * l * h, this.elements[3] = r * a * h + o * l * d) : this.axisOrder === "YZX" ? (this.elements[0] = o * a * h + r * l * d, this.elements[1] = r * l * h + o * a * d, this.elements[2] = r * a * d - o * l * h, this.elements[3] = r * a * h - o * l * d) : this.axisOrder === "XZY" && (this.elements[0] = o * a * h - r * l * d, this.elements[1] = r * l * h - o * a * d, this.elements[2] = r * a * d + o * l * h, this.elements[3] = r * a * h + o * l * d), this;
  }
}
const nt = new I(), ht = new S(), ot = new S(), lt = new S(), dt = new S(), ct = new S(), ut = new S(), k = new S(), F = new S(), ge = new te(), ft = new S(0.5, 0.5, 0), pt = new S(), gt = new S(), mt = new S(), _t = new S(), xt = new I();
class we extends rt {
  constructor(e, t, {
    // Mesh params
    widthSegments: s,
    heightSegments: i,
    renderOrder: r,
    depthTest: a,
    cullFace: h,
    uniforms: o,
    vertexShaderID: l,
    fragmentShaderID: d,
    vertexShader: c,
    fragmentShader: u,
    texturesOptions: f,
    crossOrigin: y,
    // Plane specific params
    alwaysDraw: _ = !1,
    visible: v = !0,
    transparent: x = !1,
    drawCheckMargins: p = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    autoloadSources: m = !0,
    watchScroll: b = !0,
    fov: w = 50
  } = {}) {
    super(e, t, "Plane", {
      widthSegments: s,
      heightSegments: i,
      renderOrder: r,
      depthTest: a,
      cullFace: h,
      uniforms: o,
      vertexShaderID: l,
      fragmentShaderID: d,
      vertexShader: c,
      fragmentShader: u,
      texturesOptions: f,
      crossOrigin: y
    }), this.gl && (this.index = this.renderer.planes.length, this.target = null, this.alwaysDraw = _, this._shouldDraw = !0, this.visible = v, this._transparent = x, this.drawCheckMargins = p, this.autoloadSources = m, this.watchScroll = b, this._updateMVMatrix = !1, this.camera = new at({
      fov: w,
      width: this.renderer._boundingRect.width,
      height: this.renderer._boundingRect.height,
      pixelRatio: this.renderer.pixelRatio
    }), this._program.compiled && (this._initPlane(), this.renderer.scene.addPlane(this), this.renderer.planes.push(this)));
  }
  /*** RESTORING CONTEXT ***/
  /***
   Used internally to handle context restoration after the program has been successfully compiled again
   ***/
  _programRestored() {
    this.target && this.setRenderTarget(this.renderer.renderTargets[this.target.index]), this._initMatrices(), this.setPerspective(this.camera.fov, this.camera.near, this.camera.far), this._setWorldSizes(), this._applyWorldPositions(), this.renderer.scene.addPlane(this);
    for (let e = 0; e < this.textures.length; e++)
      this.textures[e]._parent = this, this.textures[e]._restoreContext();
    this._canDraw = !0;
  }
  /***
   Init our basic plane values (transformations, positions, camera, sources)
   ***/
  _initPlane() {
    this._initTransformValues(), this._initPositions(), this.setPerspective(this.camera.fov, this.camera.near, this.camera.far), this._initSources();
  }
  /*** TRANSFORMATIONS, PROJECTION & MATRICES ***/
  /***
   Set/reset plane's transformation values: rotation, scale, translation, transform origin
   ***/
  _initTransformValues() {
    this.rotation = new S(), this.rotation.onChange(() => this._applyRotation()), this.quaternion = new te(), this.relativeTranslation = new S(), this.relativeTranslation.onChange(() => this._setTranslation()), this._translation = new S(), this.scale = new S(1), this.scale.onChange(() => {
      this.scale.z = 1, this._applyScale();
    }), this.transformOrigin = new S(0.5, 0.5, 0), this.transformOrigin.onChange(() => {
      this._setWorldTransformOrigin(), this._updateMVMatrix = !0;
    });
  }
  /***
       Reset our plane transformation values and HTML element if specified (and valid)
  
       params :
       @htmlElement (HTML element, optional) : if provided, new HTML element to use as a reference for sizes and position syncing.
       ***/
  resetPlane(e) {
    this._initTransformValues(), this._setWorldTransformOrigin(), e !== null && e ? (this.htmlElement = e, this.resize()) : !e && !this.renderer.production && g(this.type + ": You are trying to reset a plane with a HTML element that does not exist. The old HTML element will be kept instead.");
  }
  /***
   This function removes the plane current render target
   ***/
  removeRenderTarget() {
    this.target && (this.renderer.scene.removePlane(this), this.target = null, this.renderer.scene.addPlane(this));
  }
  /***
   Init our plane position: set its matrices, its position and perspective
   ***/
  _initPositions() {
    this._initMatrices(), this._setWorldSizes(), this._applyWorldPositions();
  }
  /***
   Init our plane model view and projection matrices and set their uniform locations
   ***/
  _initMatrices() {
    const e = new B();
    this._matrices = {
      world: {
        // world matrix (global transformation)
        matrix: e
      },
      modelView: {
        // model view matrix (world matrix multiplied by camera view matrix)
        name: "uMVMatrix",
        matrix: e,
        location: this.gl.getUniformLocation(this._program.program, "uMVMatrix")
      },
      projection: {
        // camera projection matrix
        name: "uPMatrix",
        matrix: e,
        location: this.gl.getUniformLocation(this._program.program, "uPMatrix")
      },
      modelViewProjection: {
        // model view projection matrix (model view matrix multiplied by projection)
        matrix: e
      }
    };
  }
  /*** PLANES PERSPECTIVES, SCALES AND ROTATIONS ***/
  /***
   This will set our perspective matrix and update our perspective matrix uniform
   used internally at each draw call if needed
   ***/
  _setPerspectiveMatrix() {
    this.camera._shouldUpdate && (this.renderer.useProgram(this._program), this.gl.uniformMatrix4fv(this._matrices.projection.location, !1, this._matrices.projection.matrix.elements)), this.camera.cancelUpdate();
  }
  /***
       This will set our perspective matrix new parameters (fov, near plane and far plane)
       used internally but can be used externally as well to change fov for example
  
       params :
       @fov (float): the field of view
       @near (float): the nearest point where object are displayed
       @far (float): the farthest point where object are displayed
       ***/
  setPerspective(e, t, s) {
    this.camera.setPerspective(e, t, s, this.renderer._boundingRect.width, this.renderer._boundingRect.height, this.renderer.pixelRatio), this.renderer.state.isContextLost && this.camera.forceUpdate(), this._matrices.projection.matrix = this.camera.projectionMatrix, this.camera._shouldUpdate && (this._setWorldSizes(), this._applyWorldPositions(), this._translation.z = this.relativeTranslation.z / this.camera.CSSPerspective), this._updateMVMatrix = this.camera._shouldUpdate;
  }
  /***
   This will set our model view matrix
   used internally at each draw call if needed
   It will calculate our matrix based on its plane translation, rotation and scale
   ***/
  _setMVMatrix() {
    this._updateMVMatrix && (this._matrices.world.matrix = this._matrices.world.matrix.composeFromOrigin(this._translation, this.quaternion, this.scale, this._boundingRect.world.transformOrigin), this._matrices.world.matrix.scale({
      x: this._boundingRect.world.width,
      y: this._boundingRect.world.height,
      z: 1
    }), this._matrices.modelView.matrix.copy(this._matrices.world.matrix), this._matrices.modelView.matrix.elements[14] -= this.camera.position.z, this._matrices.modelViewProjection.matrix = this._matrices.projection.matrix.multiply(this._matrices.modelView.matrix), this.alwaysDraw || this._shouldDrawCheck(), this.renderer.useProgram(this._program), this.gl.uniformMatrix4fv(this._matrices.modelView.location, !1, this._matrices.modelView.matrix.elements)), this._updateMVMatrix = !1;
  }
  /*** SCREEN TO WORLD CALCS ***/
  /***
   Convert our transform origin point from plane space to world space
   ***/
  _setWorldTransformOrigin() {
    this._boundingRect.world.transformOrigin = new S(
      (this.transformOrigin.x * 2 - 1) * this._boundingRect.world.width,
      -(this.transformOrigin.y * 2 - 1) * this._boundingRect.world.height,
      this.transformOrigin.z
    );
  }
  /***
       This function takes pixel values along X and Y axis and convert them to world space coordinates
  
       params :
       @vector (Vec3): position to convert on X, Y and Z axes
  
       returns :
       @worldPosition: plane's position in WebGL space
       ***/
  _documentToWorldSpace(e) {
    return ot.set(
      e.x * this.renderer.pixelRatio / this.renderer._boundingRect.width * this._boundingRect.world.ratios.width,
      -(e.y * this.renderer.pixelRatio / this.renderer._boundingRect.height) * this._boundingRect.world.ratios.height,
      e.z
    );
  }
  /***
   Set our plane dimensions relative to clip spaces
   ***/
  _setWorldSizes() {
    const e = this.camera.getScreenRatiosFromFov();
    this._boundingRect.world = {
      width: this._boundingRect.document.width / this.renderer._boundingRect.width * e.width / 2,
      height: this._boundingRect.document.height / this.renderer._boundingRect.height * e.height / 2,
      ratios: e
    }, this._setWorldTransformOrigin();
  }
  /***
   Set our plane position relative to clip spaces
   ***/
  _setWorldPosition() {
    const e = {
      x: this._boundingRect.document.width / 2 + this._boundingRect.document.left,
      y: this._boundingRect.document.height / 2 + this._boundingRect.document.top
    }, t = {
      x: this.renderer._boundingRect.width / 2 + this.renderer._boundingRect.left,
      y: this.renderer._boundingRect.height / 2 + this.renderer._boundingRect.top
    };
    this._boundingRect.world.top = (t.y - e.y) / this.renderer._boundingRect.height * this._boundingRect.world.ratios.height, this._boundingRect.world.left = (e.x - t.x) / this.renderer._boundingRect.width * this._boundingRect.world.ratios.width;
  }
  /*** TRANSFORMATIONS ***/
  /***
       This will set our plane scale
       used internally but can be used externally as well
  
       params :
       @scale (Vec2 object): scale to apply on X and Y axes
       ***/
  setScale(e) {
    if (!e.type || e.type !== "Vec2") {
      this.renderer.production || g(this.type + ": Cannot set scale because the parameter passed is not of Vec2 type:", e);
      return;
    }
    e.sanitizeNaNValuesWith(this.scale).max(nt.set(1e-3, 1e-3)), (e.x !== this.scale.x || e.y !== this.scale.y) && (this.scale.set(e.x, e.y, 1), this._applyScale());
  }
  /***
   This will apply our scale and tells our model view matrix to update
   ***/
  _applyScale() {
    for (let e = 0; e < this.textures.length; e++)
      this.textures[e].resize();
    this._updateMVMatrix = !0;
  }
  /***
       This will set our plane rotation
       used internally but can be used externally as well
  
       params :
       @rotation (Vec3 object): rotation to apply on X, Y and Z axes (in radians)
       ***/
  setRotation(e) {
    if (!e.type || e.type !== "Vec3") {
      this.renderer.production || g(this.type + ": Cannot set rotation because the parameter passed is not of Vec3 type:", e);
      return;
    }
    e.sanitizeNaNValuesWith(this.rotation), e.equals(this.rotation) || (this.rotation.copy(e), this._applyRotation());
  }
  /***
   This will apply our rotation and tells our model view matrix to update
   ***/
  _applyRotation() {
    this.quaternion.setFromVec3(this.rotation), this._updateMVMatrix = !0;
  }
  /***
       This will set our plane transform origin
       (0, 0, 0) means plane's top left corner
       (1, 1, 0) means plane's bottom right corner
       (0.5, 0.5, -1) means behind plane's center
  
       params :
       @origin (Vec3 object): coordinate of transformation origin X, Y and Z axes
       ***/
  setTransformOrigin(e) {
    if (!e.type || e.type !== "Vec3") {
      this.renderer.production || g(this.type + ": Cannot set transform origin because the parameter passed is not of Vec3 type:", e);
      return;
    }
    e.sanitizeNaNValuesWith(this.transformOrigin), e.equals(this.transformOrigin) || (this.transformOrigin.copy(e), this._setWorldTransformOrigin(), this._updateMVMatrix = !0);
  }
  /***
   This will set our plane translation by adding plane computed bounding box values and computed relative position values
   ***/
  _setTranslation() {
    let e = ht.set(0, 0, 0);
    this.relativeTranslation.equals(e) || (e = this._documentToWorldSpace(this.relativeTranslation)), this._translation.set(
      this._boundingRect.world.left + e.x,
      this._boundingRect.world.top + e.y,
      //this._translation.z,
      this.relativeTranslation.z / this.camera.CSSPerspective
    ), this._updateMVMatrix = !0;
  }
  /***
       This function takes pixel values along X and Y axis and convert them to clip space coordinates, and then apply the corresponding translation
  
       params :
       @translation (Vec3): translation to apply on X, Y and Z axes
       ***/
  setRelativeTranslation(e) {
    if (!e.type || e.type !== "Vec3") {
      this.renderer.production || g(this.type + ": Cannot set translation because the parameter passed is not of Vec3 type:", e);
      return;
    }
    e.sanitizeNaNValuesWith(this.relativeTranslation), e.equals(this.relativeTranslation) || (this.relativeTranslation.copy(e), this._setTranslation());
  }
  /***
   This function uses our plane HTML Element bounding rectangle values and convert them to the world clip space coordinates, and then apply the corresponding translation
   ***/
  _applyWorldPositions() {
    this._setWorldPosition(), this._setTranslation();
  }
  /***
   This function updates the plane position based on its CSS positions and transformations values.
   Useful if the HTML element has been moved while the container size has not changed.
   ***/
  updatePosition() {
    this._setDocumentSizes(), this._applyWorldPositions();
  }
  /***
       This function updates the plane position based on the Curtains class scroll manager values
  
       params:
       @lastXDelta (float): last scroll value along X axis
       @lastYDelta (float): last scroll value along Y axis
       ***/
  updateScrollPosition(e, t) {
    (e || t) && (this._boundingRect.document.top += t * this.renderer.pixelRatio, this._boundingRect.document.left += e * this.renderer.pixelRatio, this._applyWorldPositions());
  }
  /*** FRUSTUM CULLING (DRAW CHECK) ***/
  /***
       Find the intersection point by adding a vector starting from a corner till we reach the near plane
  
       params:
       @refPoint (Vec3 class object): corner of the plane from which we start to iterate from
       @secondPoint (Vec3 class object): second point near the refPoint to get a direction to use for iteration
  
       returns:
       @intersection (Vec3 class object): intersection between our plane and the camera near plane
       ***/
  _getIntersection(e, t) {
    let s = t.clone().sub(e), i = e.clone();
    for (; i.z > -1; )
      i.add(s);
    return i;
  }
  /***
       Get intersection points between a plane and the camera near plane
       When a plane gets clipped by the camera near plane, the clipped corner projected coords returned by _applyMat4() are erronate
       We need to find the intersection points using another approach
       Here I chose to use non clipped corners projected coords and a really small vector parallel to the plane's side
       We're adding that vector again and again to our corner projected coords until the Z coordinate matches the near plane: we got our intersection
  
       params:
       @corners (array): our original corners vertices coordinates
       @mvpCorners (array): the projected corners of our plane
       @clippedCorners (array): index of the corners that are clipped
  
       returns:
       @mvpCorners (array): the corrected projected corners of our plane
       ***/
  _getNearPlaneIntersections(e, t, s) {
    const i = this._matrices.modelViewProjection.matrix;
    if (s.length === 1)
      s[0] === 0 ? (t[0] = this._getIntersection(t[1], k.set(0.95, 1, 0).applyMat4(i)), t.push(this._getIntersection(t[3], F.set(-1, -0.95, 0).applyMat4(i)))) : s[0] === 1 ? (t[1] = this._getIntersection(t[0], k.set(-0.95, 1, 0).applyMat4(i)), t.push(this._getIntersection(t[2], F.set(1, -0.95, 0).applyMat4(i)))) : s[0] === 2 ? (t[2] = this._getIntersection(t[3], k.set(-0.95, -1, 0).applyMat4(i)), t.push(this._getIntersection(t[1], F.set(1, 0.95, 0).applyMat4(i)))) : s[0] === 3 && (t[3] = this._getIntersection(t[2], k.set(0.95, -1, 0).applyMat4(i)), t.push(this._getIntersection(t[0], F.set(-1, 0.95, 0).applyMat4(i))));
    else if (s.length === 2)
      s[0] === 0 && s[1] === 1 ? (t[0] = this._getIntersection(t[3], k.set(-1, -0.95, 0).applyMat4(i)), t[1] = this._getIntersection(t[2], F.set(1, -0.95, 0).applyMat4(i))) : s[0] === 1 && s[1] === 2 ? (t[1] = this._getIntersection(t[0], k.set(-0.95, 1, 0).applyMat4(i)), t[2] = this._getIntersection(t[3], F.set(-0.95, -1, 0).applyMat4(i))) : s[0] === 2 && s[1] === 3 ? (t[2] = this._getIntersection(t[1], k.set(1, 0.95, 0).applyMat4(i)), t[3] = this._getIntersection(t[0], F.set(-1, 0.95, 0).applyMat4(i))) : s[0] === 0 && s[1] === 3 && (t[0] = this._getIntersection(t[1], k.set(0.95, 1, 0).applyMat4(i)), t[3] = this._getIntersection(t[2], F.set(0.95, -1, 0).applyMat4(i)));
    else if (s.length === 3) {
      let r = 0;
      for (let a = 0; a < e.length; a++)
        s.includes(a) || (r = a);
      t = [
        t[r]
      ], r === 0 ? (t.push(this._getIntersection(t[0], k.set(-0.95, 1, 0).applyMat4(i))), t.push(this._getIntersection(t[0], F.set(-1, 0.95, 0).applyMat4(i)))) : r === 1 ? (t.push(this._getIntersection(t[0], k.set(0.95, 1, 0).applyMat4(i))), t.push(this._getIntersection(t[0], F.set(1, 0.95, 0).applyMat4(i)))) : r === 2 ? (t.push(this._getIntersection(t[0], k.set(0.95, -1, 0).applyMat4(i))), t.push(this._getIntersection(t[0], F.set(1, -0.95, 0).applyMat4(i)))) : r === 3 && (t.push(this._getIntersection(t[0], k.set(-0.95, -1, 0).applyMat4(i))), t.push(this._getIntersection(t[0], F.set(-1 - 0.95, 0).applyMat4(i))));
    } else
      for (let r = 0; r < e.length; r++)
        t[r][0] = 1e4, t[r][1] = 1e4;
    return t;
  }
  /***
       Useful to get our WebGL plane bounding box in the world space
       Takes all transformations into account
       Used internally for frustum culling
  
       returns :
       @boundingRectangle (obj): an object containing our plane WebGL element 4 corners coordinates: top left corner is [-1, 1] and bottom right corner is [1, -1]
       ***/
  _getWorldCoords() {
    const e = [
      lt.set(-1, 1, 0),
      // plane's top left corner
      dt.set(1, 1, 0),
      // plane's top right corner
      ct.set(1, -1, 0),
      // plane's bottom right corner
      ut.set(-1, -1, 0)
      // plane's bottom left corner
    ];
    let t = [], s = [];
    for (let o = 0; o < e.length; o++) {
      const l = e[o].applyMat4(this._matrices.modelViewProjection.matrix);
      t.push(l), Math.abs(l.z) > 1 && s.push(o);
    }
    s.length && (t = this._getNearPlaneIntersections(e, t, s));
    let i = 1 / 0, r = -1 / 0, a = 1 / 0, h = -1 / 0;
    for (let o = 0; o < t.length; o++) {
      const l = t[o];
      l.x < i && (i = l.x), l.x > r && (r = l.x), l.y < a && (a = l.y), l.y > h && (h = l.y);
    }
    return {
      top: h,
      right: r,
      bottom: a,
      left: i
    };
  }
  /***
   Transpose our plane corners coordinates from world space to document space
   Sets an object with the accurate plane WebGL bounding rect relative to document
   ***/
  _computeWebGLBoundingRect() {
    const e = this._getWorldCoords();
    let t = {
      top: 1 - (e.top + 1) / 2,
      right: (e.right + 1) / 2,
      bottom: 1 - (e.bottom + 1) / 2,
      left: (e.left + 1) / 2
    };
    t.width = t.right - t.left, t.height = t.bottom - t.top, this._boundingRect.worldToDocument = {
      width: t.width * this.renderer._boundingRect.width,
      height: t.height * this.renderer._boundingRect.height,
      top: t.top * this.renderer._boundingRect.height + this.renderer._boundingRect.top,
      left: t.left * this.renderer._boundingRect.width + this.renderer._boundingRect.left,
      // add left and width to get right property
      right: t.left * this.renderer._boundingRect.width + this.renderer._boundingRect.left + t.width * this.renderer._boundingRect.width,
      // add top and height to get bottom property
      bottom: t.top * this.renderer._boundingRect.height + this.renderer._boundingRect.top + t.height * this.renderer._boundingRect.height
    };
  }
  /***
       Returns our plane WebGL bounding rect relative to document
  
       returns :
       @boundingRectangle (obj): an object containing our plane WebGL element bounding rectangle (width, height, top, bottom, right and left properties)
       ***/
  getWebGLBoundingRect() {
    if (this._matrices.modelViewProjection)
      (!this._boundingRect.worldToDocument || this.alwaysDraw) && this._computeWebGLBoundingRect();
    else
      return this._boundingRect.document;
    return this._boundingRect.worldToDocument;
  }
  /***
       Returns our plane WebGL bounding rectangle in document coordinates including additional drawCheckMargins
  
       returns :
       @boundingRectangle (obj): an object containing our plane WebGL element bounding rectangle including the draw check margins (top, bottom, right and left properties)
       ***/
  _getWebGLDrawRect() {
    return this._computeWebGLBoundingRect(), {
      top: this._boundingRect.worldToDocument.top - this.drawCheckMargins.top,
      right: this._boundingRect.worldToDocument.right + this.drawCheckMargins.right,
      bottom: this._boundingRect.worldToDocument.bottom + this.drawCheckMargins.bottom,
      left: this._boundingRect.worldToDocument.left - this.drawCheckMargins.left
    };
  }
  /***
   This function checks if the plane is currently visible in the canvas and sets _shouldDraw property according to this test
   This is our real frustum culling check
   ***/
  _shouldDrawCheck() {
    const e = this._getWebGLDrawRect();
    Math.round(e.right) <= this.renderer._boundingRect.left || Math.round(e.left) >= this.renderer._boundingRect.left + this.renderer._boundingRect.width || Math.round(e.bottom) <= this.renderer._boundingRect.top || Math.round(e.top) >= this.renderer._boundingRect.top + this.renderer._boundingRect.height ? this._shouldDraw && (this._shouldDraw = !1, this.renderer.nextRender.add(() => this._onLeaveViewCallback && this._onLeaveViewCallback())) : (this._shouldDraw || this.renderer.nextRender.add(() => this._onReEnterViewCallback && this._onReEnterViewCallback()), this._shouldDraw = !0);
  }
  /***
   This function returns if the plane is actually drawn (ie fully initiated, visible property set to true and not culled)
   ***/
  isDrawn() {
    return this._canDraw && this.visible && (this._shouldDraw || this.alwaysDraw);
  }
  /*** DEPTH AND RENDER ORDER ***/
  /***
       This function set/unset the depth test for that plane
  
       params :
       @shouldEnableDepthTest (bool): enable/disable depth test for that plane
       ***/
  enableDepthTest(e) {
    this._depthTest = e;
  }
  /*** SOURCES ***/
  /***
   Load our initial sources if needed and calls onReady callback
   ***/
  _initSources() {
    let e = 0;
    if (this.autoloadSources) {
      const t = this.htmlElement.getElementsByTagName("img"), s = this.htmlElement.getElementsByTagName("video"), i = this.htmlElement.getElementsByTagName("canvas");
      t.length && this.loadImages(t), s.length && this.loadVideos(s), i.length && this.loadCanvases(i), e = t.length + s.length + i.length;
    }
    this.loader._setLoaderSize(e), this._canDraw = !0;
  }
  /*** DRAWING ***/
  /***
   Specific instructions for the Plane class to execute before drawing it
   ***/
  _startDrawing() {
    this._canDraw && (this._onRenderCallback && this._onRenderCallback(), this.target ? this.renderer.bindFrameBuffer(this.target) : this.renderer.state.scenePassIndex === null && this.renderer.bindFrameBuffer(null), this._setPerspectiveMatrix(), this._setMVMatrix(), (this.alwaysDraw || this._shouldDraw) && this.visible && this._draw());
  }
  /*** INTERACTION ***/
  /***
       This function takes the mouse position relative to the document and returns it relative to our plane
       It ranges from -1 to 1 on both axis
  
       params :
       @mouseCoordinates (Vec2 object): coordinates of the mouse
  
       returns :
       @mousePosition (Vec2 object): the mouse position relative to our plane in WebGL space coordinates
       ***/
  mouseToPlaneCoords(e) {
    if (ge.setAxisOrder(this.quaternion.axisOrder), ge.equals(this.quaternion) && ft.equals(this.transformOrigin))
      return super.mouseToPlaneCoords(e);
    {
      const t = {
        x: 2 * (e.x / (this.renderer._boundingRect.width / this.renderer.pixelRatio)) - 1,
        y: 2 * (1 - e.y / (this.renderer._boundingRect.height / this.renderer.pixelRatio)) - 1
      }, s = this.camera.position.clone(), i = pt.set(
        t.x,
        t.y,
        -0.5
      );
      i.unproject(this.camera), i.sub(s).normalize();
      const r = gt.set(0, 0, -1);
      r.applyQuat(this.quaternion).normalize();
      const a = _t.set(0, 0, 0), h = r.dot(i);
      if (Math.abs(h) >= 1e-4) {
        const o = this._matrices.world.matrix.getInverse().multiply(this.camera.viewMatrix), l = this._boundingRect.world.transformOrigin.clone().add(this._translation), d = mt.set(
          this._translation.x - l.x,
          this._translation.y - l.y,
          this._translation.z - l.z
        );
        d.applyQuat(this.quaternion), l.add(d);
        const c = r.dot(l.clone().sub(s)) / h;
        a.copy(
          s.add(i.multiplyScalar(c))
        ), a.applyMat4(o);
      } else
        a.set(1 / 0, 1 / 0, 1 / 0);
      return xt.set(a.x, a.y);
    }
  }
  /*** EVENTS ***/
  /***
       This is called each time a plane is entering again the view bounding box
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onReEnterView(e) {
    return e && (this._onReEnterViewCallback = e), this;
  }
  /***
       This is called each time a plane is leaving the view bounding box
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onLeaveView(e) {
    return e && (this._onLeaveViewCallback = e), this;
  }
}
class ne {
  constructor(e, {
    shaderPass: t,
    depth: s = !1,
    clear: i = !0,
    maxWidth: r,
    maxHeight: a,
    minWidth: h = 1024,
    minHeight: o = 1024,
    texturesOptions: l = {}
  } = {}) {
    if (this.type = "RenderTarget", e = e && e.renderer || e, !e || e.type !== "Renderer")
      O(this.type + ": Renderer not passed as first argument", e);
    else if (!e.gl) {
      e.production || O(this.type + ": Unable to create a " + this.type + " because the Renderer WebGL context is not defined");
      return;
    }
    this.renderer = e, this.gl = this.renderer.gl, this.index = this.renderer.renderTargets.length, this._shaderPass = t, this._depth = s, this._shouldClear = i, this._maxSize = {
      width: r ? Math.min(this.renderer.state.maxTextureSize / 4, r) : this.renderer.state.maxTextureSize / 4,
      // enough!
      height: a ? Math.min(this.renderer.state.maxTextureSize / 4, a) : this.renderer.state.maxTextureSize / 4
    }, this._minSize = {
      width: h * this.renderer.pixelRatio,
      height: o * this.renderer.pixelRatio
    }, l = Object.assign({
      // set default sampler to "uRenderTexture" and isFBOTexture to true
      sampler: "uRenderTexture",
      isFBOTexture: !0,
      premultiplyAlpha: !1,
      anisotropy: 1,
      generateMipmap: !1,
      floatingPoint: "none",
      wrapS: this.gl.CLAMP_TO_EDGE,
      wrapT: this.gl.CLAMP_TO_EDGE,
      minFilter: this.gl.LINEAR,
      magFilter: this.gl.LINEAR
    }, l), this._texturesOptions = l, this.userData = {}, this.uuid = he(), this.renderer.renderTargets.push(this), this.renderer.onSceneChange(), this._initRenderTarget();
  }
  /***
   Init our RenderTarget by setting its size, creating a textures array and then calling _createFrameBuffer()
   ***/
  _initRenderTarget() {
    this._setSize(), this.textures = [], this._createFrameBuffer();
  }
  /*** RESTORING CONTEXT ***/
  /***
   Restore a render target
   Basically just re init it
   ***/
  _restoreContext() {
    this._setSize(), this._createFrameBuffer();
  }
  /***
   Sets our RenderTarget size based on its parent plane size
   ***/
  _setSize() {
    this._shaderPass && this._shaderPass._isScenePass ? this._size = {
      width: this.renderer._boundingRect.width,
      height: this.renderer._boundingRect.height
    } : this._size = {
      width: Math.min(this._maxSize.width, Math.max(this._minSize.width, this.renderer._boundingRect.width)),
      height: Math.min(this._maxSize.height, Math.max(this._minSize.height, this.renderer._boundingRect.height))
    };
  }
  /***
   Resizes our RenderTarget (only resize it if it's a ShaderPass scene pass FBO)
   ***/
  resize() {
    this._shaderPass && (this._setSize(), this.textures[0].resize(), this.renderer.bindFrameBuffer(this, !0), this._depth && this._bindDepthBuffer(), this.renderer.bindFrameBuffer(null));
  }
  /***
   Binds our depth buffer
   ***/
  _bindDepthBuffer() {
    this._depthBuffer && (this.gl.bindRenderbuffer(this.gl.RENDERBUFFER, this._depthBuffer), this.gl.renderbufferStorage(this.gl.RENDERBUFFER, this.gl.DEPTH_COMPONENT16, this._size.width, this._size.height), this.gl.framebufferRenderbuffer(this.gl.FRAMEBUFFER, this.gl.DEPTH_ATTACHMENT, this.gl.RENDERBUFFER, this._depthBuffer));
  }
  /***
   Here we create our frame buffer object
   We're also adding a render buffer object to handle depth if needed
   ***/
  _createFrameBuffer() {
    this._frameBuffer = this.gl.createFramebuffer(), this.renderer.bindFrameBuffer(this, !0), this.textures.length ? (this.textures[0]._parent = this, this.textures[0]._restoreContext()) : new X(this.renderer, this._texturesOptions).addParent(this), this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0, this.gl.TEXTURE_2D, this.textures[0]._sampler.texture, 0), this._depth && (this._depthBuffer = this.gl.createRenderbuffer(), this._bindDepthBuffer()), this.renderer.bindFrameBuffer(null);
  }
  /*** GET THE RENDER TARGET TEXTURE ***/
  /***
       Returns the render target's texture
  
       returns :
       @texture (Texture class object): our RenderTarget's texture
       ***/
  getTexture() {
    return this.textures[0];
  }
  /*** DESTROYING ***/
  /***
   Remove an element by calling the appropriate renderer method
   ***/
  remove() {
    if (this._shaderPass) {
      this.renderer.production || g(this.type + ": You're trying to remove a RenderTarget attached to a ShaderPass. You should remove that ShaderPass instead:", this._shaderPass);
      return;
    }
    this._dispose(), this.renderer.removeRenderTarget(this);
  }
  /***
   Delete a RenderTarget buffers and its associated texture
   ***/
  _dispose() {
    this._frameBuffer && (this.gl.deleteFramebuffer(this._frameBuffer), this._frameBuffer = null), this._depthBuffer && (this.gl.deleteRenderbuffer(this._depthBuffer), this._depthBuffer = null), this.textures[0]._dispose(), this.textures = [];
  }
}
class yt extends we {
  constructor(e, t, {
    sampler: s = "uPingPongTexture",
    // Plane params
    widthSegments: i,
    heightSegments: r,
    renderOrder: a,
    // does not have much sense
    depthTest: h,
    cullFace: o,
    uniforms: l,
    vertexShaderID: d,
    fragmentShaderID: c,
    vertexShader: u,
    fragmentShader: f,
    texturesOptions: y,
    crossOrigin: _,
    alwaysDraw: v,
    visible: x,
    transparent: p,
    drawCheckMargins: m,
    autoloadSources: b,
    watchScroll: w,
    fov: P
  } = {}) {
    if (h = !1, b = !1, super(e, t, {
      widthSegments: i,
      heightSegments: r,
      renderOrder: a,
      depthTest: h,
      cullFace: o,
      uniforms: l,
      vertexShaderID: d,
      fragmentShaderID: c,
      vertexShader: u,
      fragmentShader: f,
      texturesOptions: y,
      crossOrigin: _,
      alwaysDraw: v,
      visible: x,
      transparent: p,
      drawCheckMargins: m,
      autoloadSources: b,
      watchScroll: w,
      fov: P
    }), !this.gl)
      return;
    this.renderer.scene.removePlane(this), this.type = "PingPongPlane", this.renderer.scene.addPlane(this), this.readPass = new ne(e, {
      depth: !1,
      clear: !1,
      texturesOptions: y
    }), this.writePass = new ne(e, {
      depth: !1,
      clear: !1,
      texturesOptions: y
    }), this.createTexture({
      sampler: s
    });
    let T = 0;
    this.readPass.getTexture().onSourceUploaded(() => {
      T++, this._checkIfReady(T);
    }), this.writePass.getTexture().onSourceUploaded(() => {
      T++, this._checkIfReady(T);
    }), this.setRenderTarget(this.readPass), this._onRenderCallback = () => {
      this.readPass && this.writePass && this.textures[0] && this.textures[0]._uploaded && this.setRenderTarget(this.writePass), this._onPingPongRenderCallback && this._onPingPongRenderCallback();
    }, this._onAfterRenderCallback = () => {
      this.readPass && this.writePass && this.textures[0] && this.textures[0]._uploaded && this._swapPasses(), this._onPingPongAfterRenderCallback && this._onPingPongAfterRenderCallback();
    };
  }
  /***
   Copy the current target texture once both render targets textures have been uploaded
   Wait for next tick to be sure our texture is correctly initiated
   ***/
  _checkIfReady(e) {
    e === 2 && this.renderer.nextRender.add(() => {
      this.textures[0].copy(this.target.getTexture());
    });
  }
  /***
   After each draw call, we'll swap the 2 render targets and copy the read pass texture again
   ***/
  _swapPasses() {
    const e = this.readPass;
    this.readPass = this.writePass, this.writePass = e, this.textures[0].copy(this.readPass.getTexture());
  }
  /***
   Returns the created texture where we're writing
   ***/
  getTexture() {
    return this.textures[0];
  }
  /*** OVERRIDE USED EVENTS ***/
  /***
       This is called at each requestAnimationFrame call
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onRender(e) {
    return e && (this._onPingPongRenderCallback = e), this;
  }
  /***
       This is called at each requestAnimationFrame call
  
       params :
       @callback (function) : a function to execute
  
       returns :
       @this: our plane to handle chaining
       ***/
  onAfterRender(e) {
    return e && (this._onPingPongAfterRenderCallback = e), this;
  }
  /*** DESTROYING ***/
  /***
   Override the regular remove method to remove the 2 render targets
   ***/
  remove() {
    this.target = null, this.renderer.bindFrameBuffer(null), this.writePass && (this.writePass.remove(), this.writePass = null), this.readPass && (this.readPass.remove(), this.readPass = null), super.remove();
  }
}
const Q = (n, e, t) => n * (1 - t) + e * t, Te = (n, e, t, s) => Math.sqrt(Math.pow(n - t, 2) + Math.pow(e - s, 2)), vt = (n, e, t, s) => (s - t) / (e - n);
function bt(n) {
  return n.map((e, t) => t > 0 ? Math.sqrt(
    Math.pow(e[0] - n[t - 1][0], 2) + Math.pow(e[1] - n[t - 1][1], 2)
  ) : 0).reduce((e, t) => e + t);
}
const Pt = (n, e) => {
  const t = [n[0]], s = n.length - 1;
  let i = 0;
  for (let r = 1; r < s; r++) {
    const a = Te(
      n[r][0],
      n[r][1],
      n[r - 1][0],
      n[r - 1][1]
    );
    a <= e / 2 ? i < e / 2 ? i += a : (t.push([
      Q(n[r - 1][0], n[r][0], 0.5),
      Q(n[r - 1][1], n[r][1], 0.5)
    ]), i = 0) : t.push([
      Q(n[r - 1][0], n[r][0], 0.5),
      Q(n[r - 1][1], n[r][1], 0.5)
    ]);
  }
  return t.push(n[s]), t;
}, wt = (n, e) => {
  const t = bt(n), s = Math.floor(t / e), i = [n[0]];
  function r(a) {
    let h = 1, o = 0;
    for (; n[h + 1] && o < a * e; )
      o += Te(n[h][0], n[h][1], n[h - 1][0], n[h - 1][1]), h++;
    return n[h];
  }
  for (let a = 0; a < s; a++) {
    const h = r(a), o = vt(
      i[a][0],
      h[0],
      i[a][1],
      h[1]
    ) || 0, l = Math.atan(o), d = {
      x: i[a][0] <= h[0] ? 1 : -1,
      y: i[a][1] <= h[1] ? 1 : -1
    };
    i.push([+(d.x * Math.abs(Math.cos(l)) * e + i[a][0]).toFixed(1), +(d.y * Math.abs(Math.sin(l)) * e + i[a][1]).toFixed(1)]);
  }
  return i;
}, me = (n, e) => {
  const t = Math.max(1.5, e / 500 * 4);
  return wt(
    Pt(n, t),
    t
  );
}, _e = {
  NORMAL: "src",
  ADD: "src + dst",
  SUBTRACT: "src - dst",
  MULTIPLY: "src * dst",
  SCREEN: "1. - (1. - src) * (1. - dst)",
  OVERLAY: "vec3((dst.x <= 0.5) ? (2.0 * src.x * dst.x) : (1.0 - 2.0 * (1.0 - dst.x) * (1.0 - src.x)), (dst.y <= 0.5) ? (2.0 * src.y * dst.y) : (1.0 - 2.0 * (1.0 - dst.y) * (1.0 - src.y)), (dst.z <= 0.5) ? (2.0 * src.z * dst.z) : (1.0 - 2.0 * (1.0 - dst.z) * (1.0 - src.z)))",
  DARKEN: "min(src, dst)",
  LIGHTEN: "max(src, dst)",
  COLOR_DODGE: "vec3((src.x == 1.0) ? 1.0 : min(1.0, dst.x / (1.0 - src.x)), (src.y == 1.0) ? 1.0 : min(1.0, dst.y / (1.0 - src.y)), (src.z == 1.0) ? 1.0 : min(1.0, dst.z / (1.0 - src.z)))",
  COLOR_BURN: "vec3((src.x == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.x) / src.x)), (src.y == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.y) / src.y)), (src.z == 0.0) ? 0.0 : (1.0 - ((1.0 - dst.z) / src.z)))",
  LINEAR_BURN: "(src + dst) - 1.0",
  HARD_LIGHT: "vec3((src.x <= 0.5) ? (2.0 * src.x * dst.x) : (1.0 - 2.0 * (1.0 - src.x) * (1.0 - dst.x)), (src.y <= 0.5) ? (2.0 * src.y * dst.y) : (1.0 - 2.0 * (1.0 - src.y) * (1.0 - dst.y)),  (src.z <= 0.5) ? (2.0 * src.z * dst.z) : (1.0 - 2.0 * (1.0 - src.z) * (1.0 - dst.z)))",
  SOFT_LIGHT: "vec3((src.x <= 0.5) ? (dst.x - (1.0 - 2.0 * src.x) * dst.x * (1.0 - dst.x)) : (((src.x > 0.5) && (dst.x <= 0.25)) ? (dst.x + (2.0 * src.x - 1.0) * (4.0 * dst.x * (4.0 * dst.x + 1.0) * (dst.x - 1.0) + 7.0 * dst.x)) : (dst.x + (2.0 * src.x - 1.0) * (sqrt(dst.x) - dst.x))), (src.y <= 0.5) ? (dst.y - (1.0 - 2.0 * src.y) * dst.y * (1.0 - dst.y)) : (((src.y > 0.5) && (dst.y <= 0.25)) ? (dst.y + (2.0 * src.y - 1.0) * (4.0 * dst.y * (4.0 * dst.y + 1.0) * (dst.y - 1.0) + 7.0 * dst.y)) : (dst.y + (2.0 * src.y - 1.0) * (sqrt(dst.y) - dst.y))), (src.z <= 0.5) ? (dst.z - (1.0 - 2.0 * src.z) * dst.z * (1.0 - dst.z)) : (((src.z > 0.5) && (dst.z <= 0.25)) ? (dst.z + (2.0 * src.z - 1.0) * (4.0 * dst.z * (4.0 * dst.z + 1.0) * (dst.z - 1.0) + 7.0 * dst.z)) : (dst.z + (2.0 * src.z - 1.0) * (sqrt(dst.z) - dst.z))))",
  DIFFERENCE: "abs(dst - src)",
  EXCLUSION: "src + dst - 2.0 * src * dst",
  LINEAR_LIGHT: "2.0 * src + dst - 1.0",
  PIN_LIGHT: "vec3((src.x > 0.5) ? max(dst.x, 2.0 * (src.x - 0.5)) : min(dst.x, 2.0 * src.x), (src.x > 0.5) ? max(dst.y, 2.0 * (src.y - 0.5)) : min(dst.y, 2.0 * src.y), (src.z > 0.5) ? max(dst.z, 2.0 * (src.z - 0.5)) : min(dst.z, 2.0 * src.z))",
  VIDID_LIGHT: "vec3((src.x <= 0.5) ? (1.0 - (1.0 - dst.x) / (2.0 * src.x)) : (dst.x / (2.0 * (1.0 - src.x))), (src.y <= 0.5) ? (1.0 - (1.0 - dst.y) / (2.0 * src.y)) : (dst.y / (2.0 * (1.0 - src.y))), (src.z <= 0.5) ? (1.0 - (1.0 - dst.z) / (2.0 * src.z)) : (dst.z / (2.0 * (1.0 - src.z))))"
};
let Re = "";
Object.keys(_e).forEach((n, e) => {
  Re += `
    if(blendMode == ${e}) {
      return ${_e[n]};
    }
  `;
});
const Tt = `
  vec3 blend (int blendMode, vec3 src, vec3 dst) {
    ${Re} 
  }
`, Rt = {
  LINEAR: "t",
  EASE_IN_QUAD: "t * t",
  EASE_OUT_QUAD: "t * (2.0 - t)",
  EASE_IN_OUT_QUAD: "t < 0.5 ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t",
  EASE_IN_CUBIC: "t * t * t",
  EASE_OUT_CUBIC: "--t * t * t + 1.0",
  EASE_IN_OUT_CUBIC: "t < 0.5 ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0",
  EASE_IN_QUART: "t * t * t * t",
  EASE_OUT_QUART: "1.0 - (--t) * t * t * t",
  EASE_IN_OUT_QUART: "t < 0.5 ? 8.0 * t * t * t * t : 1.0 - 8.0 * (--t) * t * t * t",
  EASE_IN_QUINT: "t * t * t * t * t",
  EASE_OUT_QUINT: "1.0 + (--t) * t * t * t * t",
  EASE_IN_OUT_QUINT: "t < 0.5 ? 16.0 * t * t * t * t * t : 1.0 + 16.0 * (--t) * t * t * t * t",
  EASE_IN_CIRC: "1.0 - sqrt(1.0 - t * t)",
  EASE_OUT_CIRC: "sqrt((2.0 - t) * t)",
  EASE_IN_OUT_CIRC: "t < 0.5 ? (1.0 - sqrt(1.0 - 4.0 * t * t)) / 2.0 : (sqrt(-((2.0 * t) - 3.0) * ((2.0 * t) - 1.0)) + 1.0) / 2.0",
  EASE_IN_EXPO: "t == 0.0 ? 0.0 : pow(2.0, 10.0 * (t - 1.0))",
  EASE_OUT_EXPO: "t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t)",
  EASE_IN_OUT_EXPO: "t == 0.0 ? 0.0 : t == 1.0 ? 1.0 : t < 0.5 ? pow(2.0, (20.0 * t) - 10.0) / 2.0 : (2.0 - pow(2.0, -20.0 * t + 10.0)) / 2.0",
  EASE_IN_SINE: "1.0 - cos((t * 3.141592654) / 2.0)",
  EASE_OUT_SINE: "sin((t * 3.141592654) / 2.0)",
  EASE_IN_OUT_SINE: "-(cos(3.141592654 * t) - 1.0) / 2.0",
  EASE_IN_ELASTIC: "t == 0.0 ? 0.0 : t == 1.0 ? 1.0 : -pow(2.0, 10.0 * t - 10.0) * sin((t * 10.0 - 10.75) * ((2.0 * 3.141592654) / 3.0))",
  EASE_OUT_ELASTIC: "t == 0.0 ? 0.0 : t == 1.0 ? 1.0 : pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * ((2.0 * 3.141592654) / 3.0)) + 1.0",
  EASE_IN_OUT_ELASTIC: "t == 0.0 ? 0.0 : t == 1.0 ? 1.0 : t < 0.5 ? -(pow(2.0, 20.0 * t - 10.0) * sin((20.0 * t - 11.125) * ((2.0 * 3.141592654) / 4.5))) / 2.0 : (pow(2.0, -20.0 * t + 10.0) * sin((20.0 * t - 11.125) * ((2.0 * 3.141592654) / 4.5))) / 2.0 + 1.0"
};
Object.keys(Rt).forEach((n, e) => {
});
const Se = `#version 300 es
precision mediump float;

in vec3 aVertexPosition;
in vec2 aTextureCoord;

uniform mat4 uMVMatrix;
uniform mat4 uPMatrix;
uniform mat4 uTextureMatrix;
uniform vec2 uMousePos;

out vec2 vTextureCoord;
out vec3 vVertexPosition;

void main() {
    float angleX = uMousePos.y * 0.5 - 0.25; // Vertical mouse movement tilts around the X-axis
    float angleY = (1.-uMousePos.x) * 0.5 - 0.25; // Horizontal mouse movement tilts around the Y-axis

    // Rotation matrices around X and Y axes
    mat4 rotateX = mat4(1.0, 0.0, 0.0, 0.0,
                        0.0, cos(angleX), -sin(angleX), 0.0,
                        0.0, sin(angleX), cos(angleX), 0.0,
                        0.0, 0.0, 0.0, 1.0);
    mat4 rotateY = mat4(cos(angleY), 0.0, sin(angleY), 0.0,
                        0.0, 1.0, 0.0, 0.0,
                        -sin(angleY), 0.0, cos(angleY), 0.0,
                        0.0, 0.0, 0.0, 1.0);

    mat4 rotationMatrix = rotateX * rotateY;
    gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);
    vVertexPosition = (rotationMatrix * vec4(aVertexPosition, 1.0)).xyz;
    vTextureCoord = (uTextureMatrix * vec4(aTextureCoord, 0.0, 1.0)).xy;
}`, St = `#version 300 es
precision mediump float;
in vec2 vTextureCoord;
in vec3 vVertexPosition;

uniform sampler2D uBgTexture;
uniform sampler2D uTexture;
uniform vec2 uMousePos;
uniform vec2 uResolution;
uniform float uOpacity;
uniform float uAxisTilt;
uniform int uSampleBg;
uniform float uTrackMouse;

vec2 perspectiveUV(vec2 uv) {
  float aspectRatio = uResolution.x/uResolution.y;
  vec2 centeredUV = uv - 0.5;
  centeredUV.x *= aspectRatio;
  float strength = 1.0 + (vVertexPosition.z * uAxisTilt);
  vec2 perspectiveUV = centeredUV / strength;
  perspectiveUV.x /= aspectRatio;
  perspectiveUV += 0.5;
  return perspectiveUV;
}

out vec4 fragColor;

void main() {
  vec2 uv = vTextureCoord;
  vec2 pos = mix(vec2(0), (uMousePos - 0.5), uTrackMouse);
  uv = perspectiveUV(uv) - pos;
  vec4 color = texture(uTexture, uv);
  vec4 background = uSampleBg == 1 ? texture(uBgTexture, vTextureCoord) : vec4(0);
  
  color = mix(background, color, color.a * uOpacity);
  fragColor = color/(color.a + 0.0000000000001);
}
`, Et = {
  fragmentShader: St,
  vertexShader: Se,
  crossorigin: "Anonymous",
  texturesOptions: {
    floatingPoint: "none",
    premultiplyAlpha: !0
  },
  uniforms: {
    opacity: {
      name: "uOpacity",
      type: "1f",
      value: 1
    },
    mousePos: {
      name: "uMousePos",
      type: "2f",
      value: new I(0.5)
    },
    trackMouse: {
      name: "uTrackMouse",
      type: "1f",
      value: 0
    },
    axisTilt: {
      name: "uAxisTilt",
      type: "1f",
      value: 0
    },
    resolution: {
      name: "uResolution",
      type: "2f",
      value: new I(1080, 1080)
    },
    sampleBg: {
      name: "uSampleBg",
      type: "1i",
      value: 1
    }
  }
}, Mt = `#version 300 es
precision mediump float;
in vec2 vTextureCoord;
in vec3 vVertexPosition;

uniform vec2 uResolution;
uniform vec2 uMousePos;
uniform sampler2D uBgTexture;
uniform sampler2D uMaskTexture;
uniform sampler2D uTexture;
uniform float uOpacity;
uniform int uBlendMode;
uniform float uBgDisplace;
uniform float uDisplace;
uniform float uDispersion;
uniform float uTrackMouse;
uniform float uAxisTilt;
uniform int uSampleBg;
uniform float uMask;

${Tt}

const float STEPS = 24.0;
const float PI = 3.1415926;

vec3 chromaticAbberation(vec2 st, float angle, float amount, float blend) {
  float aspectRatio = uResolution.x/uResolution.y;
  float rotation = angle * 360.0 * PI / 180.0;
  vec2 aberrated = amount * vec2(0.1 * sin(rotation) * aspectRatio, 0.1 * cos(rotation));
  aberrated *= distance(st, vec2(0.5)) * 2.0;

  vec4 red = vec4(0);
  vec4 blue = vec4(0);
  vec4 green = vec4(0);

  float invSteps = 1.0 / STEPS;
  float invStepsHalf = invSteps * 0.5;

  for(float i = 1.0; i <= STEPS; i++) {
    vec2 offset = aberrated * (i * invSteps);
    red += texture(uBgTexture, st - offset) * invSteps;
    blue += texture(uBgTexture, st + offset) * invSteps;
    green += texture(uBgTexture, st - offset * 0.5) * invStepsHalf;
    green += texture(uBgTexture, st + offset * 0.5) * invStepsHalf;
  }

  return vec3(red.r, green.g, blue.b);
}

vec3 refrakt(vec3 eyeVector, vec3 normal, float iorRatio) {
  float dotProduct = dot(eyeVector, normal);
  float k = 1.0 - iorRatio * iorRatio * (1.0 - dotProduct * dotProduct);
  
  // Handle total internal reflection
  if (k < 0.0) {
    // Calculate reflection instead
    return reflect(eyeVector, normal);
  } else {
    // Calculate refraction
    return iorRatio * eyeVector - (iorRatio * dotProduct + sqrt(k)) * normal;
  }
}

vec4 displacement (vec2 st, vec4 bg, vec4 color) {
  if(uBgDisplace == 1.0) {
    vec2 refraction = refrakt(vec3(vTextureCoord, 0.5), color.rgb, uDisplace-0.5).xy;
    vec2 displaced = vTextureCoord + mix(vec2(0), refraction * 0.1, uDisplace);
    vec4 bgDisp = texture(uBgTexture, displaced);
    bgDisp.rgb = uDispersion == 1.0 ? chromaticAbberation(displaced, atan(displaced.y, displaced.x)-0.25, uDisplace*0.2, 1.0) : bgDisp.rgb;
    return bgDisp * color.a;
  } else {
    vec2 normal = vec2(bg.r * 2.0 - 1.0, bg.g * 2.0 - 1.0) * 0.1; // Convert the color range from [0, 1] to [-1, 1]
    if(uMask == 1.) {
      return texture(uMaskTexture, st + normal * uDisplace) * texture(uTexture, st + normal * uDisplace).a;
    } else {
      return texture(uTexture, st + normal * uDisplace);
    }
  }
}

vec2 perspectiveUV(vec2 uv) {
  float aspectRatio = uResolution.x/uResolution.y;
  vec2 centeredUV = uv - 0.5;
  centeredUV.x *= aspectRatio;
  float strength = 1.0 + (vVertexPosition.z * uAxisTilt);
  vec2 perspectiveUV = centeredUV / strength;
  perspectiveUV.x /= aspectRatio;
  perspectiveUV += 0.5;
  return perspectiveUV;
}

out vec4 fragColor;

void main() {
  vec2 uv = vTextureCoord;
  vec2 pos = mix(vec2(0), (uMousePos - 0.5), uTrackMouse);
  uv = perspectiveUV(uv) - pos;
  vec4 maskColor = texture(uMaskTexture, vTextureCoord);
  vec4 base = texture(uTexture, uv);
  vec4 background = uSampleBg == 1 ? texture(uBgTexture, vTextureCoord) : vec4(0);
  vec4 color = base;

  if (uMask == 1.) {
    color = maskColor * color.a;
  }

  if (uDisplace > 0.) {
    if(uMask == 1.) {
      color = displacement(uv, background, uBgDisplace == 1. ? color : maskColor);
    } else {
      color = displacement(uv, background, color);
    }
  }

  if (uBlendMode > 0) {
    color.rgb = blend(uBlendMode, color.rgb, background.rgb) * color.a;
  }

  color = mix(background, color, color.a * uOpacity);
  fragColor = color.a > 0.0000001 ? (color / color.a) : color;
}
`, At = {
  fragmentShader: Mt,
  vertexShader: Se,
  crossorigin: "Anonymous",
  texturesOptions: {
    floatingPoint: "none",
    premultiplyAlpha: !0
  },
  uniforms: {
    dispersion: {
      name: "uDispersion",
      type: "1f",
      value: 0
    },
    displace: {
      name: "uDisplace",
      type: "1f",
      value: 0
    },
    bgDisplace: {
      name: "uBgDisplace",
      type: "1f",
      value: 0
    },
    resolution: {
      name: "uResolution",
      type: "2f",
      value: new I(1080, 1080)
    },
    mousePos: {
      name: "uMousePos",
      type: "2f",
      value: new I(0.5)
    },
    opacity: {
      name: "uOpacity",
      type: "1f",
      value: 1
    },
    trackMouse: {
      name: "uTrackMouse",
      type: "1f",
      value: 0
    },
    axisTilt: {
      name: "uAxisTilt",
      type: "1f",
      value: 0
    },
    mask: {
      name: "uMask",
      type: "1f",
      value: 0
    },
    sampleBg: {
      name: "uSampleBg",
      type: "1i",
      value: 1
    },
    blendMode: {
      name: "uBlendMode",
      type: "1i",
      value: 0
    }
  }
};
(function(n) {
  var e = {};
  function t(s) {
    if (e[s])
      return e[s].exports;
    var i = e[s] = { i: s, l: !1, exports: {} };
    return n[s].call(i.exports, i, i.exports, t), i.l = !0, i.exports;
  }
  t.m = n, t.c = e, t.d = function(s, i, r) {
    t.o(s, i) || Object.defineProperty(s, i, { enumerable: !0, get: r });
  }, t.r = function(s) {
    typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(s, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(s, "__esModule", { value: !0 });
  }, t.t = function(s, i) {
    if (1 & i && (s = t(s)), 8 & i || 4 & i && typeof s == "object" && s && s.__esModule)
      return s;
    var r = /* @__PURE__ */ Object.create(null);
    if (t.r(r), Object.defineProperty(r, "default", { enumerable: !0, value: s }), 2 & i && typeof s != "string")
      for (var a in s)
        t.d(r, a, function(h) {
          return s[h];
        }.bind(null, a));
    return r;
  }, t.n = function(s) {
    var i = s && s.__esModule ? function() {
      return s.default;
    } : function() {
      return s;
    };
    return t.d(i, "a", i), i;
  }, t.o = function(s, i) {
    return Object.prototype.hasOwnProperty.call(s, i);
  }, t.p = "", t(t.s = 0);
})([function(n, e, t) {
  var s = this && this.__spreadArray || function(h, o) {
    for (var l = 0, d = o.length, c = h.length; l < d; l++, c++)
      h[c] = o[l];
    return h;
  };
  Object.defineProperty(e, "__esModule", { value: !0 }), e.ConicalGradient = void 0;
  var i = t(1);
  function r(h, o, l, d, c, u, f) {
    o === void 0 && (o = [[0, "#fff"], [1, "#fff"]]), l === void 0 && (l = 0), d === void 0 && (d = 0), c === void 0 && (c = 0), u === void 0 && (u = 2 * Math.PI), f === void 0 && (f = !1);
    var y = Math.floor(180 * c / Math.PI), _ = Math.ceil(180 * u / Math.PI), v = document.createElement("canvas");
    v.width = h.canvas.width, v.height = h.canvas.height;
    var x = v.getContext("2d"), p = [[0, 0], [h.canvas.width, 0], [h.canvas.width, h.canvas.height], [0, h.canvas.height]], m = Math.max.apply(Math, p.map(function(M) {
      var E = M[0], R = M[1];
      return Math.sqrt(Math.pow(E - l, 2) + Math.pow(R - d, 2));
    })) + 10;
    x.translate(l, d);
    for (var b = 2 * Math.PI * (m + 20) / 360, w = new i.default(o, _ - y + 1), P = y; P <= _; P++)
      x.save(), x.rotate((f ? -1 : 1) * (Math.PI * P) / 180), x.beginPath(), x.moveTo(0, 0), x.lineTo(m, -2 * b), x.lineTo(m, 0), x.fillStyle = w.getColor(P - y), x.fill(), x.closePath(), x.restore();
    var T = document.createElement("canvas");
    T.width = h.canvas.width, T.height = h.canvas.height;
    var A = T.getContext("2d");
    return A.beginPath(), A.arc(l, d, m, c, u, f), A.lineTo(l, d), A.closePath(), A.fillStyle = A.createPattern(v, "no-repeat"), A.fill(), h.createPattern(T, "no-repeat");
  }
  e.default = r, CanvasRenderingContext2D.prototype.createConicalGradient = function() {
    for (var h = [], o = 0; o < arguments.length; o++)
      h[o] = arguments[o];
    var l = this, d = { stops: [], addColorStop: function(c, u) {
      this.stops.push([c, u]);
    }, get pattern() {
      return r.apply(void 0, s([l, this.stops], h));
    } };
    return d;
  };
  var a = t(2);
  Object.defineProperty(e, "ConicalGradient", { enumerable: !0, get: function() {
    return a.ConicalGradient;
  } });
}, function(n, e, t) {
  Object.defineProperty(e, "__esModule", { value: !0 });
  var s = function() {
    function i(r, a) {
      r === void 0 && (r = []), a === void 0 && (a = 100);
      var h = document.createElement("canvas");
      h.width = a, h.height = 1, this.ctx = h.getContext("2d");
      for (var o = this.ctx.createLinearGradient(0, 0, a, 0), l = 0, d = r; l < d.length; l++) {
        var c = d[l];
        o.addColorStop.apply(o, c);
      }
      this.ctx.fillStyle = o, this.ctx.fillRect(0, 0, a, 1), this.rgbaSet = this.ctx.getImageData(0, 0, a, 1).data;
    }
    return i.prototype.getColor = function(r) {
      var a = this.rgbaSet.slice(4 * r, 4 * r + 4);
      return "rgba(" + a[0] + ", " + a[1] + ", " + a[2] + ", " + a[3] / 255 + ")";
    }, i;
  }();
  e.default = s;
}, function(n, e, t) {
  Object.defineProperty(e, "__esModule", { value: !0 });
}]);
const Ct = (n, e, t, s, i) => {
  var r = Math.PI / 180 * i, a = Math.cos(r), h = Math.sin(r), o = a * (t - n) + h * (s - e) + n, l = a * (s - e) - h * (t - n) + e;
  return [+o.toFixed(1), +l.toFixed(1)];
}, G = (n, e) => {
  const t = e || 1, s = Math.min(...n.map((l) => l[0])), i = Math.max(...n.map((l) => l[0])), r = Math.min(...n.map((l) => l[1])), a = Math.max(...n.map((l) => l[1])), h = Math.abs(i - s), o = Math.abs(a - r);
  return {
    width: Math.round(h / t),
    height: Math.round(o / t),
    aspectRatio: h / t / (o / t),
    center: {
      x: Math.round((h / 2 + s) / t),
      y: Math.round((o / 2 + r) / t)
    },
    corners: [
      [s, r],
      [i, r],
      [i, a],
      [s, a]
    ]
  };
}, Ee = (n, e, t) => {
  let s;
  const i = G(t);
  if (e.fill.length > 1) {
    let r = e.gradientAngle ? +e.gradientAngle * 2 * Math.PI : 0, a = i.center.x, h = i.center.y;
    if (e.gradientType === "radial" && (s = n.createRadialGradient(
      a,
      h,
      Math.max(i.width, i.height) * 0.7,
      a,
      h,
      0
    )), e.gradientType === "linear" && (s = n.createLinearGradient(
      a - Math.cos(r) * i.width / 2,
      h - Math.sin(r) * i.height / 2,
      a + Math.cos(r) * i.width / 2,
      h + Math.sin(r) * i.height / 2
    )), e.gradientType === "conic") {
      s = n.createConicalGradient(
        a,
        h,
        -Math.PI + r,
        Math.PI + r
      );
      const o = [...e.fill, ...e.fill.slice().reverse()];
      o.forEach((d, c) => {
        s.addColorStop(c * (1 / (o.length - 1)), d);
      }), document.createElementNS("http://www.w3.org/2000/svg", "svg").createSVGMatrix(), s = s.pattern;
    } else
      e.fill.forEach((o, l) => {
        s.addColorStop(l * (1 / (e.fill.length - 1)), o);
      });
  } else
    s = e.fill[0];
  return s;
};
let Z, K;
typeof document.hidden < "u" ? (Z = "hidden", K = "visibilitychange") : typeof document.msHidden < "u" ? (Z = "msHidden", K = "msvisibilitychange") : typeof document.webkitHidden < "u" && (Z = "webkitHidden", K = "webkitvisibilitychange");
const It = {
  NORMAL: "Normal",
  ADD: "Add",
  SUBTRACT: "Subtract",
  MULTIPLY: "Multiply",
  SCREEN: "Screen",
  OVERLAY: "Overlay",
  DARKEN: "Darken",
  LIGHTEN: "Lighten",
  COLOR_DODGE: "Color dodge",
  COLOR_BURN: "Color burn",
  LINEAR_BURN: "Linear burn",
  HARD_LIGHT: "Hard light",
  SOFT_LIGHT: "Soft light",
  DIFFERENCE: "Difference",
  EXCLUSION: "Exclusion",
  LINEAR_LIGHT: "Linear light",
  PIN_LIGHT: "Pin light",
  VIVID_LIGHT: "Vivid light"
};
function Dt(n, e) {
  let t;
  return function() {
    const s = arguments, i = this;
    t || (n.apply(i, s), t = !0, setTimeout(() => t = !1, e));
  };
}
const Ot = () => {
  var n = (/* @__PURE__ */ new Date()).getTime(), e = typeof performance < "u" && performance.now && performance.now() * 1e3 || 0;
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(t) {
    var s = Math.random() * 16;
    return n > 0 ? (s = (n + s) % 16 | 0, n = Math.floor(n / 16)) : (s = (e + s) % 16 | 0, e = Math.floor(e / 16)), (t === "x" ? s : s & 3 | 8).toString(16);
  });
};
function U(n) {
  return n && typeof n == "string" && (n = JSON.parse(n)), Object.values(n);
}
function xe(n, e, t) {
  for (let s = 0; s < t; s++)
    n = (n + e) / 2;
  return +((n + e) / 2).toFixed(2);
}
function Lt(n) {
  const e = G(n.coords), t = n.getPositionOffset();
  let s = n.coords.map(([i, r]) => Ct(e.center.x, e.center.y, i, r, -n.rotation * 360));
  return s = s.map(([i, r]) => [
    Math.round(i + t.x),
    Math.round(r + t.y)
  ]), s;
}
function $(n, e) {
  const t = n[0] / n[1], s = Math.sqrt(t * (3e5 * (e || 1)));
  return [s, s / t];
}
function Me() {
  return /Android|iPhone/i.test(navigator.userAgent);
}
function j(n) {
  const e = n.trackMouse && n.trackMouse > 0;
  let t = n.layerType === "effect" && n.compiledFragmentShaders && n.compiledFragmentShaders.filter((i) => i.match(/uMousePos/g) && i.match(/uMousePos/g).length > 1).length, s = n.layerType === "effect" && n.animating;
  return e || t || s;
}
function zt(n, e, t) {
  const s = [];
  return n.forEach((i) => {
    switch (i.layerType) {
      case "text":
        s.push(new Xt(i, e, null, t).unpackage());
        break;
      case "image":
        s.push(new jt(i, e, t).unpackage());
        break;
      case "fill":
        s.push(new ye(i, e, t).unpackage());
        break;
      case "draw":
        s.push(new Ht(i, e, t).unpackage());
        break;
      case "shape":
        s.push(new Gt(i, e, t).unpackage());
        break;
      case "effect":
        s.push(new ye(i, e, t).unpackage());
        break;
    }
  }), s;
}
function kt(n) {
  n.forEach((e) => {
    if (e.fontCSS && e.fontCSS.src) {
      let t = e.fontCSS.src.includes(".otf") ? "otf" : !1, s = e.fontCSS.src.includes(".tff") ? "tff" : !1;
      const i = document.createElement("link");
      i.rel = "preload", i.href = e.fontCSS.src, i.as = "font", i.type = `font/${t || s || "otf"}`, i.crossOrigin = "anonymous", document.head.appendChild(i);
    }
  });
}
function Ft(n, e) {
  if (n.length) {
    const t = document.createElement("style");
    for (let s = 0; s < n.length; s++) {
      let i = ["normal", "regular"].includes(n[s].fontStyle) ? "" : `:wght@${n[s].fontStyle}`;
      n[s].fontStyle === "italic" && (i = ""), n[s].fontCSS ? t.innerHTML += `
        @font-face {
          font-family: '${n[s].fontCSS.family}';
          src: url('${n[s].fontCSS.src}');
          font-display: swap;
        }` : t.innerHTML += `@import url(https://fonts.googleapis.com/css2?family=${n[s].fontFamily.split(" ").join("+")}${i});`;
    }
    document.head.appendChild(t);
  }
}
function Ut(n, e) {
  const s = $([e.offsetWidth || n.width, e.offsetHeight || n.height])[0] / e.offsetWidth, i = n.getPositionOffset(), r = document.createElement("div");
  r.setAttribute("data-us-text", "loading"), r.setAttribute("data-us-project", n.local.projectId), r.style.width = n.width / s + "px", r.style.height = n.height / s + "px", r.style.top = i.y / s + e.offsetTop + "px", r.style.left = i.x / s + e.offsetLeft + "px", r.style.fontSize = n.fontSize / s + "px", r.style.lineHeight = n.lineHeight / s + "px", r.style.letterSpacing = n.letterSpacing / s + "px", r.style.fontFamily = n.fontFamily, r.style.fontWeight = n.fontWeight, r.style.textAlign = n.textAlign, r.style.wordBreak = "break-word", r.style.transform = `rotateZ(${Math.round(n.rotation * 360)}deg)`, r.style.color = n.fill[0], r.style.zIndex = 2, r.innerText = n.textContent, e.appendChild(r);
}
let q;
function Vt() {
  L.forEach((n, e) => {
    document.body.contains(n.element) || (n.curtain.dispose(), L.splice(e, 1));
  });
}
function se() {
  cancelAnimationFrame(q);
  const n = L.filter((t) => t.getAnimatingEffects().length), e = (t) => {
    const s = n.filter((i) => i.isInView);
    L.forEach((i) => {
      i.rendering = s.includes(i);
    }), s.length ? (Zt(), s.forEach((i) => {
      i.curtain && t - i.lastTime >= i.frameDuration && (Kt(), i.curtain.render(), i.lastTime = t);
    }), q = requestAnimationFrame(e)) : cancelAnimationFrame(q);
  };
  n.length && (q = requestAnimationFrame(e));
}
function Nt(n, e) {
  return new Promise((t) => {
    const s = setInterval(() => {
      n.local[e] && (clearInterval(s), t());
    }, 20);
  });
}
function Y(n, e, t) {
  return n + (e - n) * t;
}
function Bt(n) {
  switch (n) {
    case "linear":
      return (e) => e;
    case "easeInQuad":
      return (e) => e * e;
    case "easeOutQuad":
      return (e) => 1 - (1 - e) * (1 - e);
    case "easeInOutQuad":
      return (e) => e < 0.5 ? 2 * e * e : 1 - Math.pow(-2 * e + 2, 2) / 2;
    case "easeInCubic":
      return (e) => e * e * e;
    case "easeInOutCubic":
      return (e) => e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
    case "easeOutCubic":
      return (e) => 1 - Math.pow(1 - e, 3);
    case "easeInQuart":
      return (e) => e * e * e * e;
    case "easeOutQuart":
      return (e) => 1 - Math.pow(1 - e, 4);
    case "easeInOutQuart":
      return (e) => e < 0.5 ? 8 * e * e * e * e : 1 - Math.pow(-2 * e + 2, 4) / 2;
    case "easeInQuint":
      return (e) => e * e * e * e * e;
    case "easeOutQuint":
      return (e) => 1 - Math.pow(1 - e, 5);
    case "easeInOutQuint":
      return (e) => e < 0.5 ? 16 * e * e * e * e * e : 1 - Math.pow(-2 * e + 2, 5) / 2;
    case "easeOutElastic":
      return (e) => {
        const t = 2 * Math.PI / 3;
        return e === 0 ? 0 : e === 1 ? 1 : Math.pow(2, -10 * e) * Math.sin((e * 10 - 0.75) * t) + 1;
      };
    case "easeInElastic":
      return (e) => {
        const t = 2 * Math.PI / 3;
        return e === 0 ? 0 : e === 1 ? 1 : -Math.pow(2, 10 * e - 10) * Math.sin((e * 10 - 10.75) * t);
      };
    case "easeInOutElastic":
      return (e) => {
        const t = 2 * Math.PI / 4.5;
        return e === 0 ? 0 : e === 1 ? 1 : e < 0.5 ? -(Math.pow(2, 20 * e - 10) * Math.sin((20 * e - 11.125) * t)) / 2 : Math.pow(2, -20 * e + 10) * Math.sin((20 * e - 11.125) * t) / 2 + 1;
      };
    case "easeInSine":
      return (e) => 1 - Math.cos(e * Math.PI / 2);
    case "easeOutSine":
      return (e) => Math.sin(e * Math.PI / 2);
    case "easeInOutSine":
      return (e) => -(Math.cos(Math.PI * e) - 1) / 2;
    case "easeInCirc":
      return (e) => 1 - Math.sqrt(1 - Math.pow(e, 2));
    case "easeOutCirc":
      return (e) => Math.sqrt(1 - Math.pow(e - 1, 2));
    case "easeInOutCirc":
      return (e) => e < 0.5 ? (1 - Math.sqrt(1 - Math.pow(2 * e, 2))) / 2 : (Math.sqrt(1 - Math.pow(-2 * e + 2, 2)) + 1) / 2;
    case "easeInExpo":
      return (e) => e === 0 ? 0 : Math.pow(2, 10 * e - 10);
    case "easeOutExpo":
      return (e) => e === 1 ? 1 : 1 - Math.pow(2, -10 * e);
    case "easeInOutExpo":
      return (e) => e === 0 ? 0 : e === 1 ? 1 : e < 0.5 ? Math.pow(2, 20 * e - 10) / 2 : (2 - Math.pow(2, -20 * e + 10)) / 2;
    default:
      return (e) => e;
  }
}
class Wt {
  constructor({ prop: e, value: t, transition: s, uniformData: i }) {
    this.prop = e, this.value = t, this.transition = s, this.complete = !1, this.progress = 0, this.initialStateSet = !1, this.uniformData = i, typeof this.value == "object" && (this.value.type === "Vec2" ? this.value = new I(this.value._x, this.value._y) : this.value.type === "Vec3" && (this.value = new S(this.value._x, this.value._y, this.value._z)));
  }
  cloneVector(e) {
    let t;
    return e.type === "Vec2" ? (t = new I(
      e._x,
      e._y
    ), this.prop === "pos" && (t.y = 1 - t.y)) : e.type === "Vec3" && (t = new S(
      e._x,
      e._y,
      e._z
    )), t;
  }
  initializeState(e, t) {
    if (t !== void 0 && (typeof t == "object" ? (this.endVal = this.cloneVector(t), this.startVal = this.cloneVector(this.value)) : this.endVal = t), e) {
      if (typeof this.value == "object") {
        let r;
        this.value.type === "Vec2" ? r = new I(this.value._x, this.value._y) : this.value.type === "Vec3" && (r = new S(this.value._x, this.value._y, this.value._z)), e.value = r;
      } else
        e.value = this.value;
      this.initialStateSet = !0;
    }
  }
  updateEffect(e, t) {
    const s = typeof this.value == "object";
    if (this.complete || !e.userData.createdAt || !this.initialStateSet)
      return !1;
    const i = e.uniforms[this.prop], r = Bt(this.transition.ease), a = e.userData.createdAt + this.transition.delay, h = Math.max(0, Math.min(1, (t - a) / this.transition.duration));
    let o = this.value;
    if (h > 0 && h <= 1) {
      let l = r(h);
      s ? (i.value.x = Y(o.x, this.endVal.x, l), this.prop === "pos" ? i.value.y = Y(1 - o.y, this.endVal.y, l) : i.value.y = Y(o.y, this.endVal.y, l), o.type === "Vec3" && (i.value.z = Y(o.z, this.endVal.z, l))) : i.value = Y(o, this.endVal, l);
    } else
      s ? i.value = this.cloneVector(this.value) : i.value = this.value;
    return h >= 1 && (this.complete = !0, this.progress = 0), this.lastTick = t, !0;
  }
  resetState() {
    this.progress = 0, this.complete = !1, this.initialStateSet = !1;
  }
}
class Ae {
  constructor(e, t) {
    z(this, "local", { id: "", projectId: "" });
    this.visible = e.visible !== void 0 ? e.visible : !e.hidden || !0, this.locked = e.locked || !1, this.aspectRatio = e.aspectRatio || 1, this.local.projectId = t, this.local.id = Ot();
  }
  state() {
    return L.find((e) => e.projectId === this.local.projectId) || this.initOptions;
  }
  getIndex() {
    return this.state().history.map((e) => e.local.id).indexOf(this.local.id);
  }
  getPlane() {
    return this.state().curtain.planes.find((e) => e.userData.id === this.local.id);
  }
  getPlanes() {
    return this.state().curtain.planes.filter((e) => e.userData.id === this.local.id);
  }
  getMaskedItem() {
    return this.mask ? this.state().history.filter((e) => e.visible && !e.parentLayer)[this.getIndex() - 1] : !1;
  }
  getChildEffectItems() {
    return this.effects ? this.state().history.filter((e) => e.visible && e.parentLayer && this.effects.includes(e.parentLayer)) : [];
  }
}
let ie = class extends Ae {
  constructor(t, s, i) {
    super(t, s);
    z(this, "isElement", !0);
    this.initOptions = i, this.opacity = t.opacity || 1, this.displace = t.displace || 0, this.trackMouse = t.trackMouse || 0, this.axisTilt = t.axisTilt || 0, this.bgDisplace = t.bgDisplace || 0, this.dispersion = t.dispersion || 0, this.blendMode = t.blendMode || "NORMAL", this.compiledFragmentShaders = t.compiledFragmentShaders || [], this.compiledVertexShaders = t.compiledVertexShaders || [];
  }
  createLocalCanvas() {
    const t = this.state(), s = document.createElement("canvas"), i = +t.dpi * t.scale;
    s.width = t.element.offsetWidth * i, s.height = t.element.offsetHeight * i;
    const a = $([t.element.offsetWidth, t.element.offsetHeight])[0] / t.element.offsetWidth, h = s.getContext("2d");
    h.scale(i / a, i / a), this.local.canvas = s, this.local.ctx = h;
  }
  resize() {
    const t = this.state();
    if (this.local.canvas) {
      const s = +t.dpi * t.scale, r = $([t.element.offsetWidth, t.element.offsetHeight])[0] / t.element.offsetWidth;
      this.local.canvas.width = t.canvasWidth, this.local.canvas.height = t.canvasHeight, this.local.ctx.scale(s / r, s / r);
    }
  }
  getPositionOffset() {
    const t = this.state(), s = t.canvasWidth / t.canvasHeight, i = this.aspectRatio / s, r = t.canvasWidth * Math.sqrt(i), a = t.canvasHeight / Math.sqrt(i), o = $([t.element.offsetWidth, t.element.offsetHeight])[0] / t.element.offsetWidth;
    let l = (t.canvasWidth * o - r * o) / (t.dpi * 2), d = (t.canvasHeight * o - a * o) / (t.dpi * 2);
    this.layerType === "image" && (l += r * o / (t.dpi * 2), d += a * o / (t.dpi * 2));
    let c = this.translateX + l, u = this.translateY + d;
    return { x: c, y: u, offX: l, offY: d };
  }
};
class Ht extends ie {
  constructor(t, s, i) {
    super(t, s);
    z(this, "layerType", "draw");
    this.initOptions = i;
    let r = this.default(t || {});
    for (let a in r)
      this[a] = r[a];
    Object.keys(t).length && this.createLocalCanvas();
  }
  default(t) {
    return {
      displace: t.displace || 0,
      bgDisplace: t.bgDisplace || 0,
      dispersion: t.dispersion || 0,
      blendMode: "NORMAL",
      opacity: t.opacity || 1,
      type: t.type || "circle",
      mask: t.mask || !1,
      brushRotation: t.brushRotation || t.rotation || 0,
      coords: t.coords || [],
      effects: t.effects || [],
      gradientAngle: t.gradientAngle || t.gradAngle || 0,
      gradientType: t.gradientType || t.gradType || "linear",
      fill: t.fill || ["#777777"],
      rotateHue: t.rotateHue || t.huerotate || !1,
      rotation: t.rotation || 0,
      lerp: t.lerp || !0,
      size: t.size || 100,
      translateX: t.translateX || 0,
      translateY: t.translateY || 0
    };
  }
  unpackage() {
    return this.coords = U(this.coords), this.fill = U(this.fill), this.effects = U(this.effects), this.coords.length > 3 ? this.coordsHiRes = me(this.coords, this.size) : this.coordsHiRes = this.coords, this;
  }
  interpolatePath() {
    this.coordsHiRes = me(this.coords, this.size);
  }
  render() {
    const t = this.state().getScaleFactor(this.aspectRatio);
    let s = this.lerp ? this.coordsHiRes || this.coords : this.coords;
    this.local.ctx.clearRect(0, 0, this.state().canvasWidth, this.state().canvasHeight);
    const i = this.getPositionOffset(), r = s.length;
    this.local.ctx.beginPath();
    for (let a = 0; a < r; a++) {
      let h = s[a][0] * t.x + i.x, o = s[a][1] * t.y + i.y;
      a === 0 ? this.local.ctx.moveTo(h, o) : this.local.ctx.lineTo(h, o);
    }
    this.local.ctx.lineJoin = "round", this.local.ctx.lineCap = "round", this.local.ctx.strokeStyle = this.fill[0], this.local.ctx.lineWidth = this.size, this.local.ctx.stroke();
  }
}
class Gt extends ie {
  constructor(t, s, i) {
    super(t, s);
    z(this, "layerType", "shape");
    z(this, "isElement", !0);
    this.initOptions = i;
    let r = this.default(t || {});
    for (let a in r)
      this[a] = r[a];
    Object.keys(t).length && (this.createLocalCanvas(), this.render());
  }
  default(t) {
    return {
      blendMode: t.blendMode || "NORMAL",
      borderRadius: t.borderRadius || 0,
      coords: t.coords || [],
      displace: t.displace || 0,
      dispersion: t.dispersion || 0,
      bgDisplace: t.bgDisplace || 0,
      effects: t.effects || [],
      fill: t.fill || ["#777777"],
      gradientAngle: t.gradientAngle || t.gradAngle || 0,
      gradientType: t.gradientType || t.gradType || "linear",
      mask: t.mask || 0,
      numSides: t.numSides || 3,
      opacity: t.opacity || 1,
      rotation: t.rotation || 0,
      translateX: t.translateX || 0,
      translateY: t.translateY || 0,
      type: t.type || "rectangle"
    };
  }
  unpackage() {
    return this.fill = U(this.fill), this.coords = U(this.coords), this.effects = U(this.effects), this;
  }
  render() {
    let t = Lt(this);
    if (this.local.ctx.beginPath(), this.type === "rectangle") {
      const s = G(this.coords);
      let i = this.borderRadius * Math.min(s.width, s.height) / 2;
      const r = (h, o, l) => {
        const d = Math.cos(l), c = Math.sin(l);
        return [h * d - o * c, h * c + o * d];
      }, a = this.rotation * 2 * Math.PI;
      if (t.length) {
        this.local.ctx.beginPath();
        let h = this.coords[0][0] < this.coords[1][0], o = this.coords[0][1] > this.coords[2][1], l = [-1, 1, -1, 1];
        h && (l = [-1, -1, -1, -1]), o && (l = [1, 1, 1, 1]), h && o && (l = [1, -1, 1, -1]);
        for (let d = 0; d < t.length; d++) {
          const [c, u] = t[d], [f, y] = t[(d + 1) % t.length], _ = (d + 1) * Math.PI / 2 + a, [v, x] = r(i, 0, _);
          let p = l[d];
          this.local.ctx.lineTo(c - v * p, u - x * p), this.local.ctx.arcTo(c, u, f, y, i);
        }
        this.local.ctx.closePath(), this.local.ctx.stroke();
      }
    } else if (this.type === "circle") {
      let s = G(t);
      const i = G(this.coords);
      this.local.ctx.ellipse(
        s.center.x,
        s.center.y,
        i.width / 2,
        i.height / 2,
        this.rotation * Math.PI * 2,
        0,
        2 * Math.PI
      );
    } else if (this.type === "polygon") {
      const s = this.numSides;
      if (t.length >= 2) {
        const i = G(t), r = G(this.coords), a = this.coords[0][1] > this.coords[2][1], h = i.center.y, o = i.center.x, l = (f, y, _, v, x) => {
          const p = Math.cos(_), m = Math.sin(_);
          f -= v, y -= x;
          const b = f * p - y * m, w = f * m + y * p;
          return f = b + v, y = w + x, [f, y];
        }, d = (this.rotation + (a ? 0.5 : 0)) * 2 * Math.PI, c = r.width / Math.sqrt(3) * 0.86, u = r.height / Math.sqrt(3) * 0.86;
        this.local.ctx.beginPath();
        for (let f = 0; f < s; f++) {
          const _ = -Math.PI / 2 + 2 * Math.PI * f / s;
          let v = o + c * Math.cos(_), x = h + u * Math.sin(_);
          [v, x] = l(v, x, d, o, h), f === 0 ? this.local.ctx.moveTo(v, x) : this.local.ctx.lineTo(v, x);
        }
        this.local.ctx.closePath();
      }
    }
    this.local.ctx.fillStyle = Ee(this.local.ctx, this, t), this.local.ctx.clearRect(0, 0, this.state().canvasWidth, this.state().canvasHeight), this.local.ctx.fill();
  }
}
class ye extends Ae {
  constructor(t, s, i) {
    super(t, s);
    z(this, "layerType", "effect");
    this.initOptions = i, this.type = t.type || "sine", this.speed = t.speed || 0.5, this.data = t.data || {}, this.parentLayer = t.parentLayer || !1, this.animating = t.animating || !1, this.isMask = t.isMask || 0, this.texture = t.texture || null, this.compiledFragmentShaders = t.compiledFragmentShaders || [], this.compiledVertexShaders = t.compiledVertexShaders || [], this.states = {
      appear: t.states && t.states.appear ? t.states.appear.map((r) => new Wt(r)) : []
    };
    for (let r in t)
      this[r] || (this[r] = t[r]);
  }
  unpackage() {
    this.type === "blur" && this.type, this.type === "smoothBlur" && (this.type = "blur"), this.type === "ungulate" && (this.type = "noise");
    for (let t in this)
      this[t] && this[t].type && (this[t].type === "Vec2" ? this[t] = new I(this[t]._x, this[t]._y) : this[t].type === "Vec3" && (this[t] = new S(this[t]._x, this[t]._y, this[t]._z)));
    return this;
  }
  getParent() {
    return this.state().history.filter((t) => t.effects && t.effects.length).find((t) => t.effects.includes(this.parentLayer));
  }
}
class jt extends ie {
  constructor(t, s, i) {
    super(t, s);
    z(this, "layerType", "image");
    z(this, "isElement", !0);
    this.initOptions = i;
    let r = this.default(t || {});
    for (let a in r)
      this[a] = r[a];
    Object.keys(t).length && (this.createLocalCanvas(), this.loadImage());
  }
  default(t) {
    return {
      bgDisplace: t.bgDisplace || 0,
      dispersion: t.dispersion || 0,
      effects: t.effects || [],
      size: t.size || 0.25,
      rotation: t.rotation || t.angle || 0,
      height: t.height || 50,
      displace: t.displace || 0,
      repeat: t.repeat || 0,
      mask: t.mask || 0,
      rotation: t.rotation || 0,
      scaleX: t.scaleX || 1,
      scaleY: t.scaleY || 1,
      src: t.src || "",
      speed: t.speed || 0.5,
      thumb: t.thumb || "",
      translateX: t.translateX || 0,
      translateY: t.translateY || 0,
      width: t.width || 50
    };
  }
  unpackage() {
    return this.effects = U(this.effects), this;
  }
  loadImage() {
    const t = new Image(), s = new Image();
    t.crossOrigin = "Anonymous", s.crossOrigin = "Anonymous", t.addEventListener("load", () => {
      this.local.loaded = !0, this.local.fullyLoaded = !0, this.local.img = t, this.width = t.width, this.height = t.height, this.render = this.renderImage, this.render(), this.getPlane() && this.getPlane().textures.filter((i) => i.sourceType === "canvas").forEach((i) => {
        i.shouldUpdate = !1, this.rendering || (i.needUpdate(), this.state().curtain.render());
      });
    }, !1), s.addEventListener("load", () => {
      this.local.loaded || (this.local.loaded = !0, this.local.img = s, this.width = s.width, this.height = s.height, this.render = this.renderImage, this.render());
    }, !1), t.src = this.src, s.src = this.thumb;
  }
  getRelativeScale() {
    return Math.min(
      1080 / this.width,
      1080 / this.height
    );
  }
  renderImage() {
    const t = this.getPositionOffset(), s = t.x, i = t.y, r = this.rotation * 360 * (Math.PI / 180), a = this.getRelativeScale();
    let h = this.width * a * this.scaleX, o = this.height * a * this.scaleY;
    this.local.ctx.clearRect(0, 0, this.state().canvasWidth, this.state().canvasHeight), this.local.ctx.save(), this.local.ctx.translate(s, i), this.local.ctx.rotate(r), this.local.ctx.scale(this.size, this.size), this.local.ctx.drawImage(this.local.img, -h / 2, -o / 2, h, o), this.local.ctx.restore();
  }
  render() {
  }
}
class Xt extends ie {
  constructor(t, s, i, r) {
    super(t, s);
    z(this, "layerType", "text");
    z(this, "isElement", !0);
    z(this, "justCreated", !1);
    this.initOptions = r;
    let a = this.default(t || {});
    for (let h in a)
      this[h] = a[h];
    if (this.isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent), Ut(this, r.element), Object.keys(t).length && (this.createLocalCanvas(), requestAnimationFrame(() => {
      this.coords = [
        [-2, 0],
        [-2 + this.width, 0],
        [-2 + this.width, 0 + this.height],
        [-2, 0 + this.height]
      ];
    })), i)
      this.local.loaded = !0, this.render(), this.state().renderNFrames(2), this.getPlane() && this.getPlane().textures.filter((h) => h.sourceType === "canvas").forEach((h) => {
        h.needUpdate();
      });
    else {
      const h = new FontFace(this.fontFamily, `url(${this.fontCSS.src})`, {
        style: this.fontStyle.includes("italic") ? "italic" : "normal",
        weight: isNaN(parseInt(this.fontStyle)) ? 400 : parseInt(this.fontStyle)
      });
      document.fonts.add(h), h.load().then(() => {
        this.local.loaded = !0, this.render(), this.state().renderNFrames(2), this.getPlane() && this.getPlane().textures.filter((o) => o.sourceType === "canvas").forEach((o) => {
          o.needUpdate();
        });
      });
    }
  }
  default(t) {
    return {
      bgDisplace: t.bgDisplace || 0,
      dispersion: t.dispersion || 0,
      effects: t.effects || [],
      fill: t.fill || ["#ffffff"],
      highlight: t.highlight || ["transparent"],
      fontSize: t.fontSize || 24,
      fontCSS: t.fontCSS || null,
      lineHeight: t.lineHeight || 25,
      letterSpacing: t.letterSpacing || 0,
      mask: t.mask || 0,
      fontFamily: t.fontFamily || "arial",
      fontStyle: t.fontStyle || "normal",
      fontWeight: t.fontWeight || "normal",
      textAlign: t.textAlign || "left",
      textContent: t.textContent || "",
      gradientAngle: t.gradientAngle || t.gradAngle || 0,
      gradientType: t.gradientType || t.gradType || "linear",
      coords: t.coords || [],
      rotation: t.rotation || 0,
      translateX: t.translateX || 0,
      translateY: t.translateY || 0,
      width: t.width || 200,
      height: t.height || 50
    };
  }
  unpackage() {
    return this.fill = U(this.fill), this.highlight = U(this.highlight), this.coords = U(this.coords), this.effects = U(this.effects), this;
  }
  render() {
    const t = this.getPositionOffset();
    let s = t.x, i = t.y, r = 0, a = this.width, h = this.height, o = this.fontSize > 0 ? this.fontSize : 0, l = this.lineHeight > 0 ? this.lineHeight : 0, d = this.fontStyle.includes("italic") ? "italic" : "normal", c = "400";
    this.local.textBoxPos = { x: s, y: i }, this.local.ctx.clearRect(0, 0, this.state().canvasWidth, this.state().canvasHeight), this.local.ctx.font = `${d} ${c} ${o}px/${l}px ${this.fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial`, this.isSafari || (this.local.ctx.textAlign = this.textAlign, this.local.ctx.letterSpacing = this.letterSpacing + "px");
    const u = this.local.ctx.measureText("m").width;
    a = Math.max(a, u), this.local.ctx.save(), this.local.ctx.translate(s + a / 2, i + h / 2), this.local.ctx.rotate(this.rotation * 360 * Math.PI / 180), this.local.ctx.translate(-(s + a / 2), -(i + h / 2)), this.textAlign === "center" && (s += a / 2), this.textAlign === "right" && (s += a), this.local.ctx.fillStyle = Ee(this.local.ctx, this, this.coords);
    const f = (p, m, b, w, P, T, A) => {
      let M = m.split("").reduce((R, D, V) => R + p.measureText(D).width + (V < m.length - 1 ? P : 0), 0), E;
      if (T === "center" ? E = b + (A - M) / 2 - A / 2 : E = b, T === "right")
        for (let R = m.length - 1; R >= 0; R--) {
          const D = m[R];
          E -= p.measureText(D).width, p.fillText(D, E, w), R > 0 && (E -= P);
        }
      else
        for (let R = 0; R < m.length; R++)
          p.fillText(m[R], E, w), E += p.measureText(m[R]).width + P;
    }, y = (p, m) => {
      let b = i + l * m + l / 2 + o / 3;
      this.isSafari ? f(this.local.ctx, p, s, b, this.letterSpacing, this.textAlign, a) : this.local.ctx.fillText(p, s, b);
    }, _ = this.textContent ? this.textContent.split(`
`) : [""];
    let v = _.length;
    const x = (p, m, b) => m.split("").reduce((P, T, A) => (P += p.measureText(T).width, A < m.length - 1 && (P += b), P), 0);
    for (let p = 0; p < v; p++) {
      let m = "", b = _[p].split(/(\s|\n)/);
      for (let w = 0; w < b.length; w++) {
        const P = b[w], T = m + P;
        if ((this.isSafari && this.letterSpacing ? x(this.local.ctx, T, this.letterSpacing) : this.local.ctx.measureText(T).width) > a || P === `
`) {
          if (m !== "")
            _[p] = m.trim(), w !== b.length - 1 ? (_.splice(p + 1, 0, b.slice(w).join("")), v++) : P !== `
` && _.push(P);
          else {
            let M = P, E = p;
            for (; M.length > 0; ) {
              let R = "";
              for (let D = 0; D < M.length && (this.local.ctx.measureText(R + M[D]).width <= a || D == 0); D++)
                R += M[D];
              M = M.slice(R.length), _[E] = R.trim(), M.length > 0 && (_.splice(E + 1, 0, M), E++, v++);
            }
            b.slice(w + 1).length > 0 && (_[E] += b.slice(w + 1).join(""));
          }
          break;
        } else
          m = T;
        w === b.length - 1 && (_[p] = m.trim());
      }
    }
    _.forEach((p, m) => {
      y(p, r), m < _.length - 1 && r++;
    }), this.local.ctx.translate(-(s + a / 2), -(i + h / 2)), this.local.ctx.restore(), this.height = this.lineHeight * r + this.lineHeight;
  }
}
function Yt() {
  document[Z] ? cancelAnimationFrame(q) : se();
}
function qt() {
  L.forEach((n) => {
    n.initialized && n.isInView && n.resize();
  });
}
const $t = Dt(() => {
  L.forEach((n) => {
    n.setVisibilityState();
  });
}, 32);
let ve = window.scrollY;
function Qt(n) {
  $t();
  const e = L.filter((s) => s.getAnimatingEffects().length), t = L.filter((s) => s.rendering);
  e.length && !t.length && se(), t.length && t.forEach((s) => {
    s.mouse.movePos.y += (window.scrollY - ve) / 2;
  }), ve = window.scrollY;
}
function Zt() {
  L.forEach((n) => {
    n.isInView && n.curtain.planes.find((e) => e.uniforms.mousePos) && (Me() && n.interactivity && n.interactivity.mouse && n.interactivity.mouse.disableMobile || (n.interactivity.mouse.momentum ? (n.mouse.pos.x = xe(n.mouse.movePos.x, n.mouse.lastPos.x, n.interactivity.mouse.momentum * 2), n.mouse.pos.y = xe(n.mouse.movePos.y, n.mouse.lastPos.y, n.interactivity.mouse.momentum * 2)) : (n.mouse.pos.x = n.mouse.movePos.x, n.mouse.pos.y = n.mouse.movePos.y), n.mouse.lastPos.x = n.mouse.pos.x, n.mouse.lastPos.y = n.mouse.pos.y));
  });
}
function be(n) {
  L.filter((e) => e.isInView).forEach((e) => {
    let t = e.curtain.container.getBoundingClientRect(), s, i;
    n.targetTouches ? (s = n.targetTouches[0].clientX, i = n.targetTouches[0].clientY) : (s = n.clientX, i = n.clientY);
    const r = {
      x: t.left / 2,
      y: t.top / 2
    }, a = s / 2 - r.x, h = i / 2 - r.y;
    e.mouse.movePos.x = a, e.mouse.movePos.y = h;
  });
}
function Kt() {
  L.filter((n) => n.isInView && n.mouse.recordTrail).forEach((n) => {
    n.mouse.trail.unshift([
      n.mouse.pos.x / (n.element.offsetWidth * 0.5),
      1 - n.mouse.pos.y / (n.element.offsetHeight * 0.5)
    ]), n.mouse.trail.length > 100 && n.mouse.trail.pop();
  });
}
const L = [];
class Jt {
  constructor(e) {
    this.canvasWidth = e.width || e.element.offsetWidth || window.innerWidth, this.canvasHeight = e.height || e.element.offsetHeight || window.innerHeight, this.curtain = void 0, this.curtainRafId = void 0, this.dpi = +e.dpi || Math.min(1.5, window.devicePixelRatio), this.element = e.element, this.fps = e.fps || 60, this.frameDuration = Math.floor(1e3 / (e.fps || 60)), this.history = e.history, this.initialized = !1, this.lasTick = null, this.isInView = !1, this.lastTime = 0, this.rendering = !1, this.projectId = e.projectId, this.interactivity = {
      mouse: {
        momentum: 1.1,
        disableMobile: !1
      },
      scroll: {
        momentum: 1.1,
        disableMobile: !1
      }
    }, this.loading = !0, this.mouse = {
      downPos: { x: 0, y: 0 },
      movePos: { x: window.innerWidth / 4, y: window.innerHeight / 4 },
      lastPos: { x: window.innerWidth / 4, y: window.innerHeight / 4 },
      delta: { x: 0, y: 0 },
      dragging: !1,
      trail: [],
      recordTrail: !1,
      pos: { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    }, this.renderingScale = e.renderingScale || 1, this.scale = e.scale || 1, this.size = "Square", this.split = !1, this.versionId = "", e.width && e.height && (this.element.style.width = e.width + "px", this.element.style.height = e.height + "px"), this.createCurtains(), this.setCanvasScale(), this.setVisibilityState();
  }
  setCanvasScale() {
    this.canvasWidth = this.element.offsetWidth * this.dpi * this.scale, this.canvasHeight = this.element.offsetHeight * this.dpi * this.scale;
  }
  destroy() {
    this.curtain.dispose();
  }
  resize() {
    this.setCanvasScale(), this.history.filter((e) => e.isElement).forEach((e) => {
      e.resize(), e.getPlane() && e.getPlane().textures.filter((t) => t.sourceType === "canvas").forEach((t) => {
        t.needUpdate();
      });
    }), this.history.filter((e) => e.render).forEach((e) => {
      e.render();
    }), this.curtain.resize();
  }
  setVisibilityState() {
    const e = this.element.getBoundingClientRect(), t = window.innerHeight || document.documentElement.clientHeight, s = window.innerWidth || document.documentElement.clientWidth, i = e.top < t && e.bottom > 0 && e.left < s && e.right > 0;
    this.isInView = i;
  }
  getScaleFactor(e) {
    return {
      x: Math.sqrt(this.canvasWidth / this.canvasHeight / e),
      y: Math.sqrt(this.canvasHeight / this.canvasWidth * e)
    };
  }
  getAnimatingEffects() {
    return this.history.filter((e) => j(e) && e.visible);
  }
  createCurtains() {
    const e = new Ue({
      container: this.element,
      premultipliedAlpha: !0,
      antialias: !1,
      autoRender: !1,
      autoResize: !1,
      watchScroll: !1,
      renderingScale: Math.min(Math.max(0.25, this.renderingScale), 1),
      production: !0,
      pixelRatio: this.dpi
    });
    document.querySelectorAll(`[data-us-text="loading"][data-us-project="${this.projectId}"]`).forEach((t) => {
      t.style.position = "absolute";
    }), this.curtain = e;
  }
  fullRedraw() {
    this.fullRedrawEnabled = !0, this.curtain.render(), this.fullRedrawEnabled = !1;
  }
  renderNFrames(e, t) {
    let s = 0;
    const i = () => {
      this.curtain.render(), s < e ? (s++, requestAnimationFrame(i)) : t && t();
    };
    this.rendering || i();
  }
  setInteractiveParams(e, t) {
    let s = {
      mouse: {
        momentum: 1.1,
        disableMobile: !1
      },
      scroll: {
        momentum: 1.1,
        disableMobile: !1
      }
    };
    t && t.mouse && ("momentum" in t.mouse && (s.mouse.momentum = t.mouse.momentum), "disableMobile" in t.mouse && (s.mouse.disableMobile = t.mouse.disableMobile)), e && e.interactivity && e.interactivity.mouse && ("momentum" in e.interactivity.mouse && (s.mouse.momentum = e.interactivity.mouse.momentum), "disableMobile" in e.interactivity.mouse && (s.mouse.disableMobile = e.interactivity.mouse.disableMobile)), this.interactivity = s;
  }
  getSplitOrderedItems() {
    let e = this.getOrderedItems(), t = 0, s = e[t];
    if (s) {
      let i = s.parentLayer ? s.getParent() : null, r = i && j(i), a = i && i.effects && i.effects.length && i.getChildEffectItems().filter((h) => j(h)).length;
      for (; s && !j(s) && !r && !a; )
        t++, s = e[t], s && (i = s.parentLayer ? s.getParent() : null, r = i && j(i), a = i && i.effects && i.effects.length && i.getChildEffectItems().filter((h) => j(h)).length);
      return {
        static: this.getOrderedItems().splice(0, t),
        dynamic: this.getOrderedItems().splice(t)
      };
    } else
      return {
        static: [],
        dynamic: []
      };
  }
  // Plane handling  
  initializePlanes(e) {
    this.initializing = !0, this.handleItemPlanes(() => {
      document.querySelectorAll(`[data-us-text="loading"][data-us-project="${this.projectId}"]`).forEach((t) => {
        t.style.color = "transparent";
      }), this.handlePlaneCreation(), e && e(this);
    });
  }
  getPassPlane(e, t) {
    return this.curtain.planes.find((s) => s.userData.id === e.local.id && s.userData.passIndex === t);
  }
  getRenderTargets() {
    return this.curtain.renderTargets.filter((e) => e.userData.id);
  }
  getPlanes() {
    return this.curtain.planes.filter((e) => e.type !== "PingPongPlane");
  }
  removeUnusedPlanes() {
    this.curtain.planes.forEach((e) => {
      e.remove();
    }), this.curtain.renderTargets.forEach((e) => {
      e.remove();
    });
  }
  getEffectParams(e, t) {
    let s = ["noise", "noiseField", "sine", "ripple"].includes(e.type) ? 250 : 1;
    const i = {
      resolution: {
        name: "uResolution",
        type: "2f",
        value: new I(this.canvasWidth, this.canvasHeight)
      },
      mousePos: {
        name: "uMousePos",
        type: "2f",
        value: new I(0.5)
      },
      previousMousePos: {
        name: "uPreviousMousePos",
        type: "2f",
        value: new I(0.5)
      },
      time: {
        name: "uTime",
        type: "1f",
        value: 0
      }
    };
    return e.states && e.states.appear.length && e.states.appear.forEach((r) => {
      i[r.prop] || (i[r.prop] = r.uniformData, i[r.prop].value = r.value);
    }), {
      crossOrigin: "",
      fragmentShader: e.compiledFragmentShaders[t || 0],
      vertexShader: e.compiledVertexShaders[t || 0],
      widthSegments: s,
      heightSegments: s,
      texturesOptions: {
        floatingPoint: "half-float",
        premultiplyAlpha: !0
      },
      uniforms: i
    };
  }
  createPlane(e, t, s) {
    let i;
    e.isElement ? e.compiledFragmentShaders.length ? i = this.getEffectParams(e) : e.displace === 0 && e.blendMode === "NORMAL" && !e.mask ? i = Et : i = At : i = this.getEffectParams(e, s ? s.index : null);
    const r = new we(this.curtain, this.curtain.container, i);
    return r.textures.length = 0, r.userData.id = e.local.id, r.userData.layerType = e.layerType, r.userData.type = e.type, r.setRenderOrder(t), r;
  }
  createPingPongPlane(e, t, s) {
    let i = this.getEffectParams(e, 1);
    const r = new yt(this.curtain, this.curtain.container, i), a = e.getParent();
    if (r)
      return r.userData.id = e.local.id, r.setRenderOrder(t), this.setInitialEffectPlaneUniforms(r, e, a, s), r.onReady(() => {
        r.userData.isReady = !0;
      }).onRender(() => this.setEffectPlaneUniforms(r, e)), r;
  }
  createEffectPlane(e, t, s) {
    const i = this.createPlane(e, t, s), r = e.getParent();
    i && (s && (i.userData.passIndex = s.index, i.userData.downSample = s.downSample, i.userData.length = e.data.passes.length, Object.entries(s).forEach(([a, h]) => {
      i.uniforms[a] && (i.uniforms[a].value = h);
    })), this.setInitialEffectPlaneUniforms(i, e, r, s), i.onReady(() => {
      i.userData.isReady = !0;
    }).onRender(() => this.setEffectPlaneUniforms(i, e)));
  }
  createElementPlane(e, t) {
    const s = this.createPlane(e, t);
    s && s.onReady(() => {
      s.userData.isReady = !0;
    }).onRender(() => {
      s.uniforms.mousePos.value.x = this.mouse.pos.x / (this.element.offsetWidth * 0.5), s.uniforms.mousePos.value.y = 1 - this.mouse.pos.y / (this.element.offsetHeight * 0.5), s.uniforms.resolution.value.x = this.curtain.canvas.width, s.uniforms.resolution.value.y = this.curtain.canvas.height, !s.userData.isReady && !e.compiledFragmentShaders.length && (s.uniforms.opacity.value = e.visible ? e.opacity : 0, s.uniforms.trackMouse.value = e.trackMouse || 0, s.uniforms.axisTilt.value = e.axisTilt || 0, s.renderOrder === 0 ? s.uniforms.sampleBg.value = 0 : s.uniforms.sampleBg.value = 1, s.uniforms.displace && (s.uniforms.displace.value = e.displace, s.uniforms.bgDisplace.value = e.bgDisplace, s.uniforms.dispersion.value = e.dispersion), s.uniforms.blendMode && (s.uniforms.blendMode.value = Object.keys(It).indexOf(e.blendMode)), s.uniforms.mask && "mask" in e && (s.uniforms.mask.value = e.mask));
    });
  }
  handleEffectPlane(e, t, s) {
    const i = "passIndex" in s ? this.getPassPlane(e, s.passIndex) : e.getPlane();
    let r = this.getRenderTargets()[t - 1], a = this.curtain.planes.find((o) => o.type === "PingPongPlane" && o.userData.id === e.local.id);
    a && i && i.createTexture({
      sampler: "uPingPongTexture",
      fromTexture: a.getTexture()
    }), r && i && i.createTexture({
      sampler: "uTexture",
      fromTexture: r.getTexture()
    }), s.passIndex > 0 && i && this.getRenderTargets()[t - (1 + s.passIndex)] && i.createTexture({
      sampler: "uBgTexture",
      fromTexture: this.getRenderTargets()[t - (1 + s.passIndex)].getTexture()
    });
    const h = e.texture || e.data.texture;
    h && (i.userData.textureLoaded = !1, i.loadImage(h.src, {
      sampler: h.sampler
    }, (o) => {
      i.userData.textureLoaded = !0, this.curtain.render();
    }));
  }
  handleElementPlane(e, t) {
    const s = e.getPlane(), i = e.getChildEffectItems();
    let r = this.getRenderTargets()[t - 1];
    if (i.length || (s.textures.length = 0), r && i.length && s ? s.createTexture({
      sampler: "uTexture",
      premultipliedAlpha: !0,
      fromTexture: r.getTexture()
    }) : s && s.loadCanvas(e.local.canvas, {
      premultipliedAlpha: !0,
      sampler: "uTexture"
    }), r) {
      let a = i.length + 1, h = i.reduce((d, c) => d + c.getPlanes().length, 0), o = this.getPlanes()[t - a], l = o ? this.history.find((d) => d.local.id === o.userData.id) : null;
      if (e.mask) {
        const d = r.getTexture();
        if (e.effects.length) {
          const c = e.getChildEffectItems().filter((u) => !u.isMask).reduce((u, f) => u + f.getPlanes().length, 0);
          r = this.getRenderTargets()[t - (1 + c)];
        }
        s.createTexture({
          sampler: "uMaskTexture",
          premultipliedAlpha: !0,
          fromTexture: l.isElement ? d : r.getTexture()
        });
      }
      if (e.mask) {
        let d = l.getPlanes().length + l.getChildEffectItems().reduce((c, u) => c + u.getPlanes().length, 0);
        l.getMaskedItem() && (d += l.getMaskedItem().getPlanes().length), l.getPlanes().filter((c) => c.type === "PingPongPlane").length && d--, r = this.getRenderTargets()[t - (1 + d + h)];
      } else
        r = this.getRenderTargets()[t - (1 + h)];
      r && s.createTexture({
        sampler: "uBgTexture",
        premultipliedAlpha: !0,
        fromTexture: r.getTexture()
      });
    }
  }
  handleChildEffectPlane(e, t, s) {
    const i = "passIndex" in s ? this.getPassPlane(e, s.passIndex) : e.getPlane(), r = e.getParent();
    let a = this.getRenderTargets()[t - 1], h = r.effects.filter((u) => {
      if (this.history.find((f) => f.parentLayer === u))
        return this.history.find((f) => f.parentLayer === u).visible;
    }), o = h.indexOf(e.parentLayer), l = h.at(-1) === h[o], d = s.passIndex === s.length;
    i && a && (o || s.passIndex > 0) ? (i.createTexture({
      sampler: "uTexture",
      premultipliedAlpha: !0,
      fromTexture: a.getTexture()
    }), e.isMask && (!s.length || l && d) && i.loadCanvas(r.local.canvas, {
      premultipliedAlpha: !0,
      sampler: "uMaskTexture"
    })) : i && e.isMask ? (l && d && i.loadCanvas(r.local.canvas, {
      premultipliedAlpha: !0,
      sampler: "uMaskTexture"
    }), a && i.createTexture({
      sampler: "uTexture",
      premultipliedAlpha: !0,
      fromTexture: a.getTexture()
    })) : i && i.loadCanvas(r.local.canvas, {
      premultipliedAlpha: !0,
      sampler: "uTexture"
    }), e.type === "custom" && i.createTexture({
      sampler: "uCustomTexture",
      premultipliedAlpha: !0,
      fromTexture: this.getRenderTargets()[t]
    });
    const c = e.texture || e.data.texture;
    c && (i.userData.textureLoaded = !1, i.loadImage(c.src, {
      sampler: c.sampler
    }, (u) => {
      i.userData.textureLoaded = !0, this.curtain.render();
    }));
  }
  createPlanes() {
    this.getOrderedItems().forEach((e, t) => {
      e.getPlanes().length ? e.getPlanes().forEach((s) => s.setRenderOrder(t)) : e.isElement ? this.createElementPlane(e, t) : this.createEffectPlanes(e, t);
    });
  }
  createEffectPlanes(e, t) {
    const s = e.data;
    s.passes && s.passes.length ? (this.createEffectPlane(e, t, {
      index: 0,
      length: s.passes.length + 1,
      downSample: s.downSample
    }), s.passes.forEach((i, r) => {
      this.createEffectPlane(e, t, {
        index: r + 1,
        length: s.passes.length + 1,
        downSample: i.downSample,
        [i.prop]: i.value
      });
    })) : (this.createEffectPlane(e, t), e.type === "mouse" && this.createPingPongPlane(e, t));
  }
  createTextures() {
    const e = this.getPlanes().filter((s) => s.visible).sort((s, i) => s.renderOrder - i.renderOrder), t = e.length;
    for (let s = 0; s < t; s++) {
      const i = e[s];
      let r = this.history.find((a) => a.local.id === i.userData.id);
      s < t - 1 && this.assignRenderTargetToPlane(e, s, r, i), this.handleTextures(r, s, i.userData);
    }
  }
  assignRenderTargetToPlane(e, t, s, i) {
    let r = this.getTextureParams(e, t, s), a = this.getRenderTargets()[t] || new ne(this.curtain, r);
    a.userData.id = i.userData.id, i.setRenderTarget(a);
  }
  handleTextures(e, t, s) {
    e.isElement ? this.handleElementPlane(e, t) : e.parentLayer ? this.handleChildEffectPlane(e, t, s) : this.handleEffectPlane(e, t, s);
  }
  handleItemPlanes(e, t) {
    t && this.handleArgs(t), this.createPlanes(), this.createTextures(), this.checkIfReady(e);
  }
  isNotReady(e) {
    const t = this.history.find((h) => h.local.id === e.userData.id), s = t.layerType === "image" && !t.local.loaded, i = t.layerType === "text" && !t.local.loaded, r = "textureLoaded" in e.userData && !e.userData.textureLoaded;
    return (this.split ? s || i || r : !1) || !e.userData.isReady;
  }
  checkIfReady(e) {
    const t = () => {
      this.curtain.planes.filter((s) => this.isNotReady(s)).length ? (this.curtain.render(), requestAnimationFrame(t)) : e();
    };
    t();
  }
  setInitialEffectPlaneUniforms(e, t, s, i) {
    if (!e.userData.initialUniformsSet || !e.userData.isReady) {
      for (let r in e.uniforms)
        r in t && (e.uniforms[r].value = t[r]);
      s && i && i.index < i.length - 1 && e.uniforms.isMask && (e.uniforms.isMask.value = 0), t.states && t.states.appear.length && t.states.appear.forEach((r) => {
        e.uniforms[r.prop] && r.initializeState(e.uniforms[r.prop], t[r.prop]);
      }), e.userData.initialUniformsSet = !0;
    }
  }
  handleStateEffects(e, t) {
    if (this.isInView && !e.userData.createdAt && (e.userData.createdAt = performance.now()), !t.states || !t.states.appear || !t.states.appear.length)
      return !1;
    const s = performance.now();
    t.states.appear.forEach((i) => {
      i.updateEffect(e, s);
    });
  }
  setEffectPlaneUniforms(e, t) {
    if (t.animating && e.uniforms.time && (e.uniforms.time.value += (t.speed || 1) * 60 / this.fps), this.handleStateEffects(e, t), e.uniforms.mousePos && (e.uniforms.mousePos.value.x = this.mouse.pos.x / (this.element.offsetWidth * 0.5), e.uniforms.mousePos.value.y = 1 - this.mouse.pos.y / (this.element.offsetHeight * 0.5)), e.uniforms.previousMousePos && this.mouse.trail.length > 3) {
      let s = this.mouse.trail.at(3);
      e.uniforms.previousMousePos.value.x = s[0], e.uniforms.previousMousePos.value.y = s[1];
    }
    e.uniforms.resolution.value.x = this.curtain.canvas.width, e.uniforms.resolution.value.y = this.curtain.canvas.height;
  }
  isHiddenFirstChildEffect(e) {
    return e.parentLayer && e.getParent().effects.length > 1 ? e.getParent().effects.indexOf(e.parentLayer) === 0 : !1;
  }
  removeRenderTargets() {
    this.getRenderTargets().forEach((e) => e.remove());
  }
  clearAllTextures() {
    this.getPlanes().forEach((e) => e.textures.length = 0);
  }
  handleArgs(e) {
    (e.reorder || e.changed && this.isHiddenFirstChildEffect(e.changed)) && (this.removeRenderTargets(), this.clearAllTextures()), e.changed && this.isHiddenFirstChildEffect(e.changed) && this.clearAllTextures();
  }
  getOrderedItems() {
    let e = [];
    return this.history.filter((t) => !t.parentLayer && t.visible).forEach((t) => {
      t.effects && t.effects.length && e.push(...t.getChildEffectItems()), e.push(t);
    }), e;
  }
  getTextureParams(e, t, s) {
    const i = {
      maxWidth: this.curtain.canvas.width,
      maxHeight: this.curtain.canvas.height
    }, r = e[t], a = e[t + 1] ? this.history.find((o) => o.local.id === e[t + 1].userData.id) : null;
    return (r.userData.downSample || a && !a.parentLayer && a.type === "pixelate" || a && !a.parentLayer && a.type === "diffuse" || s.type === "blur" || s.type === "bokeh" || s.type === "bloom" || s.type === "pixelate") && (i.maxWidth = this.canvasWidth, i.maxHeight = this.canvasHeight, !r.uniforms.final || r.uniforms.final.value < 1), i;
  }
  cloneCanvas(e) {
    const t = document.createElement("canvas");
    t.width = e.width, t.height = e.height;
    const s = t.getContext("2d"), i = this.scale;
    return s.scale(i, i), s.drawImage(e, 0, 0), t;
  }
  handlePlaneCreation() {
    this.history.filter((e) => e.isElement).forEach((e) => {
      e.render(), e.getPlane() && e.getPlane().textures.filter((t) => t.sourceType === "canvas").forEach((t) => {
        t.shouldUpdate = !1, t.needUpdate();
      });
    }), this.initialized = !0, this.initializing = !1, this.rendering || (this.fullRedraw(), this.renderNFrames(2)), this.removePlanes(), this.curtain.setPixelRatio(Math.min(Math.min(this.dpi || 1.5, 2), this.dpi)), se();
  }
  async removePlanes() {
    const e = this.getSplitOrderedItems();
    e.dynamic.length || e.static.pop();
    for (const t of e.static) {
      const s = t.layerType === "text" && !t.local.loaded, i = t.layerType === "image" && !t.local.fullyLoaded;
      (s || i) && await Nt(t, s ? "loaded" : "fullyLoaded");
      const r = t.getPlanes();
      for (const a of r)
        a.uuid !== r.at(-1).uuid && a.remove();
    }
  }
}
function es(n) {
  return typeof HTMLElement == "object" ? n instanceof HTMLElement : (
    //DOM2
    n && typeof n == "object" && n !== null && n.nodeType === 1 && typeof n.nodeName == "string"
  );
}
function ts() {
  window.addEventListener("mousemove", be), window.addEventListener("touchmove", be), window.addEventListener("scroll", Qt), window.addEventListener("routeChange", Vt), Me() || window.addEventListener("resize", qt), document.addEventListener(K, Yt, !1);
}
function ss(n, e, t) {
  return $([n.offsetWidth, n.offsetHeight])[0] / n.offsetWidth, {
    canvasWidth: n.offsetWidth * t,
    canvasHeight: n.offsetHeight * t,
    scale: e,
    dpi: t,
    element: n
  };
}
function hs() {
  L.forEach((n) => {
    n.destroy();
  }), L.length = 0;
}
function is(n) {
  let e = n.projectId.split("?")[0], t = n.projectId.split("?")[1];
  return new Promise((s, i) => {
    fetch(`https://firebasestorage.googleapis.com/v0/b/embeds.unicorn.studio/o/${e}?alt=media${t ? `&update=${t}` : ""}`).then((r) => r.json()).then((r) => {
      const a = r.options || {}, h = es(n.element) ? n.element : document.getElementById(n.elementId);
      if (!h) {
        i(new Error(`Couldn't find an element with id '${n.elementId}' on the page.`));
        return;
      }
      const o = zt(r.history, e, ss(h, n.scale || a.scale || 1, n.dpi || Math.min(1.5, window.devicePixelRatio)));
      kt(o.filter((d) => d.layerType === "text")), Ft(o.filter((d) => d.layerType === "text"));
      const l = new Jt({
        fps: n.fps || a.fps || 60,
        dpi: n.dpi,
        projectId: e,
        renderingScale: n.scale || a.scale || 1,
        element: h,
        width: n.width,
        height: n.height
      });
      L.push(l), l.history = o, l.mouse.recordTrail = l.history.find((d) => d.type == "mouse"), l.setInteractiveParams(n, a), l.initializePlanes(s);
    }).catch((r) => {
      console.log(r), i(r);
    });
  });
}
function os() {
  return new Promise((n, e) => {
    const t = document.querySelectorAll("[data-us-project]");
    [...t].filter((s) => !s.getAttribute("data-us-initialized")).forEach((s, i) => {
      const r = s.getAttribute("data-us-project"), a = s.getAttribute("data-us-dpi"), h = s.getAttribute("data-us-scale"), o = s.getAttribute("data-us-fps"), l = s.getAttribute("data-us-disableMobile");
      s.setAttribute("data-us-initialized", !0), is({
        projectId: r,
        element: s,
        dpi: +a,
        scale: +h,
        fps: +o,
        interactivity: l ? {
          mouse: {
            disableMobile: !0
          }
        } : null
      }).then((d) => {
        i === t.length - 1 && (se(), n(L));
      });
    });
  });
}
ts();
export {
  is as addScene,
  hs as destroy,
  os as init
};
