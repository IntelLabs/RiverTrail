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
Cu.import("resource://gre/modules/Services.jsm");

let { CLTypes } = require("CLTypes.js");
let { Constants } = require("Constants.js");
let { OpenCL } = require("OpenCL.js");
let { Platforms } = require("Platforms.js");
let { Debug } = require("Debug.js");

// Options to pass to clCreateCommandQueue.
let commandQueueProperties =
    // Constants.CL_QUEUE_PROFILING_ENABLE |
    // Constants.CL_QUEUE_OUT_OF_ORDER_EXEC_MODE_ENABLE |
    0;

// A wrapper for CData values that are being returned to user-side
// code, so that we can distinguish among them by name on the user
// side.
function GenericWrapper(_ctypesObj, _name, _id) {
    this.ctypesObj = _ctypesObj;
    this.name = _name;
    this.id = _id;
    this.__exposedProps__ = {ctypesObj: "rw", name: "rw", id: "rw"};
}

let RiverTrailInterface = (function() {

    // A place to put all the error codes we encounter.
    let err_code = new CLTypes.cl_int();

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

        let prefService = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService);
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

        let defaultPlatformPref = require('sdk/simple-prefs').prefs["defaultPlatform"];
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
        let numDevices = new CLTypes.cl_uint();

        // weird gotcha with js-ctypes: the return value will be
        // magically coerced to "number", so we have to assign it to
        // err_code.value, not just err_code.
        err_code.value = OpenCL.clGetDeviceIDs(defaultPlatformID,
                                               Constants.CL_DEVICE_TYPE_ALL,
                                               0,
                                               null,
                                               numDevices.address());
        Debug.check(err_code, "clGetDeviceIDs (in initContext, call 1)");
        Debug.log(err_code.value);

        // Then, get a list of device IDs of to pass to
        // `clCreateContext`.

        // numDevices.value is the length of the array
        const DeviceArray = new ctypes.ArrayType(CLTypes.cl_device_id,
                                                 numDevices.value);
        deviceList = new DeviceArray();
        err_code.value = OpenCL.clGetDeviceIDs(defaultPlatformID, // platform
                                               Constants.CL_DEVICE_TYPE_ALL, // device_type
                                               1, // num_entries
                                               deviceList, // *devices
                                               null); // *num_devices
        Debug.check(err_code, "clGetDeviceIDs (in initContext, call 2)");
        Debug.log(err_code.value);

        // Create a three-element array of context properties to pass
        // to clCreateContext.

        // According to the spec, the context properties argument
        // should be "a list of context property names and their
        // corresponding values. Each property name is immediately
        // followed by the corresponding desired value. The list is
        // terminated with 0."

        let contextPropertiesList = CLTypes.cl_context_properties.array(3)();

        // We have to do these casts because contextPropertiesList
        // actually contains pointers.
        ctypes.cast(contextPropertiesList[0], ctypes.int).value = Constants.CL_CONTEXT_PLATFORM;
        contextPropertiesList[1] = ctypes.cast(defaultPlatformID, ctypes.int.ptr);
        ctypes.cast(contextPropertiesList[2], ctypes.int).value = 0;

        let contextProps = ctypes.cast(contextPropertiesList.address(), CLTypes.cl_context_properties.ptr);

        // Get the default device ID to pass to clCreateContext.
        defaultDevicePref = require('sdk/simple-prefs').prefs["defaultDeviceType"];
        if (defaultDevicePref < 0 ||
            defaultDevicePref === undefined ||
            defaultDevicePref > deviceList.length-1) {
            defaultDevicePref = 0;
        }

        context = OpenCL.clCreateContext(contextProps,
                                         1,
                                         (deviceList[defaultDevicePref]).address(),
                                         null,
                                         null,
                                         err_code.address());
        Debug.check(err_code, "clCreateContext (in initContext)");
        Debug.log(err_code.value);

        failureMemCLBuffer = OpenCL.clCreateBuffer(context,
                                                   Constants.CL_MEM_READ_WRITE,
                                                   4,
                                                   null,
                                                   err_code.address());
        Debug.check(err_code, "clCreateBuffer (in initContext)");
        Debug.log(err_code.value);

        commandQueue = OpenCL.clCreateCommandQueue(context,
                                                   deviceList[defaultDevicePref],
                                                   commandQueueProperties,
                                                   err_code.address());
        Debug.check(err_code, "clCreateCommandQueue (in initContext)");
        Debug.log(err_code.value);
    };

    let canBeMapped = function(obj) {
        // N.B.: In the original River Trail extension, `canBeMapped`
        // checked to see if `obj` was a nested dense array of floats.
        // However, it doesn't seem like we support mapping arrays at
        // all now, so this just returns false.
        return false;
    };

    // Returns a GenericWrapper around a CData kernel.
    let compileKernel = function(sourceString, kernelName) {

        // Our first step is to clear the build log so that what's
        // there is not left over from the last kernel that was
        // compiled.
        buildLog = "";

        // `sourceString` is a JS string; we change it to a C string.
        let sourceCString = ctypes.char.array()(sourceString);

        // an array (of length 1) of char arrays
        let SourceArray = new ctypes.ArrayType(ctypes.char.array(sourceCString.length), 1);
        let source = new SourceArray();
        source[0] = sourceCString;

        let sourceptrptr = ctypes.cast(source.address().address(), ctypes.char.ptr.ptr);

        let program = OpenCL.clCreateProgramWithSource(context,
                                                       1,
                                                       sourceptrptr,
                                                       null,
                                                       err_code.address());
        Debug.check(err_code, "clCreateProgramWithSource (in compileKernel)");
        Debug.log(err_code.value);

        // Apparently, the options argument to `clBuildProgram` is
        // always an empty string.
        let options = "";
        let optionsCString = ctypes.char.array()(options);

        err_code.value = OpenCL.clBuildProgram(program, 0, null, options, null, null);
        Debug.check(err_code, "clBuildProgram (in compileKernel)");
        Debug.log(err_code.value);

        // Before getting the build info, figure out how big the build
        // log is so we know how big a buffer we need to create for
        // it.
        let buildLogSize = new ctypes.size_t;
        err_code.value = OpenCL.clGetProgramBuildInfo(program,
                                                      deviceList[defaultDevicePref],
                                                      Constants.CL_PROGRAM_BUILD_LOG,
                                                      0,
                                                      null,
                                                      buildLogSize.address());
        Debug.check(err_code, "clGetProgramBuildInfo (in compileKernel)");
        Debug.log(err_code.value);

        // Now that we have the build log size, read the build log
        // into an appropriately sized buffer.
        const BuildLogArray = new ctypes.ArrayType(ctypes.char, buildLogSize.value);
        let buildLogCString = new BuildLogArray();

        err_code.value = OpenCL.clGetProgramBuildInfo(program,
                                                      deviceList[defaultDevicePref],
                                                      Constants.CL_PROGRAM_BUILD_LOG,
                                                      buildLogSize.value,
                                                      buildLogCString,
                                                      null);
        Debug.check(err_code, "clGetProgramBuildInfo (in compileKernel)");
        Debug.log(err_code.value);
        buildLog = buildLogCString.readString();

        // Finally, create the kernel.
        let kernelNameCString = ctypes.char.array()(kernelName);
        kernel = OpenCL.clCreateKernel(program,
                                       kernelNameCString,
                                       err_code.address());
        Debug.check(err_code, "clCreateKernel (in compileKernel)");
        Debug.log(err_code.value);

        err_code.value = OpenCL.clReleaseProgram(program);
        Debug.check(err_code, "clReleaseProgram (in compileKernel)");
        Debug.log(err_code.value);

        err_code.value = OpenCL.clSetKernelArg(kernel, 0, CLTypes.cl_mem.ptr.size, failureMemCLBuffer.address());
        Debug.check(err_code, "clSetKernelArg (in compileKernel)");
        Debug.log(err_code.value);
        compiledKernels.push(kernel);

        let wrappedKernel = new GenericWrapper(kernel, "OpenCLKernel", compiledKernels.length-1);
        return wrappedKernel;
    };

    let getBuildLog = function() {

        return buildLog;

    };

    // We have an OpenCL buffer with id `bufferObjId` that was
    // originally made out of a TypedArray object `view`.
    let getValue = function(bufferObjId, view, callback) {

        let numEvents = new CLTypes.cl_uint(0);

        // This call side-effects the contents of `view.buffer`,
        // writing into it from bufferObjId.
        err_code.value = OpenCL.clEnqueueReadBuffer(commandQueue,
                                    mappedBuffers[bufferObjId],
                                    Constants.CL_TRUE,
                                    ctypes.size_t(0),
                                    ctypes.size_t(view.byteLength),
                                    ctypes.voidptr_t(view.buffer),
                                    numEvents,
                                    null,
                                    null);
        Debug.check(err_code, "clEnqueueReadBuffer (in getValue)");
        Debug.log(err_code.value);

        // Run the provided callback, which will assign its argument
        // to a variable on the user side.
        callback(view);
    };

    let mapData = function(source) {
        let clbuffer = OpenCL.clCreateBuffer(context,
                                             Constants.CL_MEM_USE_HOST_PTR,
                                             source.byteLength,
                                             ctypes.voidptr_t(source.buffer),
                                             err_code.address());
        Debug.check(err_code, "clCreateBuffer (in mapData)");
        Debug.log(err_code.value);
        mappedBuffers.push(clbuffer);
        return new GenericWrapper(null, "CData", mappedBuffers.length-1);
    };

    let setArgument = function(kernel, index, arg) {

        let argSize = ctypes.size_t.size;
        err_code.value = OpenCL.clSetKernelArg(compiledKernels[kernel],
                                               index+Constants.RIVERTRAIL_NUMBER_OF_ARTIFICIAL_ARGS,
                                               argSize,
                                               ctypes.cast(mappedBuffers[arg].address(),
                                                           CLTypes.cl_mem.ptr));
        Debug.check(err_code, "clSetKernelArg (in setArgument)");
        Debug.log(err_code.value);
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
                                               index+Constants.RIVERTRAIL_NUMBER_OF_ARTIFICIAL_ARGS,
                                               argSize,
                                               argV.address());
        Debug.check(err_code, "clSetKernelArg (in setScalarArgument)");
        Debug.log(err_code.value);
    };

    let run = function(kernel, rank, iterSpace) {

        let offset = ctypes.size_t(0);
        let size = ctypes.size_t(4);
        let zero = new CLTypes.cl_int(0);
        let writeEvent = new CLTypes.cl_event(); // This likely won't work if cl_event is a stack allocated C struct for eg. -- jsreeram

        err_code.value = OpenCL.clEnqueueWriteBuffer(commandQueue,
                                                     failureMemCLBuffer,
                                                     Constants.CL_FALSE,
                                                     offset,
                                                     size,
                                                     zero.address(),
                                                     0,
                                                     null,
                                                     writeEvent.address());
        Debug.check(err_code, "clEnqueueWriteBuffer (in run)");
        Debug.log(err_code.value);

        let rankInteger = new CLTypes.cl_uint(rank|0);
        let runEvent = new CLTypes.cl_event();
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
        Debug.check(err_code, "clEnqueueNDRangeKernel (in run)");
        Debug.log(err_code.value);

        let numEvents = new CLTypes.cl_uint(1);

        err_code.value = OpenCL.clWaitForEvents(numEvents,
                                                runEvent.address());
        Debug.check(err_code, "clWaitForEvents (in run)");
        Debug.log(err_code.value);
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

exports.RiverTrailInterface = RiverTrailInterface;
