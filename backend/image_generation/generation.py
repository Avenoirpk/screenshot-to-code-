import os
import base64
from google import genai
from google.genai import types

def generate_image_with_gemini(prompt: str) -> str:
    """
    Gemini/Imagen model ka istemal karke prompt se image generate karta hai 
    aur Base64 Data URL string return karta hai.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable mein nahi mila. Pehle .env file check karein.")

    # Initialize Gemini Client
    client = genai.Client(api_key=api_key)

    try:
        # Imagen 3 model call
        result = client.models.generate_images(
            model='imagen-3.0-generate-002',
            prompt=prompt,
            config=types.GenerateImagesConfig(
                number_of_images=1,
                output_mime_type="image/jpeg",
                aspect_ratio="1:1",
            )
        )

        # Base64 string build karna
        for generated_image in result.generated_images:
            encoded = base64.b64encode(generated_image.image.image_bytes).decode('utf-8')
            return f"data:image/jpeg;base64,{encoded}"

        raise Exception("Google GenAI API se koi image receive nahi hui.")

    except Exception as e:
        raise RuntimeError(f"Image generation me error aaya: {str(e)}")
