import streamlit as st
from utils.llm_helper import get_text_completion

def render():
    st.header("Ayurvedic Remedy Recommendation System 🌿")
    st.write("Enter your symptoms to get natural Ayurvedic treatments alongside general advice.")

    symptom = st.text_input("What is your main symptom? (e.g., Cold, Cough, Stomach ache)")

    if st.button("Get Recommendations"):
        if symptom.strip():
            with st.spinner("Finding remedies..."):
                prompt = (
                    "You are an expert in Ayurvedic medicine. For the following symptom, suggest: "
                    "1. Modern general advice (briefly). "
                    "2. 3-4 specific Ayurvedic remedies or treatments (e.g., specific herbs, teas, practices). "
                    f"Symptom: {symptom}"
                )
                response = get_text_completion(prompt)
            st.subheader("Recommended Remedies:")
            st.write_stream(response)
        else:
            st.warning("Please enter a symptom.")
