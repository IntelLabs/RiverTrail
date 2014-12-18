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

let { Cu, Cc, Ci } = require("chrome");
Cu.import("resource://gre/modules/ctypes.jsm");

let { CLTypes } = require("CLTypes.js");
let { Constants } = require("Constants.js");
let { OpenCL } = require("OpenCL.js");
let { Debug } = require("Debug.js");

// Info about all OpenCL platforms.
let Platforms = {
    numPlatforms: CLTypes.cl_uint(0),

    // A pointer to a ctypes array of platform IDs of supported
    // platforms.  (Should this be a ctypes.ArrayType?  Probably.)
    platforms: CLTypes.cl_platform_id(null),

    // A JS array of Platform objects.
    jsPlatforms: new Array(),

    // Initializes numPlatforms and platforms.  Should only be called
    // in a context where OpenCL.init() has already been called.
    init: function init() {

        let err_code = CLTypes.cl_int();

        // |nplatforms| is used to get number of platforms
        // |naplatforms| is used for the number of actual platforms returned into |platforms|
        // |numSupportedPlatforms| is the number of supported platforms found
        let nplatforms = CLTypes.cl_uint();
        let naplatforms = CLTypes.cl_uint();
        let numSupportedPlatforms = CLTypes.cl_uint(0);

        err_code.value = OpenCL.clGetPlatformIDs(0, null, nplatforms.address());
        Debug.check(err_code, "clGetPlatformIDs (in Platforms.init, call 1)");
        Debug.log(err_code.value);

        // All found platforms
        const PlatformsArray = new ctypes.ArrayType(CLTypes.cl_platform_id, nplatforms.value);
        let allPlatforms = new PlatformsArray();

        err_code.value = OpenCL.clGetPlatformIDs(nplatforms.value,
                                                 allPlatforms,
                                                 naplatforms.address());
        Debug.check(err_code, "clGetPlatformIDs (in Platforms.init, call 2)");
        Debug.log(err_code.value);

        for (let i = 0; i < naplatforms.value; i++) {

            let platform = new Platform(allPlatforms[i]);

            if (this.isSupported(platform.name)) {

                this.platforms[numSupportedPlatforms.value] = allPlatforms[i];
                numSupportedPlatforms.value++;

                this.jsPlatforms.push(platform);
            }
        }
        this.numPlatforms = numSupportedPlatforms;

    },

    isSupported: function(platformName) {
        return (platformName == "Intel(R) OpenCL" || platformName == "Apple");
    }

};

function Platform(platform_id) {
    this.platform_id = this.GetPlatformID(platform_id);
    this.version = this.GetVersion();
    this.name = this.GetName();
    this.vendor = this.GetVendor();
    this.profile = this.GetProfile();
    this.extensions = this.GetExtensions();
    this.deviceNames = this.GetDeviceNames();
}

// paramName: one of the cl_platform_info variants
Platform.prototype.GetPlatformPropertyHelper = function GetPlatformPropertyHelper(paramName) {

    let err_code = CLTypes.cl_int();
    let length = new ctypes.size_t();

    // This first call to `clGetPlatformInfo` is just to find out
    // what the appropriate length is.
    err_code.value = OpenCL.clGetPlatformInfo(this.platform_id,
                                              paramName,
                                              0,
                                              null,
                                              length.address());
    Debug.check(err_code, "clGetPlatformInfo (in GetPlatformPropertyHelper, call 1)");
    Debug.log(err_code.value);

    // Now that we have a length, we can allocate space for the
    // actual results of the call, and call it for real.

    const PropertyArray = new ctypes.ArrayType(ctypes.char, length.value);
    let propertyBuf = new PropertyArray();
    const SizeTArray = new ctypes.ArrayType(ctypes.size_t, 1);
    let paramValueSizeRet = new SizeTArray();

    err_code.value = OpenCL.clGetPlatformInfo(this.platform_id,
                                              paramName,
                                              length.value*ctypes.char.size, // size of propertyBuf
                                              propertyBuf,
                                              paramValueSizeRet);
    Debug.check(err_code, "clGetPlatformInfo (in GetPlatformPropertyHelper, call 2)");
    Debug.log(err_code.value);

    // Return the property as a JS string.
    let jsProperty = propertyBuf.readString();
    return jsProperty;

};

