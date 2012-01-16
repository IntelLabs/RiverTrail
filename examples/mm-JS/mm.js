
function Matrix(sizex, sizey) {
	this.sizex = sizex;
	this.sizey = sizey;
	//this.data = new Float64Array(sizex);
	this.data = new Array(sizex);
	for(var i =0 ; i < sizex; i++) {
		//this.data[i] = new Float64Array(sizey);
		this.data[i] = new Array(sizey);
	}
	for(var i=0;i<sizex;i++) {
		for(var j=0;j<sizey; j++) {
			this.data[i][j] = 0;
		}
	}
}

Matrix.prototype.init = function() {
	for(var i =0 ; i < this.sizex; i++) {
		for(var j =0 ; j< this.sizey; j++) {
			this.data[i][j] = 4;
		}
	}
}

Matrix.prototype.print = function() {
	for(var i =0 ; i < this.sizex; i++) {
		for(var j =0 ; j< this.sizey; j++) {
			console.log(" " + this.data[i][j] + " ");
		}
		console.log("\n");
	}
}

Matrix.prototype.multiply = function(B, C) {
	var sizex_A = this.sizex;
	var sizey_A = this.sizey;
	var sizex_B = B.sizex;
	var sizey_B = B.sizey;

	for(var i=0;i<sizex_A;i++) {
		for(var j = 0;j<sizey_B;j++) {
			for(var k = 0; k<sizey_A;k++) {
				C.data[i][j] += this.data[i][k] * B.data[k][j];
			}
		}
	}
	//return C;
}

function initArray(A, val) {
	for(var i =0;i<A.length;i++) {
		A[i] = val;
	}
}

function printPA(A) {
	var shape = A.getShape();
	console.log(A.getArray().join());
/*
	for(var i = 0; i < shape[0]; i++) {
		for(var j = 0; j < shape[1]; j++) {
			console.log(" " + A.getArray()[i][j] + " ");
		}
	}
*/
}

function PASeqMul(A, B) {
	var sizex_A = A.getShape()[0];
	var sizey_B = B.getShape()[1];
	var sizey_A = A.getShape()[0];
	var C = new Matrix(sizex_A, sizey_B);
	for(var i=0;i<sizex_A;i++) {
		for(var j = 0;j<sizey_B;j++) {
			for(var k = 0; k<sizey_A;k++) {
				C.data[i][j] += A.get([i,k]) * B.get([k,j]);
			}
		}
	}
	return C;
}

function FlatMul(A, B, C, sizex_A, sizey_A, sizey_B) {
	//var C = new Array(sizex_A*sizey_B); initArray(C);
	for(var i =0 ; i < sizex_A; i++) {
		for(var j = 0;j<sizey_B;j++) {
			r_index = i*sizey_A+j;
			for(var k = 0; k<sizey_A;k++) {
				C[r_index] += A[i*sizey_A+k] * B[k*sizey_B+j];
			}
		}
	}
	return C;
}

function outerNestAndCombine1(index, B, oddDim) {
	
	//var shapeA_x = A.getShape()[0];
	//var shapeA_y = A.getShape()[1];
	//var shapeB_x = B.getShape()[0];
	//var shapeB_y = B.getShape()[1];
	//for(var i=0;i<shapeA_x;i++) {
	//	for(var j =0;j<shapey_B; j++) {
	
	//var D = new ParallelArray(oddDim, function(idx) { return 0;});
	var D = new ParallelArray(oddDim, function(idx) { return 0;});
	D.combine(1, comb, this, B, index);
	var e = D.reduce(redu, 0);
	return e;
}

function outerNestAndCombine(index, B, oddDim) {
	var sum = 0;
	var k;
	for(k = 0; k < oddDim; k = k+1) {
		//sum += this.get([index[0], k]) * B.get([k, index[1]]);
		sum += this.get(index[0], k) * B.get(k, index[1]);
	}
	return sum;
}

// sizex_B is odd dim ?
function outerNestAndCombineVec(index, B, sizex_A, sizey_A, sizex_B, sizey_B) {
	var sum = 0; var k = 0;
	var i = Math.floor(index[0]/sizey_A);
	var j = index[0] - i*sizey_A;
	for(k=0; k<sizex_B; k=k+1) {
		sum+= this.get(i*sizey_A+k) * B.get(k*sizey_B + index[0] - i*sizey_A);
	}
	return sum;
}
function comb(index, A, B, outeridx) {
	return (A.get([outeridx[0],index])*B.get([index, outeridx[1]]));
}
// seed is 0
function redu(acc) {
	return acc+this;
}

