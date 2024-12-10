import rasterio
from rasterio.windows import Window
import numpy as np
import argparse

def get_bounding_box_from_args(bbox_str):
    # Parse bbox string (format: minLng,minLat,maxLng,maxLat)
    bbox = [float(x) for x in bbox_str.split(',')]
    return bbox[0], bbox[1], bbox[2], bbox[3]

def download_region(tif_file_path, output_file_path, bbox=None):
    # Get bounding box from arguments or user input
    if bbox:
        min_lng, min_lat, max_lng, max_lat = bbox
    else:
        min_lng = float(input("Enter minimum longitude: "))
        min_lat = float(input("Enter minimum latitude: "))
        max_lng = float(input("Enter maximum longitude: "))
        max_lat = float(input("Enter maximum latitude: "))
    
    # Open the TIFF file
    with rasterio.open(tif_file_path) as src:
        # Calculate the window to read
        transform = src.transform
        col_start, row_start = ~transform * (min_lng, max_lat)
        col_stop, row_stop = ~transform * (max_lng, min_lat)

        # Ensure indices are within bounds
        col_start, col_stop = max(0, int(col_start)), min(src.width, int(col_stop))
        row_start, row_stop = max(0, int(row_start)), min(src.height, int(row_stop))

        # Check if the window size is valid
        if col_stop <= col_start or row_stop <= row_start:
            print("Invalid bounding box: resulting window size is zero.")
            return

        # Read the data within the window
        window = Window.from_slices((row_start, row_stop), (col_start, col_stop))
        data = src.read(window=window)

        # Update metadata for the new file
        out_meta = src.meta.copy()
        out_meta.update({
            "driver": "GTiff",
            "height": window.height,
            "width": window.width,
            "transform": rasterio.windows.transform(window, src.transform)
        })

        # Write the data to a new TIFF file
        with rasterio.open(output_file_path, "w", **out_meta) as dest:
            dest.write(data)

    print(f"Region downloaded and saved to {output_file_path}")

def main():
    parser = argparse.ArgumentParser(description='Download a region from a TIFF file')
    parser.add_argument('--input', type=str, help='Input TIFF file path')
    parser.add_argument('--output', type=str, help='Output TIFF file path')
    parser.add_argument('--bbox', type=str, help='Bounding box (minLng,minLat,maxLng,maxLat)')
    
    args = parser.parse_args()
    
    if args.input and args.output:
        bbox = get_bounding_box_from_args(args.bbox) if args.bbox else None
        download_region(args.input, args.output, bbox)
    else:
        # Default behavior when run directly
        tif_file_path = r"C:\Users\cmrnn\Downloads\COG_L1B_MIR_04SEP2024_1315.tif"
        output_file_path = r"selected_region.tif"
        download_region(tif_file_path, output_file_path)

if __name__ == "__main__":
    main()
