# AI Health Copilot 🏥

An intelligent, full-stack healthcare assistant application designed to provide users with accessible medical insights, risk profiling, and structural hospital localization. 

Operating on a modern, decoupled **Client-Server architecture**, the system utilizes a lightweight **React** frontend communicating asynchronously with a robust **FastAPI Python** backend processing Local Large Language Models (LLMs) via Ollama.

---

## ✨ Key Features

### 🤖 AI Chat Copilot & Ayurvedic Guidance
A dynamic conversational interface that parses user symptoms. It employs contextual prompt-engineering to synthesize both modern medical interpretations and traditional Ayurvedic remedy recommendations.

### 🔐 Secure Login & Session Management
High-level authentication using **JWT (JSON Web Tokens)** ensures that user data and health sessions are protected and private.

### 📜 Persistent Medical Chat History
Registered users can save, search, and resume previous medical consultations. All interactions are stored securely in a local SQLite database for future reference.

### 🎙️ Multilingual Voice Assistant (English & Hindi)
Speak your symptoms and receive spoken guidance in both English and Hindi. The system utilizes speech recognition and text-to-speech technologies for hands-free medical consultation.

### 📄 Medical Report Analyzer
Users can upload `.pdf` reports (e.g., blood tests). The system utilizes **PyMuPDF** to extract content, which is then analyzed by the AI to yield a simplified, actionable summary.

### 👁️ Visual Skin Disease Detection
Upload images (`.jpg`/`.png`) of skin conditions for immediate diagnostic perspectives. This feature leverages **Llama 3.2 Vision** for high-accuracy visual analysis.

### ⚖️ Demographic Risk Profiling
Input age, weight, height, and lifestyle habits to calculate BMI and predict long-term risks for Diabetes, Heart Disease, and Obesity.

### 🗺️ Nearby Medical Help (Hospital Finder)
Leveraging **Google Places API**, the platform locates nearby hospitals and clinics, distinguishing between **Government** and **Private** facilities on an interactive map.

---

## 🏗️ System Architecture

The project structurally isolates the User Interface from the Machine Learning logic:

*   **Frontend Domain (`/frontend`)**: Built with **React 19** and **Vite**. Styled with **Tailwind CSS** and **Framer Motion** for premium animations.
*   **Backend Domain (`/backend`)**: Engineered on **FastAPI** for high-performance RESTful networking.
*   **Inference Layer**: Uses **Ollama** locally (`llama3.1:latest` and `llama3.2-vision:11b`) to ensure data privacy and zero cloud inference latency.
*   **Database Layer**: **SQLAlchemy** with **SQLite** for user management and secure chat persistence.

---

## 🛠️ Technology Stack

| Component | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript + Vite |
| **Styling** | Tailwind CSS + Lucide Icons |
| **Backend API** | FastAPI (Python 3.10+) |
| **LLM Engine** | Ollama (Llama 3.1, Llama 3.2 Vision) |
| **Database** | SQLite + SQLAlchemy ORM |
| **Auth** | JWT (JSON Web Tokens) |
| **Maps** | Google Maps SDK for React |
| **PDF Processing** | PyMuPDF (fitz) + PyPDF2 |

---

## 📂 Project Structure

```text
Dev_Project/
├── backend/                # FastAPI Application
│   ├── features/           # Modular healthcare tools
│   ├── utils/              # LLM and Auth helpers
│   ├── models.py           # Database schemas
│   ├── server.py           # API endpoints
│   └── requirements.txt    # Python dependencies
├── frontend/               # React Application
│   ├── src/
│   │   ├── pages/          # Dashboard, Chat, NearbyHelp, etc.
│   │   ├── components/     # UI Elements
│   │   └── layout/         # App Layout wrappers
│   └── package.json        # Node dependencies
└── health_copilot.db       # Local SQLite Database
```

---

## 🚀 Getting Started

### Prerequisites
- **Python 3.10+**
- **Node.js 18+**
- **Ollama** (Ensure `llama3.1` and `llama3.2-vision` models are pulled)

### 1. Initialize Backend
1. Navigate to the backend directory:
    ```bash
    cd backend
    ```
2. Create and activate a virtual environment:
    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    ```
3. Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
4. Start the server:
    ```bash
    uvicorn server:app --reload --port 8000
    ```

### 2. Initialize Frontend
1. Navigate to the frontend directory:
    ```bash
    cd frontend
    ```
2. Install dependencies:
    ```bash
    npm install
    ```
3. Create a `.env` file and add your Google Maps API Key:
    ```env
    VITE_GOOGLE_MAPS_API_KEY=your_api_key_here
    ```
4. Start the development server:
    ```bash
    npm run dev
    ```

### 3. Usage
Launch your browser and visit `http://localhost:5173/`.

> [!NOTE]
> Ensure Ollama is running in the background for AI features to function.

---

## 🔄 Technical Data Workflow
1. **User Interaction**: Client captures inputs (text, PDFs, Images) and builds `FormData`.
2. **REST Processing**: Payloads transmitted via Axios to FastAPI.
3. **Data Parsing**: Backend extracts text (PyMuPDF) and builds system-level prompts.
4. **LLM Execution**: `ollama.chat` yields generation chunks asynchronously.
5. **Streaming**: React receives chunks and updates the UI in real-time.

---
© 2026 AI Health Copilot Project
