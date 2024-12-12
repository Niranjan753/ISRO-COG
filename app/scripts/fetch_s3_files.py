from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import boto3
import os
import logging
from botocore.exceptions import ClientError
import tempfile

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION', 'ap-south-1')
)

BUCKET_NAME = os.getenv('S3_BUCKET_NAME')

@app.route('/list_s3_files', methods=['GET'])
def list_s3_files():
    try:
        # List all objects in the bucket
        paginator = s3_client.get_paginator('list_objects_v2')
        files = []
        
        for page in paginator.paginate(Bucket=BUCKET_NAME):
            if 'Contents' in page:
                for obj in page['Contents']:
                    files.append({
                        'Key': obj['Key'],
                        'LastModified': obj['LastModified'].isoformat(),
                        'Size': obj['Size']
                    })
        
        return jsonify({
            'files': files
        })
        
    except ClientError as e:
        logger.error(f"Error listing S3 files: {e}")
        return jsonify({
            'error': str(e)
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            'error': 'An unexpected error occurred'
        }), 500

@app.route('/download_s3_file', methods=['POST'])
def download_s3_file():
    try:
        data = request.get_json()
        if not data or 'key' not in data:
            return jsonify({'error': 'No file key provided'}), 400
            
        file_key = data['key']
        
        # Create a temporary file
        with tempfile.NamedTemporaryFile(delete=False) as temp_file:
            try:
                # Download the file from S3
                s3_client.download_fileobj(BUCKET_NAME, file_key, temp_file)
                temp_file_path = temp_file.name
                
                # Send the file
                return send_file(
                    temp_file_path,
                    as_attachment=True,
                    download_name=file_key.split('/')[-1],
                    mimetype='application/octet-stream'
                )
            finally:
                # Clean up the temporary file
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
                    
    except ClientError as e:
        logger.error(f"Error downloading file from S3: {e}")
        return jsonify({
            'error': f"Error downloading file: {str(e)}"
        }), 500
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            'error': f"An unexpected error occurred: {str(e)}"
        }), 500

if __name__ == '__main__':
    app.run(port=5000, debug=True)