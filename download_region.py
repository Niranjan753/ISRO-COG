import rasterio
from rasterio.windows import Window
import numpy as np

# Function to get user input for bounding box
def get_bounding_box():
    min_lng = float(input("Enter minimum longitude: "))
    min_lat = float(input("Enter minimum latitude: "))
    max_lng = float(input("Enter maximum longitude: "))
    max_lat = float(input("Enter maximum latitude: "))
    return min_lng, min_lat, max_lng, max_lat

# Function to download the selected region from a TIFF file
def download_region(tif_file_path, output_file_path):
    # Get bounding box from user
    min_lng, min_lat, max_lng, max_lat = get_bounding_box()
    
    # Open the TIFF file
    with rasterio.open(tif_file_path) as src:
        # Calculate the window to read
        transform = src.transform
        col_start, row_start = ~transform * (min_lng, max_lat)
        col_stop, row_stop = ~transform * (max_lng, min_lat)

        # Ensure indices are within bounds
        col_start, col_stop = max(0, int(col_start)), min(src.width, int(col_stop))
        row_start, row_stop = max(0, int(row_start)), min(src.height, int(row_stop))

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

# Main execution
def main():
    tif_file_path = "your_file.tif"  # Replace with your actual file name
    output_file_path = "selected_region.tif"
    download_region(tif_file_path, output_file_path)

if __name__ == "__main__":
    main()
