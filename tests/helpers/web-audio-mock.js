// Feature 008: a recording Web Audio mock, enough of the API for the piano's node graph
// (piano-sampler.js; synth.js until 2026-10-18). jsdom implements no Web Audio, so tests
// assert the graph that was BUILT — buffers, playback rates, start times, envelope ramps,
// connections — never sound.
//
// decodeAudioData "decodes" the bytes as UTF-8 text and returns { source: text }, so a
// fetch mock that answers with the URL's own text (sampleFetchMock below) lets a test
// read which recording a buffer source is playing.

class MockParam {
  constructor(value = 0) {
    this.value = value;
    this.events = [];
  }
  setValueAtTime(value, time) {
    this.events.push({ type: "set", value, time });
  }
  linearRampToValueAtTime(value, time) {
    this.events.push({ type: "linear", value, time });
  }
  exponentialRampToValueAtTime(value, time) {
    this.events.push({ type: "exponential", value, time });
  }
}

class MockNode {
  constructor(ctx, kind) {
    this.ctx = ctx;
    this.kind = kind;
    this.connections = [];
  }
  connect(target) {
    this.connections.push(target);
    return target;
  }
}

export class RecordingAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.sampleRate = 8000;
    this.destination = new MockNode(this, "destination");
    this.nodes = [];
    RecordingAudioContext.instances.push(this);
  }
  resume() {
    this.state = "running";
    return Promise.resolve();
  }
  close() {
    this.state = "closed";
    return Promise.resolve();
  }
  track(node) {
    this.nodes.push(node);
    return node;
  }
  createGain() {
    const node = new MockNode(this, "gain");
    node.gain = new MockParam(1);
    return this.track(node);
  }
  createBiquadFilter() {
    const node = new MockNode(this, "biquad");
    node.type = "lowpass";
    node.frequency = new MockParam(350);
    node.Q = new MockParam(1);
    return this.track(node);
  }
  createOscillator() {
    const node = new MockNode(this, "oscillator");
    node.type = "sine";
    node.frequency = new MockParam(440);
    node.detune = new MockParam(0);
    node.start = (when) => (node.startedAt = when);
    node.stop = (when) => (node.stoppedAt = when);
    return this.track(node);
  }
  createDynamicsCompressor() {
    const node = new MockNode(this, "compressor");
    for (const p of ["threshold", "knee", "ratio", "attack", "release"]) node[p] = new MockParam();
    return this.track(node);
  }
  createConvolver() {
    const node = new MockNode(this, "convolver");
    node.buffer = null;
    return this.track(node);
  }
  createBufferSource() {
    const node = new MockNode(this, "buffer-source");
    node.buffer = null;
    node.playbackRate = new MockParam(1);
    node.start = (when) => (node.startedAt = when);
    node.stop = (when) => (node.stoppedAt = when);
    return this.track(node);
  }
  decodeAudioData(bytes) {
    this.decodeCount = (this.decodeCount || 0) + 1;
    return Promise.resolve({ source: new TextDecoder().decode(bytes) });
  }
  createBuffer(channels, length) {
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, getChannelData: (c) => data[c] };
  }
  oscillators() {
    return this.nodes.filter((n) => n.kind === "oscillator");
  }
  bufferSources() {
    return this.nodes.filter((n) => n.kind === "buffer-source");
  }
}
RecordingAudioContext.instances = [];

export function allOscillators() {
  return RecordingAudioContext.instances.flatMap((ctx) => ctx.oscillators());
}

export function allBufferSources() {
  return RecordingAudioContext.instances.flatMap((ctx) => ctx.bufferSources());
}

// A fetch stand-in for the piano's recordings: answers every URL with its own text as
// the body, records each request, and fails any URL in `failing`.
export function sampleFetchMock() {
  const mock = {
    requests: [],
    failing: new Set(),
    fetch: (url) => {
      const href = String(url);
      mock.requests.push(href);
      if (mock.failing.has(href)) return Promise.resolve({ ok: false, status: 503 });
      return Promise.resolve({ ok: true, status: 200, arrayBuffer: () => Promise.resolve(new TextEncoder().encode(href).buffer) });
    },
  };
  return mock;
}
