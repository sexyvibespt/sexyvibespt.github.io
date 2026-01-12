(function(){
  // === CONFIG — ajusta estes nomes conforme o repo ===
  const ASSETS = {
    maleBase: '/assets/images/basem.png',      // base sólido masculino
    maleShadow: '/assets/images/sombram.png',  // sombras masculino
    femaleBase: '/assets/images/basef.png',    // base sólido feminino
    femaleShadow: '/assets/images/sombraf.png' // sombras feminino
  };
  // canvas target logical size (layout size) - we scale for DPR in setup
  const LAYOUT_WIDTH = 600;
  const LAYOUT_HEIGHT = 1200;

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
      drawAll();
    });

    this.userImg.onload = ()=> { this.userImgLoaded = true; drawAll(); };

    drawAll();
  };

  Shirt.prototype.draw = function() {
    const ctx = this.ctx;
    const w = LAYOUT_WIDTH, h = LAYOUT_HEIGHT;
    ctx.clearRect(0,0, w, h);

    ctx.save();
    ctx.fillStyle = this.baseColor || '#ffffff';
    ctx.fillRect(0,0,w,h);
    ctx.restore();

    if (this.base && this.base.complete) {
      ctx.drawImage(this.base, 0, 0, w, h);
    }

    if (this.userImgLoaded) {
      ctx.save();
      const tr = this.targetRect;
      ctx.beginPath();
      ctx.rect(tr.x, tr.y, tr.width, tr.height);
      ctx.clip();

      const drawW = this.userImg.width * this.scale;
      const drawH = this.userImg.height * this.scale;
      ctx.drawImage(this.userImg, this.pos.x - drawW/2, this.pos.y - drawH/2, drawW, drawH);
      ctx.restore();
    }

    if (this.shadow && this.shadow.complete) {
      ctx.drawImage(this.shadow, 0, 0, w, h);
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
    drawAll();
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
      this.userImg.onload = ()=> { this.userImgLoaded = true; drawAll(); };
      this.userImg.src = ev.target.result;
      this.scale = 1;
    };
    reader.readAsDataURL(file);
  };

  Shirt.prototype.exportPNG = function(filename='design.png') {
    const tmp = document.createElement('canvas');
    tmp.width = LAYOUT_WIDTH;
    tmp.height = LAYOUT_HEIGHT;
    const ctx = tmp.getContext('2d');

    ctx.fillStyle = this.baseColor || '#fff';
    ctx.fillRect(0,0, tmp.width, tmp.height);

    if (this.base && this.base.complete) ctx.drawImage(this.base, 0, 0, tmp.width, tmp.height);

    if (this.userImgLoaded) {
      ctx.save();
      const tr = this.targetRect;
      ctx.beginPath();
      ctx.rect(tr.x, tr.y, tr.width, tr.height);
      ctx.clip();
      const drawW = this.userImg.width * this.scale;
      const drawH = this.userImg.height * this.scale;
      ctx.drawImage(this.userImg, this.pos.x - drawW/2, this.pos.y - drawH/2, drawW, drawH);
      ctx.restore();
    }

    if (this.shadow && this.shadow.complete) ctx.drawImage(this.shadow, 0, 0, tmp.width, tmp.height);

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

  const canvas = document.getElementById('tcanvas');
  function loadImg(src){ const i = new Image(); i.crossOrigin='anonymous'; i.src = src; return i; }
  const maleBase = loadImg(ASSETS.maleBase);
  const maleShadow = loadImg(ASSETS.maleShadow);
  const femaleBase = loadImg(ASSETS.femaleBase);
  const femaleShadow = loadImg(ASSETS.femaleShadow);

  const shirt = new Shirt(canvas, maleBase, maleShadow, TARGET_PERCENT.male);

  const whenLoaded = [maleBase, maleShadow, femaleBase, femaleShadow];
  let readyCount = 0;
  whenLoaded.forEach(img => { img.onload = ()=> {
    readyCount++;
    if (readyCount === whenLoaded.length) {
      shirt.init();
    }
  }; });

  function drawAll(){ if (shirt) shirt.draw(); }

  document.getElementById('shirtColor').addEventListener('input', function(e){ shirt.baseColor = e.target.value; drawAll(); });
  document.getElementById('userImage').addEventListener('change', function(e){ shirt.setImageFile(e.target.files[0]); });
  document.getElementById('userText').addEventListener('input', function(e){ shirt.text = e.target.value; drawAll(); });
  document.getElementById('textColor').addEventListener('input', function(e){ shirt.textColor = e.target.value; drawAll(); });
  document.getElementById('textSize').addEventListener('input', function(e){ shirt.textSize = parseInt(e.target.value,10); drawAll(); });
  document.getElementById('imgScale').addEventListener('input', function(e){ shirt.scale = parseFloat(e.target.value); drawAll(); });

  document.getElementById('resetView').addEventListener('click', function(){ shirt.pos.x = shirt.targetRect.x + shirt.targetRect.width/2; shirt.pos.y = shirt.targetRect.y + shirt.targetRect.height/2; shirt.scale = 1; drawAll(); });

  document.getElementById('downloadDesign').addEventListener('click', function(){ shirt.exportPNG('tshirt-design.png'); });

  document.getElementById('mode-male').addEventListener('change', function(){
    if (this.checked) {
      shirt.base = maleBase;
      shirt.shadow = maleShadow;
      shirt.targetPercent = TARGET_PERCENT.male;
      shirt.init();
    }
  });
  document.getElementById('mode-female').addEventListener('change', function(){
    if (this.checked) {
      shirt.base = femaleBase;
      shirt.shadow = femaleShadow;
      shirt.targetPercent = TARGET_PERCENT.female;
      shirt.init();
    }
  });

  window.addEventListener('resize', function(){ if (shirt) shirt.init(); });

})();
