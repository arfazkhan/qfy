import os
import base64
import re
from typing import Optional
from pathlib import Path

# Base directory for uploads
UPLOAD_DIR = Path("static/uploads")

def save_base64_image(base64_str: str, name: str, qid: str, side: str = "FRONT") -> Optional[str]:
    """
    Saves a base64 image to the filesystem with the name format: NAME_QID_SIDE.jpg
    Returns the public URL path.
    """
    if not base64_str or not base64_str.startswith("data:image"):
        return None

    try:
        # Create directory if it doesn't exist
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

        # Sanitize name for filename
        clean_name = re.sub(r'[^a-zA-Z0-9]', '_', name).upper()
        
        # Extract base64 data
        header, encoded = base64_str.split(",", 1)
        data = base64.b64decode(encoded)

        # Generate filename
        filename = f"{clean_name}_{qid}_{side.upper()}.jpg"
        file_path = UPLOAD_DIR / filename

        # Write to file
        with open(file_path, "wb") as f:
            f.write(data)

        # Return the public URL path
        return f"/static/uploads/{filename}"
    except Exception as e:
        print(f"Error saving image: {e}")
        return None
