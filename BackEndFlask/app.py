from flask import Flask, request, jsonify
from flask_pymongo import PyMongo
from bson.json_util import dumps
from pymongo import MongoClient
from flask_cors import CORS
from flask_mail import Mail, Message
import traceback


client = MongoClient("mongodb+srv://adminFavour:williams012345@cluster0.p3mtv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
db = client["boneDetectionDB"]
users_collection = db["Users"]

app = Flask(__name__)
# Mail configuration
app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})


app.config['MAIL_SERVER'] = 'smtp.gmail.com'  # Use Gmail SMTP or your email provider
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USE_SSL'] = False
app.config['MAIL_USERNAME'] = 'williamsfavour012345@gmail.com'  # Your email
app.config['MAIL_PASSWORD'] = 'pnpq mapj lfvi hiue'  # Use an App Password if using Gmail
app.config['MAIL_DEFAULT_SENDER'] = 'williamsfavour012345@gmail.com'  # Sender email
mail = Mail(app)



# # MongoDB Configuration
app.config["MONGO_URI"] = "mongodb+srv://adminFavour:williams012345@cluster0.p3mtv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
mongo = PyMongo(app)


# Begining of routes
@app.route('/', methods=['GET', 'POST'])
def home():
    if db is None:
        print("MongoDB connection failed.")
        print("Database object:", db)
        return "MongoDB connection failed.", 500  # Return a 500 status code with a message
    else:
        print("MongoDB connected successfully.")
        print("Database object:", db)
        return "MongoDB connected successfully." 
    

@app.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('userName')
    password = data.get('password')

    user = coll.find_one({'userName': username, 'password': password})
    if user:
        return jsonify({
            'id': str(user['_id']),
            'email': user['email'],
            'firstName':user['firstName'],
            'lastName': user['lastName'],
            'userName': user['userName'],
            'otherName':user['otherName'],
            'phoneNumber': user['phoneNumber'],
        })
    else:
        return jsonify({'error': 'Invalid username or password'}), 401



if __name__ == '__main__':
    app.run(debug=True)




