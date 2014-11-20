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

// OpenCL "abstract data types" (see
// https://www.khronos.org/registry/cl/sdk/1.2/docs/man/xhtml/abstractDataTypes.html).
// We have no choice but to represent these as ctypes.voidptr_t, since
// we don't know know how OpenCL represents them internally.

const cl_platform_id = ctypes.voidptr_t; // The ID for a platform.
const cl_device_id = ctypes.voidptr_t; // The ID for a device.
const cl_context = ctypes.voidptr_t; // A context.
const cl_command_queue = ctypes.voidptr_t; // A command queue.
const cl_mem = ctypes.voidptr_t; // A memory object.
const cl_program = ctypes.voidptr_t; // A program.
const cl_kernel = ctypes.voidptr_t; // A kernel.
const cl_event = ctypes.voidptr_t; // An event.

// Types that have existing ctypes counterparts:

// As defined in cl_platform.h.
const cl_int = ctypes.int32_t;
const cl_uint = ctypes.uint32_t;
const cl_ulong = ctypes.uint64_t;

// As defined in cl.h.
const cl_bool = cl_uint;
const cl_bitfield = cl_ulong;
const cl_device_type = cl_bitfield;
const cl_platform_info = cl_uint;
const cl_device_info = cl_uint;
const cl_command_queue_properties = cl_bitfield;

const cl_context_properties = ctypes.int.ptr; // N.B.: in cl.h, cl_context_properties is typedef'd to intptr_t, even though it's an enum type.
const cl_context_info = cl_uint;
const cl_mem_flags = cl_bitfield;
const cl_map_flags = cl_bitfield;
const cl_program_info = cl_bitfield;
const cl_program_build_info = cl_uint;

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
const MAX_DEVICE_NAME_LENGTH = 64;

// Checks for non-CL_SUCCESS error codes.
// errorCode should be a cl_int.
function check(errorCode) {
    if (errorCode.value != CL_SUCCESS) {
        errorString = arguments.callee.caller.name +
            " called a function that returned with error code " +
            errorCode.value;
        console.log(errorString);

        // LK: Commented for now to make debugging easier.
        // throw errorString;
    }
}

// A wrapper for CData values that are being returned to user-side
// code, so that we can distinguish among them by name on the user
// side.
function GenericWrapper(_ctypesObj, _name, _id) {
    this.ctypesObj = _ctypesObj;
    this.name = _name;
    this.id = _id;
    this.__exposedProps__ = {ctypesObj: "rw", name: "rw", id: "rw"};
}

// This wrapper makes it possible to return TypedArrays from
// extension-side code to user-side code.
function TypedArrayWrapper(_typedArray) {
    console.log("Wrapping...");
    this.typedArray = _typedArray;
    this.typedArray.__exposedProps__ = {
        name: "rw",
        prototype: "rw",
    };
    this.typedArray.prototype.__exposedProps__ = {
        buffer: "rw",
        byteLength: "rw",
        byteOffset: "rw",
        length: "rw",
    };
    this.__exposedProps__ = { typedArray: "rw" };
}

