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
const cl_command_queue = ctypes.voidptr_t;
const cl_context = ctypes.voidptr_t;
const cl_device_id = ctypes.voidptr_t;
const cl_kernel = ctypes.voidptr_t;
const cl_mem = ctypes.voidptr_t;
const cl_platform_id = ctypes.voidptr_t;
const cl_program = ctypes.voidptr_t;

// Types that have existing ctypes counterparts:

// cl_uint and cl_int are 32-bit, according to
// https://www.khronos.org/registry/cl/sdk/2.0/docs/man/xhtml/scalarDataTypes.html.
const cl_uint = ctypes.uint32_t;
const cl_int = ctypes.int32_t;

// Enum types.  I'm not really sure what type these should be...
const cl_command_queue_properties = ctypes.uint32_t;
const cl_context_info = ctypes.uint32_t;
const cl_context_properties = ctypes.uint32_t;
const cl_device_type = ctypes.uint32_t;
const cl_device_info = ctypes.uint32_t;
const cl_mem_flags = ctypes.uint32_t;
const cl_platform_info = ctypes.uint32_t;
const cl_program_info = ctypes.uint32_t;
const cl_program_build_info = ctypes.uint32_t;

// Constants from cl.h (not all of them, just the ones we need):

// Error codes:
const CL_SUCCESS =                                  0;
const CL_MEM_OBJECT_ALLOCATION_FAILURE =           -4;
const CL_OUT_OF_RESOURCES =                        -5;
const CL_OUT_OF_HOST_MEMORY =                      -6;

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

// cl_program_info variants (for specifying to `clGetProgramInfo`
// what we're asking for info about):
const CL_PROGRAM_NUM_DEVICES = 0x1162;
const CL_PROGRAM_DEVICES =     0x1163;

// cl_program_build_info variants (for specifying to
// `clGetProgramBuildInfo` what we're asking for info about):
const CL_PROGRAM_BUILD_LOG =   0x1183;

// cl_context_properties variants:
const CL_CONTEXT_PLATFORM =    0x1084;

// cl_device_type bitfield variants (returned from `CL_DEVICE_TYPE`
// queries to `clGetDeviceInfo`):
const CL_DEVICE_TYPE_DEFAULT =                     (1 << 0);
const CL_DEVICE_TYPE_CPU =                         (1 << 1);
const CL_DEVICE_TYPE_GPU =                         (1 << 2);
const CL_DEVICE_TYPE_ACCELERATOR =                 (1 << 3);
const CL_DEVICE_TYPE_CUSTOM =                      (1 << 4);
const CL_DEVICE_TYPE_ALL =                         0xFFFFFFFF;

// cl_mem_flags bitfield variants:
const CL_MEM_READ_WRITE =                          (1 << 0);
const CL_MEM_READ_ONLY =                           (1 << 2);
const CL_MEM_USE_HOST_PTR =                        (1 << 3);
const CL_MEM_COPY_HOST_PTR =                       (1 << 5);

// cl_command_queue_properties bitfield variants:
const CL_QUEUE_OUT_OF_ORDER_EXEC_MODE_ENABLE =     (1 << 0);
const CL_QUEUE_PROFILING_ENABLE =                  (1 << 1);

// Other handy constants.
const MAX_DEVICE_NAME_LENGTH = 64;
const BUILDLOG_SIZE  = 4096;

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

// Stuff that ParallelArray.js needs to call.
let ParallelArrayFFI = {

    riverTrailExtensionIsInstalled: function() {
        // This does nothing; it's just here as a way to mark that the
        // extension is installed.
    },

    is64BitFloatingPointEnabled: function() {

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
        console.log("defaultPlatformExtensions: " + defaultPlatformExtensions);

        // Check if 64-bit floating point extension is turned on.
        let retval = defaultPlatformExtensions.indexOf("cl_khr_fp64") !== -1;
        return retval;
    },
};

