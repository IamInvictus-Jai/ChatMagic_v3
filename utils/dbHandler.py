from pymongo import MongoClient, server_api
from os import environ
from dotenv import load_dotenv; load_dotenv()


class DBHandler:
    def __init__(self, db_name):
        self.client = MongoClient(
            self.get_mongo_uri(),
            server_api=server_api.ServerApi('1')
        )
        self.client.admin.command('ping')
        self.db = self.client[db_name]
    
    def get_mongo_uri(self):
        username = environ.get("MONGODB_USER")
        password = environ.get("MONGODB_PASSWORD")
        cluster = environ.get("MONGODB_CLUSTER")      

        return f"mongodb+srv://{username}:{password}@{cluster}.mongodb.net/?retryWrites=true&w=majority&appName=chat-magic"

    def insert(self, collection, data):
        self.db[collection].insert_one(data)

    def find(self, collection, query):
        return self.db[collection].find(query)

    def find_one(self, collection, query):
        return self.db[collection].find_one(query)

    def find_one_chat_group(self, username, group_id):

        if self.db is None: self.db = self.client["users"]

        return self.db["profiles"].find_one(
            {"username": username, "chat_groups": {"$elemMatch": {"group_id": group_id}}},
            {"chat_groups.$": 1}
        )['chat_groups'][0]

    def update(self, collection, query, data, filters=None):
        self.db[collection].update_one(query, data, array_filters= filters)

    def update_profile(self, collection, query, data, filters=None):
        self.db[collection].update_many(query, data, array_filters= filters)

    def delete(self, collection, query):
        self.db[collection].delete_one(query)

    def close(self):
        self.client.close()

if __name__ == "__main__":
    db = DBHandler("users")
    data = {
        "username": "demo",
        "email": "demo@mail.com",
        "password": "iamdemo",
        "date_joined": "2021-09-01T00:00:00Z",
        "last_login": "2021-09-01T00:00:00Z",
        "chat_groups": []
    }
    
    
    db.insert("profiles", data)
    user = db.find_one("profiles", {"username": "demo"})





    db.close()
    print(user)
    print("Data Inserted Successfully!")