import io

import edge_tts

VOICES = {
    ("en", "male"): "en-US-GuyNeural",
    ("en", "female"): "en-US-JennyNeural",
    ("hi", "male"): "hi-IN-MadhurNeural",
    ("hi", "female"): "hi-IN-SwaraNeural",
}


def _pick_voice(text: str, gender: str) -> str:
    lang = "hi" if any("\u0900" <= c <= "\u097f" for c in text) else "en"
    g = "female" if gender == "female" else "male"
    return VOICES.get((lang, g), VOICES[("en", "male")])


async def synthesize_speech(text: str, gender: str = "male") -> bytes:
    voice = _pick_voice(text, gender)
    communicate = edge_tts.Communicate(text, voice)
    buf = io.BytesIO()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            buf.write(chunk["data"])
    return buf.getvalue()
