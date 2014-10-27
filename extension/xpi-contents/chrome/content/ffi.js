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

// This code makes OpenCL API functions available to JavaScript
// through the js-ctypes interface.

// Import the ctypes library.
Components.utils.import("resource://gre/modules/ctypes.jsm");

// For restartlessness and other services.
Components.utils.import("resource://gre/modules/Services.jsm");

// For debugging.
Components.utils.import("resource://gre/modules/devtools/Console.jsm");

// Here are a few types for which we have no better alternative than
// voidptr_t.  We have no idea how, e.g., the cl_context type is
// actually defined.  From the OpenCL spec: "The context includes a
// set of devices, the memory accessible to those devices, the
// corresponding memory properties and one or more command-queues used
// to schedule execution of a kernel(s) or operations on memory
// objects."  But that's only so helpful, so voidptr_t will have to
// do.
const cl_context = ctypes.voidptr_t;
const cl_context_properties = ctypes.voidptr_t;
const cl_context_info = ctypes.voidptr_t;
const cl_device_id = ctypes.voidptr_t;
const cl_platform_id = ctypes.voidptr_t;

// Types that have existing ctypes counterparts:

// cl_uint and cl_int are 32-bit, according to
// https://www.khronos.org/registry/cl/sdk/2.0/docs/man/xhtml/scalarDataTypes.html.
const cl_uint = ctypes.uint32_t;
const cl_int = ctypes.int32_t;

// Enum types.  I'm not really sure what type these should be...
const cl_device_type = ctypes.uint32_t;
const cl_device_info = ctypes.uint32_t;
const cl_platform_info = ctypes.uint32_t;

// Constants from cl.h (not all of them, just the ones we need):

// Error codes:
const CL_SUCCESS = 0;

// cl_context_info variants (for specifying to `clGetContextInfo` what
// we're asking for info about):
const CL_CONTEXT_NUM_DEVICES = 0x1083;

// cl_device_info variants (for specifying to `clGetDeviceInfo` what
// we're asking for info about):
const CL_DEVICE_TYPE_ = 0x1000;
const CL_DEVICE_AVAILABLE = 0x1027;
const CL_DEVICE_NAME = 0x102B;

// cl_platform_info variants (for specifying to `clGetPlatformInfo`
// what we're asking for info about):
const CL_PLATFORM_PROFILE =    0x0900;
const CL_PLATFORM_VERSION =    0x0901;
const CL_PLATFORM_NAME =       0x0902;
const CL_PLATFORM_VENDOR =     0x0903;
const CL_PLATFORM_EXTENSIONS = 0x0904;

// cl_device_type bitfield variants (returned from `CL_DEVICE_TYPE`
// queries to `clGetDeviceInfo`):
const CL_DEVICE_TYPE_DEFAULT =                     (1 << 0);
const CL_DEVICE_TYPE_CPU =                         (1 << 1);
const CL_DEVICE_TYPE_GPU =                         (1 << 2);
const CL_DEVICE_TYPE_ACCELERATOR =                 (1 << 3);
const CL_DEVICE_TYPE_CUSTOM =                      (1 << 4);
const CL_DEVICE_TYPE_ALL =                         0xFFFFFFFF;

// Other handy constants.
const MAX_DEVICE_NAME_LENGTH = 64;

const uint32ptr_t = ctypes.uint32_t.ptr;
const int32ptr_t = ctypes.int32_t.ptr;
const sizeptr_t = ctypes.size_t.ptr;

// A handy thing to have, since we're going to be checking a lot of
// error codes after calls to js-ctypes-declared functions.
function check(errorCode) {
    if (errorCode != CL_SUCCESS) {
        errorString = arguments.callee.caller.name +
            " called a function that returned with error code " +
            errorCode;
        console.log(errorString);
        throw errorString;
    }
}

function hello() {
    console.log("Hello!");
}

