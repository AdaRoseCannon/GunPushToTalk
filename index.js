/* global Gun */

import { state } from "./state.js";
import audioBridge from "./audioBridge.js";
import audioTransmitter from "./audioTransmitter.js";

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
}

audioBridge.init();

showMessage("Welcome to room\n" + state.room);
showMessage("\n\nPress or hold button or spacebar");

function showMessage(msg) {
	message.textContent += `\n${msg}`;
}

const button = window.getElementById("btn-record");
button.addEventListener("pointerdown", () => audioTransmitter.start());
button.addEventListener("onpointerup", () => audioTransmitter.stop());
button.addEventListener("onpointerout", () => audioTransmitter.stop());

let pressedButton = false;

document.onkeyup = function (e) {
	if (e.which == 32) {
		console.log("stop");
		window.pressedButton = false;
		button.onpointerup();
	}
};

document.onkeydown = function (e) {
	if (e.which == 32 && pressedButton == false && button.disabled == false) {
		console.log("start");
		pressedButton = true;
		button.onpointerdown();
	}
};
