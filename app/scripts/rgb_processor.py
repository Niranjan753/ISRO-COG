from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import rasterio
import numpy as np
from PIL import Image, ImageEnhance
import os
import logging
import uuid
import shutil

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure upload folder - use absolute path
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def clean_uploads():
    """Clean old files from uploads directory"""
    try:
        for filename in os.listdir(UPLOAD_FOLDER):
            file_path = os.path.join(UPLOAD_FOLDER, filename)
            try:
                if os.path.isfile(file_path):
                    os.unlink(file_path)
            except Exception as e:
                logger.error(f"Error deleting {file_path}: {e}")
    except Exception as e:
        logger.error(f"Error cleaning uploads directory: {e}")

def normalize_band(band, min_val, max_val):
    """Normalize band data to 0-255 range using provided thresholds"""
    try:
        # Convert band to float32 for processing
        band = band.astype(np.float32)
        
        # Handle nodata and infinite values
        band = np.nan_to_num(band, nan=0, posinf=max_val, neginf=min_val)
        
        # Clip values to threshold range
        band = np.clip(band, min_val, max_val)
        
        # Normalize to 0-255
        normalized = ((band - min_val) / (max_val - min_val) * 255).astype(np.uint8)
        return normalized
    except Exception as e:
        logger.error(f"Error in normalize_band: {e}")
        raise

def get_band_statistics(band):
    """Calculate basic statistics for a band"""
    try:
        valid_data = band[~np.isnan(band) & ~np.isinf(band)]
        if len(valid_data) == 0:
            return {"min": 0, "max": 0, "mean": 0}
            
        return {
            "min": float(np.min(valid_data)),
            "max": float(np.max(valid_data)),
            "mean": float(np.mean(valid_data))
        }
    except Exception as e:
        logger.error(f"Error in get_band_statistics: {e}")
        return {"min": 0, "max": 0, "mean": 0}

def apply_image_adjustments(img, brightness, contrast, saturation):
    """Apply image enhancement adjustments"""
    try:
        # Convert percentage adjustments to enhancement factors
        brightness_factor = max(0.1, 1 + (brightness / 100))
        contrast_factor = max(0.1, 1 + (contrast / 100))
        saturation_factor = max(0.1, 1 + (saturation / 100))
        
        # Apply enhancements
        if brightness != 0:
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(brightness_factor)
        
        if contrast != 0:
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(contrast_factor)
        
        if saturation != 0:
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(saturation_factor)
        
        return img
    except Exception as e:
        logger.error(f"Error in apply_image_adjustments: {e}")
        raise

@app.route('/rgb_process', methods=['POST'])
def process_rgb():
    temp_path = None
    try:
        # Clean old files
        clean_uploads()
        
        # Get file and parameters
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
            
        file = request.files['file']
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400
            
        # Get threshold parameters with better error handling
        try:
            thresholds = {
                'r': {
                    'min': float(request.form.get('r_min', 0)),
                    'max': float(request.form.get('r_max', 255))
                },
                'g': {
                    'min': float(request.form.get('g_min', 0)),
                    'max': float(request.form.get('g_max', 255))
                },
                'b': {
                    'min': float(request.form.get('b_min', 0)),
                    'max': float(request.form.get('b_max', 255))
                }
            }
        except ValueError as e:
            return jsonify({"error": "Invalid threshold values"}), 400
        
        # Get image adjustment parameters
        try:
            brightness = float(request.form.get('brightness', 0))
            contrast = float(request.form.get('contrast', 0))
            saturation = float(request.form.get('saturation', 0))
        except ValueError as e:
            return jsonify({"error": "Invalid adjustment values"}), 400
        
        # Save uploaded file
        temp_path = os.path.join(UPLOAD_FOLDER, str(uuid.uuid4()) + '.tif')
        file.save(temp_path)
        
        # Open and process image
        with rasterio.open(temp_path) as src:
            # Verify number of bands
            if src.count < 3:
                return jsonify({"error": f"Image has only {src.count} bands. At least 3 bands are required."}), 400
            
            # Read first three bands
            r, g, b = [src.read(i) for i in range(1, 4)]
            
            # Get band statistics
            band_statistics = {
                'red': get_band_statistics(r),
                'green': get_band_statistics(g),
                'blue': get_band_statistics(b)
            }
            
            # Normalize bands
            r_norm = normalize_band(r, thresholds['r']['min'], thresholds['r']['max'])
            g_norm = normalize_band(g, thresholds['g']['min'], thresholds['g']['max'])
            b_norm = normalize_band(b, thresholds['b']['min'], thresholds['b']['max'])
            
            # Stack bands and create PIL Image
            rgb = np.dstack((r_norm, g_norm, b_norm))
            img = Image.fromarray(rgb)
            
            # Apply image adjustments
            img = apply_image_adjustments(img, brightness, contrast, saturation)
            
            # Save result
            result_filename = str(uuid.uuid4()) + '.png'
            result_path = os.path.join(UPLOAD_FOLDER, result_filename)
            img.save(result_path)
            
            return jsonify({
                "result_image": result_filename,
                "bands_info": {
                    "band_statistics": band_statistics
                }
            })
            
    except rasterio.errors.RasterioIOError as e:
        logger.error(f"Error reading TIFF file: {e}")
        return jsonify({"error": "Invalid or corrupted TIFF file"}), 400
    except Exception as e:
        logger.error(f"Error processing RGB image: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        # Clean up temporary file
        if temp_path and os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except Exception as e:
                logger.error(f"Error removing temporary file: {e}")

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

if __name__ == '__main__':
    # Clean uploads directory on startup
    clean_uploads()
    app.run(port=5001, debug=True)
