import AudioStream from "./audiostream.js";
import audioBridge from "./audioBridge.js";
import { state } from "./state.js";

export default (function () {
	let audioRecorder;

	new AudioStream().getRecorder().then((recorder) => {
		audioRecorder = recorder;
	});

	function start() {
		audioRecorder.start();
	}

	function stop() {
		audioRecorder.stop();
	}

	function transmitAudioData(data) {
		const base64String = btoa(
			new Uint8Array(data).reduce(
				(onData, byte) => onData + String.fromCharCode(byte),
				""
			)
		);

		const dataToSend = constructData("binary", base64String);
		audioBridge.send(dataToSend);
	}

	function transmitMetadata(metadata) {
		const dataToSend = constructData("metadata", metadata);
		audioBridge.send(dataToSend);
	}

	function transmitStartData() {
		const dataToSend = constructData("started", "started");
		audioBridge.send(dataToSend);
	}

	function transmitStopData() {
		const dataToSend = constructData("stopped", "stopped");
		audioBridge.send(dataToSend);
	}

	function constructData(event, data) {
		const dataToSend = {};
		dataToSend.user = state.gunDB._.opt.pid;
		dataToSend.event = event;
		dataToSend.timestamp = new Date().getTime();

		if (event == "metadata") {
			dataToSend.data = JSON.stringify(data);
		} else if (event == "binary") {
			dataToSend.data = data;
		}

		return dataToSend;
	}

	return {
		start: start,
		stop: stop,
		transmitStartData: transmitStartData,
		transmitStopData: transmitStopData,
		transmitMetadata: transmitMetadata,
		transmitAudioData: transmitAudioData,
	};
})();
