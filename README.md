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

- [Docker](https://docs.docker.com/get-docker/) 20.10 or higher
- [Docker Compose](https://docs.docker.com/compose/install/) v2
- (Optional) NVIDIA GPU + [Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html) for GPU acceleration

### Installation

```bash
# Clone the repository
git clone https://github.com/Tagzzs/tagzzs.git
cd tagzzs

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your API keys (required)
# You'll need: Supabase, Firebase, Groq API keys

# Build and run
docker compose up -d
```

### CPU vs GPU Mode

| Mode              | Command                              |
| ----------------- | ------------------------------------ |
| **CPU** (default) | `docker compose up -d`               |
| **GPU** (NVIDIA)  | `docker compose --profile gpu up -d` |


### Access the Application

| Service     | URL                        |
| ----------- | -------------------------- |
| Frontend    | http://localhost:3000      |
| Backend API | http://localhost:8000      |
| API Docs    | http://localhost:8000/docs |

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
