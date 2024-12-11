from rio_tiler.io import COGReader
import numpy as np
import rasterio
import boto3
import os
from urllib.parse import urlparse
from botocore.exceptions import ClientError
from tqdm import tqdm
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SelectiveStreaming:
    def __init__(self, aws_access_key_id=None, aws_secret_access_key=None, region_name=None):
        """Initialize with AWS credentials if provided"""
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=aws_access_key_id,
            aws_secret_access_key=aws_secret_access_key,
            region_name=region_name
        ) if aws_access_key_id else None

    def parse_s3_url(self, url):
        """Parse S3 URL into bucket and key"""
        parsed = urlparse(url)
        if parsed.scheme != "s3":
            raise ValueError("URL must be an S3 URL (s3://...)")
        return parsed.netloc, parsed.path.lstrip('/')

    def get_signed_url(self, s3_url, expiration=3600):
        """Generate a signed URL for S3 object"""
        try:
            bucket, key = self.parse_s3_url(s3_url)
            signed_url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': bucket, 'Key': key},
                ExpiresIn=expiration
            )
            return signed_url
        except Exception as e:
            logger.error(f"Error generating signed URL: {e}")
            raise

    def extract_region(self, cog_url, bounds, output_path=None, resolution=None):
        """
        Extract a region from a COG file with specified bounds
        
        Args:
            cog_url (str): URL to the COG file (s3:// or https://)
            bounds (list): [xmin, ymin, xmax, ymax]
            output_path (str, optional): Path to save the extracted region
            resolution (float, optional): Output resolution in units of the CRS
        """
        try:
            # If S3 URL, get signed URL
            if cog_url.startswith('s3://') and self.s3_client:
                cog_url = self.get_signed_url(cog_url)

            logger.info(f"Opening COG file: {cog_url}")
            with COGReader(cog_url) as cog:
                # Get metadata
                metadata = cog.info()
                logger.info(f"COG metadata: {metadata}")

                # Extract the region
                logger.info(f"Extracting region with bounds: {bounds}")
                data, mask = cog.part(bounds)
                
                if data is None or data.size == 0:
                    raise ValueError("No data found in specified bounds")

                logger.info(f"Extracted data shape: {data.shape}")

                # If output path is specified, save the extracted region
                if output_path:
                    logger.info(f"Saving extracted region to: {output_path}")
                    with rasterio.open(
                        output_path,
                        "w",
                        driver="GTiff",
                        height=data.shape[1],
                        width=data.shape[2],
                        count=data.shape[0],
                        dtype=data.dtype,
                        crs=cog.dataset.crs,
                        transform=cog.dataset.transform,  
                        compress='lzw'  
                    ) as dst:
                        # Write with progress bar
                        with tqdm(total=data.shape[0], desc="Writing bands") as pbar:
                            for i in range(data.shape[0]):
                                dst.write(data[i], i + 1)
                                pbar.update(1)

                return data, mask, metadata

        except Exception as e:
            logger.error(f"Error in extract_region: {e}")
            raise

def main():
    """Example usage"""
    # Initialize with AWS credentials from environment variables
    streamer = SelectiveStreaming(
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
        region_name=os.getenv('AWS_REGION')
    )

    # Example bounds (modify as needed)
    # Bounds: [Westernmost, Southernmost, Easternmost, Northernmost]
    bounds = [
        68.186,  # Westernmost point (Longitude): Guhar Moti, Gujarat
        6.740,   # Southernmost point (Latitude): Indira Point, Great Nicobar Island
        97.414,  # Easternmost point (Longitude): Vijaynagar, Arunachal Pradesh
        35.674   # Northernmost point (Latitude): Siachen Glacier region
    ]
    
    try:
        # Example with S3 URL
        data, mask, metadata = streamer.extract_region(
            "https://cog-s3-data.s3.ap-south-1.amazonaws.com/COG_L1B_MIR_04SEP2024_1315.tif?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=AKIA3LET6GUZAKOIAOOZ%2F20241211%2Fap-south-1%2Fs3%2Faws4_request&X-Amz-Date=20241211T071523Z&X-Amz-Expires=3600&X-Amz-Signature=71092a2caf14e129e54bc3ef32e797e99270429dcf0869e8a669adee67f2149c&X-Amz-SignedHeaders=host&x-id=GetObject",
            bounds,
            output_path="extracted_region.tif"
        )
        logger.info("Extraction completed successfully")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")

if __name__ == "__main__":
    main()