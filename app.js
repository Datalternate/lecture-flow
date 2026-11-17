const sampleTranscript = `Today we are looking at the relationship between attention and memory. The first idea to keep in mind is that attention is not a passive filter; it is an active selection process. We constantly decide what deserves our limited cognitive resources.

Working memory is the system that lets us temporarily hold and manipulate information. It is closely linked to attention, but it is not the same thing. A useful way to think about it is as a mental workbench: small, active, and easily interrupted.

When we connect new information to something we already understand, encoding becomes stronger. This is why examples, retrieval practice, and explaining an idea in your own words are more effective than simply re-reading a page.`;

const state = {
  recording: false,
  seconds: 0,
  interval: null,
  mediaRecorder: null,
  stream: null,
  recognition: null,
  transcript: localStorage.getItem('lectureflow-transcript') || '',
  notes: localStorage.getItem('lectureflow-notes') || '',
  chunks: [],
};

const $ = (id) => document.getElementById(id);
const timer = $('timer');
const recordButton = $('record-button');
const recordLabel = $('record-label');
const recordStatus = $('record-status');
const transcriptText = $('transcript-text');
const transcriptEmpty = $('transcript-empty');
const notes = $('notes');
const wordCount = $('word-count');

function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function renderTranscript() {
  const value = state.transcript.trim();
  transcriptText.textContent = value;
  transcriptText.hidden = !value;
  transcriptEmpty.hidden = Boolean(value);
  const count = value ? value.split(/\s+/).length : 0;
  wordCount.textContent = `${count.toLocaleString()} word${count === 1 ? '' : 's'}`;
  localStorage.setItem('lectureflow-transcript', state.transcript);
}

function renderNotes() {
  notes.value = state.notes;
  localStorage.setItem('lectureflow-notes', state.notes);
}

function setRecordingUi(recording) {
  recordButton.classList.toggle('recording', recording);
  recordLabel.textContent = recording ? 'Pause recording' : 'Start recording';
  recordStatus.textContent = recording ? 'Capturing audio + transcript' : 'Microphone ready';
  document.querySelector('.live-pill').innerHTML = recording ? '<i></i> RECORDING LIVE' : '<i></i> READY TO RECORD';
}

async function startRecording() {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    $('support-status').textContent = 'Recording is not supported in this browser';
    recordStatus.textContent = 'Use a recent Chrome, Edge, or Safari';
    return;
  }
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaRecorder = new MediaRecorder(state.stream);
    state.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size) state.chunks.push(event.data);
    };
    state.mediaRecorder.start(60000);
    state.recording = true;
    state.interval = setInterval(() => {
      state.seconds += 1;
      timer.textContent = formatTime(state.seconds);
    }, 1000);
    startSpeechRecognition();
    setRecordingUi(true);
  } catch (error) {
    recordStatus.textContent = 'Microphone permission is needed';
    $('support-status').textContent = error.name === 'NotAllowedError' ? 'Microphone access was denied' : 'Could not access microphone';
  }
}

function pauseRecording() {
  state.recording = false;
  clearInterval(state.interval);
  state.mediaRecorder?.pause();
  state.recognition?.stop();
  setRecordingUi(false);
  recordStatus.textContent = 'Paused — press resume to continue';
  recordLabel.textContent = 'Resume recording';
}

function stopRecording() {
  state.recording = false;
  clearInterval(state.interval);
  state.mediaRecorder?.stop();
  state.stream?.getTracks().forEach((track) => track.stop());
  state.recognition?.stop();
  setRecordingUi(false);
  recordStatus.textContent = state.seconds ? 'Recording saved locally' : 'Microphone ready';
  recordLabel.textContent = 'Start recording';
}

function startSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $('support-status').textContent = 'Audio recording on · live captions unavailable';
    return;
  }
  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.onresult = (event) => {
    let finalText = '';
    for (let index = event.resultIndex; index < event.results.length; index += 1) {
      if (event.results[index].isFinal) finalText += `${event.results[index][0].transcript} `;
    }
    if (finalText) {
      state.transcript = `${state.transcript} ${finalText}`.trim();
      renderTranscript();
    }
  };
  recognition.onerror = () => { $('support-status').textContent = 'Audio recording on · live captions unavailable'; };
  recognition.onend = () => { if (state.recording) recognition.start(); };
  state.recognition = recognition;
  recognition.start();
}

function createSummary() {
  const text = `${state.transcript} ${state.notes}`.trim();
  if (!text) {
    $('summary-text').textContent = 'Add a transcript or a few notes first, then create your study brief.';
    $('key-points').innerHTML = '';
  } else {
    const sentences = text.split(/[.!?]+/).map((sentence) => sentence.trim()).filter((sentence) => sentence.length > 35);
    const summary = sentences.slice(0, 2).join('. ');
    $('summary-text').textContent = `${summary || text.slice(0, 220)}${summary ? '.' : '…'}`;
    $('key-points').innerHTML = sentences.slice(0, 3).map((point) => `<div class="key-point">• ${point}.</div>`).join('');
  }
  $('summary-box').hidden = false;
}

function addToNotes(prefix) {
  const separator = notes.value && !notes.value.endsWith('\n') ? '\n' : '';
  notes.value += `${separator}${prefix}`;
  state.notes = notes.value;
  notes.focus();
  renderNotes();
}

recordButton.addEventListener('click', () => {
  if (!state.recording && state.mediaRecorder?.state === 'paused') {
    state.mediaRecorder.resume();
    state.recording = true;
    state.interval = setInterval(() => { state.seconds += 1; timer.textContent = formatTime(state.seconds); }, 1000);
    startSpeechRecognition();
    setRecordingUi(true);
  } else if (state.recording) {
    pauseRecording();
  } else {
    startRecording();
  }
});
$('paste-demo').addEventListener('click', () => { state.transcript = sampleTranscript; renderTranscript(); });
$('clear-transcript').addEventListener('click', () => { state.transcript = ''; renderTranscript(); });
$('summarize-button').addEventListener('click', createSummary);
$('close-summary').addEventListener('click', () => { $('summary-box').hidden = true; });
$('add-heading').addEventListener('click', () => addToNotes('\n## Key idea\n'));
$('add-bullet').addEventListener('click', () => addToNotes('\n• '));
notes.addEventListener('input', () => { state.notes = notes.value; renderNotes(); $('save-notes').textContent = 'Saved'; });
$('save-notes').addEventListener('click', () => { state.notes = notes.value; renderNotes(); $('save-notes').textContent = 'Saved'; });

const recentLectures = [
  ['Introduction to Cognitive Psychology', 'Yesterday · 01:42:18', '24 notes'],
  ['Research Methods — Week 4', '12 Nov · 02:08:44', '18 notes'],
  ['Counselling Skills Seminar', '08 Nov · 00:56:21', '9 notes'],
];
function renderLibrary() {
  $('lecture-list').innerHTML = recentLectures.map(([title, date, notesCount]) => `
    <article class="lecture-card">
      <div class="lecture-card-top"><span class="card-accent"></span><span>${date}</span></div>
      <h4>${title}</h4>
      <p>⌁ ${notesCount} · Transcript ready</p>
    </article>`).join('');
}

renderTranscript();
renderNotes();
renderLibrary();
