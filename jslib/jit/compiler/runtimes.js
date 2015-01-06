/*
 * Copyright (c) 2011, Intel Corporation
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

/*
 * JS: Interface and definitions of adapters to a platform OpenCL runtime
*/


"use strict";

if(RiverTrail === undefined) {
    var RiverTrail = {};
}
RiverTrail.SupportedInterfaces = {};

RiverTrail.SupportedInterfaces.RiverTrailAdapter = function() {
    var _setArgument = function(k, i, a) {
        return setArgument(k.id, i, a.id);
    };
    var _setScalarArgument = function(k, i, a, isInteger, is64bit) {
        return setScalarArgument(k.id, i, a, isInteger, is64bit);
    };
    var _run = function(k, r, i) {
        return run(k.id, r, i);
    };
    var _getValue = function(b, v, f) {
        return getValue(b.id, v, f);
    };
    return {
        name: "RiverTrailExtension",
        initContext: window.initContext,
        is64BitFloatingPointEnabled: window.is64BitFloatingPointEnabled,
        compileKernel: window.compileKernel,
        mapData: window.mapData,
        getBuildLog: window.getBuildLog,
        setArgument: _setArgument,
        setScalarArgument: _setScalarArgument,
        run: _run,
        getValue: _getValue
    };
}

RiverTrail.SupportedInterfaces.WebCLAdapter = function() {
    var context;
    var device;
    var commandQueue;
    var failureMem;
    var failureMemCLBuffer;
    var _initContext = function() {
            
        var availablePlatforms = webcl.getPlatforms ();
        var supportedPlatform = null;
        for (var i in availablePlatforms) {
            if(availablePlatforms[i]
                    .getInfo(WebCL.PLATFORM_NAME)
                    .indexOf("Intel(R)") === 0)
                supportedPlatform = availablePlatforms[i];
        }
        if(supportedPlatform === null)
            throw "[WebCL Runtime] : No supported OpenCL platforms found!";

        context = webcl.createContext(supportedPlatform);
        device = context.getInfo(WebCL.CONTEXT_DEVICES)[0];
        commandQueue = context.createCommandQueue(device);
        failureMem = new Int32Array(1);
        failureMem[0] = 0;
        failureMemCLBuffer = null;
    };
    var _is64BitFloatingPointEnabled = function() {
        // TODO: clGetPlatformInfo should tell us this.
        return false;
    };
    var _compileKernel =
        function(kernelSource, kernelName) {
            var program = context.createProgram(kernelSource);
            try {
                program.build ([device], "");
            } catch(e) {
                alert ("Failed to build WebCL program. Error "
                 + program.getBuildInfo (device, 
                   WebCL.PROGRAM_BUILD_STATUS)
                 + ":  " + program.getBuildInfo (device, 
                   WebCL.PROGRAM_BUILD_LOG));
                throw e;
            }
            var kernel;
            try {
                kernel = program.createKernel(kernelName);
            } catch(e) {
                alert("Failed to create kernel: " + e.message);
                throw e;
            }
            try {
                failureMemCLBuffer = _mapData(failureMem, true);
                commandQueue.enqueueWriteBuffer(failureMemCLBuffer, false, 0, 4, failureMem);
            } catch (e) {
                alert("Failed to create buffer for failureMem: " + e.message);
                throw e;
            }
            return kernel;
    };
    var _mapData = function(a, isWriteOnly) {
        var clbuffer;
        var bufferFlags = (isWriteOnly !== undefined) ? WebCL.MEM_WRITE_ONLY :
            WebCL.MEM_READ_WRITE;
        try {
            clbuffer = context.createBuffer(bufferFlags, a.byteLength, a);
        } catch(e) {
            alert("Could not create buffer: " + e.message);
            throw e;
        }
        return clbuffer;
    };
    var RIVERTRAIL_NUM_ARTIFICAL_ARGS = 1;
    var _setArgument = function(k, i, a) {
        var ret;
        try {
            ret = k.setArg(i+RIVERTRAIL_NUM_ARTIFICAL_ARGS, a);
        } catch (e) {
            alert("SetArgument failed: " + e.message + " at index " + (i+RIVERTRAIL_NUM_ARTIFICAL_ARGS).toString());
            throw e;
        }
        return ret;
    };
    var _setScalarArgument = function(k, i, a, isInteger, is64Bit) {
        var template;
        if(isInteger)
            template = Uint32Array;
        else if(!is64Bit)
            template = Float32Array;
        else
            template = Float64Array;
        var ret;
        try {
            ret = k.setArg(i+RIVERTRAIL_NUM_ARTIFICAL_ARGS, new template([a]));
        } catch (e) {
            alert("SetScalarArgument failed: " + e.message + " at index " + (i+RIVERTRAIL_NUM_ARTIFICAL_ARGS).toString());
            throw e;
        }
        return ret;
    };
    var _run = function(k, r, i) {
        try {
            k.setArg(0, failureMemCLBuffer);
        } catch(e) {
            alert("SetArgument for failureMem failed: " + e.message);
            throw e;
        }
        try {
            commandQueue.enqueueNDRangeKernel(k, r, null, i, null);
        } catch (e) {
            alert("kernel run failed: " + e.message);
            throw e;
        }
        // TODO: Read failureMem
    };
    var _getValue = function(b, ta) {
        commandQueue.enqueueReadBuffer(b, false, 0, ta.byteLength, ta);
        commandQueue.finish();
    };
    var _getBuildLog = function () {
        return "BuildLog (WebCL adapter) not implemented yet";
    }
    return {
        name: "WebCL",
        initContext: _initContext,
        is64BitFloatingPointEnabled: _is64BitFloatingPointEnabled,
        compileKernel: _compileKernel,
        mapData: _mapData,
        setArgument: _setArgument,
        setScalarArgument: _setScalarArgument,
        run: _run,
        getValue: _getValue,
        getBuildLog: _getBuildLog
    };
}

RiverTrail.runtime = (function() {
    if(window.riverTrailExtensionIsInstalled !== undefined) {
        return RiverTrail.SupportedInterfaces.RiverTrailAdapter();
    }
    else if(window.webcl !== undefined) {
        return RiverTrail.SupportedInterfaces.WebCLAdapter();
    }
    else {
        throw "No OpenCL adapters found";
        return undefined;
    }
})();