// Stuff that Driver.js (and runOCL.js) needs to call.
let DriverFFI = {

    // initContext fills these in.
    context: null,
    cmdQueue: null,

    // compileKernel fills this in.
    buildLog: null,

    // An attempt to port dpoCContext::InitContext.
    initContext: function() {

        OpenCL.init();

        let prefService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
        let prefBranch = prefService.getBranch("extensions.river-trail-extension.");
        let defaultPlatformPref = prefBranch.getIntPref("defaultPlatform");
        if (defaultPlatformPref < 0 || defaultPlatformPref === undefined) {
            defaultPlatformPref = 0;
        }

        Platforms.init();
        let allPlatforms = Platforms.jsPlatforms;
        let defaultPlatform = allPlatforms[defaultPlatformPref];
        let defaultPlatformID = defaultPlatform.platform_id;

        // A place to put all the error codes we encounter.
        let err_code = new cl_int();
        let err_code_address = err_code.address();

        // Get number of devices.
        let numDevices = new cl_uint();
        err_code = OpenCL.clGetDeviceIDs(defaultPlatformID,
                                         CL_DEVICE_TYPE_ALL,
                                         0,
                                         null,
                                         numDevices.address());

        // Then, get a list of device IDs of to pass to
        // `clCreateContext`.

        // numDevices.value is the length of the array
        const DeviceArray = new ctypes.ArrayType(cl_device_id,
                                                 numDevices.value);
        let deviceList = new DeviceArray();
        err_code = OpenCL.clGetDeviceIDs(defaultPlatformID, // platform
                                         CL_DEVICE_TYPE_ALL, // device_type
                                         1, // num_entries
                                         deviceList, // *devices
                                         null); // *num_devices
        check(err_code);

        // Create a three-element array of context properties to pass
        // to clCreateContext.

        // N.B. in the original code we set the third element to NULL,
        // but we can't do that here (it has to be a CData), so let's
        // just not set it...
        const ContextPropertiesArray = new ctypes.ArrayType(cl_context_properties, 3);
        let contextProperties = new ContextPropertiesArray();
        contextProperties[0] = CL_CONTEXT_PLATFORM;
        contextProperties[1] = ctypes.cast(defaultPlatformID, cl_context_properties);

        // Get the default device ID to pass to clCreateContext.
        let defaultDevicePref = prefBranch.getIntPref("defaultDeviceType");
        if (defaultDevicePref < 0 || defaultDevicePref === undefined) {
            defaultDevicePref = 0;
        }

        // TODO (LK): in the original code we passed a callback
        // function that would log errors.  I'm not going to deal with
        // that yet...
        let context = OpenCL.clCreateContext(contextProperties,
                                             1,
                                             // LK: just deviceList
                                             // here might work too
                                             (deviceList[defaultDevicePref]).address(),
                                             null,
                                             null,
                                             err_code_address);
        check(err_code);

        this.context = context;

        // TODO (LK): figure out if these should be on or not
        let commandQueueProperties = CL_QUEUE_PROFILING_ENABLE | CL_QUEUE_OUT_OF_ORDER_EXEC_MODE_ENABLE | 0;
        this.cmdQueue = OpenCL.clCreateCommandQueue(context,
                                                    deviceList[defaultDevicePref],
                                                    commandQueueProperties,
                                                    err_code_address);
    },

    canBeMapped: function(obj) {
        // In the original code, this checked to see if obj was a
        // nested dense array of floats.  However, it doesn't seem
        // like we support mapping arrays at all now, so this just
        // returns false.
        return false;

    },

    compileKernel: function(source, kernelName) {
        OpenCL.init();

        // A place to put all the error codes we encounter.
        let err_code = new cl_int();
        let err_code_address = err_code.address();

        // `source` is a JS string; we change it to a C string.
        let sourceCString = ctypes.char.array()(source);
        // It's all one line, but an array of pointers to strings, one
        // for each line, is expected.  So we need a pointer to a
        // pointer to a string.

        let program = OpenCL.clCreateProgramWithSource(this.context,
                                                       1,
                                                       sourceCString.address().address(),
                                                       null,
                                                       err_code_address);
        check(err_code);

        // Apparently, the options argument to `clBuildProgram` is
        // always an empty string.
        let options = "";
        let optionsCString = ctypes.char.array()(options);

        err_code = OpenCL.clBuildProgram(program, 0, null, options, null, null);
        check(err_code);


        // Figure out how many devices there are...
        let numDevices = new cl_uint();
        err_code = OpenCL.clGetProgramInfo(program,
                                           CL_PROGRAM_NUM_DEVICES,
                                           cl_uint.size,
                                           numDevices.address(),
                                           null);
        check(err_code);

        // ...so we can get info about them
        const DeviceIDArray = new ctypes.ArrayType(cl_device_id, numDevices.value);
        let deviceIDs = new DeviceIDArray();
        err_code = OpenCL.clGetProgramInfo(program,
                                           CL_PROGRAM_DEVICES,
                                           numDevices.value*cl_device_id.size, // size of deviceIDs
                                           deviceIDs,
                                           null);
        check(err_code);

        // LK: `deviceIDs[0]` is copied from the original code -- I'm
        // not sure how we know we want that one.

        // LK: BUILDLOG_SIZE might not be big enough, but we'll worry
        // about that later.
        const BuildLogArray = new ctypes.ArrayType(char, BUILDLOG_SIZE);
        this.buildLog = new BuildLogArray();
        err_code = OpenCL.clGetProgramBuildInfo(program,
                                                deviceIDs[0],
                                                CL_PROGRAM_BUILD_LOG,
                                                BUILDLOG_SIZE,
                                                this.buildLog,
                                                null);
        check(err_code);

        // Finally, create the kernel.
        let kernelNameCString = ctypes.char.array()(kernelName);
        kernel = OpenCL.clCreateKernel(program,
                                       kernelNameCString,
                                       err_code.address());
        check(err_code);

        err_code = OpenCL.clReleaseProgram(program);
        check(err_code);

        // Convert the kernel string back to a JS string.
        let jsKernel = kernel.readString();
        return jsKernel;

    },

    getBuildLog: function() {

        return this.buildLog;

    },

    mapData: function(source) {

        // TODO: figure out what exactly this is supposed to do.  It
        // calls CreateBuffer and InitCData.  I *think* it should
        // return the result of clCreateBuffer.

        OpenCL.init();

        // A place to put all the error codes we encounter.
        let err_code = new cl_int();
        let err_code_address = err_code.address();


        // Result of a call to ExtractArray.
        let tArray;

        // Result of a call to JS_GetTypedArrayByteLength(tArray).
        let arraySize;

        // Result of a call to GetPointerFromTA.
        let arrayPointer;

        OpenCL.clCreateBuffer(this.context, CL_MEM_READ_ONLY, arraySize,
                              arrayPointer, err_code_address);
        check(err_code);

    },

    allocateData: function(templ, length) {

        // TODO: figure out what exactly this is supposed to do.  It also
        // calls CreateBuffer and InitCData.
    }

};

