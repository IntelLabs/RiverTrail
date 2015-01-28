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

// Various constants from cl.h:

// Error codes:
const CL_SUCCESS =                                  0;
const CL_MEM_OBJECT_ALLOCATION_FAILURE =           -4;
const CL_OUT_OF_RESOURCES =                        -5;
const CL_OUT_OF_HOST_MEMORY =                      -6;

// cl_bool variants:
const CL_FALSE = 0;
const CL_TRUE  = 1;

// cl_context_info variants (for specifying to `clGetContextInfo` what
// we're asking for info about):
const CL_CONTEXT_NUM_DEVICES = 0x1083;

// cl_device_info variants (for specifying to `clGetDeviceInfo` what
// we're asking for info about):
const CL_DEVICE_AVAILABLE = 0x1027;
const CL_DEVICE_NAME = 0x102B;

// cl_platform_info variants (for specifying to `clGetPlatformInfo`
// what we're asking for info about):
const CL_PLATFORM_PROFILE =    0x0900;
const CL_PLATFORM_VERSION =    0x0901;
const CL_PLATFORM_NAME =       0x0902;
const CL_PLATFORM_VENDOR =     0x0903;
const CL_PLATFORM_EXTENSIONS = 0x0904;

// cl_program_info variants (for specifying to `clGetProgramInfo`
// what we're asking for info about):
const CL_PROGRAM_NUM_DEVICES = 0x1162;
const CL_PROGRAM_DEVICES =     0x1163;

// cl_program_build_info variants (for specifying to
// `clGetProgramBuildInfo` what we're asking for info about):
const CL_PROGRAM_BUILD_LOG =   0x1183;

// cl_context_properties variants:
const CL_CONTEXT_PLATFORM =    0x1084;

// cl_device_type bitfield bits (for specifying to `clGetDeviceIDs`
// which devices we want to query):
const CL_DEVICE_TYPE_DEFAULT =                     (1 << 0);
const CL_DEVICE_TYPE_CPU =                         (1 << 1);
const CL_DEVICE_TYPE_GPU =                         (1 << 2);
const CL_DEVICE_TYPE_ACCELERATOR =                 (1 << 3);
const CL_DEVICE_TYPE_CUSTOM =                      (1 << 4);
const CL_DEVICE_TYPE_ALL =                         0xFFFFFFFF;

// cl_mem_flags bitfield bits:
const CL_MEM_READ_WRITE =                          (1 << 0);
const CL_MEM_READ_ONLY =                           (1 << 2);
const CL_MEM_USE_HOST_PTR =                        (1 << 3);
const CL_MEM_COPY_HOST_PTR =                       (1 << 5);

// cl_command_queue_properties bitfield bits:
const CL_QUEUE_OUT_OF_ORDER_EXEC_MODE_ENABLE =     (1 << 0);
const CL_QUEUE_PROFILING_ENABLE =                  (1 << 1);

// cl_map_flags bitfield bits:
const CL_MAP_READ =                                (1 << 0);

// Other constants, not specific to OpenCL.
const RIVERTRAIL_MAX_DEVICE_NAME_LENGTH = 64;
const RIVERTRAIL_NUMBER_OF_ARTIFICIAL_ARGS = 1;

exports.Constants = {
    CL_SUCCESS: CL_SUCCESS,
    CL_MEM_OBJECT_ALLOCATION_FAILURE: CL_MEM_OBJECT_ALLOCATION_FAILURE,
    CL_OUT_OF_RESOURCES: CL_OUT_OF_RESOURCES,
    CL_OUT_OF_HOST_MEMORY: CL_OUT_OF_HOST_MEMORY,

    CL_FALSE: CL_FALSE,
    CL_TRUE: CL_TRUE,

    CL_CONTEXT_NUM_DEVICES: CL_CONTEXT_NUM_DEVICES,

    CL_DEVICE_AVAILABLE: CL_DEVICE_AVAILABLE,
    CL_DEVICE_NAME: CL_DEVICE_NAME,

    CL_PLATFORM_PROFILE: CL_PLATFORM_PROFILE,
    CL_PLATFORM_VERSION: CL_PLATFORM_VERSION,
    CL_PLATFORM_NAME: CL_PLATFORM_NAME,
    CL_PLATFORM_VENDOR: CL_PLATFORM_VENDOR,
    CL_PLATFORM_EXTENSIONS: CL_PLATFORM_EXTENSIONS,

    CL_PROGRAM_NUM_DEVICES: CL_PROGRAM_NUM_DEVICES,
    CL_PROGRAM_DEVICES: CL_PROGRAM_DEVICES,

    CL_PROGRAM_BUILD_LOG: CL_PROGRAM_BUILD_LOG,

    CL_CONTEXT_PLATFORM: CL_CONTEXT_PLATFORM,

    CL_DEVICE_TYPE_DEFAULT: CL_DEVICE_TYPE_DEFAULT,
    CL_DEVICE_TYPE_CPU: CL_DEVICE_TYPE_CPU,
    CL_DEVICE_TYPE_GPU: CL_DEVICE_TYPE_GPU,
    CL_DEVICE_TYPE_ACCELERATOR: CL_DEVICE_TYPE_ACCELERATOR,
    CL_DEVICE_TYPE_CUSTOM: CL_DEVICE_TYPE_CUSTOM,
    CL_DEVICE_TYPE_ALL: CL_DEVICE_TYPE_ALL,

    CL_MEM_READ_WRITE: CL_MEM_READ_WRITE,
    CL_MEM_READ_ONLY: CL_MEM_READ_ONLY,
    CL_MEM_USE_HOST_PTR: CL_MEM_USE_HOST_PTR,
    CL_MEM_COPY_HOST_PTR: CL_MEM_COPY_HOST_PTR,

    CL_QUEUE_OUT_OF_ORDER_EXEC_MODE_ENABLE: CL_QUEUE_OUT_OF_ORDER_EXEC_MODE_ENABLE,
    CL_QUEUE_PROFILING_ENABLE: CL_QUEUE_PROFILING_ENABLE,

    CL_MAP_READ: CL_MAP_READ,

    RIVERTRAIL_MAX_DEVICE_NAME_LENGTH: RIVERTRAIL_MAX_DEVICE_NAME_LENGTH,
    RIVERTRAIL_NUMBER_OF_ARTIFICIAL_ARGS: RIVERTRAIL_NUMBER_OF_ARTIFICIAL_ARGS,
};
