"use strict";
var frog1, lady1, spider1, flower1;
var bugs, objectsToDraw, objectsToUpdate;
var drawArea;
var initialized=false;
var happyBugs = 0, frogAte = 0, spiderAte = 0, score = 0;
var flowManager;
var edgeManager;
var doReporting = true;
var captureCanvas;
var useCanvasUpdatedEvent;

/* -------- Config options -------- */
var Config = {
		defaults : {
			w : 1280,
			h : 720,
			borderWidth : 30,
		},
		w : 1280,
		h : 720,
//		numLadybugs : 1,
//		numButterflies : 0,
//		numFlies : 0,
		numLadybugs : 5,
		numButterflies : 5,
		numFlies : 20,
		maxLeaders : 5,
		gameDuration : 60,  //Note: populated from gameDuration input
		loopRestartDuration: 5,  //Note: populated from loopRestartDuration input
};
Config.scaleX = Config.w / Config.defaults.w;
Config.scaleY = Config.h / Config.defaults.h;
Config.scale = Vec(Config.w, Config.h).len() / Vec(Config.defaults.w, Config.defaults.h).len();
Config.borderWidth = Config.defaults.borderWidth * Config.scale;
Config.bounds = {
	minX : Config.borderWidth,
	minY : Config.borderWidth,
	maxX : Config.w - Config.borderWidth,
	maxY : Config.h - Config.borderWidth,
};

console.log(Config);
//if (critterBoundaries===undefined) {
//	var critterBoundaries={minX:20,minY:20,maxX:1260,maxY:700};
//}
/* -------- End Config options ---------- */

function reset() { initialized = false; singleStep(); timer.reset(); }

function setup() {
	if (initialized) return;
	initialized = true;

    drawArea = document.getElementById('drawArea');
    clearRenderedObjects();
    
	frog1 = new Frog('Frog1', 400, 620); //650);
	spider1 = new Spider('Spider1', 950, 300);
	flower1 = new Flower('flower1', 150, 200);
	objectsToDraw = [ flower1, frog1, spider1 ];
	objectsToUpdate = [ spider1, frog1 ];
	bugs = [];
	
	var i = 0;
	for(i=0; i<Config.numLadybugs; i++) addBug(new Lady('lady'+i, 0,0));
	for(i=0; i<Config.numButterflies; i++) addBug(new Butterfly('butterfly'+i, 0,0));
	for(i=0; i<Config.numFlies; i++) addBug(new Fly('fly'+i, 0,0));
//	var numBugs = 10;
//	for(var i=0; i<numBugs; i++) {
//		addBug(new Lady('lady'+i, 0,0));
//		addBug(new Butterfly('butterfly'+i, 0,0));
//		addBug(new Fly('fly'+i, 0,0));
////		addBug(new Mosquito('mosquito'+i, 0,0));
//	}

	captureCanvas = document.getElementById('captureCanvas');
}

var edgesCanvasVisible = false;
function toggleEdges() {
    var canvas = document.getElementById('edgesCanvas');
    edgesCanvasVisible = !edgesCanvasVisible;
    if (edgesCanvasVisible) canvas.style.visibility = 'visible';
    else canvas.style.visibility = 'hidden';
}

function singleStep() {
	doReporting = false;
	main();
	doReporting = true;
}
function main() {
	if (doReporting) timer.start("Game Total");
	if (!initialized) setup();
	
	//update
	if (doReporting) timer.start("update");
	for(var i=0; i<objectsToUpdate.length; i++) objectsToUpdate[i].update();
	if (doReporting) timer.end("update");
	
	//render
	if (doReporting) timer.start("render");
	redrawCounters();
	for(var i=0; i<objectsToDraw.length; i++) {
		objectsToDraw[i].render();
	}
	if (doReporting) timer.end("render");
	if (doReporting) timer.end("Game Total");
};

function loopGameFlag() {
	return document.getElementById("loop").checked;	
}

navigator.getUserMedia = ( navigator.getUserMedia ||
                           navigator.webkitGetUserMedia ||
                           navigator.mozGetUserMedia ||
                           navigator.msGetUserMedia);

if (!navigator.getUserMedia)
	alert("The browser seems not to support getUserMedia. Cannot connect to webcam.");

var captureActive = false;

function getCaptureCanvas() {
  return document.getElementById("captureCanvas");
}

function getCaptureVideo() {
  return document.getElementById("captureVideo");
}

var getCaptureContext = (function () {
    var context;
    return function getCaptureContext() {
        if (!context)
            context = getCaptureCanvas().getContext('2d');
        return context;
    };
})();

function startCapture() {
  populateConfigAndOptions();
  navigator.getUserMedia({audio: false, video: true}, 
                         function (stream) {
                            var video = getCaptureVideo();
                            video.onloadedmetadata = function (e) {
                                this.play();
                                captureActive = true;
                                setTimeout("processFrame()", 1000);
                            };
                            video.src = window.URL.createObjectURL(stream);
                            video.stream = stream;
                         },
                         function (err) {
                            alert("Could not start video stream: " + err);
                         });
}

function stopCapture() {
  var video = getCaptureVideo();
  video.pause();
  video.src = "";
  video.stream.stop();
  video.stream = null;
  captureActive = false;
}

