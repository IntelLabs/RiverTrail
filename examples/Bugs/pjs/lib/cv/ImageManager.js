var imageManager={
  setDrawAreaId:function(drawAreaId) {
    if (this.initialized) throw "changing drawAreaId not yet implemented";
    this.drawAreaId=drawAreaId;
  },
  setScale:function(scaleX,scaleY) {
    this.scaleX=scaleX;
    this.scaleY=scaleY;
  },
  init:function() {
    if (this.initialized) return;
    if (this.scaleX==undefined) { this.scaleX=1; this.scaleY=1; }
    if (this.drawAreaId==undefined) this.drawAreaId='drawArea';
    this.drawArea=document.getElementById(this.drawAreaId);
    if (this.drawArea==undefined) throw "unable to find drawArea";
    this.drawnImages=[];
    this.toDraw=[];
    //TODO: figure out how not to have offsets
    this.offsetLeft=8;
    this.offsetTop=8;
    this.initialized=true;
  },
  addImage:function(img,x,y) {
    this.init();
    this.toDraw.push({x:x,y:y,img:img});
  },
  draw:function() {
    this.clear();
    for (var i=0;i<this.toDraw.length;i++) {
      var d=this.toDraw[i];
      var img=new Image();
      img.style.left=this.scaleX*d.x-0.5*d.img.width+this.offsetLeft;
      img.style.top=this.scaleY*d.y-0.5*d.img.height+this.offsetTop;
      img.style.position='absolute';
      img.src=d.img.src;
      this.drawnImages.push(img);
      this.drawArea.appendChild(img);
    }
    this.toDraw=[];
  },
  clear:function() {
    this.init();
    for (var i=0;i<this.drawnImages.length;i++) {
      this.drawArea.removeChild(this.drawnImages[i]);
    }
    this.drawnImages=[];
  },
};
