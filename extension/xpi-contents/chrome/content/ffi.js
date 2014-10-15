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

// cl_platform_info variants (for specifying to `clGetPlatformInfo`
// what we're asking for info about):
const CL_PLATFORM_NAME = 0x0902;

// cl_device_type bitfield variants (returned from `CL_DEVICE_TYPE`
// queries to `clGetDeviceInfo`):
const CL_DEVICE_TYPE_DEFAULT =                     (1 << 0);
const CL_DEVICE_TYPE_CPU =                         (1 << 1);
const CL_DEVICE_TYPE_GPU =                         (1 << 2);
const CL_DEVICE_TYPE_ACCELERATOR =                 (1 << 3);
const CL_DEVICE_TYPE_CUSTOM =                      (1 << 4);
const CL_DEVICE_TYPE_ALL =                         0xFFFFFFFF; // not supported, apparently

const uint32ptr_t = ctypes.uint32_t.ptr;
const int32ptr_t = ctypes.int32_t.ptr;
const sizeptr_t = ctypes.size_t.ptr;

var OpenCL = {
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

var noOfPlatforms = new cl_uint(0);
var platforms = new cl_platform_id(null);

var PrefsPopulator = {

    // An attempt to port some of the code from dpoCInterface.cpp.

    InitPlatformInfo: function(win) {

	OpenCL.init(win);

	var err_code = new cl_int();

	// |nplatforms| is used to get number of platforms
	// |naplatforms| is used for the number of actual platforms returned into |platforms|
	// |numSupportedPlatforms| is the number of supported platforms found
	var nplatforms = new cl_uint();
	var naplatforms = new cl_uint();
	var numSupportedPlatforms = new cl_uint(0);
	const maxNameLength = new cl_uint(256);
	const NameArray = new ctypes.ArrayType(ctypes.char, maxNameLength.value);
	var name = new NameArray();

	err_code = OpenCL.clGetPlatformIDs(0, null, nplatforms.address());

	if (err_code != CL_SUCCESS) {
	    console.log("InitPlatformInfo: " + err_code);
	    throw "InitPlatformInfo: " + err_code;
	}

	// All found platforms
	const PlatformsArray = new ctypes.ArrayType(cl_platform_id, nplatforms.value);
	var allPlatforms = new PlatformsArray();

	err_code = OpenCL.clGetPlatformIDs(nplatforms.value,
					   allPlatforms,
					   naplatforms.address());

	if (err_code != CL_SUCCESS) {
	    console.log("InitPlatformInfo: " + err_code);
	    throw "InitPlatformInfo: " + err_code;
	}

// Turn this off for now, since I'm not sure how to call
// clGetPlatformInfo correctly.
/*
	for (var i = new cl_uint(0); i < naplatforms; i++) {
	    err_code = OpenCL.clGetPlatformInfo(allPlatforms[i],
						CL_PLATFORM_NAME,
			 			maxNameLength.value*ctypes.char.size,
						name,
						null);
		if (err_code != CL_SUCCESS) {
		    // Why is this GetIntelPlatform?
		    console.log("GetIntelPlatform: " + err_code);
		    throw "GetIntelPlatform: " + err_code;
		}
		if (name == "Intel(R) OpenCL" || name == "Apple") {
		    platforms[numSupportedPlatforms++] = allPlatforms[i];
		}
	}


	if (err_code != CL_SUCCESS) {
	    console.log("InitPlatformInfo: " + err_code);
	    throw "InitPlatformInfo: " + err_code;
	}
	noOfPlatforms = numSupportedPlatforms;
*/

	// TODO: will allPlatforms get GC'd automatically?
    },

    // TODO: I'm not sure we really need this.  It seems to have been
    // part of an attempt to expose a smaller amount of code via
    // DPOInterface.  But since we're not doing the "everything talks
    // to C++ via the DPOInterface object" thing, then maybe it's
    // unnecessary.
    GetNumberOfPlatforms: function(win, aNumberOfPlatforms) {

	var result = 0;

	if (platforms == null) {
	    // Also, this doesn't make sense since I'm not having
	    // InitPlatformInfo return a result; that doesn't seem
	    // JS-y.
	    result = this.InitPlatformInfo(win);
	}

	aNumberOfPlatforms.contents = noOfPlatforms;

	return result;
    },

};

var Main = {

    // Needs the `win` argument so it can launch an alert.
    run: function(win) {

	OpenCL.init(win);

	// A place to put all the error codes we encounter.
	var error_code = new cl_int();
	var error_code_ptr = error_code.address();

	// First, get a list of platform IDs, one of which we'll pass
	// to `clGetDeviceIDs`.
	const PlatformsArray = new ctypes.ArrayType(cl_platform_id, 1);
	var platform_list = new PlatformsArray();
	var num_platforms_ptr = new cl_uint.ptr;
	error_code =
	    OpenCL.clGetPlatformIDs(1, platform_list, num_platforms_ptr);

	console.log(error_code);

	// Then, get a list of device IDs to pass to
	// `clCreateContext`.
	const DeviceArray = new ctypes.ArrayType(cl_device_id, 1);
	var device_list = new DeviceArray();
	error_code =
	    OpenCL.clGetDeviceIDs(platform_list[0], // platform
				  CL_DEVICE_TYPE_CPU, // device_type
				  1, // num_entries
				  device_list, // *devices
				  null); // *num_devices

	console.log(error_code);

	// Finally, we can create a context.
	var context = OpenCL.clCreateContext(null, // *properties
					     1, // num_devices
					     device_list, // *devices
					     null, // *pfn_notify
					     null, // *user_data
					     error_code_ptr); // *errcode_ret

	console.log(error_code);
	console.log(context);

        if (error_code == 0) {
            console.log(context);
            win.alert("Congratulations!  You've created OpenCL context " + context + ".");
        }

	OpenCL.shutdown();

    },
};
