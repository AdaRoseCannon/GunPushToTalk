import Writable from "https://cdn.skypack.dev/web-audio-stream/writable";
import audioTransmitter from "./audioTransmitter.js";

const SECOND = 1000;
const TARGET_ENCODING = 16;
const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_CHANNELS = 1;
const DEFAULT_DURATION = 0.5;
const DEFAULT_STOP_DELAY = 1.2;
const AudioContext = window.AudioContext || window.webkitAudioContext;

/**
 * Utility object for processing raw PCM data.
 */
const PCM = (function () {
	/**
	 * Processes raw PCM into an arraybuffer.
	 * Performs downsampling from float to 16-bit and interleaves stereo channels.
	 *
	 * @param {AudioBuffer} audioBuffer
	 * @returns {ArrayBuffer}
	 */
	function process(audioBuffer) {
		function downsample(arr) {
			const out = new Int16Array(arr.length);
			for (let i = 0; i < arr.length; i++) {
				out[i] = arr[i] * 0xffff;
			}
			return out.buffer;
		}

		function interleave(abuffer) {
			const arr = [];
			for (let i = 0; i < abuffer.getChannelData(0).length; i++) {
				const left = abuffer.getChannelData(0)[i];
				const right = abuffer.getChannelData(1)[i];
				arr.push(left);
				arr.push(right);
			}
			return new Float32Array(arr);
		}

		if (audioBuffer.numberOfChannels == 1) {
			return downsample(audioBuffer.getChannelData(0));
		}

		const interleaved = interleave(audioBuffer);
		return downsample(interleaved);
	}

	/**
	 * Converts raw PCM into WAV.
	 *
	 * @param {numChannels, sampleRate, bytesPerSample} opts
	 * @param {ArrayBuffer} data
	 * @returns {ArrayBuffer}
	 */
	function toWav(opts, data) {
		const numFrames = data.byteLength / opts.bytesPerSample;
		const numChannels = opts.numChannels || 1;
		const sampleRate = opts.sampleRate || 44100;
		const bytesPerSample = opts.bytesPerSample || 2;
		const blockAlign = numChannels * bytesPerSample;
		const byteRate = sampleRate * blockAlign;
		let dataSize = numFrames * blockAlign;
		dataSize = data.byteLength;

		const buffer = new ArrayBuffer(44);
		const dv = new DataView(buffer);

		let p = 0;

		function writeString(s) {
			for (let i = 0; i < s.length; i++) {
				dv.setInt8(p + i, s.charCodeAt(i));
			}
			p += s.length;
		}

		function writeUint32(d) {
			dv.setInt32(p, d, true);
			p += 4;
		}

		function writeUint16(d) {
			dv.setInt16(p, d, true);
			p += 2;
		}

		writeString("RIFF"); // ChunkID
		writeUint32(dataSize + 36); // ChunkSize
		writeString("WAVE"); // Format
		writeString("fmt "); // Subchunk1ID
		writeUint32(16); // Subchunk1Size
		writeUint16(1); // AudioFormat
		writeUint16(numChannels); // NumChannels
		writeUint32(sampleRate); // SampleRate
		writeUint32(byteRate); // ByteRate
		writeUint16(blockAlign); // BlockAlign
		writeUint16(bytesPerSample * 8); // BitsPerSample
		writeString("data"); // Subchunk2ID
		writeUint32(dataSize); // Subchunk2Size

		const header = new Int8Array(buffer);
		const pcm = new Int8Array(data);
		const wav = new Int8Array(header.byteLength + pcm.byteLength);
		wav.set(header);
		wav.set(pcm, header.byteLength);
		return wav.buffer;
	}

	return {
		process,
		toWav,
	};
})();

/**
 * AudioStream class for sending and receiving audio in 'almost' real-time.
 */
export default function AudioStream() {
	this.configuration = {};

	function setIfNull(conf, prop, val) {
		if (!(prop in conf)) {
			conf[prop] = val;
		}
	}
	setIfNull(this.configuration, "sampleRate", DEFAULT_SAMPLE_RATE);
	setIfNull(this.configuration, "channelCount", DEFAULT_CHANNELS);
	setIfNull(this.configuration, "duration", DEFAULT_DURATION);
	setIfNull(this.configuration, "stopDelay", DEFAULT_STOP_DELAY);
}

/**
 * Returns an Audio-Recorder object.
 */
AudioStream.prototype.getRecorder = function () {
	return new Promise((resolve, reject) => {
		const args = {
			audio: {
				sampleRate: this.configuration.sampleRate,
				channelCount: this.configuration.channelCount,
			},
		};
		navigator.mediaDevices
			.getUserMedia(args)
			.then((stream) => {
				let startedRecording = false;
				const context = new AudioContext();
				const mediaRecorder = new MediaRecorder(stream);

				mediaRecorder.addEventListener("dataavailable", (event) => {
					new Response(event.data).arrayBuffer().then((buffer) => {
						// MediaRecorder does not support PCM out of the box -> output needs to be decoded into PCM
						context.decodeAudioData(buffer, (audioBuffer) => {
							if (startedRecording) {
								// sends meta-data first
								const meta = {
									encoding: TARGET_ENCODING,
									sampleRate: audioBuffer.sampleRate,
									channels: audioBuffer.numberOfChannels,
									bufferSize:
										audioBuffer.sampleRate *
										audioBuffer.numberOfChannels *
										this.configuration.duration, // approximation based on sampleDuration
								};
								audioTransmitter.transmitMetadata(
									JSON.stringify({ meta })
								);
								startedRecording = false;
								return;
							}

							const data = PCM.process(audioBuffer);
							audioTransmitter.transmitAudioData(data);
						});
					});
				});

				let interval;

				const start = () => {
					audioTransmitter.transmitStartData("started");

					if (mediaRecorder.state == "recording") {
						mediaRecorder.stop();
					}

					mediaRecorder.start();
					startedRecording = true;

					interval = setInterval(() => {
						mediaRecorder.stop();
						mediaRecorder.start();
					}, this.configuration.duration * SECOND);
				};

				const stop = () => {
					clearInterval(interval);
					mediaRecorder.stop();
					setTimeout(() => {
						audioTransmitter.transmitStopData("stopped");
					}, this.configuration.duration * SECOND);
				};

				resolve({ start, stop });
			})
			.catch((error) => {
				reject(error);
			});
	});
};

/**
 * Returns a new Audio-Player object.
 */
AudioStream.prototype.getNewPlayer = function (metadata) {
	const context = new AudioContext();
	const writable = Writable(context.destination, {
		context: context,
		autoend: true,
	});

	/**
	 * Plays audio.
	 * @param {ArrayBuffer} data
	 */
	function play(data) {
		const opts = {
			numChannels: metadata.channels,
			sampleRate: metadata.sampleRate,
			bytesPerSample: metadata.encoding / 8,
		};
		const wavBuffer = PCM.toWav(opts, data);
		context.decodeAudioData(wavBuffer, (audioBuffer) => {
			writable.write(audioBuffer);
		});
	}

	function stop() {
		context.close();
	}

	return {
		play,
		stop,
	};
};
