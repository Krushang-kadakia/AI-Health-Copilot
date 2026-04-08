import ollama

def get_text_completion(prompt, model="llama3.1:latest"):
    """
    Get text completion from Ollama.
    """
    try:
        response = ollama.chat(
            model=model,
            messages=[{'role': 'user', 'content': prompt}],
            options={'num_thread': 8},
            stream=True
        )
        for chunk in response:
            yield chunk['message']['content']
    except Exception as e:
        yield f"Error connecting to Ollama: {str(e)}"

def get_simple_completion(prompt, model="llama3.1:latest"):
    """
    Get a single string completion from Ollama (Non-streaming).
    """
    try:
        response = ollama.chat(
            model=model,
            messages=[{'role': 'user', 'content': prompt}],
            options={'num_thread': 8},
            stream=False
        )
        return response['message']['content'].strip()
    except Exception as e:
        return f"Error: {str(e)}"

def get_vision_completion(prompt, image_data, model="llama3.2-vision:11b"):
    """
    Get text completion with vision capabilities from Ollama.
    Accepts image_data as bytes or file path.
    """
    try:
        response = ollama.chat(
            model=model,
            messages=[{
                'role': 'user',
                'content': prompt,
                'images': [image_data]
            }],
            options={'num_thread': 8},
            stream=True
        )
        for chunk in response:
            yield chunk['message']['content']
    except Exception as e:
        yield f"Error connecting to Ollama Vision: {str(e)}"
