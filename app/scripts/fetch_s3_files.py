import boto3
import json
import os
from datetime import datetime

# AWS Configuration
s3 = boto3.client(
    's3',
    region_name='ap-south-1',
    aws_access_key_id='AKIA3LET6GUZCL3V5TNE',
    aws_secret_access_key='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'
)

def fetch_and_save_metadata():
    try:
        print("Starting to fetch S3 files...")
        files_data = []
        
        response = s3.list_objects_v2(
            Bucket='cog-s3-data'
        )
        
        if 'Contents' in response:
            for item in response['Contents']:
                filename = item['Key'].split('/')[-1]
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
                            'url': f"https://raw-insat-data.s3.ap-south-1.amazonaws.com/{item['Key']}"
                        }
                        files_data.append(file_info)
                        print(f"Found file: {filename}")
                    else:
                        print(f"Skipping file with unexpected format: {filename}")
                        
                except Exception as e:
                    print(f"Error processing file {filename}: {str(e)}")
                    continue

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

def get_files_by_level_and_time(level, time):
    try:
        response = s3.list_objects_v2(
            Bucket='cog-s3-data'
        )
        
        matching_files = []
        if 'Contents' in response:
            for item in response['Contents']:
                filename = item['Key']
                if f"COG_{level}_" in filename and f"_{time}" in filename:
                    file_info = {
                        'filename': filename,
                        'level': level,
                        'band': filename.split('_')[2],
                        'time': time,
                        'size': item['Size'],
                        'url': f"https://raw-insat-data.s3.ap-south-1.amazonaws.com/{filename}"
                    }
                    matching_files.append(file_info)
        
        return matching_files
    except Exception as e:
        print(f"Error: {str(e)}")
        return []

if __name__ == "__main__":
    fetch_and_save_metadata()