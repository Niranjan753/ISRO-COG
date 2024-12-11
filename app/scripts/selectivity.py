import argparse
import sys
from osgeo import gdal

def main():
    parser = argparse.ArgumentParser(description='Selectively download region from file')
    parser.add_argument('--north', type=float, required=True, help='North latitude')
    parser.add_argument('--south', type=float, required=True, help='South latitude')
    parser.add_argument('--east', type=float, required=True, help='East longitude')
    parser.add_argument('--west', type=float, required=True, help='West longitude')
    parser.add_argument('--file', type=str, required=True, help='Path to the uploaded file')

    args = parser.parse_args()

    try:
        # Use GDAL to process the file
        dataset = gdal.Open(args.file)
        if not dataset:
            raise Exception('Failed to open file with GDAL')

        # Implement your selective download logic here
        print(f"Processing file: {args.file} with bounds: {args.north}, {args.south}, {args.east}, {args.west}")

    except Exception as e:
        print(f"Error during processing: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()