from flask import Flask, request, jsonify, send_file, render_template, after_this_request
from flask_cors import CORS
import os
from typing import Optional, Dict
import rasterio
from rasterio import CRS
import numpy as np
from PIL import Image, ImageEnhance
import io
import json
import uuid
from datetime import datetime

app = Flask(__name__, 
    static_folder='static',
    template_folder='templates'
)
CORS(app)

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# Store file metadata in memory
file_metadata: Dict[str, Dict] = {}

def normalize_band(band_data, color_adjust=1.0):
    """
    Normalize band data with enhanced color intensity
    color_adjust: Factor to adjust color intensity (>1 increases, <1 decreases)
    """
    # Convert to float for calculations
    band_float = band_data.astype(float)

    # Calculate percentiles for more dynamic range
    p_low, p_high = np.percentile(band_float, (0.5, 99.5))
    
    # Initial normalization
    normalized = np.clip((band_float - p_low) * 255.0 / (p_high - p_low), 0, 255)
    
    # Apply color enhancement
    normalized = np.power(normalized / 255.0, 0.7) * 255.0  # Gamma correction for better contrast
    normalized = np.clip(normalized * color_adjust, 0, 255)  # Color intensity adjustment
    
    return normalized.astype(np.uint8)

def is_valid_tiff(filename):
    """Check if the file has a valid TIFF extension"""
    return filename.lower().endswith(('.tif', '.tiff'))

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if not file or not file.filename:
        return jsonify({'error': 'No selected file'}), 400

    if not is_valid_tiff(file.filename):
        return jsonify({'error': 'Invalid file format. Please upload a TIF/TIFF file'}), 400

    # Generate a unique ID for this file
    file_id = str(uuid.uuid4())
    safe_filename = f"{file_id}_{file.filename}"
    filepath = os.path.join(UPLOAD_FOLDER, safe_filename)
    file.save(filepath)

    try:
        with rasterio.open(filepath) as src:
            metadata = {
                'original_filename': file.filename,
                'safe_filename': safe_filename,
                'count': src.count,
                'width': src.width,
                'height': src.height,
                'dtype': str(src.dtypes[0]),
                'file_id': file_id
            }
            file_metadata[file_id] = metadata
            return jsonify({
                'message': 'File uploaded successfully',
                'metadata': metadata,
                'file_id': file_id
            })
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'error': str(e)}), 500

