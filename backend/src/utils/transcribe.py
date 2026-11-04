import sys
import os
import json
import numpy as np

# Ensure stdout uses utf-8
sys.stdout.reconfigure(encoding='utf-8')

def transcribe(audio_path):
    if not os.path.exists(audio_path):
        return {"success": False, "error": f"File not found: {audio_path}", "text": "", "segments": []}

    try:
        import av
    except ImportError:
        return {"success": False, "error": "PyAV is required for audio decoding", "text": "", "segments": []}

    # Decode audio to 16kHz float32 mono array
    try:
        container = av.open(audio_path)
        resampler = av.AudioResampler(format='fltp', layout='mono', rate=16000)
        chunks = []
        for frame in container.decode(audio=0):
            for rf in resampler.resample(frame):
                chunks.append(rf.to_ndarray()[0])

        if not chunks:
            return {"success": False, "error": "No audio stream found in file", "text": "", "segments": []}

        audio_data = np.concatenate(chunks).astype(np.float32)
        total_seconds = len(audio_data) / 16000.0
        duration_sec = round(total_seconds)
    except Exception as e:
        return {"success": False, "error": f"Audio decoding failed: {str(e)}", "text": "", "segments": []}

    # 1. Primary: Use faster-whisper neural Speech-to-Text
    try:
        from faster_whisper import WhisperModel
        model = WhisperModel("tiny", device="cpu", compute_type="int8")
        whisper_segments, info = model.transcribe(
            audio_data,
            beam_size=3,
            vad_filter=True, # Built-in Silero VAD to eliminate silence hallucinations
            vad_parameters=dict(min_silence_duration_ms=500)
        )

        segments = []
        text_parts = []
        for s in whisper_segments:
            clean_s_text = s.text.strip()
            if not clean_s_text:
                continue
            m = int(s.start) // 60
            sec = int(s.start) % 60
            segments.append({
                "time": f"{m:02d}:{sec:02d}",
                "seconds": round(s.start),
                "text": clean_s_text
            })
            text_parts.append(clean_s_text)

        full_text = " ".join(text_parts).strip()
        if full_text:
            return {
                "success": True,
                "duration": duration_sec,
                "language": getattr(info, 'language', 'hi'),
                "text": full_text,
                "segments": segments
            }
    except Exception as whisper_err:
        pass

    # 2. Fallback: SpeechRecognition with silence handling
    try:
        import io
        import wave
        import speech_recognition as sr

        container.seek(0)
        resampler_s16 = av.AudioResampler(format='s16', layout='mono', rate=16000)
        wav_io = io.BytesIO()
        with wave.open(wav_io, 'wb') as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(16000)
            for frame in container.decode(audio=0):
                for rf in resampler_s16.resample(frame):
                    wf.writeframes(rf.to_ndarray().tobytes())

        r = sr.Recognizer()
        wav_io.seek(0)
        with sr.AudioFile(wav_io) as source:
            audio_all = r.record(source)

        transcribed = None
        for lang in ['hi-IN', 'en-IN', 'en-US']:
            try:
                transcribed = r.recognize_google(audio_all, language=lang)
                if transcribed and transcribed.strip():
                    break
            except:
                continue

        if transcribed:
            return {
                "success": True,
                "duration": duration_sec,
                "text": transcribed.strip(),
                "segments": [{"time": "00:00", "seconds": 0, "text": transcribed.strip()}]
            }
    except Exception as fallback_err:
        pass

    return {
        "success": True,
        "duration": duration_sec,
        "text": "No intelligible speech detected in recording.",
        "segments": []
    }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"success": False, "error": "No file path provided", "segments": []}))
        sys.exit(1)

    file_path = sys.argv[1]
    result = transcribe(file_path)
    print(json.dumps(result, ensure_ascii=False))
