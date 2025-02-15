import boto3
from os import environ
from dotenv import load_dotenv; load_dotenv()


class S3Handler:
    def __init__(self, bucket: str = 'dall-temp-bucket'):
        config = self.config()
        self.client = boto3.client(
            's3',
            region_name=config['region'],
            aws_access_key_id=config['access_key'],
            aws_secret_access_key=config['secret_key']
        ) if all(config.values()) else None

        self.bucket = bucket

    def config(self):
        return {
            'access_key': environ.get("AWS_ACCESS_KEY_ID"),
            'secret_key': environ.get("AWS_SECRET_ACCESS_KEY"),
            'region': environ.get("AWS_REGION_NAME")
        }


    def upload(self, file_obj, obj_name, path= "group-avatars"):
        try:
            if not self.client:
                raise ValueError("S3 client not initialized")
            
            else:
                print("\n\nUploading Files...\n\n\n")
                self.client.upload_fileobj(file_obj, self.bucket, f"{path}/{obj_name}")

            return f"https://{self.bucket}.s3.amazonaws.com/{path}/{obj_name}"
        
        except Exception as e:
            print(f"\nImposter...\n{e}\n\n")
            return None
        
    def delete(self, obj_name):
        try:
            if not self.client:
                raise ValueError("S3 client not initialized")
            
            else:
                print("\n\nDeleting File...\n\n\n")
                self.client.delete_object(Bucket=self.bucket, Key=f"group-avatars/{obj_name}")
                print(f"Deleted {obj_name} from {self.bucket}")

            return True
        
        except Exception as e:
            print(f"\nFailed to delete object...\n{e}\n\n")
            return False