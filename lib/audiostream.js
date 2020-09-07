import Writable from "https://rawcdn.githack.com/AdaRoseCannon/web-audio-stream/c12130eee6409fd261cb2913100c1a26a84206a2/writable.esm.js";
import audioTransmitter from "./audioTransmitter.js";
import * as PCM from "./pcm.js";

const SECOND = 1000;
const TARGET_ENCODING = 16;
const DEFAULT_SAMPLE_RATE = 44100;
const DEFAULT_CHANNELS = 1;
const DEFAULT_DURATION = 0.5;
const DEFAULT_STOP_DELAY = 1.2;
const AudioContext = window.AudioContext || window.webkitAudioContext;

/**
 * AudioStream class for sending and receiving audio in 'almost' real-time.
 */
class AudioStream {
	constructor() {
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
	async getRecorder() {
		const args = {
			audio: {
				sampleRate: this.configuration.sampleRate,
				channelCount: this.configuration.channelCount,
			},
		};
		const stream = await navigator.mediaDevices.getUserMedia(args);
		let startedRecording = false;
		const context = new AudioContext();
		const mediaRecorder = new MediaRecorder(stream);

		mediaRecorder.addEventListener("dataavailable", async (event) => {
			const buffer = await new Response(event.data).arrayBuffer();

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
							this.configuration.duration,
					};
					audioTransmitter.transmitMetadata(JSON.stringify({ meta }));
					startedRecording = false;
					return;
				}

				const data = PCM.process(audioBuffer);
				audioTransmitter.transmitAudioData(data);
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

		return { start, stop };
	}
	/**
	 * Returns a new Audio-Player object.
	 */
	getNewPlayer(metadata) {
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
	}
}

export default AudioStream;
