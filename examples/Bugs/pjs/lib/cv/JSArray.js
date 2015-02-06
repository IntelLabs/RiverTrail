function JSArray2D(width,height,type) {
  this.width=width;
  this.height=height;
  if (typeof type==='undefined') type=Uint8Array;
  this.data=type(width*height);
}
JSArray2D.prototype={
  getShape:function() { return [this.height,this.width]; },
  get:function(y,x) { return this.data[y*this.width+x]; },
};

function JSArray3D(width,height,depth,type) {
  this.width=width;
  this.height=height;
  if (typeof depth==='undefined') depth=4;
  this.depth=depth;
  if (typeof type==='undefined') type=Uint8Array;
  this.data=type(width*height*depth);
}
JSArray3D.prototype={
  getShape:function() { return [this.height,this.width,this.depth]; },
  get:function(a) {
    if (a.length==3) return this.data[(a[0]*this.width+a[1])*this.depth+a[2]];
    var self=this;
    if (a.length==2) return {get:function(d) {
      return self.data[(a[0]*self.width+a[1])*self.depth+d];
    }};
    throw "error: JSArray3D.get() can only accept an array of length 2 or 3";
  },
};

function PAToJSArray(pa) {
	var shape=pa.getShape();
	if (shape.length<2||shape.length>3) throw "Can only emulate 2D or 3D PA Arrays as JSArrays";
	var v=shape.slice(0);
	for (var i=0;i<v.length;i++) v[i]=0;
	pa.get(v); //make sure pa is materialized and pa.data is populated
	var a={height:shape[0],width:shape[1],data:pa.data};
	if (shape.length==3) a.depth=shape[2];
	return a;
}

function copyJSArrayArea(src,pos,dest) {
	var depth=1;
	if ((src.depth!=undefined)||(dest.depth!=undefined)) {
		if (dest.depth!=src.depth) throw "copyJSArrayArea: src and dest must be same dimention and depth";
		depth=src.depth;
	}
	var copyWidth=dest.width*depth;
	var xStart=pos[0];
	var yStart=pos[1];
	var di=0;
	//TODO: bounds checking
	for (var dy=0;dy<dest.height;dy++) {
		var si=((yStart+dy)*src.width+xStart)*depth;
		for (var i=0;i<copyWidth;i++) {
			dest.data[di]=src.data[si];
			++di;
			++si;
		}
	}
}
