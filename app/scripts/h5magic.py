import os
import gdal
import numpy as np
from pyproj import Proj, transform

# Set the input and output directories
input_dir = "C:/Users/cmrnn/Downloads/SIH1738_cog(3)/SIH2024"
output_dir = "C:/Users/cmrnn/Downloads/SIH1738_cog(3)/SIH2024"

# Set the projection parameters
in_proj = Proj(init='epsg:4326')  # Input projection is likely geographic (lat/lon)
out_proj = Proj(init='epsg:3857')  # Output projection is Mercator

for filename in os.listdir(input_dir):
    if filename.endswith('.h5'):
        # Open the .h5 file
        dataset = gdal.Open(os.path.join(input_dir, filename))

        # Get the geotransform information
        geotransform = dataset.GetGeoTransform()
        originX = geotransform[0]
        originY = geotransform[3]
        pixelWidth = geotransform[1]
        pixelHeight = geotransform[5]

        # Convert geographic coordinates to Mercator
        x1, y1 = transform(in_proj, out_proj, originX, originY)
        x2, y2 = transform(in_proj, out_proj, originX + dataset.RasterXSize * pixelWidth,
                          originY + dataset.RasterYSize * pixelHeight)

        # Calculate the resolution
        resx = (x2 - x1) / dataset.RasterXSize
        resy = (y2 - y1) / dataset.RasterYSize

        # Create the output .tif file
        output_filename = os.path.splitext(filename)[0] + '.tif'
        output_path = os.path.join(output_dir, output_filename)
        driver = gdal.GetDriverByName('GTiff')
        out_dataset = driver.Create(output_path, dataset.RasterXSize, dataset.RasterYSize, 1, gdal.GDT_Float32)
        out_dataset.SetGeoTransform((x1, resx, 0, y2, 0, resy))
        out_dataset.SetProjection(out_proj.srs)
        out_dataset.GetRasterBand(1).WriteArray(dataset.GetRasterBand(1).ReadAsArray())
        out_dataset = None