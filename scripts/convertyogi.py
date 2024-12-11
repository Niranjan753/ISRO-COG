import h5py
import numpy as np
from osgeo import gdal, osr
import cartopy.crs as ccrs
import os
from scipy import ndimage

class B_Level:
    def _init_(self, h5_file_path):
        """
        Initialize with the path to the H5 file
        Parameters specific to INSAT-3DR geostationary satellite
        """
        self.h5_file_path = h5_file_path
        
        # Define INSAT-3DR geostationary projection using Cartopy
        # INSAT-3DR is positioned at 74°E with a 0.1° tilt
        self.geos_proj = ccrs.Geostationary(
            central_longitude=74.0,  # INSAT-3DR's operational position at 74°E
            satellite_height=35786000,  # Updated height for INSAT-3DR in meters
            false_easting=0,
            false_northing=0,
            sweep_axis='y',
            globe=ccrs.Globe(
                semimajor_axis=6378137.0,  # Earth's equatorial radius in meters
                semiminor_axis=6356752.31414,  # Earth's polar radius in meters
                ellipse=None
            )
        )

    def read_h5_data(self, dataset_path):
        """
        Read data from H5 file and ensure it's 2D
        """
        try:
            with h5py.File(self.h5_file_path, 'r') as h5_file:
                # First, let's print available datasets to help debug
                print("Available datasets:")
                h5_file.visit(lambda x: print(x))
                
                if dataset_path not in h5_file:
                    print(f"Dataset path '{dataset_path}' not found in H5 file")
                    return None
                    
                data = h5_file[dataset_path][...]
                
                # Print data shape for debugging
                print(f"Original data shape: {data.shape}")
                
                # Ensure data is 2D
                if len(data.shape) > 2:
                    # If 3D, take the first band/channel
                    data = data[0, :, :] if data.shape[0] == 1 else data[:, :, 0]
                elif len(data.shape) == 1:
                    print(f"Error: Data is 1-dimensional with shape {data.shape}")
                    return None
                    
                # Print final shape for verification
                print(f"Final data shape: {data.shape}")
                
                # Convert to float32 if not already
                data = data.astype(np.float32)
                
                return data
                
        except Exception as e:
            print(f"Error reading H5 file: {e}")
            print(f"File path: {self.h5_file_path}")
            print(f"Dataset path: {dataset_path}")
            return None

    def filter_cold_space(self, data, threshold=None):
        """
        Filter out cold space pixels and ensure data is valid using ndimage
        """
        if data is None:
            return None
        
        # Replace NaN values with 0
        data = np.nan_to_num(data, nan=0.0)
        
        # Determine threshold based on dataset characteristics
        if threshold is None:
            # Calculate dynamic threshold based on data statistics
            valid_data = data[data > 0]  # Only consider non-zero values
            if len(valid_data) > 0:
                mean_val = np.mean(valid_data)
                std_val = np.std(valid_data)
                threshold = max(0, mean_val - 2 * std_val)  # 2 sigma below mean
            else:
                threshold = 0
        
        # Create initial mask for cold space (very low values)
        cold_space_mask = data <= threshold
        
        # Enhance edge detection and filtering
        kernel_size = 5  # Increased from 3 for better edge detection
        filtered_data = ndimage.median_filter(data, size=kernel_size)
        
        # Use Gaussian gradient for smoother edge detection
        gradient_magnitude = ndimage.gaussian_gradient_magnitude(filtered_data, sigma=2)
        
        # Enhanced boundary detection
        edge_threshold = np.percentile(gradient_magnitude, 95)  # Use 95th percentile
        edge_mask = gradient_magnitude > edge_threshold
        
        # Combine masks with more aggressive boundary filtering
        final_mask = cold_space_mask | edge_mask
        
        # Increase iterations for more aggressive cleaning
        final_mask = ndimage.binary_erosion(final_mask, iterations=3)
        final_mask = ndimage.binary_dilation(final_mask, iterations=4)
        
        # Additional boundary cleaning
        border_width = 5
        final_mask[:border_width, :] = True  # Top border
        final_mask[-border_width:, :] = True  # Bottom border
        final_mask[:, :border_width] = True  # Left border
        final_mask[:, -border_width:] = True  # Right border
        
        # Create masked array
        masked_data = np.ma.array(data, mask=final_mask)
        
        # Print statistics for debugging
        print(f"Filtering statistics:")
        print(f"Original data range: {np.min(data)} to {np.max(data)}")
        print(f"Applied threshold: {threshold}")
        print(f"Percentage of data masked: {(final_mask.sum() / final_mask.size) * 100:.2f}%")
        
        return masked_data

    def save_as_geotiff(self, data, output_path, bounds=None):
        """
        Save data as GeoTIFF with proper projection using GDAL
        """
        try:
            if data is None:
                print("No valid data to save")
                return False
                
            # Ensure data is 2D
            if len(data.shape) != 2:
                print(f"Invalid data shape: {data.shape}")
                return False
                
            if bounds is None:
                bounds = (-5500000, -5500000, 5500000, 5500000)
            
            # Calculate pixel size
            pixel_size_x = (bounds[2] - bounds[0]) / data.shape[1]
            pixel_size_y = (bounds[3] - bounds[1]) / data.shape[0]
            
            # Create the output dataset
            driver = gdal.GetDriverByName('GTiff')
            dataset = driver.Create(
                output_path,
                data.shape[1],
                data.shape[0],
                1,
                gdal.GDT_Float32
            )
            
            if dataset is None:
                print("Failed to create output dataset")
                return False
            
            # Set the geotransform
            dataset.SetGeoTransform([
                bounds[0],    # x_min
                pixel_size_x, # pixel width
                0,           # rotation (0 if image is "north up")
                bounds[3],    # y_max
                0,           # rotation (0 if image is "north up")
                -pixel_size_y # negative pixel height
            ])
            
            # Set the projection using Cartopy's projection
            srs = osr.SpatialReference()
            srs.ImportFromProj4(self.geos_proj.proj4_init)
            dataset.SetProjection(srs.ExportToWkt())
            
            # Write the data
            band = dataset.GetRasterBand(1)
            band.WriteArray(data)
            band.SetNoDataValue(0)
            
            # Close the dataset
            dataset = None
            return True
            
        except Exception as e:
            print(f"Error saving GeoTIFF: {e}")
            return False

    def reproject_to_wgs84(self, input_tiff, output_tiff):
        """
        Reproject GeoTIFF to WGS84 (EPSG:4326)
        """
        try:
            warp_options = gdal.WarpOptions(
                dstSRS='EPSG:4326',
                xRes=0.036,  # approximately 4km at equator
                yRes=0.036,
                resampleAlg='near'
            )
            
            gdal.Warp(output_tiff, input_tiff, options=warp_options)
            return True
        except Exception as e:
            print(f"Error reprojecting: {e}")
            return False

    def create_cog(self, input_tiff, output_cog):
        """
        Convert GeoTIFF to Cloud Optimized GeoTIFF (COG) with DEFLATE compression
        """
        try:
            # Create COG with GDAL translate
            translate_options = gdal.TranslateOptions(
                format='GTiff',
                creationOptions=[
                    'COMPRESS=DEFLATE',
                    'PREDICTOR=2',
                    'ZLEVEL=9',
                    'TILED=YES',
                    'BLOCKXSIZE=512',
                    'BLOCKYSIZE=512',
                    'COPY_SRC_OVERVIEWS=YES',
                    'BIGTIFF=YES'
                ]
            )
            
            gdal.Translate(output_cog, input_tiff, options=translate_options)
            
            # Build overviews for the COG
            ds = gdal.Open(output_cog, gdal.GA_Update)
            ds.BuildOverviews("NEAREST", [2, 4, 8, 16])
            ds = None
            
            print(f"Created Cloud Optimized GeoTIFF with DEFLATE compression: {output_cog}")
            return True
            
        except Exception as e:
            print(f"Error creating COG: {e}")
            return False

    def process_h5_to_geotiff(self, dataset_path, output_base_path):
        """
        Complete workflow to process H5 to GeoTIFF and COG
        """
        # Read data
        data = self.read_h5_data(dataset_path)
        if data is None:
            return False
        
        # Determine appropriate threshold based on dataset type
        threshold = None
        if 'TEMP' in dataset_path:
            threshold = 180.0  # Kelvin temperature threshold for cold space
        elif 'RADIANCE' in dataset_path:
            threshold = 0.001  # Radiance threshold
        elif 'ALBEDO' in dataset_path:
            threshold = 0.01   # Albedo threshold
        
        # Filter cold space with appropriate threshold
        filtered_data = self.filter_cold_space(data, threshold)
        if filtered_data is None:
            return False
        
        # Save intermediate GeoTIFF
        temp_tiff = f"{output_base_path}_{dataset_path}_geos.tif"
        if not self.save_as_geotiff(filtered_data, temp_tiff):
            return False
        
        # Create WGS84 version
        wgs84_tiff = f"{output_base_path}_{dataset_path}_wgs84.tif"
        if not self.reproject_to_wgs84(temp_tiff, wgs84_tiff):
            return False
        
        # Create COG version
        cog_tiff = f"{output_base_path}_{dataset_path}_wgs84_cog.tif"
        success = self.create_cog(wgs84_tiff, cog_tiff)
        
        # Clean up intermediate files
        if os.path.exists(temp_tiff):
            os.remove(temp_tiff)
        if os.path.exists(wgs84_tiff):
            os.remove(wgs84_tiff)
        
        return success

# Example usage:
if _name_ == "_main_":
    # Update with your actual file path
    h5_file = "3RIMG_04SEP2024_1015_L1B_STD_V01R00.h5"
    
    # Check if file exists
    if not os.path.exists(h5_file):
        print(f"Error: H5 file not found at {os.path.abspath(h5_file)}")
        exit(1)
    
    # MIR band options:
    dataset_path = "IMG_MIR"              # Raw MIR data
    # dataset_path = "IMG_MIR_RADIANCE"   # Calibrated radiance for MIR
    # dataset_path = "IMG_MIR_TEMP"       # Temperature for MIR
    
    # Create output directory if it doesn't exist
    output_dir = "MIR_output"
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Set output path with MIR specific naming
    output_path = os.path.join(output_dir, "MIR_processed")
    
    # Create processor instance
    processor = B_Level(h5_file)
    
    # Process file
    success = processor.process_h5_to_geotiff(dataset_path, output_path)
    
    if success:
        print(f"MIR Processing completed successfully!")
        print(f"Output files:")
        print(f"- Final COG: {output_path}_{dataset_path}_wgs84_cog.tif")
    else:
        print("MIR Processing failed!")