/* global Gun */
import "https://cdn.jsdelivr.net/npm/gun/gun.js";
import "https://cdn.jsdelivr.net/npm/gun/lib/unset.js";
import { state } from "./state.js";
import audioBridge from "./audioBridge.js";
import AudioStream from "./audiostream.js";

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
	state.room = "demo room";
}

audioBridge.init();

showMessage("Welcome to room\n" + state.room);
showMessage("\n\nPress or hold button or spacebar");

function showMessage(msg) {
	message.textContent += `\n${msg}`;
}

let audioRecorder;

async function start() {
	if (!audioRecorder) {
		await new AudioStream().getRecorder().then((recorder) => {
			audioRecorder = recorder;
		});
	}
	console.log("Recording");
	audioRecorder.start();
}

function stop() {
	console.log("Not recording");
	audioRecorder.stop();
}

document.onkeyup = function (e) {
	if (e.which == 32) {
		stop();
	}
};

document.onkeydown = function (e) {
	if (e.which == 32) {
		start();
	}
};
