from osgeo import gdal
import os
import argparse

def create_cog(input_tiff, output_cog):
    """Convert regular GeoTIFF to Cloud Optimized GeoTIFF"""
    try:
        print(f"Converting {os.path.basename(input_tiff)} to COG...")
        
        translate_options = gdal.TranslateOptions(
            format="GTiff",
            creationOptions=[
                'COMPRESS=DEFLATE',
                'PREDICTOR=2',
                'ZLEVEL=9',
                'TILED=YES',
                'BLOCKXSIZE=512',
                'BLOCKYSIZE=512',
                'BIGTIFF=YES'
            ]
        )
        
        gdal.Translate(output_cog, input_tiff, options=translate_options)
        print("COG creation completed successfully")
        
    except Exception as e:
        if os.path.exists(output_cog):
            try:
                os.remove(output_cog)
            except:
                pass
        raise Exception(f"Error creating COG: {str(e)}")

def crop_tiff(input_tiff, output_tiff, min_lon, max_lon, min_lat, max_lat):
    """Crop GeoTIFF based on lat/lon bounds"""
    try:
        gdal.Warp(
            output_tiff,
            input_tiff,
            outputBounds=[min_lon, min_lat, max_lon, max_lat],
            dstSRS='EPSG:4326',
            format='GTiff',
            creationOptions=[
                'COMPRESS=DEFLATE',
                'PREDICTOR=2',
                'ZLEVEL=9',
                'TILED=YES',
                'BIGTIFF=YES'
            ]
        )
        
    except Exception as e:
        if os.path.exists(output_tiff):
            try:
                os.remove(output_tiff)
            except:
                pass
        raise Exception(f"Error during cropping: {str(e)}")

def main():
    parser = argparse.ArgumentParser(description='Process and crop GeoTIFF files')
    parser.add_argument('--file', required=True, help='Path to input TIFF file')
    parser.add_argument('--north', type=float, required=True, help='North latitude')
    parser.add_argument('--south', type=float, required=True, help='South latitude')
    parser.add_argument('--east', type=float, required=True, help='East longitude')
    parser.add_argument('--west', type=float, required=True, help='West longitude')
    
    args = parser.parse_args()
    
    input_path = os.path.abspath(args.file)
    
    if not os.path.exists(input_path):
        print(f"Error: File '{input_path}' does not exist!")
        return
    
    # Validate coordinates
    if args.north <= args.south:
        print("Error: North latitude must be greater than South latitude")
        return
    if args.east <= args.west:
        print("Error: East longitude must be greater than West longitude")
        return
    
    try:
        input_dir = os.path.dirname(input_path)
        file = os.path.basename(input_path)
        base_name = os.path.splitext(file)[0]
        
        # Create cropped version
        cropped_tiff = os.path.join(input_dir, f"{base_name}_cropped.tif")
        print(f"\nCropping {file}...")
        crop_tiff(input_path, cropped_tiff, args.west, args.east, args.south, args.north)
        
        # Convert to COG
        cog_output = os.path.join(input_dir, f"{base_name}_cropped_cog.tif")
        create_cog(cropped_tiff, cog_output)
        
        # Clean up intermediate file
        os.remove(cropped_tiff)
        print(f"Successfully processed {file}")
        
    except Exception as e:
        print(f"Error processing {file}: {str(e)}")

if __name__ == "__main__":
    gdal.UseExceptions()
    try:
        main()
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")