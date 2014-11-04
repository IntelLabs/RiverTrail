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

/* Entry point for the extension. */

"use strict";

Components.utils.import("resource://gre/modules/Services.jsm");

let o = {};
Services.scriptloader.loadSubScript("chrome://river-trail-extension/content/ffi.js", o);

// Global observer object
let observer;

function myObserver() {
  this.register();
}

myObserver.prototype = {
  observe: function(subject, topic, data) {

      // TODO (LK): explain what's happening here
      var window = Components.utils.waiveXrays(subject);

      // All the functions we want to export.
      Components.utils.exportFunction(o.ParallelArrayFFI.is64BitFloatingPointEnabled, window,
                                      {defineAs: "is64BitFloatingPointEnabled"});

      Components.utils.exportFunction(o.DriverFFI.initContext, window,
                                      {defineAs: "initContext"});

      Components.utils.exportFunction(o.DriverFFI.canBeMapped, window,
                                      {defineAs: "canBeMapped"});

      Components.utils.exportFunction(o.DriverFFI.compileKernel, window,
                                      {defineAs: "compileKernel"});

      Components.utils.exportFunction(o.DriverFFI.getBuildLog, window,
                                      {defineAs: "getBuildLog"});

      Components.utils.exportFunction(o.RunOCLFFI.mapData, window,
                                      {defineAs: "mapData"});

      Components.utils.exportFunction(o.RunOCLFFI.allocateData, window,
                                      {defineAs: "allocateData"});

      Components.utils.exportFunction(o.Main.run, window,
                                      {defineAs: "run"});
  },
  register: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "content-document-global-created", false);
  },
  unregister: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observerService.removeObserver(this, "content-document-global-created");
  }
}

function load(win) {
    console.log("load() is running...");

    observer = new myObserver();

}

// Listener to make sure that stuff happens in future windows.
let listener = {
    onOpenWindow: function(aWindow) {
        // Wait for the window to finish loading
        let win = aWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIDOMWindowInternal);
        win.addEventListener("UIReady", function(aEvent) {
            win.removeEventListener(aEvent.name, arguments.callee, false);
            load(win);
        }, false);
    },

    // Unused:
    onCloseWindow: function(aWindow) { },
    onWindowTitleChange: function(aWindow, aTitle) { }
};

/* Bootstrap functions */


// FIXME (LK): there's a weird behavior where the extension has to be
// disabled/enabled in order for web page code to realize that the
// extension is installed.  Figure out why this is happening
function startup(data, reason) {

    // Load in existing windows.
    let enumerator = Services.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
        let win = enumerator.getNext();
        load(win);
    }

    // Load in future windows.
    Services.wm.addListener(listener);

    // Load default preferences for the extension.
    let defaultBranch = Services.prefs.getDefaultBranch(null);
    function setDefaultPref(prefName, prefValue) {
        defaultBranch.setIntPref(prefName, prefValue);
    }
    Services.scriptloader.loadSubScript("chrome://river-trail-extension/content/defaults.js",
                                        {pref:setDefaultPref} );
}

function shutdown(data, reason) {

    o.OpenCL.shutdown();
}

function install(data, reason) {

}

function uninstall(data, reason) {

}
