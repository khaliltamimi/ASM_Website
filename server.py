from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

DATA_FILE = 'data.json'
USERS_FILE = 'users.json'
ALLOWED_FILES = ['index.html', 'register.html', 'admin.html', 'admin_jumuah.html', 'admin_users.html', 'jumuah.html', 'resources.html', 'support.html', 'gallery.html', 'events.html']
ALLOWED_DIRS = ['assets', 'css', 'js']

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_file(path):
    if path in ALLOWED_FILES:
        return send_from_directory('.', path)
    for d in ALLOWED_DIRS:
        if path.startswith(d + '/'):
            return send_from_directory('.', path)
    return "Not Found", 404

@app.route('/api/content', methods=['GET'])
def get_content():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            return jsonify(json.load(f))
    return jsonify({"announcement": "", "jummah_prayer": ""})

def load_users():
    if os.path.exists(USERS_FILE):
        with open(USERS_FILE, 'r') as f:
            return json.load(f)
    return [{"username": "admin", "password": "password123", "role": "superadmin"}]

def save_users(users):
    with open(USERS_FILE, 'w') as f:
        json.dump(users, f, indent=2)

def get_user_role(token):
    if not token or not token.startswith('Bearer token-'): return None
    username = token.split('token-')[1]
    users = load_users()
    for u in users:
        if u.get('username') == username:
            return u.get('role', 'admin')
    return None

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
        
    users = load_users()
    username = data.get('username')
    password = data.get('password')
    
    for u in users:
        if u.get('username') == username and u.get('password') == password:
            role = u.get('role', 'admin')
            return jsonify({"success": True, "token": f"token-{username}", "role": role})
            
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/users', methods=['GET', 'POST', 'DELETE'])
def manage_users():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if role != 'superadmin':
        return jsonify({"success": False, "message": "Forbidden. Superadmin access required."}), 403

    users = load_users()

    if request.method == 'GET':
        return jsonify({"success": True, "users": [{"username": u.get('username'), "role": u.get('role', 'admin')} for u in users]})

    if request.method == 'POST':
        data = request.json
        new_user = data.get('username')
        new_pass = data.get('password')
        new_role = data.get('role', 'admin')
        if not new_user or not new_pass:
            return jsonify({"success": False, "message": "Username and password required"}), 400
        
        if any(u.get('username') == new_user for u in users):
            return jsonify({"success": False, "message": "User already exists"}), 400
            
        users.append({"username": new_user, "password": new_pass, "role": new_role})
        save_users(users)
        return jsonify({"success": True})

    if request.method == 'DELETE':
        data = request.json
        del_user = data.get('username')
        
        if not del_user:
            return jsonify({"success": False, "message": "Username required"}), 400
        if del_user == 'admin':
            return jsonify({"success": False, "message": "Cannot delete default admin account"}), 400
            
        new_users = [u for u in users if u.get('username') != del_user]
        if len(new_users) == len(users):
            return jsonify({"success": False, "message": "User not found"}), 404
            
        save_users(new_users)
        return jsonify({"success": True})

@app.route('/api/update', methods=['POST'])
def update_content():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if not role:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
        
    current_data = {"announcement": "", "jummah_prayer": "", "events": []}
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, 'r') as f:
            current_data.update(json.load(f))
            
    current_data.update(data)

    with open(DATA_FILE, 'w') as f:
        json.dump(current_data, f, indent=2)
    return jsonify({"success": True})

if __name__ == '__main__':
    print("Starting server on http://localhost:8080")
    app.run(host='0.0.0.0', port=8080, debug=True)
