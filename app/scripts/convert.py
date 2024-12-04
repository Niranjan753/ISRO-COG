import boto3
import os
import h5py
import numpy as np
from osgeo import gdal, osr
from scipy.interpolate import griddata

s3_client = boto3.client('s3')

def determine_product_type(filename):
    """Determine product type from filename"""
    if 'L1B' in filename:
        return 'L1B'
    elif 'L1C' in filename:
        return 'L1C'
    elif 'L2B' in filename:
        return 'L2B'
    elif 'L2C' in filename:
        return 'L2C'
    return None

def convert_coordinates(lat, lon, channel_type):
    """Convert scaled integer coordinates to actual lat/lon values"""
    scale = 10000.0 if channel_type == 'VIS' else 100.0
    lat_scaled = lat / scale
    lon_scaled = lon / scale
    
    # Handle invalid values
    lat_scaled[lat_scaled > 90] = np.nan
    lat_scaled[lat_scaled < -90] = np.nan
    lon_scaled[lon_scaled > 180] = np.nan
    lon_scaled[lon_scaled < -180] = np.nan
    
    return lat_scaled, lon_scaled

def create_geotiff(data, band_name, lat, lon, output_path, product_type, nodata_value=0):
    """Create GeoTIFF with common parameters"""
    height, width = data.shape
    x_min, x_max = float(lon.min()), float(lon.max())
    y_min, y_max = float(lat.min()), float(lat.max())
    
    pixel_size_x = (x_max - x_min) / (width - 1)
    pixel_size_y = (y_max - y_min) / (height - 1)
    
    driver = gdal.GetDriverByName('GTiff')
    ds = driver.Create(
        output_path,
        width,
        height,
        1,
        gdal.GDT_Float32 if product_type == 'L1C' else gdal.GDT_UInt16,
        options=['COMPRESS=DEFLATE', 'PREDICTOR=2', 'ZLEVEL=9', 'TILED=YES']
    )
    
    ds.SetGeoTransform((x_min, pixel_size_x, 0, y_max, 0, -pixel_size_y))
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(4326)
    ds.SetProjection(srs.ExportToWkt())
    
    band = ds.GetRasterBand(1)
    band.SetNoDataValue(nodata_value)
    band.WriteArray(data)
    band.SetDescription(band_name)
    band.ComputeStatistics(False)
    
    ds = None

def process_l1b_data(h5_data, date_str, output_dir):
    """Process L1B data"""
    for dataset_name in h5_data:
        if not dataset_name.startswith('IMG_'):
            continue
            
        try:
            # Get data
            data = h5_data[dataset_name][:]
            if len(data.shape) > 2:
                data = data[0]
            if data is None or len(data.shape) != 2:
                continue
            
            # Get coordinates based on channel type
            if dataset_name.startswith(('IMG_VIS', 'IMG_SWIR')):
                lat = h5_data['Latitude_VIS'][:]
                lon = h5_data['Longitude_VIS'][:]
                lat, lon = convert_coordinates(lat, lon, 'VIS')
            elif dataset_name.startswith('IMG_WV'):
                lat = h5_data['Latitude_WV'][:]
                lon = h5_data['Longitude_WV'][:]
                lat, lon = convert_coordinates(lat, lon, 'WV')
            else:
                lat = h5_data['Latitude'][:]
                lon = h5_data['Longitude'][:]
                lat, lon = convert_coordinates(lat, lon, 'IR')

            # Ensure data and coordinates are valid
            if lat is None or lon is None or data is None:
                continue

            # Create masks
            valid_mask = (~np.isnan(lat) & ~np.isnan(lon) &
                         (lat >= -90) & (lat <= 90) &
                         (lon >= -180) & (lon <= 180))
            
            # Earth disk mask
            center_lon = 82.0
            dlat = np.radians(lat - 0)
            dlon = np.radians(lon - center_lon)
            a = np.sin(dlat/2)**2 + np.cos(np.radians(lat)) * np.cos(np.radians(0)) * np.sin(dlon/2)**2
            earth_disk_mask = 2 * 6371 * np.arcsin(np.sqrt(a)) <= 6371 * np.pi/2
            
            valid_mask &= earth_disk_mask
            if not np.any(valid_mask):
                continue
            
            # Remove background and handle NaN values
            valid_data = data[valid_mask]
            valid_data = valid_data[~np.isnan(valid_data)]
            if len(valid_data) == 0:
                continue
                
            hist, bin_edges = np.histogram(valid_data, bins=1000)
            background_mask = np.abs(data - bin_edges[np.argmax(hist)]) > 1e-10
            valid_mask &= background_mask
            
            if not np.any(valid_mask):
                continue
            
            # Normalize data
            valid_data = data[valid_mask]
            valid_data = np.nan_to_num(valid_data, nan=0.0, posinf=0.0, neginf=0.0)
            min_val = np.nanmin(valid_data)
            max_val = np.nanmax(valid_data)
            
            if min_val == max_val:
                continue
                
            data_normalized = np.zeros_like(data, dtype=np.uint16)
            normalized = ((valid_data - min_val) / (max_val - min_val) * 65535)
            normalized = np.clip(normalized, 0, 65535)
            data_normalized[valid_mask] = normalized.astype(np.uint16)
            
            # Create output file
            band_name = dataset_name.replace('IMG_', '')
            output_file = os.path.join(output_dir, f'L1B_{band_name}_{date_str}.tif')
            
            # Create GeoTIFF
            rows, cols = data.shape
            driver = gdal.GetDriverByName('GTiff')
            ds = driver.Create(
                output_file,
                cols,
                rows,
                1,
                gdal.GDT_UInt16,
                options=[
                    'COMPRESS=LZW',
                    'TILED=YES',
                    'BIGTIFF=YES',
                    'PREDICTOR=2'
                ]
            )
            
            # Set projection
            srs = osr.SpatialReference()
            srs.ImportFromEPSG(4326)
            srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
            ds.SetProjection(srs.ExportToWkt())
            
            # Calculate bounds and set geotransform
            x_min, x_max = np.nanmin(lon[valid_mask]), np.nanmax(lon[valid_mask])
            y_min, y_max = np.nanmin(lat[valid_mask]), np.nanmax(lat[valid_mask])
            pixel_size_x = (x_max - x_min) / (cols - 1)
            pixel_size_y = (y_max - y_min) / (rows - 1)
            
            geotransform = (x_min, pixel_size_x, 0, y_max, 0, -pixel_size_y)
            ds.SetGeoTransform(geotransform)
            
            # Write data
            band = ds.GetRasterBand(1)
            band.SetNoDataValue(0)
            band.WriteArray(data_normalized)
            
            # Set metadata
            band.SetDescription(dataset_name)
            band.SetMetadata({
                'STATISTICS_MINIMUM': str(min_val),
                'STATISTICS_MAXIMUM': str(max_val),
                'STATISTICS_MEAN': str(np.mean(valid_data)),
                'STATISTICS_STDDEV': str(np.std(valid_data))
            })
            
            # Compute statistics
            band.ComputeStatistics(False)
            
            # Cleanup
            band.FlushCache()
            ds.FlushCache()
            band = None
            ds = None
            
        except Exception as e:
            print(f"Error processing {dataset_name}: {str(e)}")

