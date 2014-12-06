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
Cu.import("resource://gre/modules/ctypes.jsm");
Cu.import("resource://gre/modules/Services.jsm");

let { CLTypes } = require("CLTypes.js");

let OpenCL = {
    lib: null, // This will point to the OpenCL library object shortly.

    init: function() {

        let os = Services.appinfo.OS;
        let platformABI;

        // Depending what OS we're using, we need to open a different OpenCL library.
        if (os == "Darwin") {
            this.lib = ctypes.open("/System/Library/Frameworks/OpenCL.framework/OpenCL");
            platformABI = ctypes.default_abi;
        } else if (os == "Linux") {
            // Try letting the system look for the library in standard locations.
            this.lib = ctypes.open("libOpenCL.so");
            platformABI = ctypes.default_abi;

            // If that doesn't work, try specifying a full path.
            if (!this.lib) {
                this.lib = ctypes.open("/usr/lib64/libOpenCL.so");
            }

            // If that still doesn't work, try another.
            if (!this.lib) {
                this.lib = ctypes.open("/opt/intel/opencl-1.2-4.6.0.92/lib64/libOpenCL.so");
            }

            // Give up.
            if(!this.lib) {
                throw "Could not open OpenCL library";
            }
        } else if (os == "WINNT") {
            this.lib = ctypes.open("OpenCL.dll");
            platformABI = ctypes.winapi_abi;
        } else {
            throw "Your OS " + os + " is not supported";
        }

        // Set up stubs for OpenCL functions that we want to talk to from JS.
        this.clGetPlatformIDs = this.lib.declare(
            "clGetPlatformIDs",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_uint, // in: num_entries
            CLTypes.cl_platform_id.ptr, // in: *platforms
            CLTypes.cl_uint.ptr); // out: *num_platforms

        this.clGetPlatformInfo = this.lib.declare(
            "clGetPlatformInfo",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_platform_id, // platform
            CLTypes.cl_platform_info, // param_name
            ctypes.size_t, // param_value_size
            ctypes.voidptr_t, // *param_value
            ctypes.size_t.ptr); // *param_value_size_ret

        this.clGetDeviceIDs = this.lib.declare(
            "clGetDeviceIDs",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_platform_id, // platform
            CLTypes.cl_device_type, // device_type
            CLTypes.cl_uint, // num_entries
            CLTypes.cl_device_id, // *devices
            CLTypes.cl_uint.ptr); // *num_devices

        this.clGetDeviceInfo = this.lib.declare(
            "clGetDeviceInfo",
            platformABI,
            CLTypes.cl_int, // return type
            CLTypes.cl_device_id, // device
            CLTypes.cl_device_info, // param_name
            ctypes.size_t, // param_value_size
            ctypes.voidptr_t, // *param_value
            ctypes.size_t.ptr); // *param_value_size_ret

        this.clCreateContext = this.lib.declare(
            "clCreateContext",
            platformABI,
            CLTypes.cl_context, // return type
            CLTypes.cl_context_properties.ptr, // *properties
            CLTypes.cl_uint, // num_devices
            CLTypes.cl_device_id, // *devices
            ctypes.voidptr_t, // *pfn_notify
            ctypes.voidptr_t, // *user_data
            CLTypes.cl_int.ptr); // *errcode_ret

        this.clCreateProgramWithSource = this.lib.declare(
            "clCreateProgramWithSource",
            platformABI,
            CLTypes.cl_program, // return type: "a valid non-zero program object" or NULL
            CLTypes.cl_context, // context
            CLTypes.cl_uint, // count (length of the strings array)
            ctypes.char.ptr.ptr, // **strings (array of pointers to strings that make up the code)
            ctypes.size_t.ptr, // *lengths (array with length of each string)
            CLTypes.cl_int.ptr); // *errcode_ret

        this.clBuildProgram = this.lib.declare(
            "clBuildProgram",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_program, // program: the program object
            CLTypes.cl_uint, // num_devices: the number of devices listed in device_list
            CLTypes.cl_device_id, // *device_list
            ctypes.char.ptr, // *options
            ctypes.voidptr_t, // *pfn_notify
            ctypes.voidptr_t); // *user_data

        this.clGetProgramInfo = this.lib.declare(
            "clGetProgramInfo",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_program, // program
            CLTypes.cl_program_info, // param_name
            ctypes.size_t, // param_value_size
            ctypes.voidptr_t, // *param_value
            ctypes.size_t.ptr); // *param_value_size_ret

        this.clGetProgramBuildInfo = this.lib.declare(
            "clGetProgramBuildInfo",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_program, // program
            CLTypes.cl_device_id, // device
            CLTypes.cl_program_build_info, // param_name
            ctypes.size_t, // param_value_size
            ctypes.voidptr_t, // *param_value
            ctypes.size_t.ptr); // *param_value_size_ret

        this.clEnqueueNDRangeKernel = this.lib.declare(
            "clEnqueueNDRangeKernel",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_command_queue, // command_queue
            CLTypes.cl_kernel, // kernel
            CLTypes.cl_uint, // work_dim
            ctypes.size_t.ptr, // *global_work_offset
            ctypes.size_t.ptr, // *global_work_size
            ctypes.size_t.ptr, // *local_work_size
            CLTypes.cl_uint, // num_events_in_wait_list
            CLTypes.cl_event.ptr, // *event_wait_list
            CLTypes.cl_event.ptr); // *event

        this.clEnqueueWriteBuffer = this.lib.declare(
            "clEnqueueWriteBuffer",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_command_queue, // command_queue
            CLTypes.cl_mem, // buffer
            CLTypes.cl_bool, // blocking_write
            ctypes.size_t, // offset
            ctypes.size_t, // size
            ctypes.voidptr_t, // *ptr
            CLTypes.cl_uint, // num_events_in_wait_list
            CLTypes.cl_event.ptr, // *event_wait_list
            CLTypes.cl_event.ptr); // *event

        this.clEnqueueMapBuffer = this.lib.declare(
            "clEnqueueMapBuffer",
            platformABI,
            ctypes.voidptr_t, // return type: pointer to mapped region
            CLTypes.cl_command_queue, // command queue
            CLTypes.cl_mem, // buffer object
            CLTypes.cl_bool, // blocking_map
            CLTypes.cl_map_flags, // map_flags
            ctypes.size_t, // offset
            ctypes.size_t, // size
            CLTypes.cl_uint, // num_events_in_wait_list
            CLTypes.cl_event.ptr, // *event_wait_list
            CLTypes.cl_event.ptr, // *event
            CLTypes.cl_int.ptr); // err_code

        this.clEnqueueReadBuffer = this.lib.declare(
            "clEnqueueReadBuffer",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_command_queue, // command queue
            CLTypes.cl_mem, // buffer object
            CLTypes.cl_bool, // blocking_map
            ctypes.size_t, // offset
            ctypes.size_t, // size
            ctypes.voidptr_t, // host ptr
            CLTypes.cl_uint, // num_events_in_wait_list
            CLTypes.cl_event.ptr, // *event_wait_list
            CLTypes.cl_event.ptr); // *event


        this.clWaitForEvents = this.lib.declare(
            "clWaitForEvents",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_uint, // num_events
            CLTypes.cl_event.ptr); // *event_list

        this.clSetKernelArg = this.lib.declare(
            "clSetKernelArg",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_kernel, // kernel
            CLTypes.cl_uint, // arg_index
            ctypes.size_t, // arg_size
            ctypes.voidptr_t); // *arg_value

        this.clCreateKernel = this.lib.declare(
            "clCreateKernel",
            platformABI,
            CLTypes.cl_kernel, // return type: kernel object or NULL
            CLTypes.cl_program, // program
            ctypes.char.ptr, // *kernel_name
            CLTypes.cl_int.ptr); // *errcode_ret

        this.clReleaseProgram = this.lib.declare(
            "clReleaseProgram",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_program); // program

        this.clReleaseKernel = this.lib.declare(
            "clReleaseKernel",
            platformABI,
            CLTypes.cl_int, // return type: error code
            CLTypes.cl_kernel); // kernel

        this.clCreateBuffer = this.lib.declare(
            "clCreateBuffer",
            platformABI,
            CLTypes.cl_mem, // return type: buffer object or NULL
            CLTypes.cl_context, // context
            CLTypes.cl_mem_flags, // flags
            ctypes.size_t, // size
            ctypes.voidptr_t, // *host_ptr
            CLTypes.cl_int.ptr); // *errcode_ret

        this.clCreateCommandQueue = this.lib.declare(
            "clCreateCommandQueue",
            platformABI,
            CLTypes.cl_command_queue, // return type: command queue or NULL
            CLTypes.cl_context, // context
            CLTypes.cl_device_id, // device
            CLTypes.cl_command_queue_properties, // properties
            CLTypes.cl_int.ptr); // *errcode_ret
    },

    shutdown: function() {

        this.lib.close();
    },
};

exports.OpenCL = OpenCL;
