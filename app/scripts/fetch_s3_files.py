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

def fetch_and_save_metadata():
    try:
        print("Starting to fetch S3 files...")
        files_data = []
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
                            'url': f"https://raw-insat-data.s3.ap-south-1.amazonaws.com/{item['Key']}"
                        }
                        files_data.append(file_info)
                        print(f"Found file: {file_info['filename']}")

        # Create output directory if it doesn't exist
        os.makedirs('public', exist_ok=True)
        
        # Save to JSON file
        output_file = 'public/s3_files.json'
        with open(output_file, 'w') as f:
            json.dump({
                'files': files_data,
                'lastUpdated': datetime.now().isoformat()
            }, f, indent=2)
            
        print(f"Successfully saved {len(files_data)} files to {output_file}")
        
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    fetch_and_save_metadata()