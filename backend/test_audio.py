#!/usr/bin/env python3

import sys
import os
import tempfile
import wave
import struct

# Add to path
sys.path.insert(0, '.')

# Now import
from app.services.extractors.audio import extract_audio

# Create a dummy audio file for testing
def create_test_wav(filename):
    # Create a simple WAV file with silence
    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(16000)  # 16kHz
        # Write 1 second of silence
        for _ in range(16000):
            wav_file.writeframes(struct.pack('<h', 0))

# Mock UploadFile
class MockUploadFile:
    def __init__(self, filename, file_path):
        self.filename = filename
        self.file = open(file_path, 'rb')

# Test extract_audio
try:
    temp_wav = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
    create_test_wav(temp_wav.name)
    
    mock_file = MockUploadFile('test.wav', temp_wav.name)
    result = extract_audio(mock_file)
    print("✅ extract_audio test passed!")
    print(f"Transcript: {result['transcript']}")
    print(f"Metadata: {result['metadata']}")
    
    # Clean up
    os.unlink(temp_wav.name)
    
except Exception as e:
    print(f"❌ extract_audio test failed: {e}")
    import traceback
    traceback.print_exc()

print("Audio feature integration test completed!")