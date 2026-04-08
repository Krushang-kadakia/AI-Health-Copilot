import streamlit as st
from utils.llm_helper import get_text_completion

def render():
    st.header("AI Symptom Checker 🧠")
    st.write("Enter your symptoms below, and the AI will predict possible diseases using local LLM models.")

    symptoms = st.text_area("Describe your symptoms (e.g., 'I have fever and headache since yesterday'):", height=100)

    if st.button("Predict Diseases"):
        if symptoms.strip():
            with st.spinner("Analyzing symptoms..."):
                prompt = (
                    "You are a medical AI assistant. Based on the following symptoms, provide the top 3 possible diseases "
                    "with an estimated probability percentage for each. Present the result as a clear list. "
                )
                response = get_text_completion(prompt)
            st.subheader("Prediction Results:")
            st.write_stream(response)
        else:
            st.warning("Please enter your symptoms before predicting.")
