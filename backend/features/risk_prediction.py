import streamlit as st
from utils.llm_helper import get_text_completion

def render():
    st.header("Health Risk Prediction System 📊")
    st.write("Enter your personal health data, and the system will predict risks for lifestyle diseases using local LLM.")

    col1, col2 = st.columns(2)
    with col1:
        age = st.number_input("Age", min_value=1, max_value=120, value=30)
        weight = st.number_input("Weight (kg)", min_value=10, max_value=300, value=70)
        height = st.number_input("Height (cm)", min_value=50, max_value=250, value=170)
    with col2:
        exercise = st.selectbox("Exercise Frequency", ["Never", "Rarely", "1-2 times/week", "3-4 times/week", "Daily"])
        diet = st.selectbox("Diet Habits", ["Poor (Mostly junk food)", "Average", "Good (Balanced)", "Excellent (Strictly healthy)"])

    if st.button("Predict Health Risk"):
        with st.spinner("Analyzing risk factors..."):
            bmi = weight / ((height/100) ** 2)
            
            prompt = (
                "You are an AI health risk assessor. Based on the following user data, "
                "predict the risk level (Low, Medium, High) for Diabetes, Heart Disease, and Obesity. "
                "Provide a short explanation and lifestyle recommendations for each. "
                "Format the output clearly with the risk levels grouped."
            )
            response = get_text_completion(prompt)
        st.subheader("Health Risk Prediction:")
        st.write(f"**Calculated BMI:** {bmi:.1f}")
        st.write_stream(response)
