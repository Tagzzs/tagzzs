#!/usr/bin/env python3

import sys
import os
import tempfile
import wave
import struct
import asyncio
import unittest.mock

# Mock modules
mock_modules = {
    'google.genai': unittest.mock.MagicMock(),
    'google.genai.types': unittest.mock.MagicMock(),
    'faster_whisper': unittest.mock.MagicMock(),
}

for mod_name, mock_obj in mock_modules.items():
    sys.modules[mod_name] = mock_obj

# Add to path
sys.path.insert(0, '.')

# Mock the services
async def mock_summarize_content(text, **kwargs):
    class MockResponse:
        success = True
        summary = f"Summary: {text[:100]}..."
    return MockResponse()

async def mock_generate_tags(text, **kwargs):
    class MockTag:
        def __init__(self, name):
            self.name = name
    class MockResponse:
        success = True
        tags = [MockTag("test"), MockTag("audio"), MockTag("sample")]
    return MockResponse()

# Monkey patch
import app.services.refiners.summarizers
import app.services.refiners.tag_generators
app.services.refiners.summarizers.summarize_content = mock_summarize_content
app.services.refiners.tag_generators.generate_tags = mock_generate_tags

# Now import the upload endpoint logic
from app.api.audio.upload import upload_audio

# Create a test audio file with actual speech-like content
def create_test_wav(filename, duration_seconds=3):
    """Create a WAV file with a simple tone"""
    sample_rate = 16000
    frequency = 440  # A4 note
    amplitude = 32767 // 4

    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)

        # Generate a sine wave
        import math
        for i in range(int(sample_rate * duration_seconds)):
            sample = int(amplitude * math.sin(2 * math.pi * frequency * i / sample_rate))
            wav_file.writeframes(struct.pack('<h', sample))

# Mock UploadFile
class MockUploadFile:
    def __init__(self, filename, file_path):
        self.filename = filename
        self.file = open(file_path, 'rb')

# Mock user
class MockUser:
    def __init__(self):
        self.uid = "test_user_123"

async def test_upload():
    print("🎵 Testing Audio Upload Feature")
    print("=" * 50)

    # Create test audio file
    temp_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    create_test_wav(temp_file.name, duration_seconds=2)
    print(f"✅ Created test audio file: {temp_file.name}")

    # Mock file upload
    mock_file = MockUploadFile('test_audio.wav', temp_file.name)
    mock_user = MockUser()

    try:
        # Call the upload function
        result = await upload_audio(mock_file, mock_user)

        print("✅ Upload successful!")
        print(f"📝 Transcript: {result['transcript']}")
        print(f"📊 Metadata: {result['metadata']}")
        print(f"📖 Description: {result['description']}")
        print(f"🏷️  Tags: {result['tags']}")

    except Exception as e:
        print(f"❌ Upload failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Clean up
        os.unlink(temp_file.name)
        print("🧹 Cleaned up test file")

    print("=" * 50)
    print("🎉 Audio upload test completed!")

if __name__ == "__main__":
    asyncio.run(test_upload())