var flowOptionsDefaults={
		captureWidth:getCaptureCanvas().width,
		captureHeight:getCaptureCanvas().height,
		imageWidth:1280,
		imageHeight:720,
		flowWidth:160,
		flowHeight:90,
		winSize:31,
		sigma:2.1,
		iterations:3,
		flowFactorIterations:1.0,
		flowFactorFinal:1.0,
		grayFactor:1.0,
		flipImage:false,
		padBorder:true,
		edgeThreshold:200,   //Note: populated from edgeThreashold input
		useCanvasUpdatedEvent:false,
		debugTime:false,
};
if (flowOptions===undefined) {
	var flowOptions={}; //use defaults
    //var flowOptions={flowWidth:320,flowHeight:180,winSize:29,iterations:3,flowFactorIterations:1.0,flowFactorFinal:1.0,grayFactor:1.0,flipImage:true,edgeThreshold:200,debugTime:true};
    //var flowOptions={flowWidth:256,flowHeight:144,winSize:29,iterations:3,flowFactorIterations:1.0,flowFactorFinal:1.0,grayFactor:1.0,flipImage:true,edgeThreshold:200,debugTime:false};
}
addDefaultsToObj(flowOptions,flowOptionsDefaults);
useCanvasUpdatedEvent=flowOptions.useCanvasUpdatedEvent;

var flowManagerPar=new DenseOpticalFlowManager(flowOptions);
var edgeManagerPar=new ScalingEdgeManager(flowOptions);

var flowManagerSeq=new DenseOpticalFlowManagerSeq(flowOptions);
var edgeManagerSeq=edgeManagerPar; //same class for now

function populateConfigAndOptions() {
	edgeManagerPar.edgeThreshold=parseFloat(document.getElementById("edgeThreshold").value);
	Config.gameDuration=parseFloat(document.getElementById("gameDuration").value);
	Config.loopRestartDuration=parseFloat(document.getElementById("loopRestartDuration").value);
}

function processFrameSeq() {
  setup();
  timer.start("processFrameSeq");
  flowManager=flowManagerSeq;
  edgeManager=edgeManagerSeq;
  timer.start("getCaptureImageSeq");
  var captureContext=getCaptureContext();
  var captureVideo=getCaptureVideo();
  captureContext.drawImage(captureVideo, 0, 0, captureContext.canvas.width, captureContext.canvas.height);
  var imageData=captureContext.getImageData(0,0,captureCanvas.width,captureCanvas.height);
  var captureImage={width:imageData.width,height:imageData.height,depth:4,data:imageData.data};
  captureImage.getShape=function(){return [captureImage.height,captureImage.width,4];}
  timer.end("getCaptureImageSeq");

  timer.start("edgeManagerSetJSImage");
  edgeManager.setJSImage(captureImage);
  timer.end("edgeManagerSetJSImage");

  flowManager.computeFlow(captureImage);

  main();
  
  if (edgesCanvasVisible) {
	  timer.start("drawEdgeImage");
	  edgeManager.drawEdgeImage(document.getElementById('edgesCanvas'));
	  timer.end("drawEdgeImage");
  }

  timer.end("processFrameSeq");
}


// N.B.: This try/catch is necessary to handle a bug in Firefox; see
// http://stackoverflow.com/q/18580844/415518 .
function drawVideo() {
  var captureContext=getCaptureContext();
  var captureVideo=getCaptureVideo();
  try {
    captureContext.drawImage(captureVideo, 0, 0, captureContext.canvas.width, captureContext.canvas.height);
  } catch (e) {
    if (e.name == "NS_ERROR_NOT_AVAILABLE") {
      // Wait a bit before trying again; you may wish to change the
      // length of this delay.
      setTimeout(drawVideo, 100);
    } else {
      throw e;
    }
  }
}

function processFramePar() {
  setup();
  timer.start("processFramePar");
  flowManager=flowManagerPar;
  edgeManager=edgeManagerPar;
  var captureCanvas = getCaptureCanvas();
  timer.start("getCaptureImage");
  drawVideo();
  var captureImage = new ParallelArray(captureCanvas);
  timer.end("getCaptureImage");

  timer.start("edgeManagerSetImagePA");
  edgeManager.setImagePA(captureImage);
  timer.end("edgeManagerSetImagePA");
  
  flowManager.computeFlow(captureImage);

  main();

  if (edgesCanvasVisible) {
	  timer.start("drawEdgeImage");
	  edgeManager.drawEdgeImage(document.getElementById('edgesCanvas'));
	  timer.end("drawEdgeImage");
  }

  timer.end("processFramePar");
}

function toggleDebug() {
	var debugCheckbox = document.getElementById("debugMode");
//	debugCheckbox.checked = !debugCheckbox.checked;
	var debugInfo = document.getElementById("debugInfo");
  if (debugCheckbox.checked) {
    debugInfo.style.visibility="visible";
  } else {
    debugInfo.style.visibility="hidden";
  }	
}


function toggleParallel() {
	var parCheckbox = document.getElementById("parallelize");
	parCheckbox.checked = !parCheckbox.checked;
	var parButton = document.getElementById("pjsButton");
  if (parCheckbox.checked) {
    parButton.value = "    Parallel    ";
    parButton.style.background="blue";
  } else {
    parButton.value = "Sequential";
    parButton.style.background="red";
  }
}

function processFrame() {
  if (timer.isRunning("outsideProcessFrame")) timer.end("outsideProcessFrame");
  if (document.getElementById("parallelize").checked) {
    processFramePar();
  } else {
    processFrameSeq();
  }
  if (doReporting) {
	timer.report("timerInfo");
	timer.start("outsideProcessFrame");
  }
  if (captureActive) {
    if (!useCanvasUpdatedEvent) setTimeout("processFrame()", 1);
  }
}
