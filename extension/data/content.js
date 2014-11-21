function riverTrailExtensionIsInstalled() {
    self.port.emit("riverTrailExtensionIsInstalledCalled");

    self.port.on("riverTrailExtensionIsInstalledReturned", function(result) {
	return result;
    });
}

function is64BitFloatingPointEnabled() {
    self.port.emit("is64BitFloatingPointEnabledCalled", arguments);

    self.port.on("is64BitFloatingPointEnabledReturned", function(result) {
	return result;
    });
}

function initContext() {
    self.port.emit("initContextCalled", arguments);

    self.port.on("initContextReturned", function(result) {
	return result;
    });
}

function canBeMapped(obj) {
    self.port.emit("canBeMappedCalled", arguments);

    self.port.on("canBeMappedReturned", function(result) {
	return result;
    });
}

function compileKernel(sourceString, kernelName) {
    console.log(arguments);
    self.port.emit("compileKernelCalled", arguments);

    self.port.on("compileKernelReturned", function(result) {
	return result;
    });
}

function getBuildLog() {
    self.port.emit("getBuildLogCalled", arguments);

    self.port.on("getBuildLogReturned", function(result) {
	return result;
    });
}

function mapData(source) {
    self.port.emit("mapDataCalled", arguments);

    self.port.on("mapDataReturned", function(result) {
	return result;
    });
}

function setArgument(kernel, index, arg) {
    self.port.emit("setArgumentCalled", arguments);

    self.port.on("setArgumentReturned", function(result) {
	return result;
    });
}

function setScalarArgument(kernel, index, arg, isInteger, is64BitPrecision) {
    self.port.emit("setScalarArgumentCalled", arguments);

    self.port.on("setScalarArgumentReturned", function(result) {
	return result;
    });
}

function run(kernel, rank, iterSpace, tile) {
    self.port.emit("runCalled", arguments);

    self.port.on("runReturned", function(result) {
	return result;
    });
}

function getValue(bufferObjId, view, callback) {
    self.port.emit("getValueCalled", arguments);

    self.port.on("getValueReturned", function(result) {
	return result;
    });
}

// All the functions we want user-side code to be able to call.
exportFunction(riverTrailExtensionIsInstalled, unsafeWindow,
               {defineAs: "riverTrailExtensionIsInstalled"});

exportFunction(is64BitFloatingPointEnabled, unsafeWindow,
               {defineAs: "is64BitFloatingPointEnabled"});

exportFunction(initContext, unsafeWindow,
               {defineAs: "initContext"});

exportFunction(canBeMapped, unsafeWindow,
               {defineAs: "canBeMapped"});

exportFunction(compileKernel, unsafeWindow,
               {defineAs: "compileKernel"});

exportFunction(getBuildLog, unsafeWindow,
               {defineAs: "getBuildLog"});

exportFunction(mapData, unsafeWindow,
               {defineAs: "mapData"});

exportFunction(setArgument, unsafeWindow,
               {defineAs: "setArgument"});

exportFunction(setScalarArgument, unsafeWindow,
               {defineAs: "setScalarArgument"});

exportFunction(run, unsafeWindow,
               {defineAs: "run"});

exportFunction(getValue, unsafeWindow,
               {defineAs: "getValue",
                allowCallbacks: true});
