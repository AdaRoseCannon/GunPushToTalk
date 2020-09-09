/**
 * Push-to-Talk object.
 */
import { state } from "./state.js";
import { Events } from "./events.js";
import { AudioStream } from "./audiostream.js";

let audiostream;
let button;
let initial = true;
let lastTimeStamp = new Date().getTime();

export default {
	connect: function () {
		let player;

		/**
		 * Binds UI button to ptt.
		 * @param {HTMLElement} btn
		 */
		const bind = (btn) => {
			button = btn;
			audiostream.getRecorder().then((recorder) => {
				button.onpointerdown = () => {
					recorder.start();
					button.disabled = true;
				};

				button.onpointerup = () => {
					recorder.stop();
					button.disabled = false;
				};

				button.onpointerout = () => {
					if (button.disabled) {
						recorder.stop();
						button.disabled = false;
					}
				};
			});
		};

		// add listener to foo
		state.gunDB
			.get("audio")
			.get(state.room)
			.on(function (data) {
				// console.log("received\n" + data.timestamp);

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

				if (data.event == "started") {
					if (button) {
						button.disabled = true;
					}
				} else if (data.event == "stopped") {
					if (button) {
						button.disabled = false;
					}
					player.stop();
				} else if (data.event == "metadata") {
					const metadata = JSON.parse(data.data);
					player = audiostream.getNewPlayer(metadata);
				} else if (data.event == "binary") {
					const byteCharacters = atob(data.data);
					const byteArray = str2ab(byteCharacters);

					player.play(byteArray);
				}
			});

		return new Promise((resolve) => {
			const websocket = new Events();
			audiostream = new AudioStream(websocket, {});

			websocket.addEventListener("started", () => {
				if (button) {
					button.disabled = true;
				}
			});

			websocket.addEventListener("stopped", () => {
				if (button) {
					button.disabled = false;
				}
				player.stop();
			});

			websocket.addEventListener("metadata", (metadata) => {
				player = audiostream.getNewPlayer(metadata);
			});

			websocket.addEventListener("binary", (buffer) => {
				// var base64String = btoa(
				//     new Uint8Array(buffer)
				//         .reduce((onData, byte) => onData + String.fromCharCode(byte), ''));

				const byteCharacters = atob(buffer);
				const byteArray = str2ab(byteCharacters);

				player.play(byteArray);
			});

			resolve({ bind });
		});
	},
};

function str2ab(str) {
	const buf = new ArrayBuffer(str.length);
	let bufView = new Uint8Array(buf);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	bufView = null;
	return buf;
}
