/* global Gun */
import { state } from "./state.js";
import { AudioStream } from "./audiostream.js";
import { init as audioBridgeInit } from "./audioBridge.js";
import { init as activityInit } from "./activity.js";

const peers = [
	"https://livecodestream-us.herokuapp.com/gun",
	"https://livecodestream-eu.herokuapp.com/gun",
];
const opt = { peers: peers, localStorage: false, radisk: false };
state.gunDB = Gun(opt);

const message = document.querySelector("#message");

const hashRoom = window.location.hash.split("#")[1];
if (hashRoom != undefined) {
	state.room = window.location.hash.split("#")[1];
} else {
	state.room = "dem_room";
}

audioBridgeInit();
activityInit();

showMessage("Welcome to room\n" + state.room);
showMessage("\n\nPress or hold spacebar");

function showMessage(msg) {
	message.textContent += `\n${msg}`;
}

let audioRecorder;
let isRecording = false;

async function start() {
	if (!audioRecorder) {
		await new AudioStream().getRecorder().then((recorder) => {
			audioRecorder = recorder;
		});
	}
	console.log("Recording");
	isRecording = true;
	audioRecorder.start();
}

function stop() {
	console.log("Not recording");
	isRecording = false;
	audioRecorder.stop();
}

document.onkeyup = function (e) {
	if (e.which == 32) {
		stop();
	}
};

document.onkeydown = function (e) {
	if (e.which == 32 && !isRecording) {
		start();
	}
};
