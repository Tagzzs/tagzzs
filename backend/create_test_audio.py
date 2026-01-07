#!/usr/bin/env python3

import requests
import tempfile
import wave
import struct
import os

# Create a test audio file
def create_test_wav(filename, duration_seconds=5):
    """Create a simple WAV file with a tone"""
    sample_rate = 16000
    frequency = 440  # A4 note
    amplitude = 32767 // 2

    with wave.open(filename, 'wb') as wav_file:
        wav_file.setnchannels(1)  # Mono
        wav_file.setsampwidth(2)  # 16-bit
        wav_file.setframerate(sample_rate)

        # Generate a sine wave
        import math
        for i in range(int(sample_rate * duration_seconds)):
            sample = int(amplitude * math.sin(2 * math.pi * frequency * i / sample_rate))
            wav_file.writeframes(struct.pack('<h', sample))

# Create test file
test_file = tempfile.NamedTemporaryFile(suffix='.wav', delete=False)
create_test_wav(test_file.name, duration_seconds=3)
print(f"Created test audio file: {test_file.name}")

# Upload to the API
url = "http://localhost:8000/audio/upload"

# For testing without auth, we'll need to mock or skip auth
# Since the endpoint requires auth, let's create a simple test without auth first

print("Test audio file created successfully!")
print(f"File size: {os.path.getsize(test_file.name)} bytes")
print("You can now upload this file to test the audio endpoint.")

# Clean up
os.unlink(test_file.name)
print("Test file cleaned up.")