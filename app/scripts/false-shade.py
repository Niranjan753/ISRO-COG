import numpy as np
import matplotlib.pyplot as plt
from osgeo import gdal
import json
import sys
import base64
from io import BytesIO

def get_band_data(dataset):
    band = dataset.GetRasterBand(1)
    return band.ReadAsArray()

def apply_colormap(data, colormap_name='terrain'):
    # Normalize the data
    normed_data = (data - np.nanmin(data)) / (np.nanmax(data) - np.nanmin(data))
    
    # Replace NaN values with 0
    normed_data = np.nan_to_num(normed_data, nan=0)
    
    # Apply colormap
    cmap = plt.get_cmap(colormap_name)
    colored_data = cmap(normed_data)
    
    return colored_data

def create_hillshade(elevation_array, azimuth=315, altitude=45):
    azimuth = np.deg2rad(azimuth)
    altitude = np.deg2rad(altitude)
    
    x, y = np.gradient(elevation_array)
    slope = np.pi/2 - np.arctan(np.sqrt(x*x + y*y))
    aspect = np.arctan2(-x, y)
    
    hillshade = np.sin(altitude) * np.sin(slope) + np.cos(altitude) * np.cos(slope) * np.cos(azimuth - aspect)
    hillshade = (hillshade + 1) / 2
    
    return hillshade

def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No input file specified'}))
        sys.exit(1)

    input_file = sys.argv[1]
    colormap_name = sys.argv[2] if len(sys.argv) > 2 else 'terrain'

    try:
        # Open the dataset
        dataset = gdal.Open(input_file)
        if dataset is None:
            print(json.dumps({'error': 'Failed to open the input file'}))
            sys.exit(1)

        # Get elevation data
        elevation_data = get_band_data(dataset)
        
        # Create hillshade
        hillshade = create_hillshade(elevation_data)
        
        # Apply colormap to elevation data
        colored_data = apply_colormap(elevation_data, colormap_name)
        
        # Combine hillshade with colored data
        colored_data[..., :3] *= hillshade[..., np.newaxis]
        
        # Convert to image
        plt.imsave('temp.png', colored_data)
        
        # Read the saved image and convert to base64
        with open('temp.png', 'rb') as img_file:
            img_data = base64.b64encode(img_file.read()).decode('utf-8')
        
        # Clean up temporary file
        import os
        os.remove('temp.png')
        
        # Return the result
        result = {
            'image': f'data:image/png;base64,{img_data}',
            'success': True
        }
        print(json.dumps(result))

    except Exception as e:
        print(json.dumps({'error': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
