/**
 * Utility object for processing raw PCM data.
 */

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

export { process, toWav };
