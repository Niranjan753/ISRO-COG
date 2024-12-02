import boto3
import json
from datetime import datetime
import os

# AWS Configuration
AWS_CONFIG = {
    'region_name': 'ap-south-1',
    'aws_access_key_id': 'AKIA2RMPQGWSRNI6KQJD',
    'aws_secret_access_key': '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'
}

def get_s3_files():
    try:
        s3 = boto3.client('s3', **AWS_CONFIG)
        files_data = []
        
        # List objects in the bucket with specific folders
        folders = ['L1B', 'L1C', 'L2B', 'L2C']
        
        for folder in folders:
            print(f"Checking folder: {folder}")
            response = s3.list_objects_v2(
                Bucket='raw-insat-data',
                Prefix=f"{folder}/"
            )
            
            if 'Contents' in response:
                for item in response['Contents']:
                    if item['Key'].lower().endswith('.h5'):
                        file_info = {
                            'filename': item['Key'].split('/')[-1],
                            'folder': folder,
                            'uploadDate': item['LastModified'].strftime('%Y-%m-%d'),
                            'size': item['Size'],
                            'url': f"https://raw-insat-data.s3.ap-south-1.amazonaws.com/{item['Key']}",
                            'path': item['Key']
                        }
                        files_data.append(file_info)
                        print(f"Found H5 file: {file_info['filename']}")

        # Sort files by upload date (newest first)
        files_data.sort(key=lambda x: x['uploadDate'], reverse=True)
        
        # Ensure the public directory exists
        os.makedirs('public', exist_ok=True)
        
        # Save metadata to JSON file
        with open('public/s3_files_metadata.json', 'w') as f:
            json.dump({
                'lastUpdated': datetime.now().isoformat(),
                'files': files_data,
                'totalFiles': len(files_data)
            }, f, indent=2)
            
        print(f"Found {len(files_data)} H5 files total")
        return files_data
        
    except Exception as e:
        print(f"Error accessing S3: {str(e)}")
        return None

if __name__ == "__main__":
    files = get_s3_files()
    if files:
        print("Successfully cached files metadata")