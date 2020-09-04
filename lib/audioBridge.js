import { state } from "./state.js";
import audioReceiver from "./audioReceiver.js";

export default (function () {
	let lastTimeStamp = new Date().getTime();
	let initial = true;

	function init() {
		state.gunDB
			.get("audio")
			.get(state.room)
			.on(function (data /*room*/) {
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

	function sendToGun(data) {
		state.gunDB.get("audio").get(state.room).put(data);
	}

	return {
		init: init,
		send: sendToGun,
	};
})();
