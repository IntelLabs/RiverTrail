/*
 * Copyright (c) 2014, Intel Corporation
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

let { Cu } = require("chrome");

let events = require("sdk/system/events");
let prefs = require("sdk/simple-prefs");
let panels = require("sdk/panel");

let { OpenCL } = require("OpenCL.js");
let { RiverTrailInterface } = require("RiverTrailInterface.js");
let { Debug } = require("Debug.js");

function injectFunctions(event) {
    // event.subject is an nsIDOMWindow
    // event.data is a string representing the origin
    Debug.log("injecting functions for origin " + event.data);
    let domWindow = event.subject;

    // Add to window all the functions we want user-side code to be able to call.
    Cu.exportFunction(RiverTrailInterface.riverTrailExtensionIsInstalled, domWindow,
                      {defineAs: "riverTrailExtensionIsInstalled"});

    Cu.exportFunction(RiverTrailInterface.is64BitFloatingPointEnabled, domWindow,
                      {defineAs: "is64BitFloatingPointEnabled"});

    Cu.exportFunction(RiverTrailInterface.initContext, domWindow,
                      {defineAs: "initContext"});

    Cu.exportFunction(RiverTrailInterface.canBeMapped, domWindow,
                      {defineAs: "canBeMapped"});

    Cu.exportFunction(RiverTrailInterface.compileKernel, domWindow,
                      {defineAs: "compileKernel"});

    Cu.exportFunction(RiverTrailInterface.getBuildLog, domWindow,
                      {defineAs: "getBuildLog"});

    Cu.exportFunction(RiverTrailInterface.mapData, domWindow,
                      {defineAs: "mapData"});

    Cu.exportFunction(RiverTrailInterface.setArgument, domWindow,
                      {defineAs: "setArgument"});

    Cu.exportFunction(RiverTrailInterface.setScalarArgument, domWindow,
                      {defineAs: "setScalarArgument"});

    Cu.exportFunction(RiverTrailInterface.run, domWindow,
                      {defineAs: "run"});

    Cu.exportFunction(RiverTrailInterface.getValue, domWindow,
                      {defineAs: "getValue",
                       allowCallbacks: true});

    Debug.log("finished injecting functions");
}

let gInitialized = false;

// This function is called whenever the add-on is loaded.
exports.main = function(options, callbacks) {
    if (!gInitialized &&
        (options.loadReason == "startup" ||
         options.loadReason == "install" ||
         options.loadReason == "enable")) {
        Debug.log("initializing");
        OpenCL.init();
        events.on("content-document-global-created", injectFunctions);
        gInitialized = true;
    }
};

// This function is called whenever the add-on is unloaded.
exports.onUnload = function(reason) {
    Debug.log("onUnload: " + reason);
    if (gInitialized && (reason == "shutdown" || reason == "disable")) {
        Debug.log("deinitializing");
        events.off("content-document-global-created", injectFunctions);
        OpenCL.shutdown();
        gInitialized = false;
    }
};

// This code handles the preferences panel.
prefs.on("prefsButton", function() {
    panel.show();
});

// TODO.
let panel = panels.Panel({
  width: 350,
  height: 350,
  contentURL: "http://todo"
});
