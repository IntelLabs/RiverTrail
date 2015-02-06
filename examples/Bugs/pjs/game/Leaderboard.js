"use strict";
var leaders = [];
function Leader(img, s) {
	var o = {};
	if (arguments.length>0) {
		o.img = img;
		o.score = s;
	} else {
		o.img = captureCanvas.toDataURL();
		o.score = score;
	}
	return o;
}
var startTime = 0, endTime = 0;
function resetCounters() {
	happyBugs = 0;
	frogAte = 0;
	spiderAte = 0;
	score = 0;
	startTime = Date.now();
	endTime = startTime + Config.gameDuration*1000;
}
function redrawCounters() {
    document.getElementById('happyBugs').innerHTML=happyBugs;
    document.getElementById('frogAte').innerHTML=frogAte;
    document.getElementById('spiderAte').innerHTML=spiderAte;
    score = 10*happyBugs + frogAte + spiderAte;
    document.getElementById('score').innerHTML = score;
    var remaining = (endTime - Date.now())/1000;
    if (remaining < 0) remaining = 0;
    document.getElementById('remaining').innerHTML = remaining.toFixed(0);
}

function playGame() {
	if (captureActive) return;
	populateConfigAndOptions();
	initialized = false;
  	setTimeout(function(){gameOver();},Config.gameDuration*1000);
	resetCounters();
    document.getElementById('gameOverMsg').style.visibility='hidden';
	startCapture();
}
function gameOver() {
	if (!captureActive) return;
	stopCapture();	
	var newLeader = new Leader();
	var idx = 0;
	while (idx < leaders.length && leaders[idx].score >= newLeader.score) idx++;
	if (idx < Config.maxLeaders) {
		leaders.splice(idx, 0, newLeader);
		if (leaders.length > Config.maxLeaders) leaders.pop();
	}
	renderLeaderBoard();
	if (idx == 0) Sounds.topChart.playSound();
	else if (idx < Config.maxLeaders) Sounds.chart.playSound();
	else Sounds.gameOver.playSound(); 
    document.getElementById('gameOverMsg').style.visibility='visible';
    if (loopGameFlag()) setTimeout(function(){playGame();},Config.loopRestartDuration*1000);
}

function renderLeaderBoard(){
	for(var i=0; i<leaders.length && i< Config.maxLeaders; i++) {
		document.getElementById('leaderImg'+i).src = leaders[i].img;
		document.getElementById('leaderScore'+i).innerHTML = leaders[i].score;
		document.getElementById('leaderRow'+i).style.visibility = 'visible';		
	}
//	for(i=leaders.length; i<Config.maxLeaders; i++) {
//		document.getElementById('leaderRow'+i).style.visibility = 'hidden';				
//	}
}