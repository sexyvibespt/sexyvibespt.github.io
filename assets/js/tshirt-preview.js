(function(){
  // === CONFIG — ajusta estes nomes conforme o repo ===
  const ASSETS = {
    maleBase: '/assets/images/basem.png', // PNG com base branca + sombras transparentes
    maleShadow: '/assets/images/sombram.png',
    femaleBase: '/assets/images/basef.png',
    femaleShadow: '/assets/images/sombraf.png'
  };
  // Tamanho fixo do container/canvas
  const LAYOUT_WIDTH = 400;
  const LAYOUT_HEIGHT = 500;
  // target rect percentages – ajustado para cobrir quase toda a t-shirt (mais área para user img e texto)
  const TARGET_PERCENT = {
    male: { x: 0.02, y: 0.02, w: 0.96, h: 0.85 }, // Maior h para mostrar mais da t-shirt
    female: { x: 0.02, y: 0.02, w: 0.96, h: 0.85 }
  };
  function setupHiDPICanvas(canvas, width, height) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return ctx;
  }
  function Shirt(canvas, baseImg, shadowImg, targetPercent) {
    this.canvas = canvas;
    this.base = baseImg;
    this.shadow = shadowImg;
    this.ctx = null;
    this.targetPercent = targetPercent;
    this.baseColor = '#ffffff';
    this.userImg = new Image();
    this.userImgLoaded = false;
    this.pos = { x: 0, y: 0 };
    this.scale = 1;
    this.text = '';
    this.textColor = '#000';
    this.textSize = 28;
    this.textPos = { x: 0, y: 0 };
    this.dragging = false;
    this.draggingText = false;
    this.dragStart = null;
    this.targetRect = { x:0,y:0,width:0,height:0 };
    this.loaded = false;
  }
  Shirt.prototype.init = function() {
    this.ctx = setupHiDPICanvas(this.canvas, LAYOUT_WIDTH, LAYOUT_HEIGHT);
    const w = LAYOUT_WIDTH, h = LAYOUT_HEIGHT;
    const tp = this.targetPercent;
    this.targetRect = {
      x: Math.round(tp.x * w),
      y: Math.round(tp.y * h),
      width: Math.round(tp.w * w),
      height: Math.round(tp.h * h)
    };
    this.pos.x = this.targetRect.x + this.targetRect.width/2;
    this.pos.y = this.targetRect.y + this.targetRect.height/2;
    this.textPos.x = w/2;
    this.textPos.y = h * 0.85; // Abaixo da área maior de imagem
    this.canvas.addEventListener('pointerdown', (e)=>this._onPointerDown(e));
    window.addEventListener('pointermove', (e)=>this._onPointerMove(e));
    window.addEventListener('pointerup', (e)=>this._onPointerUp(e));
    this.canvas.addEventListener('wheel', (e)=> {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.05 : 0.05;
      this.scale = Math.max(0.2, Math.min(3, this.scale + delta));
      this.draw();
    });
    this.userImg.onload = ()=> { this.userImgLoaded = true; this.draw(); };
    if (this.base.complete && this.shadow.complete) {
      this.loaded = true;
      this.draw();
    } else {
      console.log('Aguardando load de assets...');
      setTimeout(() => {
        if (!this.base.complete || !this.shadow.complete) {
          console.error('Falha ao carregar assets - verifique caminhos:', ASSETS);
        } else {
          this.loaded = true;
          this.draw();
        }
      }, 2000);
    }
  };
  Shirt.prototype.draw = function() {
    if (!this.loaded) {
      console.warn('Assets não loaded ainda - skip draw');
      return;
    }
    const ctx = this.ctx;
    const w = LAYOUT_WIDTH, h = LAYOUT_HEIGHT;
    ctx.clearRect(0,0, w, h);
    // Desenhar base preservando proporções
    if (this.base && this.base.complete) {
      const baseAspect = this.base.naturalWidth / this.base.naturalHeight;
      let drawBaseW = w;
      let drawBaseH = drawBaseW / baseAspect;
      if (drawBaseH > h) {
        drawBaseH = h;
        drawBaseW = drawBaseH * baseAspect;
      }
      const offsetX = (w - drawBaseW) / 2;
      const offsetY = (h - drawBaseH) / 2;
      ctx.drawImage(this.base, offsetX, offsetY, drawBaseW, drawBaseH);
      // Tint só na área da base usando temp canvas + source-in (máscara perfeita com PNG transparente)
      const temp = document.createElement('canvas');
      temp.width = w;
      temp.height = h;
      const tempCtx = temp.getContext('2d');
      // Fill com cor
      tempCtx.fillStyle = this.baseColor || '#ffffff';
      tempCtx.fillRect(0, 0, w, h);
      // Aplicar máscara da base (source-in mantém cor só onde base tem alpha >0)
      tempCtx.globalCompositeOperation = 'source-in';
      tempCtx.drawImage(this.base, offsetX, offsetY, drawBaseW, drawBaseH);
      // Desenhar tinted no main
      ctx.drawImage(temp, 0, 0);
    }
    // User image na área clipada
    if (this.userImgLoaded) {
      ctx.save();
      const tr = this.targetRect;
      ctx.beginPath();
      ctx.rect(tr.x, tr.y, tr.width, tr.height);
      ctx.clip();
      const aspect = this.userImg.naturalWidth / this.userImg.naturalHeight;
      let drawW = this.userImg.naturalWidth * this.scale;
      let drawH = drawW / aspect;
      if (drawH > tr.height) {
        drawH = tr.height;
        drawW = drawH * aspect;
      }
      ctx.drawImage(this.userImg, this.pos.x - drawW/2, this.pos.y - drawH/2, drawW, drawH);
      ctx.restore();
    }
    // Texto movível
    if (this.text && this.text.trim() !== '') {
      ctx.save();
      ctx.fillStyle = this.textColor || '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${this.textSize}px Arial`;
      ctx.fillText(this.text, this.textPos.x, this.textPos.y);
      ctx.restore();
    }
    // Sombra por cima (preserve proportions)
    if (this.shadow && this.shadow.complete) {
      const shadowAspect = this.shadow.naturalWidth / this.shadow.naturalHeight;
      let drawShadowW = w;
      let drawShadowH = drawShadowW / shadowAspect;
      if (drawShadowH > h) {
        drawShadowH = h;
        drawShadowW = drawShadowH * shadowAspect;
      }
      const offsetX = (w - drawShadowW) / 2;
      const offsetY = (h - drawShadowH) / 2;
      ctx.drawImage(this.shadow, offsetX, offsetY, drawShadowW, drawShadowH);
    }
  };
  // ... (resto do código igual ao anterior: _onPointerDown, _onPointerMove, _onPointerUp, setImageFile, fitToArea, exportPNG, loadImg, instâncias, listeners, reset, swap, etc.)
  // Nota: Copia os event listeners e funções restantes do teu código anterior aqui para não repetir. O foco é no draw() e exportPNG() com o temp canvas para tint.
  // Para exportPNG, usa a mesma lógica de temp canvas para tint.
  Shirt.prototype.exportPNG = function(filename='design.png') {
    const tmp = document.createElement('canvas');
    tmp.width = LAYOUT_WIDTH;
    tmp.height = LAYOUT_HEIGHT;
    const ctx = tmp.getContext('2d');
    ctx.clearRect(0,0, tmp.width, tmp.height);
    if (this.base && this.base.complete) {
      const temp = document.createElement('canvas');
      temp.width = tmp.width;
      temp.height = tmp.height;
      const tempCtx = temp.getContext('2d');
      tempCtx.fillStyle = this.baseColor || '#ffffff';
      tempCtx.fillRect(0, 0, tmp.width, tmp.height);
      tempCtx.globalCompositeOperation = 'source-in';
      const baseAspect = this.base.naturalWidth / this.base.naturalHeight;
      let drawBaseW = tmp.width;
      let drawBaseH = drawBaseW / baseAspect;
      if (drawBaseH > tmp.height) {
        drawBaseH = tmp.height;
        drawBaseW = drawBaseH * baseAspect;
      }
      const offsetX = (tmp.width - drawBaseW) / 2;
      const offsetY = (tmp.height - drawBaseH) / 2;
      tempCtx.drawImage(this.base, offsetX, offsetY, drawBaseW, drawBaseH);
      ctx.drawImage(temp, 0, 0);
    }
    if (this.userImgLoaded) {
      ctx.save();
      const tr = this.targetRect;
      ctx.beginPath();
      ctx.rect(tr.x, tr.y, tr.width, tr.height);
      ctx.clip();
      const aspect = this.userImg.naturalWidth / this.userImg.naturalHeight;
      let drawW = this.userImg.naturalWidth * this.scale;
      let drawH = drawW / aspect;
      if (drawH > tr.height) {
        drawH = tr.height;
        drawW = drawH * aspect;
      }
      ctx.drawImage(this.userImg, this.pos.x - drawW/2, this.pos.y - drawH/2, drawW, drawH);
      ctx.restore();
    }
    if (this.text && this.text.trim() !== '') {
      ctx.fillStyle = this.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${this.textSize}px Arial`;
      ctx.fillText(this.text, this.textPos.x, this.textPos.y);
    }
    if (this.shadow && this.shadow.complete) {
      const shadowAspect = this.shadow.naturalWidth / this.shadow.naturalHeight;
      let drawShadowW = tmp.width;
      let drawShadowH = drawShadowW / shadowAspect;
      if (drawShadowH > tmp.height) {
        drawShadowH = tmp.height;
        drawShadowW = drawShadowH * shadowAspect;
      }
      const offsetX = (tmp.width - drawShadowW) / 2;
      const offsetY = (tmp.height - drawShadowH) / 2;
      ctx.drawImage(this.shadow, offsetX, offsetY, drawShadowW, drawShadowH);
    }
    tmp.toBlob(function(blob){
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }, 'image/png', 0.92);
  };
  // Load assets e resto igual...
  function loadImg(src){ 
    const i = new Image(); 
    i.crossOrigin='anonymous'; 
    i.src = src; 
    i.onload = () => console.log('Loaded:', src, 'size:', i.naturalWidth, 'x', i.naturalHeight);
    i.onerror = () => console.error('Error loading:', src);
    return i; 
  }
  const maleBase = loadImg(ASSETS.maleBase);
  const maleShadow = loadImg(ASSETS.maleShadow);
  const femaleBase = loadImg(ASSETS.femaleBase);
  const femaleShadow = loadImg(ASSETS.femaleShadow);
  const canvas1 = document.getElementById('tcanvas1');
  const shirt1 = new Shirt(canvas1, maleBase, maleShadow, TARGET_PERCENT.male);
  const canvas2 = document.getElementById('tcanvas2');
  const shirt2 = new Shirt(canvas2, femaleBase, femaleShadow, TARGET_PERCENT.female);
  const whenLoaded = [maleBase, maleShadow, femaleBase, femaleShadow];
  let readyCount = 0;
  whenLoaded.forEach(img => { img.onload = ()=> {
    readyCount++;
    if (readyCount === whenLoaded.length) {
      shirt1.init();
      shirt2.init();
    }
  }; });
  // ... (copia os event listeners do teu código anterior)
})();
