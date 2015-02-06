"use strict";

function Sound(sound){
	var audio=document.createElement('audio');
	var src=document.createElement('source');
		src.setAttribute('src', sound);
	src.setAttribute('type', 'audio/wav')
	audio.appendChild(src);
	audio.load();
	audio.playSound=function(){
		audio.pause();
		audio.currentTime=0;
		audio.play();
	}
	return audio;
}

var Sounds = {
	frogEat : Sound("sounds/new/squelch.wav"),
	spiderEat : Sound("sounds/new/eat.wav"),
	topChart : Sound("sounds/new/cheer.wav"),
	chart : Sound("sounds/new/smallcrowd.wav"),
	gameOver : Sound("sounds/new/aww.wav"),
	cheer : Sound("sounds/new/giggles.wav"),
};