let OpenCL = {
    lib: null, // This will point to the OpenCL library object shortly.

    init: function() {

        let os = Services.appinfo.OS;

        // Depending what OS we're using, we need to open a different OpenCL library.
        if (os == "Darwin") {
            this.lib = ctypes.open("/System/Library/Frameworks/OpenCL.framework/OpenCL");
        } else if (os == "Linux") {
            // TODO: There's probably something more general I can
            // point to here.  This is where libOpenCL.so ends up when
            // I install the Intel OpenCL SDK.
            this.lib = ctypes.open("/opt/intel/opencl-1.2-4.6.0.92/lib64/libOpenCL.so");
        } else if (os == "WINNT") {
            throw "TODO: handle Windows";
        } else {
            throw "I'm not sure what OS this is";
        }

        // Set up stubs for functions that we want to talk to from JS.
        // These are documented at
        // https://www.khronos.org/registry/cl/sdk/2.0/docs/man/xhtml/.

        // N.B.: ctypes.default_abi should work on both Linux and Mac,
        // but not Windows.

        this.clGetPlatformIDs = this.lib.declare("clGetPlatformIDs",
                                                 ctypes.default_abi,
                                                 cl_int, // return type: error code
                                                 cl_uint, // in: num_entries
                                                 cl_platform_id.ptr, // in: *platforms
                                                 cl_uint.ptr); // out: *num_platforms

        this.clGetPlatformInfo = this.lib.declare("clGetPlatformInfo",
                                                  ctypes.default_abi,
                                                  cl_int, // return type: error code
                                                  cl_platform_id, // platform
                                                  cl_platform_info, // param_name
                                                  ctypes.size_t, // param_value_size
                                                  ctypes.voidptr_t, // *param_value
                                                  sizeptr_t); // *param_value_size_ret

        this.clGetDeviceIDs = this.lib.declare("clGetDeviceIDs",
                                               ctypes.default_abi,
                                               cl_int, // return type: error code
                                               cl_platform_id, // platform
                                               cl_device_type, // device_type
                                               cl_uint, // num_entries
                                               cl_device_id, // *devices
                                               uint32ptr_t); // *num_devices

        this.clGetDeviceInfo = this.lib.declare("clGetDeviceInfo",
                                               ctypes.default_abi,
                                               cl_int, // return type
                                               cl_device_id, // device
                                               cl_device_info, // param_name
                                               ctypes.size_t, // param_value_size
                                               ctypes.voidptr_t, // *param_value
                                               sizeptr_t); // *param_value_size_ret


        this.clCreateContext = this.lib.declare("clCreateContext",
                                                ctypes.default_abi,
                                                cl_context, // return type
                                                cl_context_properties, // *properties
                                                cl_uint, // num_devices
                                                cl_device_id, // *devices
                                                ctypes.voidptr_t, // *pfn_notify
                                                ctypes.voidptr_t, // *user_data
                                                int32ptr_t); // *errcode_ret
    },

    shutdown: function() {
        this.lib.close();
    },
};

