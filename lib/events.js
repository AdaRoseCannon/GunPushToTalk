import { state } from "./state.js";

export class Events {
	constructor() {
		this.appEvents = ["started", "stopped"];
		this.listeners = {};
	}
	send(data) {
		// console.log(data);
		if (typeof data === "string") {
			if (this.appEvents.includes(data)) {
				this.dispatchEvent(data, data);
			} else {
				try {
					const o = JSON.parse(data);
					if ("meta" in o) {
						this.dispatchEvent("metadata", o.meta);
					} else {
						// do nothing for now!
					}
				} catch (e) {
					// do nothing!
				}
			}
		} else {
			const base64String = btoa(
				new Uint8Array(data).reduce(
					(onData, byte) => onData + String.fromCharCode(byte),
					""
				)
			);

			this.dispatchEvent("binary", base64String);
		}
	}
	addEventListener(event, callback) {
		if (!(event in this.listeners)) {
			this.listeners[event] = [];
		}
		this.listeners[event].push(callback);
	}
	removeEventListener(event, callback) {
		if (!(event in this.listeners)) {
			return;
		}
		for (let i = 0, l = this.listeners[event].length; i < l; i++) {
			if (this.listeners[event][i] === callback) {
				this.listeners[event].splice(i, 1);
				return;
			}
		}
	}
	dispatchEvent(event, data) {
		if (!(event in this.listeners)) {
			return;
		}
		// for (var i = 0; i < this.listeners[event].length; i++) {
		// this.listeners[event][i].call(this, data);
		// console.log("sent\n" + JSON.stringify(data));
		const sentData = {};
		sentData.user = state.gunDB._.opt.pid;
		sentData.event = event;
		sentData.timestamp = new Date().getTime();

		if (event == "metadata") {
			sentData.data = JSON.stringify(data);
		} else {
			sentData.data = data;
		}

		state.gunDB.get("audio").get(state.room).put(sentData);
		// }
	}
}
