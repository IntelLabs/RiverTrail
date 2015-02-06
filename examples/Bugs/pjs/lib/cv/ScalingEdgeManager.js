function ScalingEdgeManager(options) {
	var o=new EdgeManager(options);
	o.scale=[options.imageWidth/options.captureWidth,options.imageHeight/options.captureHeight];
	if (o.scale[0]!=1||o.scale[1]!=1) {
		o.findClosestEdge=function(pos,searchArea) {
			var scaledSearchArea=[0,0];
			var scaledPos=[0,0];
			for (var i=0;i<2;i++) {
				scaledSearchArea[i]=Math.ceil(searchArea/this.scale[i]);
				scaledPos[i]=pos[i]/this.scale[i];
			}
			var posPix=[Math.floor(scaledPos[0]),Math.floor(scaledPos[1])];
			if (posPix[0]<scaledSearchArea[0]+3||posPix[1]<scaledSearchArea[1]+3||posPix[0]>this.src.width-scaledSearchArea[0]-3||posPix[1]>this.src.height-scaledSearchArea[1]-3) return false;
			var scaledAreaStart=[posPix[0]-scaledSearchArea[0],posPix[1]-scaledSearchArea[1]];
			var areaStart=[scaledAreaStart[0]*this.scale[0],scaledAreaStart[1]*this.scale[1]];

			var edgeArea=this.computeAreaEdges(scaledAreaStart,[scaledSearchArea[0]*2+1,scaledSearchArea[1]*2+1]);

			var nearEdge = false;
			var minDist = 10000;
			for (var yOff=-searchArea;yOff<=searchArea;yOff++) {
				for (var xOff=-searchArea;xOff<=searchArea;xOff++) {
					var edgePos=new Vec(pos[0]+xOff,pos[1]+yOff);
					var x=Math.floor((edgePos[0]-areaStart[0])/this.scale[0]);
		if (x<0||x>=edgeArea.width) console.log("ScaledEdgeManager.findClosestEdge: x out of bounds "+x+" width: "+edgeArea.width);
					var y=Math.floor((edgePos[1]-areaStart[1])/this.scale[1]);
		if (y<0||y>=edgeArea.height) console.log("ScaledEdgeManager.findClosestEdge: y out of bounds "+y+" height: "+edgeArea.height);
					if (edgeArea.data[y*edgeArea.width+x]<1) continue;
					var d=pos.dist(edgePos);
					if (d<minDist) {
						minDist = d;
						newPos = edgePos;
						nearEdge = true;
					}
				}
			}
			if (!nearEdge) return false;
//	console.log("pos: "+pos+" newPos: "+newPos+" areaStart: "+areaStart+" scaledAreaStart: "+scaledAreaStart+" scale: "+this.scale);
			pos[0]=newPos[0];
			pos[1]=newPos[1];
			return true;
		};
	}
	return o;
}
