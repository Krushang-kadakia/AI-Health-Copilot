import streamlit as st
import fitz  # PyMuPDF
from utils.llm_helper import get_text_completion

def extract_text_from_pdf(pdf_file):
    text = ""
    with fitz.open(stream=pdf_file.read(), filetype="pdf") as doc:
        for page in doc:
            text += page.get_text()
    return text

def render():
    st.header("Medical Report Analyzer 📄")
    st.write("Upload a PDF of your medical report, and the system will identify abnormal values and analyze the data.")

    uploaded_file = st.file_uploader("Upload PDF Medical Report", type=["pdf"])

    if uploaded_file is not None:
        st.success("File uploaded successfully!")
        
        if st.button("Analyze Report"):
            with st.spinner("Extracting text and analyzing report..."):
                try:
                    pdf_text = extract_text_from_pdf(uploaded_file)
                    
                    if not pdf_text.strip():
                        st.error("Could not extract text from the PDF. It might be a scanned image without OCR.")
                        return

                    prompt = (
                        "You are a medical data analyst. Review the following text extracted from a patient's medical report. "
                        "Identify any abnormal values, explain what they mean in simple terms, and provide general recommendations. "
                        f"Medical Report Text:\n{pdf_text[:4000]}" # Limiting text length to avoid context overflow
                    )
                    
                    response = get_text_completion(prompt)
                    st.subheader("Analysis Results:")
                    st.write_stream(response)
                    
                except Exception as e:
                    st.error(f"An error occurred while processing the PDF: {e}")
