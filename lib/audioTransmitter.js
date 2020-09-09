import { sendToGun } from "./audioBridge.js";
import { state } from "./state.js";

function transmitAudioData(data) {
	const base64String = btoa(
		new Uint8Array(data).reduce(
			(onData, byte) => onData + String.fromCharCode(byte),
			""
		)
	);

	const dataToSend = constructData("binary", base64String);
	sendToGun(dataToSend);
}

function transmitMetadata(metadata) {
	const dataToSend = constructData("metadata", metadata);
	sendToGun(dataToSend);
}

function transmitStartData() {
	const dataToSend = constructData("started", "started");
	sendToGun(dataToSend);
}

function transmitStopData() {
	const dataToSend = constructData("stopped", "stopped");
	sendToGun(dataToSend);
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

export const audioTransmitter = {
	transmitStartData,
	transmitStopData,
	transmitMetadata,
	transmitAudioData,
};
