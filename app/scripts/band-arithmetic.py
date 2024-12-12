from flask import Flask, render_template, request, send_from_directory, send_file, jsonify
import os
import numpy as np
from werkzeug.utils import secure_filename
from PIL import Image
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
from flask_cors import CORS
import logging
import sys
from datetime import datetime
import pandas as pd
from pathlib import Path
import tempfile
import shutil
import time

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Create console handler
handler = logging.StreamHandler(sys.stdout)
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes
app.logger.setLevel(logging.DEBUG)

# Configure upload folder
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
    logger.info(f"Created upload folder at {UPLOAD_FOLDER}")
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Available operators
OPERATORS = {
    'add': '+',
    'subtract': '-',
    'multiply': '*',
    'divide': '/',
    'ndvi': 'ndvi'
}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in {'tif', 'tiff'}

def match_resolution(src_path, reference_path, output_path):
    """Reproject and resample a raster to match the resolution of a reference raster"""
    with rasterio.open(reference_path) as reference:
        ref_transform = reference.transform
        ref_crs = reference.crs
        ref_width = reference.width
        ref_height = reference.height

        with rasterio.open(src_path) as src:
            transform, width, height = calculate_default_transform(
                src.crs, ref_crs, ref_width, ref_height, *reference.bounds)
            
            kwargs = src.meta.copy()
            kwargs.update({
                'crs': ref_crs,
                'transform': ref_transform,
                'width': ref_width,
                'height': ref_height
            })

            with rasterio.open(output_path, 'w', **kwargs) as dst:
                reproject(
                    source=rasterio.band(src, 1),
                    destination=rasterio.band(dst, 1),
                    src_transform=src.transform,
                    src_crs=src.crs,
                    dst_transform=ref_transform,
                    dst_crs=ref_crs,
                    resampling=Resampling.bilinear
                )

def get_band_name(filename):
    """Extract band name from filename"""
    # Split by underscore and get the last part before file extension
    parts = os.path.splitext(filename)[0].split('_')
    return parts[-1] if parts else filename

