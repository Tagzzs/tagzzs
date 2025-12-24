<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.127-brightgreen?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.13-yellow?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![Docker](https://img.shields.io/badge/Docker-27-blue?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)

</div>

&nbsp;

<div align="center">
  <img src="https://drive.google.com/uc?export=view&id=19FvUz9g0X2xXK-7cmDSkXume4PemDmiD" alt="TAGZZS" width="500"/>
</div>

<h3 align="center">
  Your AI Powered Second Brain.
  <br/>
  Organise your stuff into a searchable knowledge.
</h3>

<p align="center"> 
  <a href="https://github.com/Tagzzs/tagzzs/edit/main/README.md"> Documentation </a>· 
  <a href="https://github.com/Tagzzs/tagzzs/issues/new?assignees=&labels=bug&template=bug_report.md&title=%F0%9F%90%9B+Bug%3A+"> Report Bug </a>· 
  <a href="https://github.com/Tagzzs/tagzzs/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=%F0%9F%9A%80+Feature%3A+"> Request Feature </a>·
  <a href="https://tagzzs.com/discord"> Join Discord </a>· 
  <a href="https://x.com/TAGZS_OFFICIAL"> Connect on X </a> 
</p>

<div align="center">
  
  ![Stars](https://img.shields.io/github/stars/Tagzzs/tagzzs?style=flat-square&color=1e3a8a&logo=github&logoColor=white)
  ![Issues](https://img.shields.io/github/issues/Tagzzs/tagzzs?style=flat-square&color=059669&logo=issue-tracker&logoColor=white)
  ![License](https://img.shields.io/github/license/Tagzzs/tagzzs?style=flat-square&color=7c3aed&logo=legal&logoColor=white)
  ![Contributors](https://img.shields.io/github/contributors/Tagzzs/tagzzs?style=flat-square&color=ec4899&logo=people&logoColor=white)
</div>

---

## Getting Started

### Prerequisites

**Required:**

- [Docker](https://docs.docker.com/get-docker/) 20.10 or higher
- [Docker Compose](https://docs.docker.com/compose/install/) v2

**External Services (create free accounts):**

- [Supabase](https://supabase.com) - Authentication & user database
- [Firebase](https://firebase.google.com) - Content database
- [Groq](https://console.groq.com) - LLM API for AI features
- [Chroma Cloud](https://www.trychroma.com/) - Vector database (optional, for cloud embeddings)

**Optional:**

- NVIDIA GPU + [Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) for GPU acceleration

### Installation

```bash
# Clone the repository
git clone https://github.com/Tagzzs/tagzzs.git
cd tagzzs

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your API keys (see External Services Setup below)

# Build and run
docker compose up -d
```

### CPU vs GPU Mode

| Mode              | Command                              |
| ----------------- | ------------------------------------ |
| **CPU** (default) | `docker compose up -d`               |
| **GPU** (NVIDIA)  | `docker compose --profile gpu up -d` |

> GPU recommended for better performance

### Access the Application

| Service     | URL                        |
| ----------- | -------------------------- |
| Frontend    | http://localhost:3000      |
| Backend API | http://localhost:8000      |
| API Docs    | http://localhost:8000/docs |

---

## External Services Setup

<details>
<summary><strong>Supabase Setup</strong></summary>

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note down your **Project URL** and **Anon Key** from Settings → API

### 2. Create Storage Buckets

Go to **Storage** in your Supabase dashboard and create these buckets:

- `user_avatars` - For user profile pictures
- `user_uploads` - For user uploaded files
- `user_thumbnails` - For content thumbnails

### 3. Run Database Setup SQL

Go to **SQL Editor** and run the [SQL](supabase/setup.sql):


### 4. Update .env.local

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

</details>

<details>
<summary><strong>Firebase Setup</strong></summary>

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project
3. Enable **Firestore Database** (start in test mode for development)

### 2. Get Configuration

1. Go to Project Settings → General
2. Scroll to "Your apps" and create a Web app
3. Copy the configuration values

### 3. Generate Service Account Key

1. Go to Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save the JSON file securely

### 4. Update .env.local

```bash
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# Firebase Admin SDK (from service account JSON)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

</details>

<details>
<summary><strong>Groq API Setup</strong></summary>

### 1. Get API Key

1. Go to [Groq Console](https://console.groq.com)
2. Create an account and generate an API key

### 2. Update .env.local

```bash
GROQ_API_KEY=gsk_your_api_key_here
```

</details>

---

## Common Commands

```bash
# View logs
docker compose logs -f

# Rebuild after code changes
docker compose up -d --build

# Stop the application
docker compose down

# Stop and remove all data
docker compose down -v

# Rebuild from scratch (no cache)
docker compose build --no-cache && docker compose up -d
```

---

## Troubleshooting

<details>
<summary><strong>Container won't start</strong></summary>

```bash
# Check the logs for errors
docker compose logs -f

# Try rebuilding
docker compose build --no-cache
docker compose up -d
```

</details>

<details>
<summary><strong>Port already in use</strong></summary>

Edit `docker-compose.yaml` and change the port mappings:

```yaml
ports:
  - "3001:3000" # Change 3000 to 3001
  - "8001:8000" # Change 8000 to 8001
```

</details>

<details>
<summary><strong>Environment variables not loading</strong></summary>

Make sure you have `.env.local` in the project root:

```bash
cp .env.example .env.local
# Edit the file with your actual API keys
```

</details>

---

## Features

- **AI-Powered Organization and Retreival**: Automatic tagging, summarization and retreival of your content
- **Semantic Search**: Find exactly what you need with AI-powered search
- **Multi-Format Support**: Extract and organize content from websites, PDFs, images, and youtube videos
- **Smart Tagging**: Zero-shot classification for intelligent categorization
- **Vector Embeddings**: Store and search with semantic understanding
- **Privacy First**: Your knowledge base stays secure and private

---

## Tech Stack

### Frontend

- **Next.js 16** - React framework for production
- **TypeScript 5.9** - Type-safe development
- **TailwindCSS** - Utility-first CSS
- **Shadcn/ui** - UI components

### Backend

- **FastAPI** - Modern Python web framework
- **Groq API** - LLM integration for summarization
- **ChromaDB** - Vector database for embeddings
- **Transformers** - ML models for classification
- **Supabase** - Authentication and user table
- **Firebase** - Content database

---

## Contributing

Tagzzs is Open Source under the [Apache License 2.0](LICENSE), and is the [copyright of its contributors](NOTICE). If you would like to contribute to the software, read the Developer Certificate of Origin Version 1.1 (https://developercertificate.org/). Afterwards, navigate to the [contributing guide](CONTRIBUTING.md) to get started.
