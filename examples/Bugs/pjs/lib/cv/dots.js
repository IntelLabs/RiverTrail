try {
  var captureService = window.navigator.service.media;
} catch (e) {
  alert("Cannot connect to Rainbow extension :( ["+e.toString()+"]");
}

var captureActive = false;

window.onbeforeunload=function(e) {
  if (captureActive) {
    captureService.endSession();
  }
}

function videoHandler(type, data) {
  switch (type) {
    case "session-began":
      captureActive = true;
      setTimeout("processFrame()", 1);
    break;
    case "session-ended":
      captureActive = false;
    break;
  }
}

function getCaptureCanvas() {
  return document.getElementById("captureCanvas");
}

function startCapture() {
  var canvas=getCaptureCanvas();
  var configuration={audio:false,video:true,width:canvas.width,height:canvas.height};
  captureService.beginSession(configuration,canvas.getContext("2d"),videoHandler);
}

function stopCapture() {
  captureService.endSession();
}

var img=new Image();
//img.src = 'data:image/gif;base64,R0lGODlhCwALAIAAAAAA3pn/ZiH5BAEAAAEALAAAAAALAAsAAAIUhA+hkcuO4lmNVindo7qyrIXiGBYAOw==';
img.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==';

if (flowOptions===undefined) {
  var flowOptions={flowWidth:320,flowHeight:180,winSize:29,flipImage:false};
}

var flowManagerPar=new DenseOpticalFlowManager(flowOptions);
var dotsPar=new DotsManager(flowManagerPar,50,img);

var flowManagerSeq=new DenseOpticalFlowManagerSeq(flowOptions);
var dotsSeq=new DotsManager(flowManagerSeq,50,img);

function drawDisplayData(dots) {
  var captureCanvas = getCaptureCanvas();
  var scale=[1,1];
  imageManager.setScale(scale[0],scale[1]);
  dots.drawDots();
  timer.start("imageManagerDraw");
  imageManager.draw();
  timer.end("imageManagerDraw");
}

function processFrameSeq() {
  timer.start("processFrameSeq");
  var flowManager=flowManagerSeq;
  var dots=dotsSeq;
  var captureCanvas = getCaptureCanvas();
  timer.start("getCaptureImageSeq");
  var captureContext=captureCanvas.getContext('2d');
  var imageData=captureContext.getImageData(0,0,captureCanvas.width,captureCanvas.height);
  var captureImage={width:imageData.width,height:imageData.height,depth:4,data:imageData.data};
  captureImage.getShape=function(){return [captureImage.height,captureImage.width,4];}
  timer.end("getCaptureImageSeq");

  flowManager.computeFlow(captureImage);
  dots.moveDots();

  drawDisplayData(dots);

  timer.end("processFrameSeq");
}

function processFramePar() {
  var flowManager=flowManagerPar;
  var dots=dotsPar;
  timer.start("processFramePar");
  var captureCanvas = getCaptureCanvas();
  timer.start("getCaptureImage");
  var captureImage = new ParallelArray(captureCanvas);
  timer.end("getCaptureImage");

  flowManager.computeFlow(captureImage);
  dots.moveDots();

  drawDisplayData(dots);

  timer.end("processFramePar");
}
function processFrame() {
  if (document.getElementById("parallelize").checked) {
    processFramePar();
  } else {
    processFrameSeq();
  }
  timer.report("timerInfo");
  if (captureActive) {
    setTimeout("processFrame()", 1);
  }
}
function randomize() {
  dotsPar.randomize();
  dotsSeq.randomize();
}
