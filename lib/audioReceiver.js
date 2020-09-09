import { AudioStream } from "./audiostream.js";

let player;

function str2ab(str) {
	const buf = new ArrayBuffer(str.length);
	let bufView = new Uint8Array(buf);
	for (let i = 0, strLen = str.length; i < strLen; i++) {
		bufView[i] = str.charCodeAt(i);
	}
	bufView = null;
	return buf;
}

function receivedStarted() {
	console.log("Disable button?");
}

function receivedStopped() {
	player.stop();
}

function receivedMetadata(metadata) {
	player = new AudioStream().getNewPlayer(metadata);
}

function receivedAudioData(audioData) {
	const byteCharacters = atob(audioData);
	const byteArray = str2ab(byteCharacters);

	player.play(byteArray);
}

export function receive(data) {
	if (data.event == "started") {
		receivedStarted();
	} else if (data.event == "stopped") {
		receivedStopped();
	} else if (data.event == "metadata") {
		const metadata = JSON.parse(data.data);
		receivedMetadata(metadata);
	} else if (data.event == "binary") {
		receivedAudioData(data.data);
	}
}
