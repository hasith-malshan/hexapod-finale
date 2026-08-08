import collections
import math
import threading
import time
import logging
from typing import Deque, Optional
import numpy as np

try:
    import aubio
    import soundcard as sc
    from scipy.signal import butter, lfilter
except ImportError:
    pass

from .state import state
from .config import RATE, CHUNK, FFT_SIZE, TEMPO_WINDOW, STATE_UPDATE_SECONDS, NO_BEAT_IDLE_SECONDS
from .choreography import update_dance_plan

def log_event(message: str):
    logging.info(message)
    print(message)

def butter_bandpass(lowcut, highcut, fs, order=4):
    nyq = 0.5 * fs
    low = lowcut / nyq
    high = highcut / nyq
    b, a = butter(order, [low, high], btype='band')
    return b, a

def butter_bandpass_filter(data, lowcut=300, highcut=3000, fs=RATE, order=4):
    b, a = butter_bandpass(lowcut, highcut, fs, order=order)
    y = lfilter(b, a, data)
    return np.ascontiguousarray(y, dtype=np.float32)

class AudioRingBuffer:
    def __init__(self, samples: int):
        self.data = np.zeros(samples, dtype=np.float32)
        self.index = 0
        self.full = False
        self.lock = threading.Lock()

    def append(self, chunk: np.ndarray):
        chunk = np.asarray(chunk, dtype=np.float32)
        if len(chunk) >= len(self.data): chunk = chunk[-len(self.data):]
        with self.lock:
            end = self.index + len(chunk)
            if end <= len(self.data):
                self.data[self.index:end] = chunk
            else:
                first = len(self.data) - self.index
                self.data[self.index:] = chunk[:first]
                self.data[:end - len(self.data)] = chunk[first:]
            self.index = end % len(self.data)
            if end >= len(self.data): self.full = True

    def snapshot(self, sample_count: Optional[int] = None) -> np.ndarray:
        with self.lock:
            if self.full:
                ordered = np.concatenate((self.data[self.index:], self.data[:self.index]))
            else:
                ordered = self.data[:self.index].copy()
        if sample_count is not None: ordered = ordered[-sample_count:]
        return np.ascontiguousarray(ordered, dtype=np.float32)

audio_ring = AudioRingBuffer(RATE * 5)

def robust_normalize(value: float, history: Deque[float], default=0.5) -> float:
    if len(history) < 30: return default
    values = np.asarray(history, dtype=np.float32)
    low, high = np.percentile(values, [20, 85])
    if high - low < 1e-6: return default
    return float(np.clip((value - low) / (high - low), 0.0, 1.0))

