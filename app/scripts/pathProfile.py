import rasterio
import numpy as np
from scipy.ndimage import map_coordinates
import sys
import json
import os
from PIL import Image

def process_tiff(file_path):
    """Process TIFF file and return the data"""
    try:
        if not os.path.exists(file_path):
            raise Exception(f"Input file not found: {file_path}")

        with rasterio.open(file_path) as src:
            data = src.read(1)  # Read the first band
            
            if data is None or data.size == 0:
                raise Exception("No data found in TIFF file")

            # Handle NaN values
            data = np.nan_to_num(data, nan=np.nanmin(data[~np.isnan(data)]))
            
            # Normalize data for visualization
            data_min = np.min(data)
            data_max = np.max(data)
            
            if data_max == data_min:
                normalized_data = np.zeros_like(data)
            else:
                normalized_data = ((data - data_min) / (data_max - data_min) * 255)
            
            # Convert to uint8 for image
            img_data = normalized_data.astype(np.uint8)
            
            # Create PIL Image
            img = Image.fromarray(img_data)
            
            # Save visualization
            output_path = file_path.replace('.tif', '_visual.png').replace('.tiff', '_visual.png')
            img.save(output_path, 'PNG')
            
            return data

    except rasterio.errors.RasterioIOError as e:
        raise Exception(f"Error opening TIFF file: {str(e)}")
    except Exception as e:
        raise Exception(f"Error processing TIFF file: {str(e)}")

def get_elevation_profile(data, start_point, end_point, num_points=100):
    """Calculate elevation profile between two points"""
    try:
        if not isinstance(data, np.ndarray):
            raise Exception("Invalid data format")
        
        if not all(isinstance(p, (list, tuple)) and len(p) == 2 for p in [start_point, end_point]):
            raise Exception("Invalid start or end point format")

        # Create coordinates for the path
        x = np.linspace(start_point[0], end_point[0], num_points)
        y = np.linspace(start_point[1], end_point[1], num_points)
        
        # Ensure coordinates are within bounds
        if (np.any(x < 0) or np.any(x >= data.shape[1]) or 
            np.any(y < 0) or np.any(y >= data.shape[0])):
            raise Exception("Path coordinates out of bounds")
        
        # Extract elevation values along the path
        coordinates = np.vstack((y, x))
        elevations = map_coordinates(data, coordinates, order=1, mode='nearest')
        
        # Calculate distances along the path
        distances = np.sqrt((x - start_point[0])**2 + (y - start_point[1])**2)
        
        return {
            'distances': distances.tolist(),
            'elevations': elevations.tolist()
        }
    except Exception as e:
        raise Exception(f"Error calculating elevation profile: {str(e)}")

if __name__ == '__main__':
    try:
        if len(sys.argv) != 4:
            raise Exception('Invalid arguments. Expected: image_path, start_point, end_point')

        image_path = sys.argv[1]
        try:
            start_point = json.loads(sys.argv[2])
            end_point = json.loads(sys.argv[3])
        except json.JSONDecodeError:
            raise Exception("Invalid point format")

        if not os.path.exists(image_path):
            raise Exception(f"File not found: {image_path}")

        # Process the TIFF file
        data = process_tiff(image_path)
        
        # Calculate elevation profile
        result = get_elevation_profile(data, start_point, end_point)
        
        # Add success status to result
        result['status'] = 'success'
        print(json.dumps(result))

    except Exception as e:
        error_message = str(e)
        print(json.dumps({
            'status': 'error',
            'error': error_message,
            'details': {
                'args': sys.argv[1:],
                'python_version': sys.version
            }
        }))
        sys.exit(1)