def generate_result_filename(operation, band1, band2):
    """Generate a descriptive filename for the result"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"result_{band1}{operation}{band2}_{timestamp}.tif"

def normalize_band(band):
    """Normalize band data to 0-255 range"""
    if band is None:
        return None
    valid_data = band[~np.isnan(band) & ~np.isinf(band)]
    if len(valid_data) == 0:
        return None
    
    min_val, max_val = np.percentile(valid_data, [2, 98])
    normalized = np.clip((band - min_val) / (max_val - min_val) * 255, 0, 255)
    return normalized.astype(np.uint8)

def process_rasters(file1_path, file2_path, operation, band1_name, band2_name):
    """Process two rasters with resolution matching"""
    try:
        logger.debug(f"Processing rasters: {file1_path}, {file2_path}, {operation}, {band1_name}, {band2_name}")
        # Create a temporary directory for intermediate files
        with tempfile.TemporaryDirectory() as temp_dir:
            # Create temporary file for resampled raster
            temp_resampled = os.path.join(temp_dir, 'temp_resampled.tif')
            
            # Match resolution of second file to first file
            match_resolution(file2_path, file1_path, temp_resampled)
            
            # Read the rasters
            with rasterio.open(file1_path) as src1, rasterio.open(temp_resampled) as src2:
                band1 = src1.read(1)
                band2 = src2.read(1)
                profile = src1.profile.copy()
                
                # Perform the calculation
                if operation == 'add':
                    result = band1 + band2
                elif operation == 'subtract':
                    result = band1 - band2
                elif operation == 'multiply':
                    result = band1 * band2
                elif operation == 'divide':
                    # Avoid division by zero
                    band2 = np.where(band2 == 0, 1, band2)
                    result = band1 / band2
                elif operation == 'ndvi':
                    # Avoid division by zero
                    denominator = band1 + band2
                    denominator = np.where(denominator == 0, 1, denominator)
                    result = (band1 - band2) / denominator
                
                # Generate result filename
                result_filename = generate_result_filename(operation, band1_name, band2_name)
                output_path = os.path.join(app.config['UPLOAD_FOLDER'], result_filename)
                
                # Save the result
                profile.update(dtype=result.dtype)
                with rasterio.open(output_path, 'w', **profile) as dst:
                    dst.write(result, 1)
                
                return output_path, result_filename
                
    except Exception as e:
        logger.error(f"Error processing rasters: {str(e)}", exc_info=True)
        raise

def process_rgb_image(bands, mode, brightness=0, contrast=0, saturation=0):
    """Process bands into an RGB image with adjustments"""
    if len(bands) != 3:
        raise ValueError("Expected 3 bands for RGB composition")
    
    # Convert bands to float32 for processing
    rgb = np.zeros((bands[0].shape[0], bands[0].shape[1], 3), dtype=np.float32)
    
    # Process each band
    for i in range(3):
        band = bands[i].astype(np.float32)
        
        # Handle nodata values
        if np.isnan(band).any() or np.isinf(band).any():
            band = np.nan_to_num(band, nan=0.0, posinf=255.0, neginf=0.0)
        
        # Scale data to 0-255 if not already in that range
        band_min = np.min(band)
        band_max = np.max(band)
        
        if band_max > 255 or band_min < 0:
            # Use percentile-based scaling to handle outliers
            p2, p98 = np.percentile(band[band > 0], (2, 98))
            band = np.clip(band, p2, p98)
            band = ((band - p2) / (p98 - p2) * 255.0)
        
        rgb[:,:,i] = band

    # Clip to ensure 0-255 range
    rgb = np.clip(rgb, 0, 255).astype(np.uint8)
    
    # Convert to PIL Image for adjustments
    img = Image.fromarray(rgb)
    
    # Apply adjustments
    if brightness != 0 or contrast != 0 or saturation != 0:
        from PIL import ImageEnhance
        
        if brightness != 0:
            factor = 1.0 + float(brightness) / 100.0
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(factor)
        
        if contrast != 0:
            factor = 1.0 + float(contrast) / 100.0
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(factor)
        
        if saturation != 0:
            factor = 1.0 + float(saturation) / 100.0
            enhancer = ImageEnhance.Color(img)
            img = enhancer.enhance(factor)
    
    return img

@app.route('/', methods=['GET', 'POST'])
def index():
    try:
        logger.debug("Accessing index route")
        if request.method == 'POST':
            # Handle file upload
            if 'files' in request.files:
                files = request.files.getlist('files')
                if not files or all(file.filename == '' for file in files):
                    return jsonify({'error': 'No files selected'}), 400
                
                saved_files = []
                for file in files:
                    if file and allowed_file(file.filename):
                        filename = secure_filename(file.filename)
                        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                        file.save(filepath)
                        band_name = get_band_name(filename)
                        saved_files.append({
                            'path': filepath,
                            'name': filename,
                            'band': band_name
                        })
                        logger.debug(f"Saved file: {filename} with band: {band_name}")
                
                if not saved_files:
                    return jsonify({'error': 'No valid files were uploaded'}), 400
                
                return jsonify({'files': saved_files})
            
            # Handle band arithmetic operation
            operation = request.form.get('operation')
            band1 = request.form.get('band1')
            band2 = request.form.get('band2')
            
            if not all([operation, band1, band2]):
                return jsonify({'error': 'Missing required parameters'}), 400
            
            # Find the corresponding files from the upload folder
            band1_file = None
            band2_file = None
            for filename in os.listdir(app.config['UPLOAD_FOLDER']):
                if band1 in filename:
                    band1_file = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                if band2 in filename:
                    band2_file = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            
            if not band1_file or not band2_file:
                return jsonify({'error': 'Band files not found'}), 404
            
            try:
                result_path, result_filename = process_rasters(
                    band1_file, band2_file, operation, band1, band2)
                
                with rasterio.open(result_path) as src:
                    result_band = src.read(1)
                result_norm = normalize_band(result_band)
                
                if result_norm is not None:
                    result_image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'result.png')
                    Image.fromarray(result_norm).save(result_image_path)
                    logger.debug("Successfully saved result image")
                    
                    return jsonify({
                        'result_image': 'result.png',
                        'result_tiff': result_filename
                    })
                else:
                    return jsonify({'error': 'Failed to process the result'}), 500
                    
            except Exception as e:
                logger.error(f"Error processing bands: {str(e)}", exc_info=True)
                return jsonify({'error': f'Error processing bands: {str(e)}'}), 500
        
        return jsonify({'message': 'Ready for processing'})
        
    except Exception as e:
        logger.error(f"Error in index route: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/process', methods=['POST'])
def process_files():
    try:
        logger.debug("Processing files")
        if 'file1' not in request.files or 'file2' not in request.files:
            return jsonify({'error': 'Both files are required'}), 400

        file1 = request.files['file1']
        file2 = request.files['file2']
        operation = request.form.get('operation')

        if not operation:
            return jsonify({'error': 'Operation is required'}), 400

        if not file1 or not file2:
            return jsonify({'error': 'Both files are required'}), 400

        if not allowed_file(file1.filename) or not allowed_file(file2.filename):
            return jsonify({'error': 'Invalid file format. Only .tif and .tiff files are allowed'}), 400

        # Save the uploaded files
        filename1 = secure_filename(file1.filename)
        filename2 = secure_filename(file2.filename)
        
        filepath1 = os.path.join(app.config['UPLOAD_FOLDER'], filename1)
        filepath2 = os.path.join(app.config['UPLOAD_FOLDER'], filename2)
        
        file1.save(filepath1)
        file2.save(filepath2)
        
        try:   
            result_path, result_filename = process_rasters(
                filepath1, filepath2, operation, 
                os.path.splitext(filename1)[0], 
                os.path.splitext(filename2)[0]
            )
            
            with rasterio.open(result_path) as src:
                result_band = src.read(1)
            result_norm = normalize_band(result_band)
            
            if result_norm is not None:
                result_image_path = os.path.join(app.config['UPLOAD_FOLDER'], 'result.png')
                Image.fromarray(result_norm).save(result_image_path)
                logger.debug("Successfully saved result image")
                
                return jsonify({
                    'result_image': 'result.png',
                    'result_tiff': result_filename
                })
            else:
                return jsonify({'error': 'Failed to process the result'}), 500
                
        except Exception as e:
            logger.error(f"Error processing files: {str(e)}", exc_info=True)
            return jsonify({'error': f'Error processing files: {str(e)}'}), 500
            
    except Exception as e:
        logger.error(f"Error in process_files route: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    try:
        logger.debug(f"Serving uploaded file: {filename}")
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)
    except Exception as e:
        logger.error(f"Error serving uploaded file: {str(e)}", exc_info=True)
        return f"Error serving file: {str(e)}", 404

@app.route('/download/<filename>')
def download_file(filename):
    """Download the processed TIFF file"""
    try:
        logger.debug(f"Downloading file: {filename}")
        return send_file(
            os.path.join(app.config['UPLOAD_FOLDER'], filename),
            as_attachment=True,
            download_name=filename,
            mimetype='image/tiff'
        )
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}", exc_info=True)
        return str(e), 404

@app.route('/rgb_display', methods=['POST'])
def rgb_display():
    try:
        # Log incoming request
        logger.info("Received RGB display request")
        logger.debug(f"Form data: {request.form}")
        logger.debug(f"Files: {request.files}")

        if 'file' not in request.files:
            logger.error("No file in request")
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if not file or not file.filename:
            logger.error("Empty file object or no filename")
            return jsonify({'error': 'Invalid file'}), 400
            
        if not allowed_file(file.filename):
            logger.error(f"Invalid file format: {file.filename}")
            return jsonify({'error': 'Invalid file format. Only TIFF files are allowed.'}), 400
        
        # Save uploaded file
        try:
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            logger.info(f"File saved successfully: {filepath}")
        except Exception as e:
            logger.error(f"Error saving file: {str(e)}")
            return jsonify({'error': 'Error saving uploaded file'}), 500
        
        try:
            # Read file metadata
            with rasterio.open(filepath) as src:
                num_bands = src.count
                logger.info(f"File opened successfully. Number of bands: {num_bands}")
                
                if num_bands < 3:
                    logger.error(f"Insufficient bands: {num_bands}")
                    return jsonify({'error': f'File has only {num_bands} bands. At least 3 bands are required for RGB visualization.'}), 400
                
                # Get parameters
                mode = request.form.get('mode', 'natural')
                logger.info(f"RGB mode: {mode}")
                
                # Set band numbers based on mode
                if mode == 'natural':
                    r_band, g_band, b_band = min(3, num_bands), min(2, num_bands), min(1, num_bands)
                elif mode == 'false':
                    r_band = min(4, num_bands)  # NIR
                    g_band = min(3, num_bands)  # Red
                    b_band = min(2, num_bands)  # Green
                else:  # custom
                    try:
                        r_band = min(int(request.form.get('r_band', 3)), num_bands)
                        g_band = min(int(request.form.get('g_band', 2)), num_bands)
                        b_band = min(int(request.form.get('b_band', 1)), num_bands)
                    except ValueError as e:
                        logger.error(f"Invalid band numbers provided: {str(e)}")
                        return jsonify({'error': 'Invalid band numbers provided'}), 400
                
                logger.info(f"Selected bands - R: {r_band}, G: {g_band}, B: {b_band}")
                
                try:
                    # Read the bands
                    bands = [
                        src.read(r_band),
                        src.read(g_band),
                        src.read(b_band)
                    ]
                    
                    # Log band statistics
                    for i, band_data in enumerate(['Red', 'Green', 'Blue']):
                        band = bands[i]
                        logger.info(f"{band_data} band stats - "
                                  f"Min: {np.min(band)}, Max: {np.max(band)}, "
                                  f"Mean: {np.mean(band)}, Std: {np.std(band)}")
                except Exception as e:
                    logger.error(f"Error reading bands: {str(e)}")
                    return jsonify({'error': 'Error reading image bands'}), 500
        
        except rasterio.errors.RasterioIOError as e:
            logger.error(f"Error opening TIFF file: {str(e)}")
            return jsonify({'error': 'Invalid or corrupted TIFF file'}), 400
            
        try:
            # Get adjustment parameters
            brightness = int(request.form.get('brightness', 0))
            contrast = int(request.form.get('contrast', 0))
            saturation = int(request.form.get('saturation', 0))
            
            # Process RGB image
            rgb_image = process_rgb_image(
                bands, mode, brightness, contrast, saturation)
            
            # Save result
            result_filename = f'rgb_result_{int(time.time())}.png'
            result_path = os.path.join(app.config['UPLOAD_FOLDER'], result_filename)
            rgb_image.save(result_path)
            logger.info(f"Result saved successfully: {result_filename}")
            
            return jsonify({
                'result_image': result_filename,
                'bands_info': {
                    'num_bands': num_bands,
                    'selected_bands': {
                        'red': r_band,
                        'green': g_band,
                        'blue': b_band
                    }
                }
            })
            
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}", exc_info=True)
            return jsonify({'error': 'Error processing image'}), 500
        
    except Exception as e:
        logger.error(f"Unexpected error in rgb_display: {str(e)}", exc_info=True)
        return jsonify({'error': 'An unexpected error occurred'}), 500

@app.route('/rgb_combine', methods=['POST'])
def rgb_combine():
    try:
        if 'file1' not in request.files or 'file2' not in request.files:
            return jsonify({'error': 'Both files are required'}), 400
        
        file1 = request.files['file1']
        file2 = request.files['file2']
        if not file1 or not file2 or not allowed_file(file1.filename) or not allowed_file(file2.filename):
            return jsonify({'error': 'Invalid file format'}), 400
        
        # Get parameters
        mode = request.form.get('mode', 'natural')
        r_band = int(request.form.get('r_band', 4))
        g_band = int(request.form.get('g_band', 3))
        b_band = int(request.form.get('b_band', 2))
        
        # Get adjustment parameters
        brightness = int(request.form.get('brightness', 0))
        contrast = int(request.form.get('contrast', 0))
        saturation = int(request.form.get('saturation', 0))
        
        # Save uploaded files
        filename1 = secure_filename(file1.filename)
        filename2 = secure_filename(file2.filename)
        filepath1 = os.path.join(app.config['UPLOAD_FOLDER'], filename1)
        filepath2 = os.path.join(app.config['UPLOAD_FOLDER'], filename2)
        file1.save(filepath1)
        file2.save(filepath2)
        
        # Match resolution of second file to first file
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_resampled = os.path.join(temp_dir, 'resampled.tif')
            match_resolution(filepath2, filepath1, temp_resampled)
            
            # Read bands from both files
            with rasterio.open(filepath1) as src1, rasterio.open(temp_resampled) as src2:
                if mode == 'natural':
                    bands = [
                        src1.read(3),  # Red from file1
                        src1.read(2),  # Green from file1
                        src2.read(1)   # Blue from file2
                    ]
                elif mode == 'false':
                    bands = [
                        src1.read(4),  # NIR from file1
                        src2.read(3),  # Red from file2
                        src2.read(2)   # Green from file2
                    ]
                else:  # custom
                    bands = [
                        src1.read(r_band),
                        src2.read(g_band),
                        src2.read(b_band)
                    ]
        
        # Process RGB image
        rgb_image = process_rgb_image(
            bands, mode, brightness, contrast, saturation)
        
        # Save result
        result_filename = 'rgb_combined.png'
        result_path = os.path.join(app.config['UPLOAD_FOLDER'], result_filename)
        rgb_image.save(result_path)
        
        return jsonify({'result_image': result_filename})
        
    except Exception as e:
        logger.error(f"Error in rgb_combine: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    logger.info("Starting Flask application...")
    app.run(debug=True, host='127.0.0.1', port=5000)