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

var isParallel = true;

// This color palette is for the image in the wikipedia article
// http://en.wikipedia.org/wiki/File:Escape_Time_Algorithm.png
// as reverse engineered by donschoe at http://stackoverflow.com/questions/16500656/which-color-gradient-is-used-to-color-mandelbrot-in-wikipedia

var colorMapW = [
 66,  30,  15,
 25,   7,  26,
  9,   1,  47,
  4,   4,  73, 
  0,   7, 100, 
 12,  44, 138,
 24,  82, 177,
 57, 125, 209,
134, 181, 229,
211, 236, 248,
241, 233, 191,
248, 201,  95,
255, 170,   0,
204, 128,   0,
153,  87,   0,
106,  52,   3];

var maxIterations = 512;
var nc = 30, maxCol = nc*3, cr,cg,cb;
var isRunning = true;
var numFrames = 0;
var elapsed = 0;
var prevTime = 0;
var width, height;
var canvas, ctx, imgData;
var zoomFactor = 1.0;

// this is the actual mandelbrot computation, ported to JavaScript
// from the WebCL / OpenCL example at 
// http://www.ibiblio.org/e-notes/webcl/mandelbrot.html

// Sequential version
function computeSetSequential(zoomFactor, maxIterations) {
    var numPoints = width*height;
    var result = new Array(numPoints);
    for(var x = 0; x < width; x++) {
        for(var y = 0; y < height; y++) {
            var Cr = ((x/width)-0.5)/zoomFactor*2.0-0.73;
            var Ci = ((y/height)-0.5)/zoomFactor*2.0-0.237;
            var I = 0, R = 0, I2 = 0, R2 = 0;
            var n = 0;
            while ((R2+I2 < 2.0) && (n < maxIterations)) {
                I = (R+R)*I+Ci;
                R = R2-I2+Cr;
                R2 = R*R;
                I2 = I*I;
                n++;
            } 
            result[y*width+x] = n;
        }
    }
    return result;
}

// Parallel version
function computeSetParallel(iv, width, height, zoomFactor, maxIterations) {
    var x = iv[1];
    var y = iv[0];
    var Cr = (((x/width)-0.5)/zoomFactor)*2.0-0.73;
    var Ci = (((y/height)-0.5)/zoomFactor)*2.0-0.237;
    var I = 0, R = 0, I2 = 0, R2 = 0;
    var n = 0;
    while ((R2+I2 < 2.0) && (n < maxIterations)) {
       I = (R+R)*I+Ci;
       R = R2-I2+Cr;
       R2 = R*R;
       I2 = I*I;
       n++;
    } 
    return n;
}

function writeResult (m) {
    var c = 0; var ic;
    var r, g, b;
    var i = 0; var color; var ic;
    var data, len; 
    var pix = imgData.data;
    if(isParallel) {
        m.materialize();
        data = m.data;
    }
    else {
        data = m;
    }
    len = data.length;
    for (var t = 0; t < len; t++) {
        var n = data[t];
        if(n >= maxIterations) {
            r = g = b = 0;
        }
        else {
            color = n % 16;
            r = colorMapW[color*3];
            g = colorMapW[color*3+1];
            b = colorMapW[color*3+2];
        }
        pix[c++] = r;
        pix[c++] = g;
        pix[c++] = b;
        pix[c++] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
}

function toggleExecutionMode(b) {
    isParallel = !isParallel;
    numFrames = 0;
    elapsed = 0;
    b.innerHTML = isParallel ? "Go sequential" : "Go Parallel";
    switchedMode = true;
}


function doMandelBrotSequential() {
    if(numFrames === 0) {
        prevTime = Date.now();
    }
    else if(numFrames > 0) {
        var curTime = Date.now();
        elapsed +=  curTime - prevTime;
        prevTime = curTime;
    }
    var mandelbrot = computeSetSequential(zoomFactor, maxIterations);
    writeResult(mandelbrot);
    numFrames++;
    zoomFactor *= 1.01;
}

function doMandelBrotParallel() {
    
    if(numFrames === 0) {
        prevTime = Date.now();
    }
    else if(numFrames > 0) {
        var curTime = Date.now();
        elapsed +=  curTime - prevTime;
        prevTime = curTime;
    }
    var mandelbrot = new ParallelArray([width,height], computeSetParallel, width, height, zoomFactor, maxIterations);
    writeResult(mandelbrot);
    numFrames++;
    zoomFactor *= 1.01;
}

function computeFrame() {
    if(!isRunning) {
        return;
    }
    if(isParallel)
        doMandelBrotParallel();
    else
        doMandelBrotSequential();
    setTimeout(function() {computeFrame();}, 20);
}

function startFPSDisplay() {
    var fps = "--"
    if(numFrames != 0) {
        fps = Math.round((numFrames*1000)/elapsed) + " fps";
    }
    document.getElementById("fps-display").innerHTML = fps; 
    setTimeout(function() {startFPSDisplay();}, 100);
}

function render () {
    canvas = document.getElementById("canvas");
    width = canvas.width; height = canvas.height;
    ctx = canvas.getContext('2d');
    imgData = ctx.getImageData(0, 0, width, height);
    var b = document.getElementById("pause");
    b.onclick = function() {
        isRunning = !isRunning;
        numFrames = 0;
        elapsed = 0;
        this.innerHTML = isRunning ? "Pause" : "Resume";
        if(isRunning) {
            computeFrame();
        }
    };
    var m = document.getElementById("mode");
    m.onclick = function() {
       toggleExecutionMode(this); 
    };
    startFPSDisplay();
    computeFrame();
}
