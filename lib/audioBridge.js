import { state } from "./state.js";
import audioReceiver from "./audioReceiver.js";

let lastTimeStamp = new Date().getTime();
let initial = true;

export function init() {
	state.gunDB
		.get("audio")
		.get(state.room)
		.on(function (data) {
			console.log(data);

			if (initial) {
				initial = false;
				return;
			}

			if (lastTimeStamp == data.timestamp) {
				return;
			}
			lastTimeStamp = data.timestamp;

			if (data.user == state.gunDB._.opt.pid) {
				return;
			}

			audioReceiver.receive(data);
		});
}

export function sendToGun(data) {
	state.gunDB.get("audio").get(state.room).put(data);
}

export default {
	init: init,
	send: sendToGun,
};