class AdaptiveMusicAnalyzer:
    def __init__(self):
        self.tempo = aubio.tempo("specflux", TEMPO_WINDOW, CHUNK, RATE)
        self.tempo.set_threshold(0.45)
        self.window = np.hanning(FFT_SIZE).astype(np.float32)
        self.previous_spectrum = np.zeros(FFT_SIZE // 2 + 1, dtype=np.float32)
        self.frequencies = np.fft.rfftfreq(FFT_SIZE, d=1.0 / RATE)
        self.bass_mask = (self.frequencies >= 40) & (self.frequencies < 250)

        frames_per_30s = int(30 * RATE / CHUNK)
        self.rms_history: Deque[float] = collections.deque(maxlen=frames_per_30s)
        self.flux_history: Deque[float] = collections.deque(maxlen=frames_per_30s)

        self.second_rms = []
        self.second_flux = []
        self.second_onsets = 0
        self.last_state_update = time.monotonic()
        self.last_accepted_beat = 0.0

        self.candidate_signature = None
        self.candidate_count = 0

    def process(self, chunk: np.ndarray, now: float) -> bool:
        padded = np.zeros(FFT_SIZE, dtype=np.float32)
        padded[:len(chunk)] = chunk
        spectrum = np.abs(np.fft.rfft(padded * self.window)).astype(np.float32)
        spectrum /= max(float(np.sum(spectrum)), 1e-9)

        positive_change = np.maximum(spectrum - self.previous_spectrum, 0.0)
        flux = float(np.sqrt(np.sum(positive_change * positive_change)))
        self.previous_spectrum = spectrum

        rms = float(np.sqrt(np.mean(chunk * chunk) + 1e-12))
        rms_db = 20.0 * math.log10(max(rms, 1e-6))
        peak = float(np.max(np.abs(chunk)))

        with state.lock:
            state.rms_db = rms_db
            state.peak_amplitude = peak

        if len(self.flux_history) >= 20:
            recent = np.asarray(list(self.flux_history)[-120:], dtype=np.float32)
            onset = flux > max(float(np.median(recent) + 1.8 * np.std(recent)), 1e-4) and rms_db > -55.0
        else:
            onset = False

        self.rms_history.append(rms_db)
        self.flux_history.append(flux)

        self.second_rms.append(rms_db)
        self.second_flux.append(flux)
        if onset: self.second_onsets += 1

        detected = bool(self.tempo(np.ascontiguousarray(chunk, dtype=np.float32))[0])
        beat = False
        if detected and now - self.last_accepted_beat >= 0.18:
            raw_bpm = float(self.tempo.get_bpm())
            if 45.0 <= raw_bpm <= 210.0:
                self.last_accepted_beat = now
                beat = True
                with state.lock:
                    state.raw_bpm = raw_bpm
                    state.bpm_history.append(raw_bpm)
                    state.bpm = float(np.median(state.bpm_history))
                    state.last_beat_time = now

        if now - self.last_state_update >= STATE_UPDATE_SECONDS and self.second_rms:
            elapsed = max(now - self.last_state_update, 1e-3)
            self.last_state_update = now

            mean_rms = float(np.mean(self.second_rms))
            mean_flux = float(np.mean(self.second_flux))
            onset_rate = self.second_onsets / elapsed
            self.second_rms.clear()
            self.second_flux.clear()
            self.second_onsets = 0

            energy_score = robust_normalize(mean_rms, self.rms_history)
            flux_score = robust_normalize(mean_flux, self.flux_history)
            activity_score = 0.70 * flux_score + 0.30 * float(np.clip(onset_rate / 5.0, 0.0, 1.0))

            with state.lock:
                rhythm = "UNKNOWN" if state.bpm <= 0 else (
                    "MEDIUM" if state.bpm < 128 else "FAST") if state.bpm >= 88 else (
                    "MEDIUM" if activity_score >= 0.78 else "SLOW")
                energy = "HIGH" if energy_score >= 0.70 else "LOW" if energy_score <= 0.32 else "MEDIUM"
                activity = "BUSY" if activity_score >= 0.70 else "SMOOTH" if activity_score <= 0.32 else "MODERATE"

                signature = (rhythm, energy, activity)
                if signature == self.candidate_signature:
                    self.candidate_count += 1
                else:
                    self.candidate_signature, self.candidate_count = signature, 1

                if self.candidate_count >= 3:
                    state.rhythm_speed, state.energy_level, state.activity_level = rhythm, energy, activity

                if now - state.last_beat_time > NO_BEAT_IDLE_SECONDS:
                    state.mood = "IDLE"
                elif state.energy_level == "HIGH" and state.activity_level == "BUSY":
                    state.mood = "AGGRESSIVE"
                elif state.energy_level in ("MEDIUM", "HIGH"):
                    state.mood = "ENERGY"
                else:
                    state.mood = "CHILL"

        return beat

def audio_listener():
    from .voice_cmd import process_voice_command
    
    analyzer = AdaptiveMusicAnalyzer()
    aubio_syllable = aubio.onset("mkl", 1024, CHUNK, RATE)
    aubio_syllable.set_threshold(0.3)
    syllables = []

    try:
        if state.audio_source == "BT":
            speaker = sc.default_speaker()
            microphone = sc.get_microphone(id=str(speaker.name), include_loopback=True)
            log_event(f"🎧 Analysing loopback audio: {speaker.name}")
        else:
            microphone = sc.default_microphone()
            log_event(f"🎙️ Analysing microphone: {microphone.name}")

        last_log = 0.0
        with microphone.recorder(samplerate=RATE, channels=1) as recorder:
            while True:
                chunk = recorder.record(numframes=CHUNK).reshape(-1).astype(np.float32)
                if len(chunk) != CHUNK: continue
                chunk = np.nan_to_num(chunk, copy=False)
                chunk = np.clip(chunk, -1.0, 1.0)
                audio_ring.append(chunk)

                now = time.monotonic()
                analyzer.process(chunk, now)
                update_dance_plan()

                if aubio_syllable(butter_bandpass_filter(chunk))[0]: syllables.append(now)
                syllables = [t for t in syllables if now - t <= 3.0]

                with state.lock:
                    state.syllable_count = len(syllables)
                    va = state.voice_active
                    override = now < state.voice_override_until

                if len(syllables) > 8 and not va and not override:
                    with state.lock: state.voice_active = True
                    audio_bytes = (np.clip(audio_ring.snapshot(RATE * 4), -1, 1) * 32767).astype(np.int16).tobytes()
                    threading.Thread(target=process_voice_command, args=(audio_bytes,), daemon=True).start()
                    syllables.clear()

                if state.show_audio_logs and now - last_log >= 1.0:
                    last_log = now
                    with state.lock:
                        log_event(
                            f"🎵 BPM={state.bpm:5.1f} | Syl/3s={state.syllable_count} | "
                            f"Mood={state.mood} | Ctx={state.audio_context[:18]}"
                        )
    except Exception as exc:
        log_event(f"❌ Audio listener stopped: {exc}")
        while True: time.sleep(1)
