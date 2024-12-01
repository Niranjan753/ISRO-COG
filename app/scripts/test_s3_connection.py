import boto3

# AWS Configuration
AWS_CONFIG = {
    'region_name': 'ap-south-1',
    'aws_access_key_id': 'AKIA2RMPQGWSRNI6KQJD',  # Replace with new credentials
    'aws_secret_access_key': 'S9Q2dc35IXQstnqaScFrCvqpgpWX/ySIyH2Qk/WA'  # Replace with new credentials
}

def test_s3_access():
    try:
        # Initialize S3 client
        s3 = boto3.client('s3', **AWS_CONFIG)
        
        print("Testing S3 connection...")
        
        # List buckets (basic test)
        response = s3.list_buckets()
        print("Available buckets:", [bucket['Name'] for bucket in response['Buckets']])
        
        # Test specific bucket access
        bucket_name = 'raw-insat-data'
        print(f"\nTesting access to bucket: {bucket_name}")
        
        # List objects in the bucket
        response = s3.list_objects_v2(
            Bucket=bucket_name,
            MaxKeys=1  # Just get one object to test
        )
        
        if 'Contents' in response:
            print("Successfully accessed bucket!")
            print("First object:", response['Contents'][0]['Key'])
        else:
            print("Bucket is empty or no access to contents")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_s3_access()