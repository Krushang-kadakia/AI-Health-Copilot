import streamlit as st
from utils.llm_helper import get_vision_completion

def render():
    st.header("Image-Based Skin/Wound Detection 📷")
    st.write("Upload an image of a skin issue or wound for AI analysis.")

    uploaded_file = st.file_uploader("Choose an image...", type=["jpg", "jpeg", "png"])

    if uploaded_file is not None:
        st.image(uploaded_file, caption="Uploaded Image", use_container_width=True)
        
        if st.button("Analyze Image"):
            with st.spinner("Analyzing image..."):
                image_bytes = uploaded_file.getvalue()
                prompt = (
                    "You are a medical AI assistant trained to analyze skin conditions. "
                    "Analyze this image and detect the possible condition (e.g., rash, wound, acne, infection). "
                    "Include a disclaimer that this is not a professional medical diagnosis."
                )
                response = get_vision_completion(prompt, image_bytes)
            st.subheader("Analysis Results:")
            st.write_stream(response)
