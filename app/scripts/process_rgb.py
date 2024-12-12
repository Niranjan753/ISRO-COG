import os
import sys
import numpy as np
from osgeo import gdal
import base64
import json
from PIL import Image
import io

def adjust_image(img, brightness=0, contrast=0, saturation=0):
    # Convert to float for processing
    img = img.astype(float)
    
    # Brightness adjustment
    if brightness != 0:
        img += (brightness / 100.0) * 255
    
    # Contrast adjustment
    if contrast != 0:
        factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
        img = factor * (img - 128) + 128
    
    # Saturation adjustment
    if saturation != 0:
        # Convert to HSV
        img_pil = Image.fromarray(np.uint8(np.clip(img, 0, 255)))
        hsv = img_pil.convert('HSV')
        h, s, v = hsv.split()
        
        # Adjust saturation
        s = np.array(s)
        s = s * (1 + saturation / 100.0)
        s = np.clip(s, 0, 255)
        
        # Merge channels
        hsv = Image.merge('HSV', (h, Image.fromarray(np.uint8(s)), v))
        img = np.array(hsv.convert('RGB'))
    
    return np.clip(img, 0, 255).astype(np.uint8)

def process_image(input_path, r_min, r_max, g_min, g_max, b_min, b_max, brightness, contrast, saturation):
    try:
        # Open the dataset
        dataset = gdal.Open(input_path)
        if dataset is None:
            return json.dumps({"error": "Failed to open the image file"})

        # Read bands
        red_band = dataset.GetRasterBand(1).ReadAsArray()
        green_band = dataset.GetRasterBand(2).ReadAsArray()
        blue_band = dataset.GetRasterBand(3).ReadAsArray()

        # Normalize and apply thresholds
        def normalize_band(band, min_val, max_val):
            band = np.clip(band, float(min_val), float(max_val))
            band = ((band - float(min_val)) / (float(max_val) - float(min_val)) * 255).astype(np.uint8)
            return band

        red = normalize_band(red_band, r_min, r_max)
        green = normalize_band(green_band, g_min, g_max)
        blue = normalize_band(blue_band, b_min, b_max)

        # Stack bands
        rgb_image = np.dstack((red, green, blue))

        # Apply adjustments
        rgb_image = adjust_image(
            rgb_image,
            brightness=float(brightness),
            contrast=float(contrast),
            saturation=float(saturation)
        )

        # Convert to base64
        img = Image.fromarray(rgb_image)
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode()

        return json.dumps({"image": f"data:image/png;base64,{img_str}"})

    except Exception as e:
        return json.dumps({"error": str(e)})

if __name__ == "__main__":
    if len(sys.argv) != 11:
        print(json.dumps({"error": "Invalid number of arguments"}))
        sys.exit(1)

    result = process_image(
        sys.argv[1],  # input_path
        sys.argv[2],  # r_min
        sys.argv[3],  # r_max
        sys.argv[4],  # g_min
        sys.argv[5],  # g_max
        sys.argv[6],  # b_min
        sys.argv[7],  # b_max
        sys.argv[8],  # brightness
        sys.argv[9],  # contrast
        sys.argv[10]  # saturation
    )
    print(result)