// Functions that refer to `this` have to be "bound" using
// `Function.prototype.bind` before being exported, so that they'll be
// called with the appropriate `this` value.
let exportableGetBuildLog = DriverFFI.getBuildLog.bind(DriverFFI);
let exportableInitContext = DriverFFI.initContext.bind(DriverFFI);
let exportableCompileKernel = DriverFFI.compileKernel.bind(DriverFFI);
let exportableMapData = DriverFFI.mapData.bind(DriverFFI);

let OpenCL = {
    lib: null, // This will point to the OpenCL library object shortly.

    init: function() {
        console.log("OpenCL.init()...");

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
                                                  ctypes.size_t.ptr); // *param_value_size_ret

        this.clGetDeviceIDs = this.lib.declare("clGetDeviceIDs",
                                               ctypes.default_abi,
                                               cl_int, // return type: error code
                                               cl_platform_id, // platform
                                               cl_device_type, // device_type
                                               cl_uint, // num_entries
                                               cl_device_id, // *devices
                                               cl_uint.ptr); // *num_devices

        this.clGetDeviceInfo = this.lib.declare("clGetDeviceInfo",
                                               ctypes.default_abi,
                                               cl_int, // return type
                                               cl_device_id, // device
                                               cl_device_info, // param_name
                                               ctypes.size_t, // param_value_size
                                               ctypes.voidptr_t, // *param_value
                                               ctypes.size_t.ptr); // *param_value_size_ret


        this.clCreateContext = this.lib.declare("clCreateContext",
                                                ctypes.default_abi,
                                                cl_context, // return type
                                                cl_context_properties.ptr, // *properties
                                                cl_uint, // num_devices
                                                cl_device_id, // *devices
                                                ctypes.voidptr_t, // *pfn_notify
                                                ctypes.voidptr_t, // *user_data
                                                cl_int.ptr); // *errcode_ret

        this.clCreateProgramWithSource = this.lib.declare(
            "clCreateProgramWithSource",
            ctypes.default_abi,
            cl_program, // return type: "a valid non-zero program object" or NULL
            cl_context, // context
            cl_uint, // count (length of the strings array)
            ctypes.char.ptr.ptr, // **strings (array of pointers to strings that make up the code)
            ctypes.size_t.ptr, // *lengths (array with length of each string)
            cl_int.ptr); // *errcode_ret

        this.clBuildProgram = this.lib.declare(
            "clBuildProgram",
            ctypes.default_abi,
            cl_int, // return type: error code
            cl_program, // program: the program object
            cl_uint, // num_devices: the number of devices listed in device_list
            cl_device_id, // *device_list
            ctypes.char.ptr, // *options
            ctypes.voidptr_t, // *pfn_notify
            ctypes.voidptr_t); // *user_data

        this.clGetProgramInfo = this.lib.declare(
            "clGetProgramInfo",
            ctypes.default_abi,
            cl_int, // return type: error code
            cl_program, // program
            cl_program_info, // param_name
            ctypes.size_t, // param_value_size
            ctypes.voidptr_t, // *param_value
            ctypes.size_t.ptr); // *param_value_size_ret

        this.clGetProgramBuildInfo = this.lib.declare(
            "clGetProgramBuildInfo",
            ctypes.default_abi,
            cl_int, // return type: error code
            cl_program, // program
            cl_device_id, // device
            cl_program_build_info, // param_name
            ctypes.size_t, // param_value_size
            ctypes.voidptr_t, // *param_value
            ctypes.size_t.ptr); // *param_value_size_ret

        this.clCreateKernel = this.lib.declare(
            "clCreateKernel",
            ctypes.default_abi,
            cl_kernel, // return type: kernel object or NULL
            cl_program, // program
            ctypes.char.ptr, // *kernel_name
            cl_int.ptr); // *errcode_ret

        this.clReleaseProgram = this.lib.declare(
            "clReleaseProgram",
            ctypes.default_abi,
            cl_int, // return type: error code
            cl_program); // program

        this.clReleaseKernel = this.lib.declare(
            "clReleaseKernel",
            ctypes.default_abi,
            cl_int, // return type: error code
            cl_kernel); // kernel

        this.clCreateBuffer = this.lib.declare(
            "clCreateBuffer",
            ctypes.default_abi,
            cl_mem, // return type: buffer object or NULL
            cl_context, // context
            cl_mem_flags, // flags
            ctypes.size_t, // size
            ctypes.voidptr_t, // *host_ptr
            cl_int.ptr); // *errcode_ret

        this.clCreateCommandQueue = this.lib.declare(
            "clCreateCommandQueue",
            ctypes.default_abi,
            cl_command_queue, // return type: command queue or NULL
            cl_context, // context
            cl_device_id, // device
            cl_command_queue_properties, // properties
            cl_int.ptr); // *errcode_ret
    },

    shutdown: function() {
        console.log("OpenCL.shutdown()...");

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
                                        length.value*ctypes.char.size, // size of propertyBuf
                                        propertyBuf,
                                        paramValueSizeRet);
    check(err_code);

    // Return the property as a JS string.
    let jsProperty = propertyBuf.readString();
    return jsProperty;

};

Platform.prototype.GetDeviceNames = function GetDeviceNames() {

    OpenCL.init();

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

    run: function run() {

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
            console.log("Congratulations!  You've created OpenCL context " + context + ".");
        }

    },
};