@app.route('/bands/<file_id>/<int:band_number>', methods=['GET'])
def get_band(file_id, band_number):
    if file_id not in file_metadata:
        return jsonify({'error': 'File not found'}), 404
    
    metadata = file_metadata[file_id]
    filepath = os.path.join(UPLOAD_FOLDER, metadata['safe_filename'])
    
    try:
        with rasterio.open(filepath) as src:
            if band_number < 1 or band_number > src.count:
                return jsonify({'error': 'Invalid band number'}), 400
            
            band_data = src.read(band_number)
            normalized_band = normalize_band(band_data)
            
            img = Image.fromarray(normalized_band)
            img_io = io.BytesIO()
            img.save(img_io, 'PNG', quality=95)
            img_io.seek(0)
            
            return send_file(img_io, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/composite/custom', methods=['POST'])
def create_custom_composite():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    red_file_id = data.get('red_file_id')
    green_file_id = data.get('green_file_id')
    blue_file_id = data.get('blue_file_id')

    if not all([red_file_id, green_file_id, blue_file_id]):
        return jsonify({'error': 'Missing file IDs'}), 400

    # Create temporary file name outside try block
    temp_tiff = os.path.join(UPLOAD_FOLDER, f"composite_{uuid.uuid4()}.tiff")

    try:
        print(f"Creating composite with files: R={red_file_id}, G={green_file_id}, B={blue_file_id}")
        
        # Ensure all files exist
        for file_id, band in [(red_file_id, 'red'), (green_file_id, 'green'), (blue_file_id, 'blue')]:
            if file_id not in file_metadata:
                return jsonify({'error': f'File ID not found for {band} band: {file_id}'}), 404
            filepath = os.path.join(UPLOAD_FOLDER, file_metadata[file_id]['safe_filename'])
            if not os.path.exists(filepath):
                return jsonify({'error': f'File not found for {band} band: {filepath}'}), 404

        # Read red band and get profile
        red_path = os.path.join(UPLOAD_FOLDER, file_metadata[red_file_id]['safe_filename'])
        with rasterio.open(red_path) as src_red:
            red = src_red.read(1)  # Read original data without normalization
            profile = src_red.profile.copy()
            
            # Store dimensions for validation
            height, width = red.shape
            print(f"Reference dimensions: {width}x{height}")

        # Read and validate other bands
        green_path = os.path.join(UPLOAD_FOLDER, file_metadata[green_file_id]['safe_filename'])
        with rasterio.open(green_path) as src:
            green = src.read(1)  # Read original data
            if green.shape != (height, width):
                return jsonify({'error': f'Green band dimensions {green.shape} do not match red band {(height, width)}'}), 400

        blue_path = os.path.join(UPLOAD_FOLDER, file_metadata[blue_file_id]['safe_filename'])
        with rasterio.open(blue_path) as src:
            blue = src.read(1)  # Read original data
            if blue.shape != (height, width):
                return jsonify({'error': f'Blue band dimensions {blue.shape} do not match red band {(height, width)}'}), 400

        print("All bands read successfully")
        print(f"Band shapes - Red: {red.shape}, Green: {green.shape}, Blue: {blue.shape}")

        # Stack original bands
        composite_array = np.stack([red, green, blue])
        print(f"Composite array shape: {composite_array.shape}")

        # Update profile for multi-band GeoTIFF with WGS 84
        profile.update({
            'count': 3,  # Three bands
            'driver': 'GTiff',
            'crs': CRS.from_epsg(4326),  # WGS 84
            'compress': 'lzw',  # Add compression
            'tiled': True,  # Enable tiling
            'interleave': 'band'  # Store bands separately
        })

        print(f"Writing to temporary file: {temp_tiff}")

        # Write composite with original data
        with rasterio.open(temp_tiff, 'w', **profile) as dst:
            # Write each band separately
            dst.write(red, 1)  # Write red band to band 1
            dst.write(green, 2)  # Write green band to band 2
            dst.write(blue, 3)  # Write blue band to band 3
            
            # Set band descriptions
            dst.set_band_description(1, "Red Band")
            dst.set_band_description(2, "Green Band")
            dst.set_band_description(3, "Blue Band")
            
            # Update metadata
            tags = {
                'SOFTWARE': 'Satellite Band Composer',
                'DATETIME': datetime.now().strftime("%Y:%m:%d %H:%M:%S"),
                'DOCUMENTNAME': 'RGB Composite'
            }
            dst.update_tags(**tags)
            
            print("Successfully wrote composite to file")

        # Clean up file after sending
        @after_this_request
        def remove_file(response):
            try:
                if os.path.exists(temp_tiff):
                    os.remove(temp_tiff)
                    print(f"Cleaned up temporary file: {temp_tiff}")
            except Exception as e:
                print(f"Error removing temporary file: {e}")
            return response

        return send_file(
            temp_tiff,
            mimetype='image/tiff',
            as_attachment=True,
            download_name='rgb_composite.tiff'
        )

    except Exception as e:
        import traceback
        print(f"Error creating composite: {str(e)}")
        print(traceback.format_exc())
        # Clean up temp file if it exists
        if os.path.exists(temp_tiff):
            try:
                os.remove(temp_tiff)
                print(f"Cleaned up temporary file after error: {temp_tiff}")
            except Exception as cleanup_error:
                print(f"Error cleaning up temporary file: {cleanup_error}")
        return jsonify({'error': str(e)}), 500

@app.route('/composite/preview', methods=['POST'])
def create_preview():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    red_file_id = data.get('red_file_id')
    green_file_id = data.get('green_file_id')
    blue_file_id = data.get('blue_file_id')

    if not all([red_file_id, green_file_id, blue_file_id]):
        return jsonify({'error': 'Missing file IDs'}), 400

    try:
        # Read and normalize bands for preview
        with rasterio.open(os.path.join(UPLOAD_FOLDER, file_metadata[red_file_id]['safe_filename'])) as src:
            red = normalize_band(src.read(1), color_adjust=1.3)

        with rasterio.open(os.path.join(UPLOAD_FOLDER, file_metadata[green_file_id]['safe_filename'])) as src:
            green = normalize_band(src.read(1), color_adjust=1.2)

        with rasterio.open(os.path.join(UPLOAD_FOLDER, file_metadata[blue_file_id]['safe_filename'])) as src:
            blue = normalize_band(src.read(1), color_adjust=1.4)

        # Create RGB composite for preview
        composite = np.dstack((red, green, blue))
        composite = np.clip(composite * 1.1, 0, 255).astype(np.uint8)

        # Convert to PIL Image and enhance
        img = Image.fromarray(composite)
        enhancer = ImageEnhance.Contrast(img)
        img = enhancer.enhance(1.2)
        enhancer = ImageEnhance.Color(img)
        img = enhancer.enhance(1.3)

        # Save to bytes
        img_io = io.BytesIO()
        img.save(img_io, 'PNG', quality=95)
        img_io.seek(0)

        return send_file(img_io, mimetype='image/png')

    except Exception as e:
        print(f"Error creating preview: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/composite/<file_id>', methods=['POST'])
def create_composite(file_id):
    if file_id not in file_metadata:
        return jsonify({'error': 'File not found'}), 404

    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
        
    r_band = int(data.get('red', 1))
    g_band = int(data.get('green', 2))
    b_band = int(data.get('blue', 3))
    
    metadata = file_metadata[file_id]
    filepath = os.path.join(UPLOAD_FOLDER, metadata['safe_filename'])
    
    try:
        with rasterio.open(filepath) as src:
            if any(band > src.count for band in [r_band, g_band, b_band]):
                return jsonify({'error': 'Invalid band number'}), 400

            red = normalize_band(src.read(r_band))
            green = normalize_band(src.read(g_band))
            blue = normalize_band(src.read(b_band))
            
            composite = np.dstack((red, green, blue))
            img = Image.fromarray(composite)
            
            img_io = io.BytesIO()
            img.save(img_io, 'PNG', quality=95)
            img_io.seek(0)
            
            return send_file(img_io, mimetype='image/png')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/files', methods=['GET'])
def list_files():
    """Return list of uploaded files and their metadata"""
    return jsonify(list(file_metadata.values()))

if __name__ == '__main__':
    app.run(debug=True, port=5000)
