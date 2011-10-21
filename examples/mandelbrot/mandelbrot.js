/*
 * Copyright (c) 2011, Intel Corporation
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are met:
 *
 * - Redistributions of source code must retain the above copyright notice, 
 *   this list of conditions and the following disclaimer.
 * - Redistributions in binary form must reproduce the above copyright notice, 
 *   this list of conditions and the following disclaimer in the documentation 
 *   and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE 
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR 
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF 
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS 
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) 
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF 
 * THE POSSIBILITY OF SUCH DAMAGE.
 *
 */

// the below code is based on a WebCL implementation available at
// http://www.ibiblio.org/e-notes/webcl/mandelbrot.html

var nc = 30, maxCol = nc*3, cr,cg,cb;

// initialises the color map for translating Mandelbrot iterations
// into nice colors
function computeColorMap() {
   var st = 255/nc;
   cr = new Array(maxCol); cg = new Array(maxCol); cb = new Array(maxCol);
   for (var i = 0; i < nc; i++){
     var d = Math.floor(st*i);
     cr[i] = 255 - d;  cr[i+nc] = 0;  cr[i+2*nc] = d;
     cg[i] = d;  cg[i+nc] = 255 - d;  cg[i+2*nc] = 0;
     cb[i] = 0;  cb[i+nc] = d;  cb[i+2*nc] = 255 - d;
   }
   cr[maxCol] = cg[maxCol] = cb[maxCol] = 0;
}

// this is the actual mandelbrot computation, ported to JavaScript
// from the WebCL / OpenCL example at 
// http://www.ibiblio.org/e-notes/webcl/mandelbrot.html
function computeSet(iv, scale) {
    var x = iv[1];
    var y = iv[0];
    var Cr = (x - 256) / scale + 0.407476;
    var Ci = (y - 256) / scale + 0.234204;
    var I = 0, R = 0, I2 = 0, R2 = 0;
    var n = 0;
    while ((R2+I2 < 2.0) && (n < 512)) {
       I = (R+R)*I+Ci;
       R = R2-I2+Cr;
       R2 = R*R;
       I2 = I*I;
       n++;
    } 
    return n;
}

// helper function to write the result of computing the mandelbrot
// set to a canvas
function writeResult (canvas, mandelbrot) {
    var context = canvas.getContext("2d");
    var image = context.createImageData(512, 512);
    var pix = image.data, c = 0, ic;
    var mbrot = mandelbrot.flatten();
    var outBuffer = mbrot.getArray();
    for (var t = 0; t < 512*512; t++) {
        var i = outBuffer[t];
        if (i == 512) ic = maxCol;
        else ic = i % maxCol;
        pix[c++] = cr[ic];  
        pix[c++] = cg[ic];  
        pix[c++] = cb[ic];  
        pix[c++] = 255;
    }
    context.putImageData(image, 0, 0);
}

function render () {
    var canvas = document.getElementById("canvas");
    var scale = 10000*300;
    computeColorMap();
    var mandelbrot = new ParallelArray([512,512], computeSet, scale);
    writeResult(canvas, mandelbrot);
}


