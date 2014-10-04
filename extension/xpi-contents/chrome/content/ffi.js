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
Cu.import("resource://gre/modules/ctypes.jsm");

// For restartlessness.
Cu.import("resource://gre/modules/Services.jsm");

// For debugging.
let console = (Cu.import("resource://gre/modules/devtools/Console.jsm", {})).console;

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

// Constants from cl.h (not all of them, just the ones we need):

// cl_context_info variants (for specifying to `clGetContextInfo` what
// we're asking for info about):
const CL_CONTEXT_NUM_DEVICES = 0x1083;

// cl_device_info variants (for specifying to `clGetDeviceInfo` what
// we're asking for info about):
const CL_DEVICE_TYPE_ = 0x1000;
const CL_DEVICE_AVAILABLE = 0x1027;

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
	this.lib = ctypes.open("/System/Library/Frameworks/OpenCL.framework/OpenCL");

	// Set up stubs for functions that we want to talk to from JS.
	// These are documented at
	// https://www.khronos.org/registry/cl/sdk/2.0/docs/man/xhtml/.

	this.clGetPlatformIDs = this.lib.declare("clGetPlatformIDs",
						 ctypes.default_abi,
						 cl_int, // return type: error code
						 cl_uint, // in: num_entries
						 cl_platform_id.ptr, // out: *platforms
						 cl_uint.ptr); // out: *num_platforms

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

    // pfn_notify's signature:
    // void ( CL_CALLBACK  *pfn_notify) (const char *errinfo,
    //                                   const void *private_info,
    //                                   size_t cb,
    //                                   void *user_data)

    shutdown: function() {
	this.lib.close();
    },
};

var Main = {

    run: function() {

	OpenCL.init();

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
	    alert("Congratulations!  You've created OpenCL context " + context + ".");
	}

	OpenCL.shutdown();
    },
};

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
