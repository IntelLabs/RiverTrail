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

// OpenCL "abstract data types" (see
// https://www.khronos.org/registry/cl/sdk/1.2/docs/man/xhtml/abstractDataTypes.html).
// We have no choice but to represent these as ctypes.voidptr_t, since
// we don't know know how OpenCL represents them internally.

let cl_platform_id = ctypes.voidptr_t; // The ID for a platform.
let cl_device_id = ctypes.voidptr_t; // The ID for a device.
let cl_context = ctypes.voidptr_t; // A context.
let cl_command_queue = ctypes.voidptr_t; // A command queue.
let cl_mem = ctypes.voidptr_t; // A memory object.
let cl_program = ctypes.voidptr_t; // A program.
let cl_kernel = ctypes.voidptr_t; // A kernel.
let cl_event = ctypes.voidptr_t; // An event.

// Types that have existing ctypes counterparts:

// As defined in cl_platform.h.
let cl_int = ctypes.int32_t;
let cl_uint = ctypes.uint32_t;
let cl_ulong = ctypes.uint64_t;

// As defined in cl.h.
let cl_bool = cl_uint;
let cl_bitfield = cl_ulong;
let cl_device_type = cl_bitfield;
let cl_platform_info = cl_uint;
let cl_device_info = cl_uint;
let cl_command_queue_properties = cl_bitfield;

let cl_context_properties = ctypes.int.ptr; // N.B.: in cl.h, cl_context_properties is typedef'd to intptr_t, even though it's an enum type.
let cl_context_info = cl_uint;
let cl_mem_flags = cl_bitfield;
let cl_map_flags = cl_bitfield;
let cl_program_info = cl_bitfield;
let cl_program_build_info = cl_uint;

exports.CLTypes = {
    cl_platform_id: cl_platform_id,
    cl_device_id: cl_device_id,
    cl_context: cl_context,
    cl_command_queue: cl_command_queue,
    cl_mem: cl_mem,
    cl_program: cl_program,
    cl_kernel: cl_kernel,
    cl_event: cl_event,

    cl_int: cl_int,
    cl_uint: cl_uint,
    cl_ulong: cl_ulong,

    cl_bool: cl_bool,
    cl_bitfield: cl_bitfield,
    cl_device_type: cl_device_type,
    cl_platform_info: cl_platform_info,
    cl_device_info: cl_device_info,
    cl_command_queue_properties: cl_command_queue_properties,

    cl_context_properties: cl_context_properties,
    cl_context_info: cl_context_info,
    cl_mem_flags: cl_mem_flags,
    cl_map_flags: cl_map_flags,
    cl_program_info: cl_program_info,
    cl_program_build_info: cl_program_build_info,
};
