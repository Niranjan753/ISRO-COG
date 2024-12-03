import rasterio
import numpy as np
import pandas as pd
import sys
import os


def load_geotiff(file_path):
    try:
        with rasterio.open(file_path) as dataset:
            data = dataset.read(1)
            transform = dataset.transform
            width = dataset.width
            height = dataset.height

        rows, cols = np.indices((height, width))
        lon, lat = rasterio.transform.xy(transform, rows, cols)
        lat = np.array(lat).flatten()
        lon = np.array(lon).flatten()
        data = data.flatten()

        return lat, lon, data
    except Exception as e:
        print(f"Error loading TIFF: {str(e)}", file=sys.stderr)
        raise


def tiff_to_csv(file_path, output_csv):
    try:
        # Ensure input file exists
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Input file not found: {file_path}")

        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_csv), exist_ok=True)

        # Convert TIFF to CSV
        lat, lon, data = load_geotiff(file_path)
        df = pd.DataFrame({'Latitude': lat, 'Longitude': lon, 'Value': data})
        df.to_csv(output_csv, index=False)

        # Verify output file was created
        if not os.path.exists(output_csv):
            raise FileNotFoundError(f"Failed to create output file: {output_csv}")

        return output_csv
    except Exception as e:
        print(f"Error converting to CSV: {str(e)}", file=sys.stderr)
        raise


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python tiff_csv.py input.tiff output.csv", file=sys.stderr)
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2]
    
    try:
        tiff_to_csv(input_file, output_file)
        print(f"Successfully converted {input_file} to {output_file}")
    except Exception as e:
        print(f"Conversion failed: {str(e)}", file=sys.stderr)
        sys.exit(1)