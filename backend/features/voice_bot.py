import streamlit as st
import speech_recognition as sr
import pyttsx3
import tempfile
import os
from utils.llm_helper import get_text_completion

def render():
    st.header("Voice-Based Healthcare Chatbot 🎤")
    st.write("Speak your symptoms and the AI will reply to you via voice.")
    
    audio_value = st.audio_input("Record your query")
    
    if audio_value is not None:
        st.audio(audio_value, format="audio/wav")
        if st.button("Process Audio"):
            with st.spinner("Processing speech..."):
                r = sr.Recognizer()
                try:
                    # Streamlit returns a file-like object, wrap it with AudioFile
                    with sr.AudioFile(audio_value) as source:
                        audio_data = r.record(source)
                        text = r.recognize_google(audio_data)
                    
                    st.success(f"Recognized text: {text}")
                    
                    prompt = (
                        "You are a helpful and concise voice-based healthcare assistant. "
                        "A user is speaking to you about their symptoms. Provide a short, easy to understand response "
                        "with possible conditions and suggested remedies. Speak naturally and clearly. "
                        f"User: {text}"
                    )
                    
                    st.info("Generating AI response...")
                    ai_response_generator = get_text_completion(prompt)
                    
                    st.write("**AI:**")
                    # Stream to UI and capture full text simultaneously
                    full_response = st.write_stream(ai_response_generator)
                    
                    # Convert response to speech
                    engine = pyttsx3.init()
                    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as fp:
                        temp_filename = fp.name
                        
                    engine.save_to_file(full_response, temp_filename)
                    engine.runAndWait()
                    
                    # Play the generated audio file
                    st.audio(temp_filename, format="audio/wav", autoplay=True)
                    
                except sr.UnknownValueError:
                    st.error("Sorry, could not understand the audio.")
                except sr.RequestError as e:
                    st.error(f"Could not request results; {e}")
                except Exception as e:
                    st.error(f"An error occurred: {str(e)}")
