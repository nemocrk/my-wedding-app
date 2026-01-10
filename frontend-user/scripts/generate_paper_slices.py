import os
from PIL import Image

def slice_button(image_path, output_dir):
    """
    Slices a pill-shaped button image into Top, Center, and Bottom parts
    for vertical resizing (sliding doors technique).
    """
    if not os.path.exists(image_path):
        print(f"Error: Source image not found at {image_path}")
        return

    try:
        img = Image.open(image_path)
        w, h = img.size
        print(f"Processing image: {w}x{h}")
        
        # Calculate split points
        # Top section: ~40% of height to capture the top curve
        slice_height = int(h * 0.4)
        
        # Center section: small 10px strip from the middle
        # This assumes the button has a vertically straight middle section
        center_y = h // 2
        center_half_height = 5
        
        # Crops
        # (left, top, right, bottom)
        top_img = img.crop((0, 0, w, slice_height))
        
        center_img = img.crop((0, center_y - center_half_height, w, center_y + center_half_height))
        
        bottom_img = img.crop((0, h - slice_height, w, h))
        
        # Ensure output directory exists
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            
        # Save files
        top_path = os.path.join(output_dir, "paper-top.png")
        center_path = os.path.join(output_dir, "paper-center.png")
        bottom_path = os.path.join(output_dir, "paper-bottom.png")
        
        top_img.save(top_path, format="PNG")
        center_img.save(center_path, format="PNG")
        bottom_img.save(bottom_path, format="PNG")
        
        print(f"Success! Slices saved to {output_dir}:")
        print(f"- {top_path}")
        print(f"- {center_path}")
        print(f"- {bottom_path}")

    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    # Path configuration
    # Script is in frontend-user/scripts/
    # Target assets are in frontend-user/src/assets/illustrations/
    
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    ASSETS_DIR = os.path.normpath(os.path.join(BASE_DIR, "../src/assets/illustrations"))
    
    # Source image name (must be placed in ASSETS_DIR)
    SOURCE_FILENAME = "button-bk.jpg"
    SOURCE_PATH = os.path.join(ASSETS_DIR, SOURCE_FILENAME)
    
    print("Starting Vertical Slicing for 'My-Wedding-App' assets...")
    slice_button(SOURCE_PATH, ASSETS_DIR)