def process_l1c_data(h5_data, date_str, output_dir):
    """Process L1C data"""
    # Get boundary coordinates
    left_lon = float(h5_data.attrs['left_longitude'][()])
    right_lon = float(h5_data.attrs['right_longitude'][()])
    upper_lat = float(h5_data.attrs['upper_latitude'][()])
    lower_lat = float(h5_data.attrs['lower_latitude'][()])
    
    # Process each band
    for band_name in ['WV', 'TIR1', 'TIR2', 'MIR', 'SWIR', 'VIS']:
        try:
            data = h5_data[f'IMG_{band_name}'][0,:,:]
            rows, cols = data.shape
            
            # Create coordinate grids
            lats = np.linspace(upper_lat, lower_lat, rows)
            lons = np.linspace(left_lon, right_lon, cols)
            lon, lat = np.meshgrid(lons, lats)
            
            output_file = os.path.join(output_dir, f'L1C_{band_name}_{date_str}.tif')
            create_geotiff(data, band_name, lat, lon, output_file, 'L1C', nodata_value=-999)
            
        except Exception as e:
            print(f"Error processing {band_name}: {str(e)}")

def process_l2b_data(h5_data, date_str, output_dir):
    """Process L2B data"""
    for dataset_name in h5_data:
        if not dataset_name.startswith('HEM'):
            continue
            
        try:
            # Get data
            data = h5_data[dataset_name][:]
            if len(data.shape) > 2:
                data = data[0]
            
            # Get coordinates
            lat = h5_data['Latitude'][:]
            lon = h5_data['Longitude'][:]
            lat, lon = convert_coordinates(lat, lon, 'IR')

            # Create masks
            valid_mask = (~np.isnan(lat) & ~np.isnan(lon) &
                         (lat >= -90) & (lat <= 90) &
                         (lon >= -180) & (lon <= 180))
            
            # Earth disk mask
            center_lon = 82.0
            dlat = np.radians(lat - 0)
            dlon = np.radians(lon - center_lon)
            a = np.sin(dlat/2)**2 + np.cos(np.radians(lat)) * np.cos(np.radians(0)) * np.sin(dlon/2)**2
            earth_disk_mask = 2 * 6371 * np.arcsin(np.sqrt(a)) <= 6371 * np.pi/2
            
            valid_mask &= earth_disk_mask
            if not np.any(valid_mask):
                continue
            
            # Remove background
            valid_data = data[valid_mask]
            hist, bin_edges = np.histogram(valid_data, bins=1000)
            background_mask = np.abs(data - bin_edges[np.argmax(hist)]) > 1e-10
            valid_mask &= background_mask
            
            if not np.any(valid_mask):
                continue
            
            # Normalize data
            valid_data = data[valid_mask]
            min_val, max_val = np.nanmin(valid_data), np.nanmax(valid_data)
            data_normalized = np.zeros_like(data, dtype=np.uint16)
            data_normalized[valid_mask] = ((valid_data - min_val) / 
                                         (max_val - min_val) * 65535).astype(np.uint16)
            
            # Create output file
            output_file = os.path.join(output_dir, f'L2B_{dataset_name}_{date_str}.tif')
            
            # Create GeoTIFF
            rows, cols = data.shape
            driver = gdal.GetDriverByName('GTiff')
            ds = driver.Create(
                output_file, 
                cols, 
                rows, 
                1, 
                gdal.GDT_UInt16,
                options=[
                    'COMPRESS=DEFLATE',
                    'PREDICTOR=2',
                    'ZLEVEL=9',
                    'TILED=YES',
                    'BIGTIFF=YES',
                    'INTERLEAVE=PIXEL'
                ]
            )
            
            # Set projection
            srs = osr.SpatialReference()
            srs.ImportFromEPSG(4326)
            srs.SetAxisMappingStrategy(osr.OAMS_TRADITIONAL_GIS_ORDER)
            ds.SetProjection(srs.ExportToWkt())
            
            # Calculate bounds and set geotransform
            x_min, x_max = np.nanmin(lon[valid_mask]), np.nanmax(lon[valid_mask])
            y_min, y_max = np.nanmin(lat[valid_mask]), np.nanmax(lat[valid_mask])
            pixel_size_x = abs((x_max - x_min) / (cols - 1))
            pixel_size_y = abs((y_max - y_min) / (rows - 1))
            
            geotransform = (x_min, pixel_size_x, 0, y_max, 0, -pixel_size_y)
            ds.SetGeoTransform(geotransform)
            
            # Create grid and interpolate
            x_coords = np.linspace(x_min, x_max, cols)
            y_coords = np.linspace(y_max, y_min, rows)
            X, Y = np.meshgrid(x_coords, y_coords)
            
            points = np.column_stack((lon[valid_mask].ravel(), lat[valid_mask].ravel()))
            values = data_normalized[valid_mask].ravel()
            grid_data = griddata(points, values, (X, Y), method='nearest', fill_value=0)
            
            # Write data
            band = ds.GetRasterBand(1)
            band.SetNoDataValue(0)
            band.WriteArray(grid_data.astype(np.uint16))
            band.SetDescription(dataset_name)
            band.ComputeStatistics(False)
            
            # Cleanup
            ds = None
            
        except Exception as e:
            print(f"Error processing {dataset_name}: {str(e)}")

