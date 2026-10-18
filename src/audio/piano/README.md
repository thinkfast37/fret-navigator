# Piano samples

Salamander Grand Piano by Alexander Holm (a Yamaha C5 grand), licensed
[CC BY 3.0](https://creativecommons.org/licenses/by/3.0/). These are the MP3 renderings
Tone.js publishes at `https://tonejs.github.io/audio/salamander/`, one every three
semitones from A0 to A7, named `<pitch><octave>.mp3` with `s` for sharp (`Ds1`, `Fs4`).

C8 is deliberately absent: its recording measured almost a semitone sharp (≈4425 Hz
against 4186 Hz), so `src/js/piano-sampler.js` plays A#7–C8 from A7. See research R-801
in `specs/008-instrument-piano/research.md`.
