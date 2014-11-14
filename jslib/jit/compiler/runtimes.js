RiverTrail.runtime = (function() {
    if(window.RTExtension !== undefined) {
        return RiverTrailExtAdapter();
    }
    else if(window.webcl !== undefined) {
        return WebCLAdapter();
    }
    else 
        throw "No OpenCL adapters found";
})();

// JS: All adapters expose a common interface
// to the River Trail library.

function RiverTrailExtAdapter() {
    
    name = "RiverTrailExtension";
    let _setArgument = function(k, i, a) {
        return setArgument(k.id, i, a.id);
    };
    let _setScalarArgument = function(k, i, a, isInteger, is64bit) {
        return setScalarArgument(k.id, i, a, isInteger, is64bit);
    };
    let _run = function(k, r, i) {
        return run(k.id, r, i);
    };
    let _getValue = function(b, t) {
        return getValue(b.id, v);
    };
    return {
        name: "RiverTrailExtension",
        is64BitFloatingPointEnabled: window.is64BitFloatingPointEnabled;
        compileKernel: window.compileKernel,
        mapData: window.mapData,
        setArgument: _setArgument,
        setScalarArgument: _setScalarArgument,
        run: _run,
        getValue: _getValue
    };
}

function WebCLAdapter() {
    let context = webcl.createContext();
    let device = context.getInfo(WebCL.CONTEXT_DEVICES)[0];
    let commandQueue = webcl.createCommandQueue(device);
    let failureMem = new UInt32Array([0]);
    let failureMemCLBuffer = null;
    let _compileKernel =
        function(kernelSource, kernelName) {
            let program = context.createProgram(kernelSource);
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
            let kernel;
            try {
                kernel = program.createKernel(kernelName);
            } catch(e) {
                alert("Failed to create kernel: " + e.message);
                throw e;
            }
            try {
                failureMemCLBuffer = _mapData(failureMem, isWriteOnly);
                commandQueue.enqueueWriteBuffer(failureMemCLBuffer, false, 0, 4, failureMem);
            } catch (e) {
                alert("Failed to create buffer for failureMem: " + e.message);
                throw e;
            }
            return kernel;
    };
    let _mapData = function(a, isWriteOnly) {
        let clbuffer = context.createBuffer(
            (isWriteOnly ? WebCl.MEM_WRITE_ONLY : WebCL.MEM_READ_ONLY),
            a.byteLength);
        return clbuffer;
    };
    let DPO_NUM_ARTIFICAL_ARGS = 1;
    let _setArgument = function(k, i, a) {
        return k.setArg(i+DPO_NUM_ARTIFICAL_ARGS, a); 
    };
    let _setScalarArgument = function(k, i, a) {
        return k.setArg(i+DPO_NUM_ARTIFICAL_ARGS, new Float64Array([a])); 
    };
    let _run = function(k, r, i) {
        _setArgument(k, 0, failureMem);
        commandQueue.enqueueNDRangeKernel(k, r, null, i, null);
        // TODO: Read failureMem
    };
    let _getValue = function(b, ta) {
        commandQueue.enqueueReadBuffer(b, false, 0, ta.byteLength, ta);
        commandQueue.finish();
    };
    return {
        name: "WebCL",
        is64BitFloatingPointEnabled: window.is64BitFloatingPointEnabled;
        compileKernel: window.compileKernel,
        mapData: window.mapData,
        setArgument: _setArgument,
        setScalarArgument: _setScalarArgument,
        run: _run,
        getValue: _getValue
    };
}



