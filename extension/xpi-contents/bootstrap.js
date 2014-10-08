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

// Entry point for the extension.

Cu.import('resource://gre/modules/Services.jsm');

function startup(data, reason) {

    // Code that listens for a custom DOM event.  This is how we
    // implement communication between unprivileged (web page) and
    // privileged (extension) JS code.
    var DOMListener = {
	listener: function(evt) {
	    alert("Hello from privileged code! Event received!");
	    Main.run();
	}
    }

    // The `true` argument is a Mozilla-specific value to indicate
    // untrusted content is allowed to trigger the event.
    document.addEventListener("RiverTrailExtensionCustomEvent",
			      function(e) {
				  DOMListener.listener(e);
			      },
			      false,
			      true);

    // Load default preferences for the extension.
    var defaultBranch = Services.prefs.getDefaultBranch(null);
    function setDefaultPref(prefName, prefValue) {
	defaultBranch.setBoolPref(prefName, prefValue);
    }
    Services.scriptloader.loadSubScript("chrome://river-trail-extension/content/defaults.js",
					{pref:setDefaultPref} );

    // Load the main extension code.
    Services.scriptloader.loadSubScript("chrome://river-trail-extension/content/ffi.js");

}

function shutdown(data, reason) {

}

function install(data, reason) {

}

function uninstall(data, reason) {

}