let RiverTrailFFI = (function() {

    // A place to put all the error codes we encounter.
    let err_code = new cl_int();

    // A few handy constants.
    const BUILDLOG_SIZE  = 4096;
    const DPO_NUMBER_OF_ARTIFICIAL_ARGS = 1;

    // A few bits of state that the below functions manipulate.
    let context;
    let commandQueue;
    let deviceList = null;
    let defaultDevicePref;
    let failureMem = ctypes.int.array(1)([0]);
    let failureMemCLBuffer;
    let compiledKernels = [];
    let mappedBuffers = [];
    let buildLog = "";

    let riverTrailExtensionIsInstalled = function() {
        // This does nothing; its existence is just a marker that the
        // extension is installed.
        return true;
    };

    let is64BitFloatingPointEnabled = function() {

        OpenCL.init();

        let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        let prefBranch = prefService.getBranch("extensions.river-trail-extension.");
        let defaultPlatformPref = prefBranch.getIntPref("defaultPlatform");
        if (defaultPlatformPref < 0 || defaultPlatformPref === undefined) {
            defaultPlatformPref = 0;
        }

        Platforms.init();
        let allPlatforms = Platforms.jsPlatforms;

        // A string of all supported extensions on the current default
        // platform.
        let defaultPlatform = allPlatforms[defaultPlatformPref];
        let defaultPlatformExtensions = defaultPlatform.extensions;

        // Check if 64-bit floating point extension is turned on.
        let retval = defaultPlatformExtensions.indexOf("cl_khr_fp64") !== -1;
        return retval;
    };

    let initContext = function() {

        OpenCL.init();
        let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        let prefBranch = prefService.getBranch("extensions.river-trail-extension.");
        let defaultPlatformPref = prefBranch.getIntPref("defaultPlatform");
        if (defaultPlatformPref < 0 || defaultPlatformPref === undefined) {
            defaultPlatformPref = 0;
        }
        compiledKernels.length = 0;
        mappedBuffers.length = 0;
        Platforms.init();
        let allPlatforms = Platforms.jsPlatforms;
        let defaultPlatform = allPlatforms[defaultPlatformPref];
        let defaultPlatformID = defaultPlatform.platform_id;

        // Get number of devices.
        let numDevices = new cl_uint();

        // weird gotcha with js-ctypes: the return value will be
        // magically coerced to "number", so we have to assign it to
        // err_code.value, not just err_code.
        err_code.value = OpenCL.clGetDeviceIDs(defaultPlatformID,
                                               CL_DEVICE_TYPE_ALL,
                                               0,
                                               null,
                                               numDevices.address());
        check(err_code);
        console.log(err_code.value);

        // Then, get a list of device IDs of to pass to
        // `clCreateContext`.

        // numDevices.value is the length of the array
        const DeviceArray = new ctypes.ArrayType(cl_device_id,
                                                 numDevices.value);
        deviceList = new DeviceArray();
        err_code.value = OpenCL.clGetDeviceIDs(defaultPlatformID, // platform
                                               CL_DEVICE_TYPE_ALL, // device_type
                                               1, // num_entries
                                               deviceList, // *devices
                                               null); // *num_devices
        check(err_code);
        console.log(err_code.value);

        // Create a three-element array of context properties to pass
        // to clCreateContext.

        // According to the spec, the context properties argument
        // should be "a list of context property names and their
        // corresponding values. Each property name is immediately
        // followed by the corresponding desired value. The list is
        // terminated with 0."

        let contextPropertiesList = cl_context_properties.array(3)();

        // We have to do these casts because contextPropertiesList
        // actually contains pointers.
        ctypes.cast(contextPropertiesList[0], ctypes.int).value = CL_CONTEXT_PLATFORM;
        contextPropertiesList[1] = ctypes.cast(defaultPlatformID, ctypes.int.ptr);
        ctypes.cast(contextPropertiesList[2], ctypes.int).value = 0;

        let contextProps = ctypes.cast(contextPropertiesList.address(), cl_context_properties.ptr);

        // Get the default device ID to pass to clCreateContext.
        defaultDevicePref = prefBranch.getIntPref("defaultDeviceType");
        if (defaultDevicePref < 0 || defaultDevicePref === undefined) {
            defaultDevicePref = 0;
        }

        // TODO (LK): in the original code we passed a callback
        // function that would log errors.  I'm not going to deal with
        // that yet...
        context = OpenCL.clCreateContext(contextProps,
                                         1,
                                         // LK: just deviceList
                                         // here might work too
                                         (deviceList[defaultDevicePref]).address(),
                                         null,
                                         null,
                                         err_code.address());
        check(err_code);
        console.log(err_code.value);

        failureMemCLBuffer = OpenCL.clCreateBuffer(context,
                                                   CL_MEM_READ_WRITE,
                                                   4,
                                                   null,
                                                   err_code.address());
        check(err_code);
        console.log(err_code.value);

        // TODO (LK): Put these properties behind a flag.
        // let commandQueueProperties =
        //     CL_QUEUE_PROFILING_ENABLE | CL_QUEUE_OUT_OF_ORDER_EXEC_MODE_ENABLE | 0;
        let commandQueueProperties = 0;
        commandQueue = OpenCL.clCreateCommandQueue(context,
                                                   deviceList[defaultDevicePref],
                                                   commandQueueProperties,
                                                   err_code.address());
        check(err_code);
        console.log(err_code.value);
    };

    let canBeMapped = function(obj) {
        // In the original code, this checked to see if obj was a
        // nested dense array of floats.  However, it doesn't seem
        // like we support mapping arrays at all now, so this just
        // returns false.
        return false;

    };

    // Returns a GenericWrapper around a CData kernel.
    let compileKernel = function(sourceString, kernelName) {
        OpenCL.init();

        // `sourceString` is a JS string; we change it to a C string.
        let sourceCString = ctypes.char.array()(sourceString);

        // an array (of length 1) of char arrays
        let SourceArray = new ctypes.ArrayType(ctypes.char.array(sourceCString.length), 1);
        let source = new SourceArray();
        source[0] = sourceCString;

        // other options: pass sourceCString.address() or pass source.
        // the latter doesn't seem to work...
        let sourceptrptr = ctypes.cast(source.address().address(), ctypes.char.ptr.ptr);

        // Something like this for `lengths`?
        // let sizes = ctypes.size_t.array(1) ([sourceCString.length - 1]);
        // ctypes.cast (sizes.address(), ctypes.size_t.ptr)

        let program = OpenCL.clCreateProgramWithSource(context,
                                                       1,
                                                       sourceptrptr,
                                                       null,
                                                       // lengths,
                                                       err_code.address());
        check(err_code);
        console.log(err_code.value);

        // Apparently, the options argument to `clBuildProgram` is
        // always an empty string.
        let options = "";
        let optionsCString = ctypes.char.array()(options);

        err_code.value = OpenCL.clBuildProgram(program, 0, null, options, null, null);
        check(err_code);
        console.log(err_code.value);

    
        // LK: `deviceIDs[0]` is copied from the original code -- I'm
        // not sure how we know we want that one.

        // LK: BUILDLOG_SIZE might not be big enough, but we'll worry
        // about that later.
        const BuildLogArray = new ctypes.ArrayType(ctypes.char, BUILDLOG_SIZE);
        let buildLogCString = new BuildLogArray();
        err_code.value = OpenCL.clGetProgramBuildInfo(program,
                                                      deviceList[defaultDevicePref],
                                                      CL_PROGRAM_BUILD_LOG,
                                                      BUILDLOG_SIZE,
                                                      buildLogCString,
                                                      null);
        check(err_code);
        console.log(err_code.value);
        buildLog = buildLogCString.readString();

        // Finally, create the kernel.
        let kernelNameCString = ctypes.char.array()(kernelName);
        kernel = OpenCL.clCreateKernel(program,
                                       kernelNameCString,
                                       err_code.address());
        check(err_code);
        console.log(err_code.value);

        err_code.value = OpenCL.clReleaseProgram(program);
        check(err_code);
        console.log(err_code.value);

        err_code.value = OpenCL.clSetKernelArg(kernel, 0, cl_mem.ptr.size, failureMemCLBuffer.address());
        check(err_code);
        console.log(err_code.value);
        compiledKernels.push(kernel);

        let wrappedKernel = new GenericWrapper(kernel, "OpenCLKernel", compiledKernels.length-1);
        return wrappedKernel;
    };

    let getBuildLog = function() {

        return buildLog;

    };

    // We have an OpenCL buffer with id |bufferObjId| that was originally
    // made out of a TypedArray object |view|
    let getValue = function(bufferObjId, view, callback) {

        OpenCL.init();

        let numEvents = new cl_uint(0);
        
        // This call side-effects the contents of view.buffer, writing
        // into it from bufferObjId.
        err_code.value = OpenCL.clEnqueueReadBuffer(commandQueue,
                                    mappedBuffers[bufferObjId],
                                    CL_TRUE,
                                    ctypes.size_t(0),
                                    ctypes.size_t(view.byteLength),
                                    ctypes.voidptr_t(view.buffer),
                                    numEvents,
                                    null,
                                    null);
        check(err_code);
        console.log(err_code.value);


        // Run the callback, which will take the TypedArray and assign it.
        callback(view);

    };

    let mapData = function(source) {

        OpenCL.init();

        let clbuffer = OpenCL.clCreateBuffer(context,
                                             CL_MEM_USE_HOST_PTR,
                                             source.byteLength,
                                             ctypes.voidptr_t(source.buffer),
                                             err_code.address());
        check(err_code);
        console.log(err_code.value);
        mappedBuffers.push(clbuffer);
        return new GenericWrapper(null, "CData", mappedBuffers.length-1);
    };

    let setArgument = function(kernel, index, arg) {

        let argSize = ctypes.size_t.size;
        err_code.value = OpenCL.clSetKernelArg(compiledKernels[kernel],
                                               index+DPO_NUMBER_OF_ARTIFICIAL_ARGS,
                                               argSize,
                                               ctypes.cast(mappedBuffers[arg].address(),
                                                           cl_mem.ptr));
        check(err_code);
        console.log(err_code.value);
    };

    let setScalarArgument = function(kernel, index, arg, isInteger, is64BitPrecision) {

        let argSize = ctypes.size_t(4);
        let argV;
        if (isInteger) {
            argV = ctypes.int(arg);
        }
        else if (!is64BitPrecision) {
            argV = ctypes.float(arg);
        }
        else {
            argV = ctypes.double(arg);
            argSize.value = 8;
        }
        err_code.value = OpenCL.clSetKernelArg(compiledKernels[kernel],
                                               index+DPO_NUMBER_OF_ARTIFICIAL_ARGS,
                                               argSize,
                                               argV.address());
        check(err_code);
        console.log(err_code.value);
    };

    // FIXME (LK): We aren't using the `tile` argument.  Is it always null?
    let run = function(kernel, rank, iterSpace, tile) {

        let offset = ctypes.size_t(0);
        let size = ctypes.size_t(4);
        let zero = new cl_int(0);
        let writeEvent = new cl_event(); // This likely won't work if cl_event is a stack allocated C struct for eg. -- jsreeram

        err_code.value = OpenCL.clEnqueueWriteBuffer(commandQueue,
                                                     failureMemCLBuffer,
                                                     CL_FALSE,
                                                     offset,
                                                     size,
                                                     zero.address(),
                                                     0,
                                                     null,
                                                     writeEvent.address());
        check(err_code);
        console.log(err_code.value);

        let rankInteger = new cl_uint(rank|0);
        let runEvent = new cl_event();
        let globalWorkSize = ctypes.size_t.array(iterSpace.length)(iterSpace);
        for(let i = 0; i < iterSpace.length; i++) {
            globalWorkSize[i].value = iterSpace[i]|0;
        }

        err_code.value = OpenCL.clEnqueueNDRangeKernel(commandQueue,
                                                       compiledKernels[kernel],
                                                       rankInteger,
                                                       null,
                                                       globalWorkSize,
                                                       null,
                                                       1,
                                                       writeEvent.address(),
                                                       runEvent.address());
        check(err_code);
        console.log(err_code.value);

        let numEvents = new cl_uint(1);

        err_code.value = OpenCL.clWaitForEvents(numEvents,
                                                runEvent.address());
        check(err_code);
        console.log(err_code.value);
        return err_code.value;
    };

    return {
        riverTrailExtensionIsInstalled: riverTrailExtensionIsInstalled,
        is64BitFloatingPointEnabled: is64BitFloatingPointEnabled,
        initContext: initContext,
        canBeMapped: canBeMapped,
        compileKernel: compileKernel,
        mapData: mapData,
        setArgument: setArgument,
        setScalarArgument: setScalarArgument,
        run: run,
        getValue: getValue,
        getBuildLog: getBuildLog,
    };
})();

