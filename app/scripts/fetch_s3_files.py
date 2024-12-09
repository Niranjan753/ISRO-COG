import boto3
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# AWS Configuration
s3 = boto3.client(
    's3',
    region_name='ap-south-1',
    aws_access_key_id='AKIA3LET6GUZAKOIAOOZ',
    aws_secret_access_key='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'
)

def fetch_and_save_metadata():
    try:
        print("Starting to fetch S3 files...")
        files_data = []
        bucket_name = 'cog-s3-data'  # Hardcoded bucket name for COG files
            
        response = s3.list_objects_v2(
            Bucket=bucket_name
        )
        
        if 'Contents' in response:
            for item in response['Contents']:
                filename = item['Key'].split('/')[-1]
                if not filename.endswith('.tif'):  # Look for TIFF/COG files
                    continue
                    
                try:
                    # Split the filename and handle cases with different formats
                    parts = filename.split('_')
                    if len(parts) >= 5:  # Make sure we have enough parts
                        level = parts[1]
                        band = parts[2]
                        date = parts[3]
                        time = parts[4].replace('.tif', '')  # Remove file extension
                        time = time[:2] + ":" + time[2:]  # Format time with colon
                        
                        file_info = {
                            'filename': filename,
                            'level': level,
                            'band': band,
                            'date': date,
                            'time': time,
                            'size': item['Size'],
                            'url': f"https://{bucket_name}.s3.{os.getenv('AWS_REGION', 'ap-south-1')}.amazonaws.com/{item['Key']}"
                        }
                        files_data.append(file_info)
                        print(f"Found file: {filename}")
                    else:
                        print(f"Skipping file with unexpected format: {filename}")
                        
                except Exception as e:
                    print(f"Error processing file {filename}: {str(e)}")
                    
        # Save the metadata to a JSON file
        output_file = os.path.join(os.getcwd(), 'public', 's3_files.json')
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        with open(output_file, 'w') as f:
            json.dump({
                'files': files_data,
                'lastUpdated': datetime.now().isoformat()
            }, f, indent=2)
            
        print(f"Metadata saved to {output_file}")
        print(f"Found {len(files_data)} files")
        
    except Exception as e:
        print(f"Error fetching S3 files: {str(e)}")
        raise

def get_files_by_level_and_time(level, time):
    try:
        with open('public/s3_files.json', 'r') as f:
            data = json.load(f)
            
        filtered_files = [
            file for file in data['files']
            if file['level'] == level and file['time'] == time
        ]
        
        return filtered_files
    except Exception as e:
        print(f"Error getting files: {str(e)}")
        return []

if __name__ == "__main__":
    fetch_and_save_metadata()