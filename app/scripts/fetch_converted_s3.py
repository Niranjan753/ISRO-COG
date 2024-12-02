import boto3
import json
import os
from datetime import datetime

# AWS Configuration
s3 = boto3.client(
    's3',
    region_name='ap-south-1',
    aws_access_key_id='AKIA2RMPQGWSRNI6KQJD',
    aws_secret_access_key='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'
)

def fetch_and_download_files():
    try:
        print("Starting to fetch and download files from converted-insat-data...")
        
        # Create output directory if it doesn't exist
        output_dir = 'data/converted_files'
        os.makedirs(output_dir, exist_ok=True)
        
        # List all objects in the bucket
        response = s3.list_objects_v2(
            Bucket='converted-insat-data'
        )
        
        if 'Contents' in response:
            for item in response['Contents']:
                file_key = item['Key']
                local_file_path = os.path.join(output_dir, os.path.basename(file_key))
                
                print(f"Downloading: {file_key} to {local_file_path}")
                
                # Download the file
                s3.download_file(
                    'converted-insat-data',
                    file_key,
                    local_file_path
                )
                
            print(f"Successfully downloaded all files to {output_dir}")
        else:
            print("No files found in the bucket")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    fetch_and_download_files()