function driverArraySeq() {
	var sizex_A, sizey_A, sizex_B, sizey_B;
	sizex_A = sizey_A = sizex_B = sizey_B = 1000;
	var A = new Array(sizex_A);
	for(var i=0; i < sizex_A; i++) {
		A[i] = new Array(sizey_A);
		//A[i] = new Float64Array(sizey_A);
	}
	var B = new Array(sizex_B);
	for(i=0; i < sizex_B; i++) {
		B[i] = new Array(sizey_B);
		//B[i] = new Float64Array(sizey_B);
	}
	var C = new Array(sizex_A);
	for(i=0; i < sizex_A; i++) {
		C[i] = new Array(sizey_B);
		//C[i] = new Float64Array(sizey_B);
	}

	for(i=0;i<sizex_A;i++) {
		for(var j =0 ; j < sizey_A; j++) {
			A[i][j] = 4;
		}
	}
	for(i=0;i<sizex_B;i++) {
		for(j =0 ; j < sizey_B; j++) {
			B[i][j] = 4;
		}
	}
	for(i=0;i<sizex_A;i++) {
		for(j =0 ; j < sizey_B; j++) {
			C[i][j] = 4;
		}
	}
	var k = 0;
	for(i=0;i<sizex_A;i++) {
		for(j = 0;j<sizey_B;j++) {
			for(k = 0; k<sizey_A;k++) {
				C[i][j] += A[i][k] * B[k][j];
			}
		}
	}
	console.log(" " + C[4][5] + " ");
}

function driverSeq() {
	var A = new Matrix(1000, 1000); A.init();
	var B = new Matrix(1000, 1000); B.init();
	var C = new Matrix(A.sizex, B.sizey);
	//A.print();
	A.multiply(B, C);
	//C.print();
	console.log(" " + A.data[0].length + " ");
	console.log(" " + C.data[2][3] + " ");
}

function driverMMFlat() {
	var A = new Array(1000*1000); initArray(A, 4);
	var B = new Array(1000*1000); initArray(B, 4);
	var C = new Array(1000*1000); initArray(C, 0);

	//var A = new Float64Array(1000*1000); initArray(A, 4);
	//var B = new Float64Array(1000*1000); initArray(B, 4);
	//var C = new Float64Array(1000*1000); initArray(C, 0);
	FlatMul(A, B, C, 1000, 1000, 1000);
	console.log(" " + C[5] + " ");
}

function driverPASeq() {
	var sizex_A = 1000; var sizey_A = 1000;
	var sizex_B = 1000; var sizey_B = 1000;
	var A = new ParallelArray([sizex_A, sizey_A], function(iv) {return 1;});
	var B = new ParallelArray([sizex_B, sizey_B], function(iv) {return 1;});
	var C = PASeqMul(A, B);	
	console.log(" " + C.data[4][5] + " ");
}

function driverPAVec() {
	var sizex_A = 1000; var sizey_A = 1000;
	var sizex_B = 1000; var sizey_B = 1000;
	var A = new ParallelArray(sizex_A*sizey_A, function(iv) {return 4;});
	var B = new ParallelArray(sizex_B*sizey_B, function(iv) {return 4;});
	var C = A.combine(1, outerNestAndCombineVec, B, sizex_A, sizey_A, sizex_B, sizey_B);
	console.log(" " + C.get(5) + " ");
}

function driverPA() {
	var sizex_A = 1000; var sizey_A = 1000;
	var sizex_B = 1000; var sizey_B = 1000;
	var A = new ParallelArray([sizex_A, sizey_A], function(iv) {return 4;});
	var B = new ParallelArray([sizex_B, sizey_B], function(iv) {return 4;});
	var C = A.combine(A.getShape().length, outerNestAndCombine, B, sizex_B);
	//var C = multiplyPA(A, B);
	//printPA(C);
	//console.log(" " + C.getArray()[4][5] + " ");
	//console.log(" " + C.getShape()[0] + " ");
	//console.log(" " + C.getShape().length + " ");
}

function driverSeq2D() {
	
}

function render() {
	var start_time = new Date().getTime();
	//driverSeq();
	//driverArraySeq();
	driverPA();
	//driverPASeq();
	//driverPAVec();
	//driverMMFlat();
	//driverSeq2D();
	var end_time = new Date().getTime();
	var elapsed = end_time - start_time;
	document.getElementById("text1").innerHTML= "Time elapsed: " + elapsed.toString();
}
