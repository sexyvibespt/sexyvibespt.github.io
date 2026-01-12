(function(){
  // === CONFIG — ajusta estes nomes conforme o repo ===
  const ASSETS = {
    maleBase: '/assets/images/basem.png', // base sólido masculino (branco)
    maleShadow: '/assets/images/sombram.png', // sombras masculino
    femaleBase: '/assets/images/basef.png', // base sólido feminino (branco)
    femaleShadow: '/assets/images/sombraf.png' // sombras feminino
  };
  // Inicial sem size fixo - detectado de base img
  let LAYOUT_WIDTH = 600; // Fallback
  let LAYOUT_HEIGHT = 1200; // Fallback
  // target rect percentages (x, y, w, h) — ajustar se necessário para encaixar no mockup
  const TARGET_PERCENT = {
    male: { x: 0.25, y: 0.22, w: 0.5, h: 0.4 },
    female: { x: 0.26, y: 0.20, w: 0.48, h: 0.45 }
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
    this.dragging = false;
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
    // Novo: Preservar aspect ao desenhar base/shadow - calcular scale e center se aspect diferente
    if (this.base && this.base.complete) {
      const baseAspect = this.base.naturalWidth / this.base.naturalHeight;
      const canvasAspect = w / h;
      let drawBaseW = w;
      let drawBaseH = h;
      let offsetX = 0;
      let offsetY = 0;
      if (baseAspect !== canvasAspect) {
        if (baseAspect > canvasAspect) { // Base wider - fit height, crop sides
          drawBaseH = h;
          drawBaseW = drawBaseH * baseAspect;
          offsetX = (w - drawBaseW) / 2;
        } else { // Base taller - fit width, crop top/bottom
          drawBaseW = w;
          drawBaseH = drawBaseW / baseAspect;
          offsetY = (h - drawBaseH) / 2;
        }
      }
      ctx.drawImage(this.base, offsetX, offsetY, drawBaseW, drawBaseH);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this.baseColor || '#ffffff';
      ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.userImgLoaded) {
      ctx.save();
      const tr = this.targetRect;
      ctx.beginPath();
      ctx.rect(tr.x, tr.y, tr.width, tr.height);
      ctx.clip();
      const aspect = this.userImg.width / this.userImg.height;
      let drawW = this.userImg.width * this.scale;
      let drawH = this.userImg.height * this.scale;
      if (drawW / drawH !== tr.width / tr.height) {
        const targetAspect = tr.width / tr.height;
        if (aspect > targetAspect) { // User img wider - fit height
          drawH = tr.height;
          drawW = drawH * aspect;
        } else { // User img taller - fit width
          drawW = tr.width;
          drawH = drawW / aspect;
        }
      }
      ctx.drawImage(this.userImg, this.pos.x - drawW/2, this.pos.y - drawH/2, drawW, drawH);
      ctx.restore();
    }
    if (this.shadow && this.shadow.complete) {
      // Mesmo logic para shadow - preserve aspect
      const shadowAspect = this.shadow.naturalWidth / this.shadow.naturalHeight;
      const canvasAspect = w / h;
      let drawShadowW = w;
      let drawShadowH = h;
      let offsetX = 0;
      let offsetY = 0;
      if (shadowAspect !== canvasAspect) {
        if (shadowAspect > canvasAspect) {
          drawShadowH = h;
          drawShadowW = drawShadowH * shadowAspect;
          offsetX = (w - drawShadowW) / 2;
        } else {
          drawShadowW = w;
          drawShadowH = drawShadowW / shadowAspect;
          offsetY = (h - drawShadowH) / 2;
        }
      }
      ctx.drawImage(this.shadow, offsetX, offsetY, drawShadowW, drawShadowH);
    }
    if (this.text && this.text.trim() !== '') {
      ctx.save();
      ctx.fillStyle = this.textColor || '#000';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${this.textSize}px Arial`;
      ctx.fillText(this.text, w/2, h*0.75);
      ctx.restore();
    }
  };
  Shirt.prototype._onPointerDown = function(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    this.dragging = true;
    this.dragStart = { x, y, origX: this.pos.x, origY: this.pos.y };
    this.canvas.setPointerCapture && this.canvas.setPointerCapture(e.pointerId);
  };
  Shirt.prototype._onPointerMove = function(e) {
    if (!this.dragging) return;
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    const dx = x - this.dragStart.x;
    const dy = y - this.dragStart.y;
    this.pos.x = this.dragStart.origX + dx;
    this.pos.y = this.dragStart.origY + dy;
    this.draw();
  };
  Shirt.prototype._onPointerUp = function(e) {
    this.dragging = false;
    this.dragStart = null;
    try { this.canvas.releasePointerCapture && this.canvas.releasePointerCapture(e.pointerId); } catch(err){}
  };
  Shirt.prototype.setImageFile = function(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev)=> {
      this.userImgLoaded = false;
      this.userImg = new Image();
      this.userImg.onload = ()=> { this.userImgLoaded = true; this.draw(); };
      this.userImg.src = ev.target.result;
      this.scale = 1;
    };
    reader.readAsDataURL(file);
  };
  Shirt.prototype.fitToArea = function() {
    if (!this.userImgLoaded) return;
    const tr = this.targetRect;
    const ratio = Math.min(tr.width / this.userImg.width, tr.height / this.userImg.height);
    this.scale = ratio;
    this.draw();
  };
  Shirt.prototype.exportPNG = function(filename='design.png') {
    const tmp = document.createElement('canvas');
    tmp.width = LAYOUT_WIDTH;
    tmp.height = LAYOUT_HEIGHT;
    const ctx = tmp.getContext('2d');
    if (this.base && this.base.complete) {
      const baseAspect = this.base.naturalWidth / this.base.naturalHeight;
      const canvasAspect = tmp.width / tmp.height;
      let drawBaseW = tmp.width;
      let drawBaseH = tmp.height;
      let offsetX = 0;
      let offsetY = 0;
      if (baseAspect !== canvasAspect) {
        if (baseAspect > canvasAspect) {
          drawBaseH = tmp.height;
          drawBaseW = drawBaseH * baseAspect;
          offsetX = (tmp.width - drawBaseW) / 2;
        } else {
          drawBaseW = tmp.width;
          drawBaseH = drawBaseW / baseAspect;
          offsetY = (tmp.height - drawBaseH) / 2;
        }
      }
      ctx.drawImage(this.base, offsetX, offsetY, drawBaseW, drawBaseH);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = this.baseColor || '#ffffff';
      ctx.fillRect(0,0,tmp.width,tmp.height);
      ctx.globalCompositeOperation = 'source-over';
    }
    if (this.userImgLoaded) {
      ctx.save();
      const tr = this.targetRect;
      ctx.beginPath();
      ctx.rect(tr.x, tr.y, tr.width, tr.height);
      ctx.clip();
      const aspect = this.userImg.width / this.userImg.height;
      let drawW = this.userImg.width * this.scale;
      let drawH = this.userImg.height * this.scale;
      if (drawW / drawH !== tr.width / tr.height) {
        const targetAspect = tr.width / tr.height;
        if (aspect > targetAspect) {
          drawH = tr.height;
          drawW = drawH * aspect;
        } else {
          drawW = tr.width;
          drawH = drawW / aspect;
        }
      }
      ctx.drawImage(this.userImg, this.pos.x - drawW/2, this.pos.y - drawH/2, drawW, drawH);
      ctx.restore();
    }
    if (this.shadow && this.shadow.complete) {
      const shadowAspect = this.shadow.naturalWidth / this.shadow.naturalHeight;
      const canvasAspect = tmp.width / tmp.height;
      let drawShadowW = tmp.width;
      let drawShadowH = tmp.height;
      let offsetX = 0;
      let offsetY = 0;
      if (shadowAspect !== canvasAspect) {
        if (shadowAspect > canvasAspect) {
          drawShadowH = tmp.height;
          drawShadowW = drawShadowH * shadowAspect;
          offsetX = (tmp.width - drawShadowW) / 2;
        } else {
          drawShadowW = tmp.width;
          drawShadowH = drawShadowW / shadowAspect;
          offsetY = (tmp.height - drawShadowH) / 2;
        }
      }
      ctx.drawImage(this.shadow, offsetX, offsetY, drawShadowW, drawShadowH);
    }
    if (this.text && this.text.trim() !== '') {
      ctx.fillStyle = this.textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `${this.textSize}px Arial`;
      ctx.fillText(this.text, tmp.width/2, tmp.height*0.75);
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
  // Load assets com logs e detect size
  function loadImg(src){ 
    const i = new Image(); 
    i.crossOrigin='anonymous'; 
    i.src = src; 
    i.onload = () => {
      console.log('Loaded:', src, 'size:', i.naturalWidth, 'x', i.naturalHeight);
      // Detect e set global LAYOUT based on first base (assumir todas iguais)
      if (!LAYOUT_WIDTH || LAYOUT_WIDTH === 600) { // Update if fallback
        LAYOUT_WIDTH = i.naturalWidth;
        LAYOUT_HEIGHT = i.naturalHeight;
        shirt1.init(); shirt2.init(); // Re-init com new size
      }
    };
    i.onerror = () => console.error('Error loading:', src);
    return i; 
  }
  const maleBase = loadImg(ASSETS.maleBase);
  const maleShadow = loadImg(ASSETS.maleShadow);
  const femaleBase = loadImg(ASSETS.femaleBase);
  const femaleShadow = loadImg(ASSETS.femaleShadow);
  // Instâncias e resto igual
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
  document.getElementById('shirtColor').addEventListener('input', function(e){ 
    shirt1.baseColor = e.target.value; 
    shirt1.draw(); 
    shirt2.baseColor = e.target.value; 
    shirt2.draw(); 
  });
  document.getElementById('userImage1').addEventListener('change', function(e){ shirt1.setImageFile(e.target.files[0]); });
  document.getElementById('userText1').addEventListener('input', function(e){ shirt1.text = e.target.value; shirt1.draw(); });
  document.getElementById('textColor1').addEventListener('input', function(e){ shirt1.textColor = e.target.value; shirt1.draw(); });
  document.getElementById('textSize1').addEventListener('input', function(e){ shirt1.textSize = parseInt(e.target.value,10); shirt1.draw(); });
  document.getElementById('imgScale1').addEventListener('input', function(e){ shirt1.scale = parseFloat(e.target.value); shirt1.draw(); });
  document.getElementById('fitImage1').addEventListener('click', function(){ shirt1.fitToArea(); });
  document.getElementById('resetView1').addEventListener('click', function(){ shirt1.pos.x = shirt1.targetRect.x + shirt1.targetRect.width/2; shirt1.pos.y = shirt1.targetRect.y + shirt1.targetRect.height/2; shirt1.scale = 1; shirt1.draw(); });
  document.getElementById('downloadDesign1').addEventListener('click', function(){ shirt1.exportPNG('tshirt-design1.png'); });
  document.getElementById('userImage2').addEventListener('change', function(e){ shirt2.setImageFile(e.target.files[0]); });
  document.getElementById('userText2').addEventListener('input', function(e){ shirt2.text = e.target.value; shirt2.draw(); });
  document.getElementById('textColor2').addEventListener('input', function(e){ shirt2.textColor = e.target.value; shirt2.draw(); });
  document.getElementById('textSize2').addEventListener('input', function(e){ shirt2.textSize = parseInt(e.target.value,10); shirt2.draw(); });
  document.getElementById('imgScale2').addEventListener('input', function(e){ shirt2.scale = parseFloat(e.target.value); shirt2.draw(); });
  document.getElementById('fitImage2').addEventListener('click', function(){ shirt2.fitToArea(); });
  document.getElementById('resetView2').addEventListener('click', function(){ shirt2.pos.x = shirt2.targetRect.x + shirt2.targetRect.width/2; shirt2.pos.y = shirt2.targetRect.y + shirt2.targetRect.height/2; shirt2.scale = 1; shirt2.draw(); });
  document.getElementById('downloadDesign2').addEventListener('click', function(){ shirt2.exportPNG('tshirt-design2.png'); });
  const shirt2Col = document.getElementById('shirt2-col');
  const swapBtn = document.getElementById('swapGenders');
  document.getElementById('mode-single').addEventListener('change', function(){
    if (this.checked) {
      shirt2Col.classList.add('d-none');
      swapBtn.classList.add('d-none');
    }
  });
  document.getElementById('mode-couple').addEventListener('change', function(){
    if (this.checked) {
      shirt2Col.classList.remove('d-none');
      swapBtn.classList.remove('d-none');
    }
  });
  function resetShirt(shirt) {
    shirt.userImgLoaded = false;
    shirt.userImg = new Image();
    shirt.draw();
  }
  document.getElementById('mode-male1').addEventListener('change', function(){
    if (this.checked) {
      resetShirt(shirt1);
      shirt1.base = maleBase;
      shirt1.shadow = maleShadow;
      shirt1.targetPercent = TARGET_PERCENT.male;
      shirt1.init();
    }
  });
  document.getElementById('mode-female1').addEventListener('change', function(){
    if (this.checked) {
      resetShirt(shirt1);
      shirt1.base = femaleBase;
      shirt1.shadow = femaleShadow;
      shirt1.targetPercent = TARGET_PERCENT.female;
      shirt1.init();
    }
  });
  document.getElementById('mode-male2').addEventListener('change', function(){
    if (this.checked) {
      resetShirt(shirt2);
      shirt2.base = maleBase;
      shirt2.shadow = maleShadow;
      shirt2.targetPercent = TARGET_PERCENT.male;
      shirt2.init();
    }
  });
  document.getElementById('mode-female2').addEventListener('change', function(){
    if (this.checked) {
      resetShirt(shirt2);
      shirt2.base = femaleBase;
      shirt2.shadow = femaleShadow;
      shirt2.targetPercent = TARGET_PERCENT.female;
      shirt2.init();
    }
  });
  swapBtn.addEventListener('click', function(){
    const isMale1 = document.getElementById('mode-male1').checked;
    document.getElementById('mode-male1').checked = !isMale1;
    document.getElementById('mode-female1').checked = isMale1;
    shirt1.base = isMale1 ? femaleBase : maleBase;
    shirt1.shadow = isMale1 ? femaleShadow : maleShadow;
    shirt1.targetPercent = isMale1 ? TARGET_PERCENT.female : TARGET_PERCENT.male;
    shirt1.init();

    const isMale2 = document.getElementById('mode-male2').checked;
    document.getElementById('mode-male2').checked = !isMale2;
    document.getElementById('mode-female2').checked = isMale2;
    shirt2.base = isMale2 ? femaleBase : maleBase;
    shirt2.shadow = isMale2 ? femaleShadow : maleShadow;
    shirt2.targetPercent = isMale2 ? TARGET_PERCENT.female : TARGET_PERCENT.male;
    shirt2.init();
  });
  window.addEventListener('resize', function(){ shirt1.init(); shirt2.init(); });
})();
