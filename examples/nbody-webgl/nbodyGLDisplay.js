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
NBody.display = {
    "gl": null,
    "colorFloat32": null,
    //http://www.easyrgb.com/index.php?X=HARM#Result provides these using 177, 67, 140 as a base
    // This is nice in a modern understated way.
    "colorThemes": [177.00, 67.00, 140.00,
                    177.00, 67.00, 140.00,
                    177.00, 67.00, 140.00,
                    171.89, 210.50, 220.45,
                    209.52, 204.51, 178.37,
                    225.23, 195.95, 212.68,
                    180.71, 210.95, 194.98,
                    115.14, 112.17, 0.00,
                    0.00, 128.77, 169.15,
                    0.00, 130.35, 125.31,
                    90.13, 116.45, 72.94,
                    106.92, 167.52, 138.11,
                    106.92, 167.52, 138.11,
                    208.38, 130.46, 178.48,
                     0.00, 171.25, 199.54,
                    164.70, 157.13, 85.49],
    // This is a bit brighter and a bit gawdy.
    "colorThemesRed": [255.00, 0.00, 0.00,
                        255.00, 0.00, 0.00,
                        255.00, 0.00, 0.00,
                        255.00, 0.00, 0.00,
                        192.55, 210.04, 255.00,
                        165.57, 223.33, 192.98,
                        255.00, 196.33, 180.02,
                        142.14, 222.90, 241.42,
                        0.00, 158.23, 59.24,
                        0.00, 131.05, 255.00,
                        0.00, 154.08, 255.00,
                        0.00, 148.84, 141.37,
                        0.00, 189.53, 227.48,
                        255.00, 119.60, 85.70,
                        45.66, 168.32, 255.00,
                        0.00, 195.81, 119.90],

    "initGL": function initGL(canvas) {
        var i, iBase, theColor;
        var colorTheme = NBody.display.colorThemes;  // NBody.display.colorThemesRed; // NBody.display.colorThemes
        try {
            NBody.display.gl = canvas.getContext("experimental-webgl");
            NBody.display.gl.viewportWidth = canvas.width;
            NBody.display.gl.viewportHeight = canvas.height;
            NBody.display.colorFloat32 = new Array(NBody.private.numBodies * 4);
            for (i = 0; i < NBody.private.numBodies; i++) {
                theColor = Math.floor(Math.random() * 16.0); // Select one of the 14 colors, 3 are the base color.
                if (theColor >= 15) {
                    theColor = 0;
                }
                iBase = i * 4;
                // 255, 105, 80 was that nice purple.
                NBody.display.colorFloat32[iBase + 0] = colorTheme[theColor + 0];
                NBody.display.colorFloat32[iBase + 1] = colorTheme[theColor + 1];
                NBody.display.colorFloat32[iBase + 2] = colorTheme[theColor + 2];
                NBody.display.colorFloat32[iBase + 3] = 1.0;
            }
            NBody.display.colorFloat32 = new Float32Array(NBody.display.colorFloat32);
        } catch (e) {
        }
        if (!NBody.display.gl) {
            alert("Could not initialise WebGL, sorry :-(");
        }
    },


    "getShader": function getShader(gl, id) {
        var shaderScript = document.getElementById(id);
        if (!shaderScript) {
            return null;
        }

        var str = "";
        var k = shaderScript.firstChild;
        while (k) {
            if (k.nodeType == 3) {
                str += k.textContent;
            }
            k = k.nextSibling;
        }

        var shader;
        if (shaderScript.type == "x-shader/x-fragment") {
            shader = NBody.display.gl.createShader(gl.FRAGMENT_SHADER);
        } else if (shaderScript.type == "x-shader/x-vertex") {
            shader = NBody.display.gl.createShader(gl.VERTEX_SHADER);
        } else {
            return null;
        }

        NBody.display.gl.shaderSource(shader, str);
        NBody.display.gl.compileShader(shader);

        if (!NBody.display.gl.getShaderParameter(shader, NBody.display.gl.COMPILE_STATUS)) {
            alert(NBody.display.gl.getShaderInfoLog(shader));
            return null;
        }

        return shader;
    },

    "shaderProgram": null,

    "initShaders": function initShaders() {
        var fragmentShader = NBody.display.getShader(NBody.display.gl, "shader-fs");
        var vertexShader = NBody.display.getShader(NBody.display.gl, "shader-vs");

        NBody.display.shaderProgram = NBody.display.gl.createProgram();
        NBody.display.gl.attachShader(NBody.display.shaderProgram, vertexShader);
        NBody.display.gl.attachShader(NBody.display.shaderProgram, fragmentShader);
        NBody.display.gl.linkProgram(NBody.display.shaderProgram);

        if (!NBody.display.gl.getProgramParameter(NBody.display.shaderProgram, NBody.display.gl.LINK_STATUS)) {
            alert("Could not initialise shaders");
        }

        NBody.display.gl.useProgram(NBody.display.shaderProgram);
        NBody.display.shaderProgram.vertexPositionAttribute = NBody.display.gl.getAttribLocation(NBody.display.shaderProgram, "aVertexPosition");
        NBody.display.gl.enableVertexAttribArray(NBody.display.shaderProgram.vertexPositionAttribute);

        NBody.display.shaderProgram.vertexColorAttribute = NBody.display.gl.getAttribLocation(NBody.display.shaderProgram, "aVertexColor");
        NBody.display.gl.enableVertexAttribArray(NBody.display.shaderProgram.vertexColorAttribute);

        NBody.display.shaderProgram.pMatrixUniform = NBody.display.gl.getUniformLocation(NBody.display.shaderProgram, "uPMatrix");
        NBody.display.shaderProgram.mvMatrixUniform = NBody.display.gl.getUniformLocation(NBody.display.shaderProgram, "uMVMatrix");
    },

    "mvMatrix": mat4.create(),
    "mvMatrixStack": [],
    "pMatrix": mat4.create(),

    "mvPushMatrix": function mvPushMatrix() {
        var copy = mat4.create();
        mat4.set(mvMatrix, copy);
        NBody.display.mvMatrixStack.push(copy);
    },

    "mvPopMatrix": function mvPopMatrix() {
        if (NBody.display.mvMatrixStack.length == 0) {
            throw "Invalid popMatrix!";
        }
        NBody.display.mvMatrix = NBody.display.mvMatrixStack.pop();
    },

    "setMatrixUniforms": function setMatrixUniforms() {
        NBody.display.gl.uniformMatrix4fv(NBody.display.shaderProgram.pMatrixUniform, false, NBody.display.pMatrix);
        NBody.display.gl.uniformMatrix4fv(NBody.display.shaderProgram.mvMatrixUniform, false, NBody.display.mvMatrix);
    },

    "degToRad": function degToRad(degrees) {
        return degrees * Math.PI / 180;
    },

    "triangleVertexPositionBufferCount": 0, // init in webGLStart to NBody.numBodies,
    "triangleVertexPositionBuffer": null,   // init in webGLStart to new Array(NBody.display.triangleVertexPositionBufferCount),
    "sizePerPosition": 4, // For both position and color
    // If we use NBody.pos then the item size is 4, be sure to square this with the shader.
    "relativePositionFloat32": null, // NBody.pos.data for parallel NBody.posTA for sequential
    "relativePositionVertexBuffer": null,
    "colorVertexBuffer": null,

    "initBuffers": function initBuffers() {
        NBody.display.relativePositionVertexBuffer = NBody.display.gl.createBuffer();
        NBody.display.gl.bindBuffer(NBody.display.gl.ARRAY_BUFFER, NBody.display.relativePositionVertexBuffer);
        NBody.display.gl.bufferData(NBody.display.gl.ARRAY_BUFFER, NBody.display.relativePositionFloat32, NBody.display.gl.STATIC_DRAW);
        NBody.display.relativePositionVertexBuffer.itemSize = NBody.display.sizePerPosition; // If we use NBody.pos then the item size is 4, be sure to square this with the shader.
        NBody.display.relativePositionVertexBuffer.numItems = NBody.private.numBodies;

        NBody.display.colorVertexBuffer = NBody.display.gl.createBuffer();
        NBody.display.gl.bindBuffer(NBody.display.gl.ARRAY_BUFFER, NBody.display.colorVertexBuffer);
        NBody.display.gl.bufferData(NBody.display.gl.ARRAY_BUFFER, NBody.display.colorFloat32, NBody.display.gl.STATIC_DRAW);
        NBody.display.colorVertexBuffer.itemSize = NBody.display.sizePerPosition; // If we use NBody.pos then the item size is 4, be sure to square this with the shader.
        NBody.display.colorVertexBuffer.numItems = NBody.private.numBodies;

    },

    "stopDisplay": function stopDisplay() {
        var afps = Math.floor((NBody.display.animateTimer.totalTicks / (NBody.display.animateTimer.totalElapsedTime / 1000)) + .5);
        var impString = "";
        if (NBody.display.implementation == "sequential") {
            impString = "Standard Sequential JavaScript";
        } else if (NBody.display.implementation == "parallel") {
            impString = "New Data Parallel JavaScript";
        } else if (NBody.display.implementation == "parallelNoOCL") {
            impString = "DataParallel Backup JavaScript";
        } else {
            impString = "Unnamed approach              ";
        }

    },

    "rTri": 0,

    "doneOnce": false,
    "countDown": 100,
    "xViewPoint": 0,
    "yViewPoint": 0,
    "zViewPoint": 0,
    "drawScene": function drawScene() {

        // So let's allow a very deep image.
        if (!NBody.display.doneOnce) {
            NBody.display.gl.viewport(0, 0, NBody.display.gl.viewportWidth, NBody.display.gl.viewportHeight); // Move this outside if we are changing perspective
            NBody.display.gl.clear(NBody.display.gl.COLOR_BUFFER_BIT | NBody.display.gl.DEPTH_BUFFER_BIT);    // Move this outside if we don't want "trails" of the bodies.
            mat4.perspective(45, NBody.display.gl.viewportWidth / NBody.display.gl.viewportHeight, 0.1, 2000.0, NBody.display.pMatrix);
            mat4.identity(NBody.display.mvMatrix);
            mat4.translate(NBody.display.mvMatrix, [0, 0, -1.00]); // Move this outside if you want to allow user control
            
            NBody.display.gl.bindBuffer(NBody.display.gl.ARRAY_BUFFER, NBody.display.colorVertexBuffer);
            NBody.display.gl.bufferData(NBody.display.gl.ARRAY_BUFFER, NBody.display.colorFloat32, NBody.display.gl.STATIC_DRAW);
            NBody.display.gl.vertexAttribPointer(NBody.display.shaderProgram.vertexColorAttribute, NBody.display.relativePositionVertexBuffer.itemSize, NBody.display.gl.FLOAT, false, 0, 0);
            // 4 is the item size we use x, y, z, but we don't look at mass.

            NBody.display.doneOnce = true;

        }
       NBody.display.gl.clear(NBody.display.gl.COLOR_BUFFER_BIT | NBody.display.gl.DEPTH_BUFFER_BIT); // If you want a fresh screen at every frame, does not change fps
       if (false) {
            mat4.identity(NBody.display.mvMatrix);
            mat4.rotate(NBody.display.mvMatrix, NBody.display.degToRad(-NBody.display.pitch), [1, 0, 0]);
            mat4.rotate(NBody.display.mvMatrix, NBody.display.degToRad(-NBody.display.yaw), [0, 1, 0]);
            mat4.translate(NBody.display.mvMatrix, [-NBody.display.xPos, -NBody.display.yPos, -NBody.display.zPos]);
        } else {
            if (NBody.display.countDown-- < 0) {
                mat4.identity(NBody.display.mvMatrix);
                mat4.translate(NBody.display.mvMatrix, [NBody.display.xViewPoint, NBody.display.yViewPoint, NBody.display.zViewPoint]);
                NBody.display.countDown = 100;
            } else {
                mat4.identity(NBody.display.mvMatrix);
                mat4.translate(NBody.display.mvMatrix, [NBody.display.xViewPoint, NBody.display.yViewPoint, NBody.display.zViewPoint]);
            }
        }
        if (NBody.display.implementation === "sequential") {
            NBody.display.relativePositionFloat32 = NBody.private.posTA;
        } else {
            // I think we have to touch the data to avoid webGL errors.
            NBody.private.pos.materialize();
            NBody.display.relativePositionFloat32 = NBody.private.pos.data;
        }


        //gl.bufferData(gl.ARRAY_BUFFER, relativePositionFloat32, gl.STATIC_DRAW);
        //mat4.identity(mvMatrix); // Include if you want user control of viewpoint depth.
        //mat4.translate(mvMatrix, [0, 0, -1.00]);

        NBody.display.gl.bindBuffer(NBody.display.gl.ARRAY_BUFFER, NBody.display.relativePositionVertexBuffer);
        NBody.display.gl.bufferData(NBody.display.gl.ARRAY_BUFFER, NBody.display.relativePositionFloat32, NBody.display.gl.STATIC_DRAW);
        NBody.display.gl.vertexAttribPointer(NBody.display.shaderProgram.vertexPositionAttribute, NBody.display.relativePositionVertexBuffer.itemSize, NBody.display.gl.FLOAT, false, 0, 0);
        // 4 is the item size we use x, y, z, but we don't look at mass.  

        NBody.display.setMatrixUniforms();
        // mode, first, count
        NBody.display.gl.drawArrays(NBody.display.gl.POINTS, 0, NBody.display.relativePositionVertexBuffer.numItems);
    },

    "animateTimer": {
        "ticks": 0,
        "totalTicks": 0,
        "timeout": 0,
        "firstDate": 0,
        "startDate": 0,
        "endDate": 0,
        "elapsedTime": 0,
        "totalElapsedTime": 0,
        "tickCheck": 24,
        "tickStop": 500,
        "averageFPS": 0
    },

    // Reset the times when you hit the run button.
    "resetAnimateTimer": function resetAnimateTimer() {
        NBody.display.animateTimer.ticks = 0;
        NBody.display.animateTimer.totalTicks = 0;
        NBody.display.animateTimer.timeout = 0;
        NBody.display.animateTimer.firstDate = 0;
        NBody.display.animateTimer.startDate = 0;
        NBody.display.animateTimer.endDate = 0;
        NBody.display.animateTimer.elapsedTime = 0;
        NBody.display.animateTimer.totalElapsedTime = 0;
        NBody.display.animateTimer.tickCheck = 24;
        NBody.display.animateTimer.tickStop = 500;
        NBody.display.animateTimer.averageFPS = 0;
    },

    "scoreboard": { "sequential": undefined, "parallel": undefined, "speedup": undefined },
    "initScoreboard": function initScoreboard() {
        NBody.display.scoreboard = { "sequential": { "current": document.getElementById("seqFPSCurr"),
                                                     "average": document.getElementById("seqFPSAvg")},
            "parallel": { "current": document.getElementById("parFPSCurr"),
                          "average": document.getElementById("parFPSAvg")},
            "speedup": document.getElementById("speedup")};
    },
    "resetScoreboard": function resetScoreboard() {
        NBody.display.scoreboard.sequential.current.innerHTML = "--";
        NBody.display.scoreboard.sequential.average.innerHTML = "--";
        NBody.display.scoreboard.parallel.current.innerHTML = "--";
        NBody.display.scoreboard.parallel.average.innerHTML = "--";
        NBody.display.scoreboard.speedup.innerHTML = "--";
        NBody.display.scores.sequential = undefined;
        NBody.display.scores.parallel = undefined;
    },

    "scores": { "sequential": undefined, "parallel": undefined },
    "addFPS": function (current, average, impl) {
        NBody.display.scores[impl] = { "current": current, "average": average };
        NBody.display.scoreboard[impl].current.innerHTML = ((current < 1) ? "less than 1" : current) + "fps";
        NBody.display.scoreboard[impl].average.innerHTML = ((average < 1) ? "less than 1" : average) + "fps";
        if (NBody.display.scores.sequential && NBody.display.scores.parallel &&
            (NBody.display.scores.sequential.average >= 1)) {
            NBody.display.scoreboard.speedup.innerHTML = new Number(NBody.display.scores.parallel.average / NBody.display.scores.sequential.average).toFixed(2);
        } else {
            NBody.display.scoreboard.speedup.innerHTML = "--";
        }
    },
    "clockHandChars": ["/ ", "\\ "],
    "clockHandIndex": 0,
    "animate": function animate() {

        if (false) { // Set to true to avoid debug/timing output
            NBody.animateTick(NBody.display.implementation);
            return;
        }

        if (NBody.display.animateTimer.startDate === 0) {
            NBody.display.animateTimer.startDate = new Date();
            NBody.display.animateTimer.firstDate = NBody.display.animateTimer.startDate;
        }

        NBody.display.animateTimer.totalTicks++;
        if (NBody.display.animateTimer.ticks++ > NBody.display.animateTimer.tickCheck) {
            var fps, aveFps;
            NBody.display.animateTimer.endDate = new Date();
            NBody.display.animateTimer.elapsedTime = NBody.display.animateTimer.endDate - NBody.display.animateTimer.startDate;
            NBody.display.animateTimer.totalElapsedTime = NBody.display.animateTimer.endDate - NBody.display.animateTimer.firstDate;
            fps = Math.floor((NBody.display.animateTimer.ticks / (NBody.display.animateTimer.elapsedTime / 1000)) + .5);
            //if (fps < 1) {
                //fps = "is less than 1";
            //}
            NBody.display.animateTimer.averageFPS = Math.floor((NBody.display.animateTimer.totalTicks / (NBody.display.animateTimer.totalElapsedTime / 1000)) + .5);
            //if (NBody.display.animateTimer.averageFPS < 1) {
                //NBody.display.animateTimer.averageFPS = "is less than 1";
            //}
            NBody.display.addFPS(fps, NBody.display.animateTimer.averageFPS, NBody.display.implementation);
            NBody.display.clockHandIndex = (NBody.display.clockHandIndex >= 1) ? 0 : NBody.display.clockHandIndex + 1;
            NBody.display.animateTimer.startDate = NBody.display.animateTimer.endDate;

            NBody.display.animateTimer.ticks = 0;
        }

        NBody.animateTick(NBody.display.implementation);
    },

    "tick": function tick() {
        if (NBody.private.stop) {
            // This will eat any remaining events
            return;
        }
        NBody.display.handleKeys();
        NBody.display.drawScene();
        NBody.display.animateViewPoint();
        NBody.display.animate();
        window.mozRequestAnimationFrame(NBody.display.tick); // window.setTimeout(tick, 1000/60);
    },

    "currentlyPressedKeys": {},

    "handleKeyDown": function handleKeyDown(keyEvent) {
        NBody.display.currentlyPressedKeys[keyEvent.keyCode] = true;
    },


    "handleKeyUp": function handleKeyUp(keyEvent) {
        NBody.display.currentlyPressedKeys[keyEvent.keyCode] = false;
    },


    "pitch": 0,
    "pitchRate": 0,

    "yaw": 0,
    "yawRate": 0,

    "xPos": 0,
    "yPos": 0.4,
    "zPos": 0,

    "speed": 0,

    "handleKeys": function handleKeys() {
        if (NBody.display.currentlyPressedKeys[33]) {
            // Page Up
            NBody.display.pitchRate = 0.1;
            NBody.display.zViewPoint = NBody.display.zViewPoint + 10;
        } else if (NBody.display.currentlyPressedKeys[34]) {
            // Page Down
            NBody.display.pitchRate = -0.1;
            NBody.display.zViewPoint = NBody.display.zViewPoint - 10;
        } else {
            NBody.display.pitchRate = 0;
        }

        if (NBody.display.currentlyPressedKeys[37] || NBody.display.currentlyPressedKeys[65]) {
            // Left cursor key or A
            NBody.display.yawRate = 0.1;
            NBody.display.xViewPoint = NBody.display.xViewPoint - 10;
        } else if (NBody.display.currentlyPressedKeys[39] || NBody.display.currentlyPressedKeys[68]) {
            // Right cursor key or D
            NBody.display.yawRate = -0.1;
            NBody.display.xViewPoint = NBody.display.xViewPoint + 10;
        } else {
            NBody.display.yawRate = 0;
        }

        if (NBody.display.currentlyPressedKeys[38] || NBody.display.currentlyPressedKeys[87]) {
            // Up cursor key or W
            NBody.display.speed = 0.003;
            NBody.display.yViewPoint = NBody.display.yViewPoint + 10;
        } else if (NBody.display.currentlyPressedKeys[40] || NBody.display.currentlyPressedKeys[83]) {
            // Down cursor key
            NBody.display.yViewPoint = NBody.display.yViewPoint - 10;
            NBody.display.speed = -0.003;
        } else {
            NBody.display.speed = 0;
        }

    },

    "lastTime": 0,

    // Used to make us "jog" up and down as we move forward.
    "joggingAngle": 0,

    "animateViewPoint": function animateViewPoint() {
        var timeNow = new Date().getTime();
        if (NBody.display.lastTime != 0) {
            var elapsed = timeNow - NBody.display.lastTime;

            if (NBody.display.speed != 0) {
                NBody.display.xPos -= Math.sin(NBody.display.degToRad(NBody.display.yaw)) * NBody.display.speed * elapsed;
                NBody.display.zPos -= Math.cos(NBody.display.degToRad(NBody.display.yaw)) * NBody.display.speed * elapsed;

                NBody.display.joggingAngle += elapsed * 0.6; // 0.6 "fiddle factor" - makes it feel more realistic :-)
                NBody.display.yPos = Math.sin(NBody.display.degToRad(NBody.display.joggingAngle)) / 20 + 0.4
            }

            NBody.display.yaw += NBody.display.yawRate * elapsed;
            NBody.display.pitch += NBody.display.pitchRate * elapsed;

        }
        NBody.display.lastTime = timeNow;
    },

    "implementation": "parallel",

    "webGLStart": function webGLStart(implementation) {
        var canvas = document.getElementById("webgl-canvas");
        NBody.display.doneOnce = false;
        this.resetAnimateTimer();
        NBody.display.implementation = implementation; // "sequential" or "parallel"
        NBody.display.triangleVertexPositionBufferCount = NBody.private.numBodies;
        NBody.display.triangleVertexPositionBuffer = new Array(NBody.display.triangleVertexPositionBufferCount);
        if (implementation === "sequential") {
            NBody.display.relativePositionFloat32 = NBody.private.posTA;
        } else {
            // Do not need to materialize during initialization.
            NBody.display.relativePositionFloat32 = NBody.private.pos.data;
        }
        NBody.display.initGL(canvas);
        NBody.display.initShaders();

        NBody.display.initBuffers();

        NBody.display.gl.clearColor(0.0, 0.0, 0.0, 1.0);
        NBody.display.gl.enable(NBody.display.gl.DEPTH_TEST);

        document.onkeydown = NBody.display.handleKeyDown;
        document.onkeyup = NBody.display.handleKeyUp;

        NBody.display.tick(); // picks up implementation from NBody.display.implementation
    }

}
