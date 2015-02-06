function EdgeManager(options) {
	return {
		flipImage:options.flipImage,
		edgeThreshold:options.edgeThreshold,
		setImagePA:function(imagePA) {
			this.src=PAToJSArray(imagePA);
		},
		setJSImage:function(image) {
			this.src=image;
		},
		computeAreaEdges:function(startPixel,size) {
			var w=size[0];
			var h=size[1];
			var w1=w+2;
			var h1=h+2;
			var w2=w1+2;
			var h2=h1+2;
			var patch=new JSArray3D(w2,h2,4);
			var gs=new JSArray2D(w2,h2,Float32Array);
			var ph1=new JSArray2D(w1,h2,Float32Array);
			var phv1=new JSArray2D(w1,h1,Float32Array);
			var pv2=new JSArray2D(w2,h1,Float32Array);
			var phv2=new JSArray2D(w1,h1,Float32Array);
			var pMag=new JSArray2D(w1,h1,Float32Array);
			var pFilter=new JSArray2D(w,h,Float32Array);
			var pThreash=new JSArray2D(w,h,Float32Array);

			var start=startPixel;
			if (this.flipImage) {
				start=[this.src.width-start[0]-size[0],start[1]];
			}
			copyJSArrayArea(this.src,[start[0]-2,start[1]-2],patch);
			convertColorImageToGrayscaleSeq(patch,gs);
			horizontalFilter2DInnerSeq(gs,[3,10,3],ph1);
			verticalFilter2DInnerSeq(ph1,[-1,0,1],phv1);
			verticalFilter2DInnerSeq(gs,[3,10,3],pv2);
			horizontalFilter2DInnerSeq(pv2,[-1,0,1],phv2);
			for (var i=0;i<pMag.data.length;i++) { var hval=phv1.data[i];var vval=phv2.data[i];pMag.data[i]=Math.sqrt((hval*hval)+(vval*vval)); }
			var threashold=this.edgeThreshold;
			for (var yd=0;yd<pFilter.height;yd++) {
				for (var xd=0;xd<pFilter.width;xd++) {
					var y=yd+1;
					var x=xd+1;
					var v=pMag.data[y*pMag.width+x];
					var vxn=pMag.data[y*pMag.width+x-1];
					var vxp=pMag.data[y*pMag.width+x+1];
					var vyn=pMag.data[(y-1)*pMag.width+x];
					var vyp=pMag.data[(y+1)*pMag.width+x];
					var xi=false;
					if ((v-vxn)*(vxp-v)>0) xi=true;
					var yi=false;
					if ((v-vyn)*(vyp-v)>0) yi=true;
					if (xi&&yi) v=0;
					if (v<threashold) {
						v=0;
					} else {
						v=255;
					}
					if (this.flipImage) {
						pThreash.data[yd*pThreash.width+pThreash.width-1-xd]=v;
					} else {
						pThreash.data[yd*pThreash.width+xd]=v;
					}
				}
			}
			return pThreash;
		},
		findClosestEdge:function(pos,searchArea) {
			var posPix=[Math.floor(pos[0]),Math.floor(pos[1])];
			if (posPix[0]<searchArea+3||posPix[1]<searchArea+3||posPix[0]>this.src.width-searchArea-3||posPix[1]>this.src.height-searchArea-3) return false;
			var areaStart=[posPix[0]-searchArea,posPix[1]-searchArea];

			var edgeArea=this.computeAreaEdges(areaStart,[searchArea*2+1,searchArea*2+1]);

			var nearEdge = false;
			var minDist = 10000;
			for (var y=0;y<edgeArea.height;y++) {
				for (var x=0;x<edgeArea.width;x++) {
					if (edgeArea.data[y*edgeArea.width+x]<1) continue;
					var edgePos=new Vec(areaStart[0]+x,areaStart[1]+y);
					var d=pos.dist(edgePos);
					if (d<minDist) {
						minDist = d;
						newPos = edgePos;
						nearEdge = true;
					}
				}
			}
			if (!nearEdge) return false;
			pos[0]=newPos[0];
			pos[1]=newPos[1];
			return true;
		},
		drawEdgeImage:function(displayCanvas) {
			var dsize=[this.src.width-4,this.src.height-4];
			var d=this.computeAreaEdges([2,2],dsize);
			var c0=new JSArray3D(dsize[0],dsize[1],4);
			convertGrayImageToColorSeq(d,c0);
			var p1=new JSArray3D(this.src.width,this.src.height,4);
			padBorder3DSeq(c0,p1);

			var ctx = displayCanvas.getContext('2d');
			var edgeData = ctx.getImageData(0,0,displayCanvas.width,displayCanvas.height);	

			var a=p1.data;
			if (a.length!=edgeData.data.length) throw "lengths of arrays not the same";
			for (var i=0;i<a.length;i++) {edgeData.data[i]=a[i];}
			ctx.putImageData(edgeData,0,0);
		}
	};
}