// Info about all OpenCL platforms.
let Platforms = {
    numPlatforms: new cl_uint(0),

    // A pointer to a ctypes array of platform IDs of supported
    // platforms.  (Should this be a ctypes.ArrayType?  Probably.)
    platforms: new cl_platform_id(null),

    // A JS array of Platform objects.
    jsPlatforms: new Array(),

    // Initializes numPlatforms and platforms.
    init: function init() {

        OpenCL.init();

        let err_code = new cl_int();

        // |nplatforms| is used to get number of platforms
        // |naplatforms| is used for the number of actual platforms returned into |platforms|
        // |numSupportedPlatforms| is the number of supported platforms found
        let nplatforms = new cl_uint();
        let naplatforms = new cl_uint();
        let numSupportedPlatforms = new cl_uint(0);

        err_code = OpenCL.clGetPlatformIDs(0, null, nplatforms.address());
        check(err_code);

        // All found platforms
        const PlatformsArray = new ctypes.ArrayType(cl_platform_id, nplatforms.value);
        let allPlatforms = new PlatformsArray();

        err_code = OpenCL.clGetPlatformIDs(nplatforms.value,
                                           allPlatforms,
                                           naplatforms.address());
        check(err_code);

        for (let i = 0; i < naplatforms.value; i++) {

            let platform = new Platform(allPlatforms[i]);

            if (this.isSupported(platform.name)) {

                this.platforms[numSupportedPlatforms.value] = allPlatforms[i];
                numSupportedPlatforms.value++;

                this.jsPlatforms.push(platform);
            }
        }
        this.numPlatforms = numSupportedPlatforms;

        OpenCL.shutdown();
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

    let err_code = new cl_int();
    let length = new ctypes.size_t();

    // This first call to `clGetPlatformInfo` is just to find out
    // what the appropriate length is.
    err_code = OpenCL.clGetPlatformInfo(this.platform_id,
                                        paramName,
                                        0,
                                        null,
                                        length.address());
    check(err_code);

    // Now that we have a length, we can allocate space for the
    // actual results of the call, and call it for real.

    const PropertyArray = new ctypes.ArrayType(ctypes.char, length.value);
    let propertyBuf = new PropertyArray();
    const SizeTArray = new ctypes.ArrayType(ctypes.size_t, 1);
    let paramValueSizeRet = new SizeTArray();

    err_code = OpenCL.clGetPlatformInfo(this.platform_id,
                                        paramName,
                                        length.value*ctypes.char.size,
                                        propertyBuf,
                                        paramValueSizeRet);
    check(err_code);

    // Return the property as a JS string.
    let jsProperty = propertyBuf.readString();
    return jsProperty;

};

Platform.prototype.GetDeviceNames = function GetDeviceNames() {

    let err_code = new cl_int();
    let ndevices = new cl_uint();

    // First, find out how many devices there are on this platform.
    err_code = OpenCL.clGetDeviceIDs(this.platform_id,
                                     CL_DEVICE_TYPE_ALL,
                                     0,
                                     null,
                                     ndevices.address());
    check(err_code);

    // Next, get all the device IDs.
    const DeviceIDArray = new ctypes.ArrayType(cl_device_id, ndevices.value);
    let deviceIDs = new DeviceIDArray();

    err_code = OpenCL.clGetDeviceIDs(this.platform_id,
                                     CL_DEVICE_TYPE_ALL,
                                     ndevices,
                                     deviceIDs,
                                     null);
    check(err_code);

    // Get device names.
    let jsDeviceNames = new Array();

    // N.B.: This is enough space for *one* device name.
    const DeviceNameArray = new ctypes.ArrayType(ctypes.char, MAX_DEVICE_NAME_LENGTH);

    for (let i = 0; i < ndevices.value; i++) {
        let deviceNameBuf = new DeviceNameArray();
        let deviceNameSize = new ctypes.size_t();
        err_code = OpenCL.clGetDeviceInfo(deviceIDs[i],
                                          CL_DEVICE_NAME,
                                          MAX_DEVICE_NAME_LENGTH,
                                          deviceNameBuf,
                                          deviceNameSize.address());
        check(err_code);

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
    return this.GetPlatformPropertyHelper(CL_PLATFORM_VERSION);
};

Platform.prototype.GetName = function() {
    return this.GetPlatformPropertyHelper(CL_PLATFORM_NAME);
};

Platform.prototype.GetVendor = function() {
    return this.GetPlatformPropertyHelper(CL_PLATFORM_VENDOR);
};

Platform.prototype.GetProfile = function() {
    return this.GetPlatformPropertyHelper(CL_PLATFORM_PROFILE);
};

Platform.prototype.GetExtensions = function() {
    return this.GetPlatformPropertyHelper(CL_PLATFORM_EXTENSIONS);
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
        let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.river-trail-extension.");
        retval = prefs.getIntPref("defaultPlatform");
    }

    if (retval < 0 || retval >= Platforms.numPlatforms.value) {
        throw "GetPlatformID: Illegal platform_id";
    } else {
        return retval;
    }
};

let Main = {

    // Needs the `win` argument so it can launch an alert.
    run: function run(win) {

        OpenCL.init();

        // A place to put all the error codes we encounter.
        let err_code = new cl_int();
        let err_code_address = err_code.address();

        // First, get a list of platform IDs, one of which we'll pass
        // to `clGetDeviceIDs`.
        let num_platforms = new cl_uint();
        const PlatformsArray = new ctypes.ArrayType(cl_platform_id, 1);
        let platform_list = new PlatformsArray();
        err_code = OpenCL.clGetPlatformIDs(1, platform_list, num_platforms.address());
        check(err_code);

        // Then, get a list of device IDs to pass to
        // `clCreateContext`.
        const DeviceArray = new ctypes.ArrayType(cl_device_id, 1);
        let device_list = new DeviceArray();
        err_code = OpenCL.clGetDeviceIDs(platform_list[0], // platform
                                         CL_DEVICE_TYPE_CPU, // device_type
                                         1, // num_entries
                                         device_list, // *devices
                                         null); // *num_devices
        check(err_code);

        // Finally, we can create a context.
        let context = OpenCL.clCreateContext(null, // *properties
                                             1, // num_devices
                                             device_list, // *devices
                                             null, // *pfn_notify
                                             null, // *user_data
                                             err_code_address); // *errcode_ret
        check(err_code);

        if (err_code == CL_SUCCESS) {
            console.log(context);
            win.alert("Congratulations!  You've created OpenCL context " + context + ".");
        }

        OpenCL.shutdown();

    },
};
