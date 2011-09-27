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

 /*
  *     nbodyGLDisplay - Legacy class for rendeing the demo. For OGL rendering, see Render.js. This class now only updates the FPS counter.
  *
  *
  */




var displayInit = false;

var justSwitched = true;
var switchedCount = 0;

"use strict";
NBody.display = {
    "gl": null,
    "colorFloat32": null,

    "cameraTime": 0,

    "degToRad": function degToRad(degrees) {
        return degrees * Math.PI / 180;
    },

    "rTri": 0,
    "time": 0,
    "doneOnce": false,
    "countDown": 100,
    "xViewPoint": 0,
    "yViewPoint": 0,
    "zViewPoint": 0,
   

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


    "resetScoreboard": function resetScoreboard() {

        document.getElementById("fps-display").innerHTML = "--";

    },

    "scores": { "sequential": undefined, "parallel": undefined },
    "addFPS": function addFPS(current) {


        document.getElementById("fps-display").innerHTML = ((current < 1) ? "less than 1" : current) + " FPS";

        if (justSwitched == true) {
            document.getElementById("fps-display").innerHTML = "--";
            switchedCount++;
        }

        if (switchedCount > 2) { justSwitched = false; switchedCount = 0; }

    },
    "clockHandChars": ["/ ", "\\ "],
    "clockHandIndex": 0,
    "animate": function animate() {

        if (false) { // Set to true to avoid debug/timing output
            NBody.animateTick();
            return;
        }

        if (NBody.display.animateTimer.startDate === 0) {
            NBody.display.animateTimer.startDate = new Date();
            NBody.display.animateTimer.firstDate = NBody.display.animateTimer.startDate;
        }

        NBody.display.animateTimer.totalTicks++;

        // this is just so the lower framerate is displayed without the old framerate still up and vice versa
        // it is not a "cheat"
        var tickInterval;

        if (implementation == "parallel") tickInterval = 30; else tickInterval = 4;



        if (NBody.display.animateTimer.ticks++ > tickInterval) {
            var fps, aveFps;
            NBody.display.animateTimer.endDate = new Date();
            NBody.display.animateTimer.elapsedTime = NBody.display.animateTimer.endDate - NBody.display.animateTimer.startDate;
            NBody.display.animateTimer.totalElapsedTime = NBody.display.animateTimer.endDate - NBody.display.animateTimer.firstDate;
            fps = Math.floor((NBody.display.animateTimer.ticks / (NBody.display.animateTimer.elapsedTime / 1000)) + .5);

            NBody.display.addFPS(fps);
            NBody.display.clockHandIndex = (NBody.display.clockHandIndex >= 1) ? 0 : NBody.display.clockHandIndex + 1;
            NBody.display.animateTimer.startDate = NBody.display.animateTimer.endDate;

            NBody.display.animateTimer.ticks = 0;
        }

        NBody.animateTick();
    },

    "tick": function tick() {

        // only draw
        if (NBody.private.stop == false) {
            NBody.display.animate();
        }

    },

    "currentlyPressedKeys": {},

    "handleKeyDown": function handleKeyDown(keyEvent) {
        NBody.display.currentlyPressedKeys[keyEvent.keyCode] = true;
    },


    "handleKeyUp": function handleKeyUp(keyEvent) {
        NBody.display.currentlyPressedKeys[keyEvent.keyCode] = false;
    },



    "handleKeys": function handleKeys() {


    },

    "lastTime": 0,

    // Used to make us "jog" up and down as we move forward.
    "joggingAngle": 0,

    "animateViewPoint": function animateViewPoint() {
        var timeNow = new Date().getTime();
        NBody.display.lastTime = timeNow;
    },

    "webGLStart": function webGLStart() {
        if (displayInit == true) return;
        NBody.display.tick(); // picks up implementation from NBody.display.implementation
        displayInit = true;
    }

}



function degToRad(degrees) {
    return degrees * Math.PI / 180;
}

