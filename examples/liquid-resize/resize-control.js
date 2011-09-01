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

"use strict";

// configurable options
var imageSrc = "tower.jpg";
var previewSteps = 2;
var recompileThreshold = 100; // experiments show 100 is a good threshold

// global state
var statusBar = document.getElementById('statusBar');
var logArea = document.getElementById('log');
var theCanvas = document.getElementById('theCanvas');
var theContext = theCanvas.getContext('2d');
var theImage = new Image();
var theButtons = [];
theButtons.push(document.getElementById('btnResize'));
theButtons.push(document.getElementById('impl'));
theButtons.push(document.getElementById('btnReset'));
theButtons.push(document.getElementById('btnHalve'));
var originalData;
var virtualWidth;
var virtualHeight;
var topX = -1;
var topY = -1;
var bottomX = -1;
var bottomY = -1;
var parallelComponentTime = 0;
var lastTime = {js: undefined, dp: undefined};
var scoreboard = {js: {full: document.getElementById("seqFull"), par: document.getElementById("seqPar")},
                  dp: {full: document.getElementById("parFull"), par: document.getElementById("parPar")},
                  speedup: {full: document.getElementById("speedupFull"), par: document.getElementById("speedupPar")}};
 
function setStatusBar(msg) {
    statusBar.innerHTML = msg + "<a style=\"font-size: 0.7em;\" href=\"javascript:addLogMessage(\'" + msg + "\')\">[log]</a>";
}

function addLogMessage(msg) {
    var text = document.createTextNode(msg);
    logArea.appendChild(text);
    logArea.appendChild(document.createElement('br'));
}

function updateScoreboard() {
    function updateOne(impl, kind) {
        scoreboard[impl][kind].innerHTML = lastTime[impl][kind] / 1000 + "s";
    }
    if (lastTime.js) {
        updateOne("js", "full");
        updateOne("js", "par");
    }
    if (lastTime.dp) {
        updateOne("dp", "full");
        updateOne("dp", "par");
    }
    if (lastTime.dp && lastTime.js) {
        scoreboard.speedup.full.innerHTML = new Number(lastTime.js.full / lastTime.dp.full).toFixed(2);
        scoreboard.speedup.par.innerHTML = new Number(lastTime.js.par / lastTime.dp.par).toFixed(2);
    }
}

function resetScoreboard() {
    function resetOne(impl, kind) {
        scoreboard[impl][kind].innerHTML = "--";
    }
    resetOne("js", "full");
    resetOne("js", "par");
    resetOne("dp", "full");
    resetOne("dp", "par");
    resetOne("speedup", "full");
    resetOne("speedup", "par");
}

function selectTopCorner(e) {
    topX = e.layerX;
    topY = e.layerY;
    theCanvas.onmousemove = selectBottomCorner;
    theCanvas.onmouseup = remove_cont;
    setStatusBar("Drag mouse to choose area to remove. Release button to select...");
}

function selectBottomCorner(e) {
    theContext.putImageData(originalData, 0, 0);
    bottomX = Math.min(virtualWidth, e.layerX);
    bottomY = Math.min(virtualHeight, e.layerY);
    theContext.strokeRect(topX+1, topY+1, bottomX-topX-1, bottomY-topY-1);
}

function saveImage() {
    originalData = theContext.getImageData(0, 0, theCanvas.width, theCanvas.height);
}

function restoreImage() {
    theContext.putImageData(originalData, 0, 0);
}

function resetEvents() {
    theCanvas.onmousemove = undefined;
    theCanvas.onmouseup = undefined;
    theCanvas.onmousedown = undefined;
}

function inProgress(state) {
    theButtons.forEach(function(b) { b.disabled = state;});
}
    
function reset() {
    inProgress(true);
    theCanvas.width = theImage.width;
    theCanvas.height = theImage.height;
    virtualWidth = theImage.width;
    virtualHeight = theImage.height;
    theContext.drawImage(theImage, 0, 0, theImage.width, theImage.height);
    saveImage();
    theContext.strokeStyle = "rgba(255, 255, 255, 50)";
    resetEvents();
    setStatusBar("Picture loaded. Please select an option above.");
    inProgress(false);
}

function halve() {
    inProgress(true);
    bottomX = virtualWidth / 2;
    bottomY = virtualHeight / 2;
    setStatusBar("Target size is " + bottomX + " times " + bottomY + " pixels. Resizing...");
    setTimeout("resize_loop()",1);
}

function resize() {
    inProgress(true);
    topX = 0;
    topY = 0;
    theCanvas.onmousemove = selectBottomCorner;
    theCanvas.onmouseup = resize_cont;
    setStatusBar("Select target size by clicking into the image...");
}

function resize_cont() {
    resetEvents();
    restoreImage();
    setStatusBar("Target size is " + bottomX + " times " + bottomY + " pixels. Resizing...");
    setTimeout("resize_loop()",1);
}

function resize_loop() {
    var start = new Date();
    var xReduction = virtualWidth - bottomX;
    var yReduction = virtualHeight - bottomY;
    var xReps = 1;
    var yReps = 1;
    var impl = document.getElementById("impl").value;
    parallelComponentTime = 0;
    if (xReduction > yReduction) {
        if (yReduction > 0) xReps = xReduction / yReduction;
    } else {
        if (xReduction > 0) yReps = yReduction / xReduction;
    }
    if (impl === "js") {
        while ((virtualWidth > bottomX) || (virtualHeight > bottomY)) {
            if (virtualWidth > bottomX) {
                for (var i = 0; i < xReps; i++) {
                    reduceOneHorizontalJS(theCanvas);
                    virtualWidth--;
                }
            }
            if (virtualHeight > bottomY) {
                for (var i = 0; i < yReps; i++) {
                    reduceOneVerticalJS(theCanvas);
                    virtualHeight--;
                }
            }
        }
    } else {
        while ((virtualWidth > bottomX) || (virtualHeight > bottomY)) {
            if (virtualWidth > bottomX) {
                for (var i = 0; i < xReps; i++) {
                    reduceOneHorizontal(theCanvas);
                    virtualWidth--;
                }
            }
            if (virtualHeight > bottomY) {
                for (var i = 0; i < yReps; i++) {
                    reduceOneVertical(theCanvas);
                    virtualHeight--;
                }
            }
            if ((theCanvas.width - virtualWidth > recompileThreshold) ||
                (theCanvas.height - virtualHeight > recompileThreshold)) {
                saveImage();
                theCanvas.width = virtualWidth;
                theCanvas.height = virtualHeight;
                restoreImage();
            }
        }
    }
    saveImage();
    var end = new Date();
    lastTime[impl] = {full: (end-start), par: (parallelComponentTime)};
    updateScoreboard();
    setStatusBar((impl == "js" ? "Sequential" : "Parallel") + " implementation finished in " + (end-start)/1000 + "s (Parallel component took " + parallelComponentTime/1000 + "s.). Choose another operation...");
    theCanvas.width = virtualWidth;
    theCanvas.height = virtualHeight;
    restoreImage();
    inProgress(false);
}
    
function remove() {
    inProgress(true);
    theCanvas.onmousedown = selectTopCorner;
    setStatusBar("Choose top left corner of area to remove and press mouse button...");
}

function remove_cont() {
    resetEvents();
    restoreImage();
    setStatusBar("Area to remove is (" + topX + "," + topY + ") to (" + bottomX + "," + bottomY + "). Removing.");
    inProgress(false);
}

// initialise the GUI at startup
theImage.onload = reset;
theImage.src = imageSrc;