def process_l2c_data(h5_data, date_str, output_dir):
    """Process L2C data"""
    # Get boundary coordinates
    left_lon = float(h5_data.attrs['left_longitude'][()])
    right_lon = float(h5_data.attrs['right_longitude'][()])
    upper_lat = float(h5_data.attrs['upper_latitude'][()])
    lower_lat = float(h5_data.attrs['lower_latitude'][()])
    
    for param in ['DHI', 'DNI', 'GHI', 'INS']:
        try:
            data = h5_data[param][:]
            if len(data.shape) > 2:
                data = data[0]
            
            rows, cols = data.shape
            lats = np.linspace(upper_lat, lower_lat, rows)
            lons = np.linspace(left_lon, right_lon, cols)
            lon, lat = np.meshgrid(lons, lats)
            
            output_file = os.path.join(output_dir, f'L2C_{param}_{date_str}.tif')
            create_geotiff(data, param, lat, lon, output_file, 'L2C')
            
        except Exception as e:
            print(f"Error processing {param}: {str(e)}")

def process_h5_file(source_bucket, file_key):
    """Process H5 file and convert to GeoTIFF"""
    # Download the file from S3
    download_path = f"/tmp/{os.path.basename(file_key)}"
    s3_client.download_file(source_bucket, file_key, download_path)
    
    # Open the H5 file
    with h5py.File(download_path, 'r') as h5_data:
        # Determine product type
        product_type = determine_product_type(file_key)
        date_str = file_key.split('_')[1]
        
        # Process based on product type
        if product_type == 'L1B':
            process_l1b_data(h5_data, date_str, '/tmp')
        elif product_type == 'L1C':
            process_l1c_data(h5_data, date_str, '/tmp')
        elif product_type == 'L2B':
            process_l2b_data(h5_data, date_str, '/tmp')
        elif product_type == 'L2C':
            process_l2c_data(h5_data, date_str, '/tmp')

def lambda_handler(event, context):
    # Get the source bucket and file key from the event
    source_bucket = event['Records'][0]['s3']['bucket']['name']
    file_key = event['Records'][0]['s3']['object']['key']
    
    try:
        # Process the H5 file
        process_h5_file(source_bucket, file_key)
        
        # Upload converted files to S3
        for file in os.listdir('/tmp'):
            if file.endswith('.tif'):
                output_key = f"{determine_product_type(file_key)}/{file}"
                s3_client.upload_file(
                    f"/tmp/{file}", 
                    'cog-converted',
                    output_key
                )
        
        print(f"Successfully processed {file_key}")
        
    except Exception as e:
        print(f"Error processing {file_key}: {str(e)}")
        raise