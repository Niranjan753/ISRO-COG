from osgeo import gdal
import os

def create_cog(input_tiff, output_cog):
    """Convert regular GeoTIFF to Cloud Optimized GeoTIFF"""
    try:
        print(f"Converting {os.path.basename(input_tiff)} to COG...")
        
        # Create COG with optimal settings
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
    """Main function to process GeoTIFF files"""
    # Get input path (can be directory or file)
    input_path = input("Enter the path to TIFF file or directory containing TIFF files: ")
    
    # Convert to absolute path
    input_path = os.path.abspath(input_path)
    
    if not os.path.exists(input_path):
        print(f"Error: Path '{input_path}' does not exist!")
        return
    
    # Add new inputs for cropping
    try:
        crop = input("Do you want to crop the output (y/n)? ").lower() == 'y'
        if crop:
            print("\nEnter coordinates (press Ctrl+C to exit):")
            try:
                north_lat = float(input("North Latitude: "))
                south_lat = float(input("South Latitude: "))
                east_lon = float(input("East Longitude: "))
                west_lon = float(input("West Longitude: "))
                
                # Validate coordinates
                if north_lat <= south_lat:
                    print("Error: North latitude must be greater than South latitude")
                    return
                if east_lon <= west_lon:
                    print("Error: East longitude must be greater than West longitude")
                    return
                
                # Convert to min/max format for internal processing
                max_lat = north_lat
                min_lat = south_lat
                max_lon = east_lon
                min_lon = west_lon
            except ValueError:
                print("Error: Please enter valid numeric coordinates")
                return
            except KeyboardInterrupt:
                print("\nOperation cancelled by user")
                return
    except KeyboardInterrupt:
        print("\nOperation cancelled by user")
        return
    
    # Determine if input is a file or directory
    if os.path.isfile(input_path):
        files_to_process = [os.path.basename(input_path)]
        input_dir = os.path.dirname(input_path)
    else:
        files_to_process = os.listdir(input_path)
        input_dir = input_path
    
    # Process files
    for file in files_to_process:
        if file.endswith('.tif') and file.startswith(('L1B_', 'L1C_', 'L2B_', 'L2C_')):
            input_tiff = os.path.join(input_dir, file)
            base_name = os.path.splitext(file)[0]
            
            try:
                if crop:
                    # Create cropped version
                    cropped_tiff = os.path.join(input_dir, f"{base_name}_cropped.tif")
                    print(f"\nCropping {file}...")
                    crop_tiff(input_tiff, cropped_tiff, min_lon, max_lon, min_lat, max_lat)
                    
                    # Convert to COG
                    cog_output = os.path.join(input_dir, f"{base_name}_cropped_cog.tif")
                    create_cog(cropped_tiff, cog_output)
                    
                    # Clean up intermediate file
                    os.remove(cropped_tiff)
                else:
                    # Just convert to COG without cropping
                    cog_output = os.path.join(input_dir, f"{base_name}_cog.tif")
                    create_cog(input_tiff, cog_output)
                
                print(f"Successfully processed {file}")
                
            except Exception as e:
                print(f"Error processing {file}: {str(e)}")

if __name__ == "_main_":
    # Enable GDAL exceptions
    gdal.UseExceptions()
    try:
        main()
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")