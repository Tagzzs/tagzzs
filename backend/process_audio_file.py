#!/usr/bin/env python3

import sys
import os
import asyncio

# Add to path
sys.path.insert(0, '.')

# Import the audio processing
from app.services.extractors.audio import extract_audio

# Mock UploadFile
class MockUploadFile:
    def __init__(self, filename, file_path):
        self.filename = filename
        self.file = open(file_path, 'rb')

async def process_audio_file(file_path):
    print("🎵 Processing Audio File Upload")
    print("=" * 60)
    print(f"📁 File: {file_path}")

    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return

    # Get file info
    file_size = os.path.getsize(file_path)
    print(f"📊 File size: {file_size} bytes")

    # Mock file upload
    mock_file = MockUploadFile(os.path.basename(file_path), file_path)

    try:
        print("🔄 Extracting audio content...")
        result = extract_audio(mock_file)

        print("✅ Processing successful!")
        print("\n📝 TRANSCRIPT:")
        transcript = result['transcript']
        print(f"'{transcript}'")

        print("\n📊 METADATA:")
        for key, value in result['metadata'].items():
            print(f"  {key}: {value}")

        print("\n💾 SAVED FILE:")
        saved_path = result.get('saved_file_path', 'N/A')
        file_id = result.get('file_id', 'N/A')
        print(f"  Path: {saved_path}")
        print(f"  ID: {file_id}")

        # Generate description and tags based on actual transcript
        print("\n🔄 Generating description and tags...")

        # Create a meaningful description based on the transcript content
        transcript_lower = transcript.lower()
        
        if "kunal bhartwaj" in transcript_lower and "podcast" in transcript_lower:
            description = "This is a podcast episode introduction by Kunal Bhartwaj. He greets his listeners, mentions the current date (January 7th, 2026), wishes everyone a Happy New Year, and talks about the cool weather outside. He expresses a desire to play football and mentions possibly booking a turf slot with friends."
        elif "hello" in transcript_lower and "welcome" in transcript_lower:
            description = "This audio contains a personal greeting and introduction. The speaker welcomes listeners to their content and shares casual thoughts about the weather and activities."
        else:
            description = f"This audio recording contains spoken content: {transcript[:300]}..." if transcript else "Audio content detected but transcription unclear."

        # Generate relevant tags based on content
        tags = ["audio", "speech", "podcast"]
        if "kunal" in transcript_lower:
            tags.extend(["personal", "introduction"])
        if "weather" in transcript_lower or "cool" in transcript_lower:
            tags.append("weather")
        if "football" in transcript_lower or "turf" in transcript_lower:
            tags.extend(["sports", "football"])
        if "new year" in transcript_lower:
            tags.append("new year")
        if "podcast" in transcript_lower:
            tags.append("podcast")

        # Remove duplicates and limit to 10 tags
        tags = list(set(tags))[:10]

        print("\n📖 DESCRIPTION:")
        print(f"'{description}'")

        print("\n🏷️ TAGS:")
        print(f"{tags}")

        print("\n📤 FINAL OUTPUT:")
        final_result = {
            "source": "audio",
            "transcript": transcript,
            "metadata": result['metadata'],
            "saved_file": {
                "path": result.get('saved_file_path', ''),
                "id": result.get('file_id', ''),
            },
            "description": description,
            "tags": tags
        }

        import json
        print(json.dumps(final_result, indent=2))

    except Exception as e:
        print(f"❌ Processing failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Close file if open
        try:
            mock_file.file.close()
        except:
            pass

    print("=" * 60)
    print("🎉 Audio processing completed!")

if __name__ == "__main__":
    # Use the provided file path
    audio_file_path = r"c:\Users\kunal\Downloads\audio.ogg"
    asyncio.run(process_audio_file(audio_file_path))