Platform.prototype.GetDeviceNames = function GetDeviceNames() {

    let err_code = CLTypes.cl_int();
    let ndevices = CLTypes.cl_uint();

    // First, find out how many devices there are on this platform.
    err_code.value = OpenCL.clGetDeviceIDs(this.platform_id,
                                           Constants.CL_DEVICE_TYPE_ALL,
                                           0,
                                           null,
                                           ndevices.address());
    Debug.check(err_code, "clGetDeviceIDs (in GetDeviceNames, call 1");
    Debug.log(err_code.value);

    // Next, get all the device IDs.
    const DeviceIDArray = new ctypes.ArrayType(CLTypes.cl_device_id, ndevices.value);
    let deviceIDs = new DeviceIDArray();

    err_code.value = OpenCL.clGetDeviceIDs(this.platform_id,
                                           Constants.CL_DEVICE_TYPE_ALL,
                                           ndevices,
                                           deviceIDs,
                                           null);
    Debug.check(err_code, "clGetDeviceIDs (in GetDeviceNames, call 2");
    Debug.log(err_code.value);

    // Get device names.
    let jsDeviceNames = new Array();

    // N.B.: This is enough space for *one* device name.
    const DeviceNameArray = new ctypes.ArrayType(ctypes.char, Constants.RIVERTRAIL_MAX_DEVICE_NAME_LENGTH);

    for (let i = 0; i < ndevices.value; i++) {
        let deviceNameBuf = new DeviceNameArray();
        let deviceNameSize = new ctypes.size_t();
        err_code.value = OpenCL.clGetDeviceInfo(deviceIDs[i],
                                                Constants.CL_DEVICE_NAME,
                                                Constants.RIVERTRAIL_MAX_DEVICE_NAME_LENGTH,
                                                deviceNameBuf,
                                                deviceNameSize.address());
        Debug.check(err_code, "clGetDeviceInfo (in GetDeviceNames)");
        Debug.log(err_code.value);

        let jsDeviceName = deviceNameBuf.readString();

        // Check if the device is supported.  Currently we only
        // support Intel devices.
        if (jsDeviceName.indexOf("Intel(R)") > -1) {
            jsDeviceNames[i] = jsDeviceName;
        } else {
            jsDeviceNames[i] = "Unknown Device";
        }
    }

    // Return all the device names as a JS array of strings.
    return jsDeviceNames;
};

Platform.prototype.GetVersion = function() {
    return this.GetPlatformPropertyHelper(Constants.CL_PLATFORM_VERSION);
};

Platform.prototype.GetName = function() {
    return this.GetPlatformPropertyHelper(Constants.CL_PLATFORM_NAME);
};

Platform.prototype.GetVendor = function() {
    return this.GetPlatformPropertyHelper(Constants.CL_PLATFORM_VENDOR);
};

Platform.prototype.GetProfile = function() {
    return this.GetPlatformPropertyHelper(Constants.CL_PLATFORM_PROFILE);
};

Platform.prototype.GetExtensions = function() {
    return this.GetPlatformPropertyHelper(Constants.CL_PLATFORM_EXTENSIONS);
};

// Tries to look up the platform ID from the default prefs, unless
// one was passed as an argument.
Platform.prototype.GetPlatformID = function(platform_id) {

    let retval;

    // If we were passed a platform_id, use that.
    if (platform_id !== undefined) {
        retval = platform_id;
    }
    // Otherwise, look up the default pref setting and use it.
    else {
        let prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.river-trail-extension.");
        retval = prefs.getIntPref("defaultPlatform");
    }

    if (retval < 0 || retval >= Platforms.numPlatforms.value) {
        throw "GetPlatformID: Illegal platform_id";
    } else {
        return retval;
    }
};

exports.Platforms = Platforms;
