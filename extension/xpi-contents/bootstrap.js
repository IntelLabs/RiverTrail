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

Components.utils.import("resource://gre/modules/Services.jsm");

// Code that listens for a custom DOM event.  This is how we
// implement communication between unprivileged (web page) and
// privileged (extension) JS code.
function load(win) {
    let document = win.document;
    document.addEventListener("RiverTrailExtensionCustomEvent",
                              function(e) {
                                  win.alert("Hello from privileged code! Event received!");

                                  // Load the main extension code and run it.
                                  let context = {};
                                  Services.scriptloader.loadSubScript("chrome://river-trail-extension/content/ffi.js",
                                                                     context);

                                  context.Main.run(win);
                              },
                              false,
                              true // Mozilla-specific argument,
                                   // "wantUntrusted", that says that
                                   // this listener should listen for
                                   // events coming from unprivileged
                                   // code, which is what we want.
                             );
}

function unload(win) {
    let document = win.document;
    document.removeEventListener("RiverTrailExtensionCustomEvent",
                                 arguments.callee,
                                 false);
}

// Listener to make sure that stuff happens in future windows.  Not to
// be confused with our custom event listener, above.
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

    Services.wm.removeListener(listener);
    if (reason == APP_SHUTDOWN)
        return;

    let enumerator = Services.wm.getEnumerator("navigator:browser");
    while(enumerator.hasMoreElements()) {
        let win = enumerator.getNext();
        unload(win);
    }
}

function install(data, reason) {

}

function uninstall(data, reason) {

}