let OpenCL = {
    lib: null, // This will point to the OpenCL library object shortly.

    init: function() {

        let os = Services.appinfo.OS;
        let platformABI = ctypes.default_abi;
        // Depending what OS we're using, we need to open a different OpenCL library.
        if (os == "Darwin") {
            this.lib = ctypes.open("/System/Library/Frameworks/OpenCL.framework/OpenCL");
        } else if (os == "Linux") {
            // Try letting the system look for the library in standard locations.
            this.lib = ctypes.open("libOpenCL.so");

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

        // Set up stubs for functions that we want to talk to from JS.
        // These are documented at
        // https://www.khronos.org/registry/cl/sdk/2.0/docs/man/xhtml/.

        this.clGetPlatformIDs = this.lib.declare("clGetPlatformIDs",
                                                 platformABI,
                                                 cl_int, // return type: error code
                                                 cl_uint, // in: num_entries
                                                 cl_platform_id.ptr, // in: *platforms
                                                 cl_uint.ptr); // out: *num_platforms

        this.clGetPlatformInfo = this.lib.declare("clGetPlatformInfo",
                                                  platformABI,
                                                  cl_int, // return type: error code
                                                  cl_platform_id, // platform
                                                  cl_platform_info, // param_name
                                                  ctypes.size_t, // param_value_size
                                                  ctypes.voidptr_t, // *param_value
                                                  ctypes.size_t.ptr); // *param_value_size_ret

        this.clGetDeviceIDs = this.lib.declare("clGetDeviceIDs",
                                               platformABI,
                                               cl_int, // return type: error code
                                               cl_platform_id, // platform
                                               cl_device_type, // device_type
                                               cl_uint, // num_entries
                                               cl_device_id, // *devices
                                               cl_uint.ptr); // *num_devices

        this.clGetDeviceInfo = this.lib.declare("clGetDeviceInfo",
                                               platformABI,
                                               cl_int, // return type
                                               cl_device_id, // device
                                               cl_device_info, // param_name
                                               ctypes.size_t, // param_value_size
                                               ctypes.voidptr_t, // *param_value
                                               ctypes.size_t.ptr); // *param_value_size_ret

        this.clCreateContext = this.lib.declare("clCreateContext",
                                                platformABI,
                                                cl_context, // return type
                                                cl_context_properties.ptr, // *properties
                                                cl_uint, // num_devices
                                                cl_device_id, // *devices
                                                ctypes.voidptr_t, // *pfn_notify
                                                ctypes.voidptr_t, // *user_data
                                                cl_int.ptr); // *errcode_ret

        this.clCreateProgramWithSource = this.lib.declare(
            "clCreateProgramWithSource",
            platformABI,
            cl_program, // return type: "a valid non-zero program object" or NULL
            cl_context, // context
            cl_uint, // count (length of the strings array)
            ctypes.char.ptr.ptr, // **strings (array of pointers to strings that make up the code)
            ctypes.size_t.ptr, // *lengths (array with length of each string)
            cl_int.ptr); // *errcode_ret

        this.clBuildProgram = this.lib.declare(
            "clBuildProgram",
            platformABI,
            cl_int, // return type: error code
            cl_program, // program: the program object
            cl_uint, // num_devices: the number of devices listed in device_list
            cl_device_id, // *device_list
            ctypes.char.ptr, // *options
            ctypes.voidptr_t, // *pfn_notify
            ctypes.voidptr_t); // *user_data

        this.clGetProgramInfo = this.lib.declare(
            "clGetProgramInfo",
            platformABI,
            cl_int, // return type: error code
            cl_program, // program
            cl_program_info, // param_name
            ctypes.size_t, // param_value_size
            ctypes.voidptr_t, // *param_value
            ctypes.size_t.ptr); // *param_value_size_ret

        this.clGetProgramBuildInfo = this.lib.declare(
            "clGetProgramBuildInfo",
            platformABI,
            cl_int, // return type: error code
            cl_program, // program
            cl_device_id, // device
            cl_program_build_info, // param_name
            ctypes.size_t, // param_value_size
            ctypes.voidptr_t, // *param_value
            ctypes.size_t.ptr); // *param_value_size_ret

        this.clEnqueueNDRangeKernel = this.lib.declare(
            "clEnqueueNDRangeKernel",
            platformABI,
            cl_int, // return type: error code
            cl_command_queue, // command_queue
            cl_kernel, // kernel
            cl_uint, // work_dim
            ctypes.size_t.ptr, // *global_work_offset
            ctypes.size_t.ptr, // *global_work_size
            ctypes.size_t.ptr, // *local_work_size
            cl_uint, // num_events_in_wait_list
            cl_event.ptr, // *event_wait_list
            cl_event.ptr); // *event

        this.clEnqueueWriteBuffer = this.lib.declare(
            "clEnqueueWriteBuffer",
            platformABI,
            cl_int, // return type: error code
            cl_command_queue, // command_queue
            cl_mem, // buffer
            cl_bool, // blocking_write
            ctypes.size_t, // offset
            ctypes.size_t, // size
            ctypes.voidptr_t, // *ptr
            cl_uint, // num_events_in_wait_list
            cl_event.ptr, // *event_wait_list
            cl_event.ptr); // *event

        this.clEnqueueMapBuffer = this.lib.declare(
            "clEnqueueMapBuffer",
            platformABI,
            ctypes.voidptr_t, // return type: pointer to mapped region
            cl_command_queue, // command queue
            cl_mem, // buffer object
            cl_bool, // blocking_map
            cl_map_flags, // map_flags
            ctypes.size_t, // offset
            ctypes.size_t, // cb (bytelength)
            cl_uint, // num_events_in_wait_list
            cl_event.ptr, // *event_wait_list
            cl_event.ptr, // *event
            cl_int.ptr); // err_code

        this.clEnqueueReadBuffer = this.lib.declare(
            "clEnqueueReadBuffer",
            platformABI,
            cl_int, // return type: cl_int (error code)
            cl_command_queue, // command queue
            cl_mem, // buffer object
            ctypes.bool, // blocking_map
            //ctypes.unsigned_long, // map_flags
            ctypes.size_t, // offset
            ctypes.size_t, // cb (bytelength)
            ctypes.voidptr_t, // host ptr
            cl_uint, // num_events_in_wait_list
            ctypes.voidptr_t, // cl_event * event_wait_list
            ctypes.voidptr_t); // cl_event *event


        this.clWaitForEvents = this.lib.declare(
            "clWaitForEvents",
            platformABI,
            cl_int, // return type: error code
            cl_uint, // num_events
            cl_event.ptr); // *event_list

        this.clSetKernelArg = this.lib.declare(
            "clSetKernelArg",
            platformABI,
            cl_int, // return type: error code
            cl_kernel, // kernel
            cl_uint, // arg_index
            ctypes.size_t, // arg_size
            ctypes.voidptr_t); // *arg_value

        this.clCreateKernel = this.lib.declare(
            "clCreateKernel",
            platformABI,
            cl_kernel, // return type: kernel object or NULL
            cl_program, // program
            ctypes.char.ptr, // *kernel_name
            cl_int.ptr); // *errcode_ret

        this.clReleaseProgram = this.lib.declare(
            "clReleaseProgram",
            platformABI,
            cl_int, // return type: error code
            cl_program); // program

        this.clReleaseKernel = this.lib.declare(
            "clReleaseKernel",
            platformABI,
            cl_int, // return type: error code
            cl_kernel); // kernel

        this.clCreateBuffer = this.lib.declare(
            "clCreateBuffer",
            platformABI,
            cl_mem, // return type: buffer object or NULL
            cl_context, // context
            cl_mem_flags, // flags
            ctypes.size_t, // size
            ctypes.voidptr_t, // *host_ptr
            cl_int.ptr); // *errcode_ret

        this.clCreateCommandQueue = this.lib.declare(
            "clCreateCommandQueue",
            platformABI,
            cl_command_queue, // return type: command queue or NULL
            cl_context, // context
            cl_device_id, // device
            cl_command_queue_properties, // properties
            cl_int.ptr); // *errcode_ret
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

    // Initializes numPlatforms and platforms.  Should only be called
    // in a context where OpenCL.init() has already been called.
    init: function init() {

        let err_code = new cl_int();

        // |nplatforms| is used to get number of platforms
        // |naplatforms| is used for the number of actual platforms returned into |platforms|
        // |numSupportedPlatforms| is the number of supported platforms found
        let nplatforms = new cl_uint();
        let naplatforms = new cl_uint();
        let numSupportedPlatforms = new cl_uint(0);

        err_code.value = OpenCL.clGetPlatformIDs(0, null, nplatforms.address());
        check(err_code);
        console.log(err_code.value);

        // All found platforms
        const PlatformsArray = new ctypes.ArrayType(cl_platform_id, nplatforms.value);
        let allPlatforms = new PlatformsArray();

        err_code.value = OpenCL.clGetPlatformIDs(nplatforms.value,
                                                 allPlatforms,
                                                 naplatforms.address());
        check(err_code);
        console.log(err_code.value);

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

    OpenCL.init();

    let err_code = new cl_int();
    let length = new ctypes.size_t();

    // This first call to `clGetPlatformInfo` is just to find out
    // what the appropriate length is.
    err_code.value = OpenCL.clGetPlatformInfo(this.platform_id,
                                              paramName,
                                              0,
                                              null,
                                              length.address());
    check(err_code);
    console.log(err_code.value);

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
    check(err_code);
    console.log(err_code.value);

    // Return the property as a JS string.
    let jsProperty = propertyBuf.readString();
    return jsProperty;

};

Platform.prototype.GetDeviceNames = function GetDeviceNames() {

    OpenCL.init();

    let err_code = new cl_int();
    let ndevices = new cl_uint();

    // First, find out how many devices there are on this platform.
    err_code.value = OpenCL.clGetDeviceIDs(this.platform_id,
                                           CL_DEVICE_TYPE_ALL,
                                           0,
                                           null,
                                           ndevices.address());
    check(err_code);
    console.log(err_code.value);

    // Next, get all the device IDs.
    const DeviceIDArray = new ctypes.ArrayType(cl_device_id, ndevices.value);
    let deviceIDs = new DeviceIDArray();

    err_code.value = OpenCL.clGetDeviceIDs(this.platform_id,
                                           CL_DEVICE_TYPE_ALL,
                                           ndevices,
                                           deviceIDs,
                                           null);
    check(err_code);
    console.log(err_code.value);

    // Get device names.
    let jsDeviceNames = new Array();

    // N.B.: This is enough space for *one* device name.
    const DeviceNameArray = new ctypes.ArrayType(ctypes.char, MAX_DEVICE_NAME_LENGTH);

    for (let i = 0; i < ndevices.value; i++) {
        let deviceNameBuf = new DeviceNameArray();
        let deviceNameSize = new ctypes.size_t();
        err_code.value = OpenCL.clGetDeviceInfo(deviceIDs[i],
                                                CL_DEVICE_NAME,
                                                MAX_DEVICE_NAME_LENGTH,
                                                deviceNameBuf,
                                                deviceNameSize.address());
        check(err_code);
        console.log(err_code.value);

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
