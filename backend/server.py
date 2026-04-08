import os
import io
import json
import asyncio
import uuid
import shutil
import PyPDF2
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, status, BackgroundTasks, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from utils.llm_helper import get_text_completion, get_vision_completion, get_simple_completion
from features.hospital_finder import get_google_places, categorize_facility
from utils.auth_utils import get_password_hash, verify_password, create_access_token, decode_access_token
from database import engine, Base, get_db
from models import User, Conversation, Message

import speech_recognition as sr
import pyttsx3
import tempfile
import fitz  # PyMuPDF

# Initialize Database
Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Health Copilot API")

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

# Mount static files for attachments
app.mount("/api/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# Allow CORS for local Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For dev purposes
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def format_stream_response(generator, db: Session = None, message_obj: Message = None):
    """ Helper to format async/sync generator as Server-Sent Events (SSE) and save response to DB """
    async def event_generator():
        full_response = ""
        try:
            for chunk in generator:
                full_response += chunk
                yield chunk
                await asyncio.sleep(0.01) # Yield control
            
            # Save AI response to DB if message object was provided
            if db and message_obj:
                ai_message = Message(
                    conversation_id=message_obj.conversation_id,
                    role="assistant",
                    content=full_response
                )
                db.add(ai_message)
                db.commit()
                
        except Exception as e:
            yield f"Error: {str(e)}"
    return StreamingResponse(event_generator(), media_type="text/plain")

async def get_current_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token expired or invalid")
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

async def get_optional_user(authorization: str = Header(None), db: Session = Depends(get_db)):
    """Small wrapper for guest access where auth is optional."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    return db.query(User).filter(User.id == user_id).first()

# --- BACKGROUND TASKS ---
def save_message_task(conversation_id: int, role: str, content: str, file_path: str = None, file_type: str = None):
    """Saves a message to the database in the background to ensure persistence even if stream is interrupted."""
    from database import SessionLocal
    db = SessionLocal()
    try:
        new_msg = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            file_path=file_path,
            file_type=file_type
        )
        db.add(new_msg)
        db.commit()
    except Exception as e:
        print(f"Error saving message in background: {e}")
    finally:
        db.close()

# --- AUTH ENDPOINTS ---

@app.post("/api/register")
async def register(username: str = Form(...), email: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    # Check if user exists
    if db.query(User).filter((User.username == username) | (User.email == email)).first():
        raise HTTPException(status_code=400, detail="Username or email already registered")
    
    hashed_pwd = get_password_hash(password)
    new_user = User(username=username, email=email, password_hash=hashed_pwd)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = create_access_token(data={"sub": str(new_user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": new_user.id, "username": new_user.username}}

@app.post("/api/login")
async def login(username: str = Form(...), password: str = Form(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": {"id": user.id, "username": user.username}}

# --- HISTORY ENDPOINTS ---

@app.get("/api/conversations")
async def list_conversations(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    convs = db.query(Conversation).filter(Conversation.user_id == user.id).order_by(Conversation.updated_at.desc()).all()
    return [{"id": c.id, "title": c.title, "updated_at": c.updated_at} for c in convs]

@app.get("/api/conversations/{id}")
async def get_conversation(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id, Conversation.user_id == user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    messages = db.query(Message).filter(Message.conversation_id == id).order_by(Message.timestamp.asc()).all()
    return {
        "id": conv.id,
        "title": conv.title,
        "messages": [
            {
                "role": m.role,
                "content": m.content,
                "file_path": f"/api/uploads/{os.path.basename(m.file_path)}" if m.file_path else None,
                "file_type": m.file_type,
                "timestamp": m.timestamp
            } for m in messages
        ]
    }

@app.delete("/api/conversations/{id}")
async def delete_conversation(id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    conv = db.query(Conversation).filter(Conversation.id == id, Conversation.user_id == user.id).first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    
    db.delete(conv)
    db.commit()
    return {"detail": "Conversation deleted successfully"}

# --- AI ENDPOINTS (UPDATED) ---

@app.post("/api/chat")
async def chat_endpoint(
    background_tasks: BackgroundTasks,
    message: str = Form(...), 
    conversation_id: int = Form(None), 
    user: User = Depends(get_optional_user), 
    db: Session = Depends(get_db)
):
    if user:
        # Handle conversation persistence for logged-in users
        if not conversation_id:
            title_prompt = f"Generate a short, 3-5 word title for a medical conversation based on this user message: {message}. Output ONLY the title text, no quotes or period."
            smart_title = get_simple_completion(title_prompt)
            if "Error" in smart_title or not smart_title:
                smart_title = message[:30] + "..."
                
            new_conv = Conversation(user_id=user.id, title=smart_title)
            db.add(new_conv)
            db.commit()
            db.refresh(new_conv)
            conversation_id = new_conv.id

        # Save User message
        user_msg = Message(conversation_id=conversation_id, role="user", content=message)
        db.add(user_msg)
        db.commit()

        async def event_generator():
            prompt = (
                "You are a comprehensive AI medical copilot. A user is asking you a question or describing symptoms. "
                "Provide a thoughtful, professional response. If they describe symptoms, provide potential conditions. "
                "If they ask for Ayurvedic remedies, provide them alongside modern advice. "
                "Always include a disclaimer that this is an AI and not professional medical advice.\n\n"
                f"User Message: {message}"
            )
            generator = get_text_completion(prompt)
            full_response = ""
            for chunk in generator:
                full_response += chunk
                yield chunk
            
            background_tasks.add_task(save_message_task, conversation_id, "assistant", full_response)

        return StreamingResponse(event_generator(), media_type="text/plain")
    else:
        # Guest Mode: No DB persistence
        async def event_generator():
            prompt = (
                "You are a comprehensive AI medical copilot. [GUEST MODE - NOT SAVED]\n\n"
                f"User Message: {message}"
            )
            generator = get_text_completion(prompt)
            for chunk in generator:
                yield chunk
        return StreamingResponse(event_generator(), media_type="text/plain")

@app.post("/api/analyze-image")
async def analyze_image_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    message: str = Form(None), 
    conversation_id: int = Form(None),
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    # Ensure uploads directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # RELATIVE file path for the database and frontend
    rel_file_path = f"/api/uploads/{unique_filename}"

    if user:
        # Handle conversation persistence
        if not conversation_id:
            # Generate smart title
            title_prompt = f"Generate a short, 3-5 word title for a medical conversation based on this image query: {message or 'Image analysis'}. Output ONLY the title text, no quotes or period."
            smart_title = get_simple_completion(title_prompt)
            if "Error" in smart_title or not smart_title:
                 smart_title = f"Image Analysis: {file.filename[:20]}"
                 
            new_conv = Conversation(user_id=user.id, title=smart_title)
            db.add(new_conv)
            db.commit()
            db.refresh(new_conv)
            conversation_id = new_conv.id

        # Save User message with image record
        user_msg = Message(
            conversation_id=conversation_id, 
            role="user", 
            content=message or "Analyzed an image.",
            file_path=rel_file_path,
            file_type="image"
        )
        db.add(user_msg)
        db.commit()

        async def event_generator():
            prompt = "You are a medical AI analyzer. Analyze this image. "
            if message: prompt += f"The user specifies: {message}."
            
            with open(file_path, "rb") as f:
                img_data = f.read()
                
            generator = get_vision_completion(prompt, img_data)
            full_response = ""
            for chunk in generator:
                full_response += chunk
                yield chunk
                
            background_tasks.add_task(save_message_task, conversation_id, "assistant", full_response)

        return StreamingResponse(event_generator(), media_type="text/plain")
    else:
        # Guest Mode: No DB record
        async def event_generator():
            prompt = "Analyze this image for health insights. [GUEST MODE - NOT SAVED] "
            if message: prompt += f"User message: {message}"
            
            with open(file_path, "rb") as f:
                img_data = f.read()
            generator = get_vision_completion(prompt, img_data)
            for chunk in generator:
                yield chunk
        return StreamingResponse(event_generator(), media_type="text/plain")

@app.post("/api/analyze-report")
async def analyze_report_endpoint(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...), 
    message: str = Form(None), 
    conversation_id: int = Form(None),
    user: User = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    # Ensure uploads directory exists
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    
    # Save file
    file_ext = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    rel_file_path = f"/api/uploads/{unique_filename}"

    try:
        # 1. Extraction with PyPDF2
        content = ""
        with open(file_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted: content += extracted
                
        if not content.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. It might be a scanned image or protected.")

        if user:
            # Handle conversation persistence
            if not conversation_id:
                title_prompt = f"Generate a short, 3-5 word title for a medical conversation based on this report: {file.filename}. Output ONLY the title text, no quotes or period."
                smart_title = get_simple_completion(title_prompt)
                if "Error" in smart_title or not smart_title:
                    smart_title = f"Report Analysis: {file.filename[:20]}"
                    
                new_conv = Conversation(user_id=user.id, title=smart_title)
                db.add(new_conv)
                db.commit()
                db.refresh(new_conv)
                conversation_id = new_conv.id

            # Save User message with PDF record
            user_msg = Message(
                conversation_id=conversation_id, 
                role="user", 
                content=f"Uploaded report: {file.filename}. Context: {message or ''}",
                file_path=rel_file_path,
                file_type="pdf"
            )
            db.add(user_msg)
            db.commit()

            async def event_generator():
                prompt = f"Analyze this medical report. User Question: {message or 'Summarize report.'}\n\nContent:\n{content[:5000]}"
                generator = get_text_completion(prompt)
                full_response = ""
                for chunk in generator:
                    full_response += chunk
                    yield chunk
                background_tasks.add_task(save_message_task, conversation_id, "assistant", full_response)
            return StreamingResponse(event_generator(), media_type="text/plain")
        else:
            # Guest Mode: No DB record
            async def event_generator():
                prompt = f"Analyze this medical report as a guest [NOT SAVED].\n\nContent:\n{content[:5000]}"
                generator = get_text_completion(prompt)
                for chunk in generator:
                    yield chunk
            return StreamingResponse(event_generator(), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/predict-risk")
async def predict_risk_endpoint(data: dict):
    # data expects: age, weight, height, exercise, diet
    try:
        age = data.get("age", 30)
        weight = data.get("weight", 70)
        height = data.get("height", 170)
        exercise = data.get("exercise", "Rarely")
        diet = data.get("diet", "Average")
        
        bmi = weight / ((height/100) ** 2)
        
        prompt = (
            "You are an AI health risk assessor. Based on the following user data, "
            "predict the risk level (Low, Medium, High) for Diabetes, Heart Disease, and Obesity. "
            "Provide a short explanation.\n"
            f"Data:\nAge: {age}\nWeight: {weight}kg\nHeight: {height}cm\nBMI: {bmi:.1f}\n"
            f"Exercise: {exercise}\nDiet: {diet}\n\nFormat output with clear headers."
        )
        
        generator = get_text_completion(prompt)
        return format_stream_response(generator)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/hospitals")
async def hospitals_endpoint(lat: float, lon: float, api_key: str, radius: int = 3000):
    try:
        facilities = get_google_places(lat, lon, api_key, radius)
        
        gov_facilities = []
        pvt_facilities = []
        
        for facility in facilities:
            category = categorize_facility(facility["name"])
            if category == "Government":
                gov_facilities.append(facility)
            else:
                pvt_facilities.append(facility)
                
        return {
            "government": gov_facilities,
            "private": pvt_facilities
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
