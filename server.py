from flask import Flask, request, jsonify, send_from_directory, render_template
from flask_cors import CORS
import json
import os
import sqlite3
import urllib.request
import urllib.error
import datetime
import openpyxl

app = Flask(__name__, template_folder='templates')
CORS(app)

DB_FILE = 'asm.db'
ALLOWED_FILES = ['index.html', 'register.html', 'admin.html', 'admin_jumuah.html', 'admin_users.html', 'jumuah.html', 'support.html', 'gallery.html', 'events.html', 'admin_questions.html', 'halal.html']
ALLOWED_DIRS = ['assets', 'css', 'js']

# Cache for prayer times
prayer_times_cache = {
    'date': None,
    'data': None
}

def get_db():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS subscribers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            year TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/<path:path>')
def serve_file(path):
    if path in ALLOWED_FILES:
        return render_template(path)
    for d in ALLOWED_DIRS:
        if path.startswith(d + '/'):
            return send_from_directory('.', path)
    return "Not Found", 404

@app.route('/api/content', methods=['GET'])
def get_content():
    conn = get_db()
    c = conn.cursor()
    
    content = {
        "announcement": "",
        "jumuah_prayer": "",
        "mission_text": "",
        "join_us_link": "",
        "global_event_reg_link": "",
        "events": [],
        "board_members": [],
        "gallery": []
    }
    
    try:
        # Load settings
        c.execute("SELECT key, value FROM settings")
        for row in c.fetchall():
            if row['key'] == 'jumuah_info':
                content['jumuah_info'] = json.loads(row['value'])
            else:
                content[row['key']] = row['value']
                
        # Load events
        c.execute("SELECT * FROM events ORDER BY id ASC")
        content['events'] = [dict(row) for row in c.fetchall()]
        
        # Load board members
        c.execute("SELECT * FROM board_members")
        content['board_members'] = [dict(row) for row in c.fetchall()]
        
        # Load gallery
        c.execute("SELECT * FROM gallery")
        content['gallery'] = [dict(row) for row in c.fetchall()]
        
    except Exception as e:
        print("Database error:", e)
    finally:
        conn.close()
        
    return jsonify(content)

def get_user_role(token):
    if not token or not token.startswith('Bearer token-'): return None
    username = token.split('token-')[1]
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT role FROM users WHERE username = ?", (username,))
    row = c.fetchone()
    conn.close()
    if row:
        return row['role']
    return None

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "No data provided"}), 400
        
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT role FROM users WHERE username = ? AND password = ?", (username, password))
    row = c.fetchone()
    conn.close()
    
    if row:
        return jsonify({"success": True, "token": f"token-{username}", "role": row['role']})
            
    return jsonify({"success": False, "message": "Invalid credentials"}), 401

@app.route('/api/users', methods=['GET', 'POST', 'DELETE'])
def manage_users():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if role != 'superadmin':
        return jsonify({"success": False, "message": "Forbidden. Superadmin access required."}), 403

    conn = get_db()
    c = conn.cursor()

    if request.method == 'GET':
        c.execute("SELECT username, role FROM users")
        users = [dict(row) for row in c.fetchall()]
        conn.close()
        return jsonify({"success": True, "users": users})

    if request.method == 'POST':
        data = request.json
        new_user = data.get('username')
        new_pass = data.get('password')
        new_role = data.get('role', 'admin')
        if not new_user or not new_pass:
            conn.close()
            return jsonify({"success": False, "message": "Username and password required"}), 400
        
        try:
            c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", (new_user, new_pass, new_role))
            conn.commit()
            success = True
            msg = ""
        except sqlite3.IntegrityError:
            success = False
            msg = "User already exists"
        
        conn.close()
        return jsonify({"success": success, "message": msg} if not success else {"success": True})

    if request.method == 'DELETE':
        data = request.json
        del_user = data.get('username')
        
        if not del_user:
            conn.close()
            return jsonify({"success": False, "message": "Username required"}), 400
        if del_user == 'admin':
            conn.close()
            return jsonify({"success": False, "message": "Cannot delete default admin account"}), 400
            
        c.execute("DELETE FROM users WHERE username = ?", (del_user,))
        deleted = c.rowcount > 0
        conn.commit()
        conn.close()
        
        if not deleted:
            return jsonify({"success": False, "message": "User not found"}), 404
            
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
        
    conn = get_db()
    c = conn.cursor()
    
    try:
        if 'events' in data:
            c.execute("DELETE FROM events")
            for ev in data['events']:
                c.execute("INSERT INTO events (title, date, desc, reg_link) VALUES (?, ?, ?, ?)",
                          (ev.get('title', ''), ev.get('date', ''), ev.get('desc', ''), ev.get('reg_link', '')))
        
        # update setting fields
        settings_keys = ['announcement', 'jumuah_prayer', 'mission_text', 'join_us_link', 'global_event_reg_link']
        for k in settings_keys:
            if k in data:
                c.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", (k, data[k]))
                
        if 'jumuah_info' in data:
            c.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", ('jumuah_info', json.dumps(data['jumuah_info'])))
            
        if 'gallery' in data:
            for item in data['gallery']:
                c.execute("UPDATE gallery SET title = ?, image = ? WHERE role = ?", 
                          (item.get('title', ''), item.get('image', ''), item.get('role', '')))
                          
        if 'board_members' in data:
            for member in data['board_members']:
                c.execute("UPDATE board_members SET name = ?, avatar = ? WHERE role = ?",
                          (member.get('name', ''), member.get('avatar', ''), member.get('role', '')))
            
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500
        
    conn.close()
    return jsonify({"success": True})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if not role:
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    if 'file' not in request.files:
        return jsonify({"success": False, "message": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"success": False, "message": "No selected file"}), 400
        
    filename = request.form.get('filename')
    if not filename:
        from werkzeug.utils import secure_filename
        filename = secure_filename(file.filename)
        
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ['.png', '.jpg', '.jpeg', '.webp']:
        return jsonify({"success": False, "message": "Invalid file type. Only PNG, JPG, JPEG, and WEBP are allowed."}), 400
        
    filename = os.path.basename(filename)
    dest_path = os.path.join('assets', filename)
    
    try:
        os.makedirs('assets', exist_ok=True)
        file.save(dest_path)
        return jsonify({"success": True, "path": f"assets/{filename}"})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/questions', methods=['POST'])
def add_question():
    data = request.json
    if not data or not data.get('question') or not data.get('topic'):
        return jsonify({"success": False, "message": "Topic and question details are required"}), 400
    
    if not data.get('email') and not data.get('phone'):
        return jsonify({"success": False, "message": "Either email or phone number is required"}), 400
    
    q_id = str(int(datetime.datetime.now().timestamp() * 1000))
    topic = data.get('topic')
    question = data.get('question')
    email = data.get('email', '')
    phone = data.get('phone', '')
    created_at = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    conn = get_db()
    c = conn.cursor()
    try:
        c.execute("INSERT INTO questions (id, topic, question, email, phone, answered, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                  (q_id, topic, question, email, phone, False, created_at))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500
        
    conn.close()
    return jsonify({"success": True})

@app.route('/api/questions', methods=['GET'])
def get_questions():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if not role:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
    
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM questions ORDER BY created_at DESC")
    questions = [dict(row) for row in c.fetchall()]
    # SQLite boolean returns 0/1, convert to True/False for json
    for q in questions:
        q['answered'] = bool(q['answered'])
    conn.close()
    
    return jsonify({"success": True, "questions": questions})

@app.route('/api/questions/toggle', methods=['POST'])
def toggle_question_status():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if not role:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    data = request.json
    q_id = data.get('id') if data else None
    if not q_id:
        return jsonify({"success": False, "message": "Question ID required"}), 400
        
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE questions SET answered = 1 - answered WHERE id = ?", (q_id,))
    updated = c.rowcount > 0
    conn.commit()
    
    if updated:
        c.execute("SELECT * FROM questions ORDER BY created_at DESC")
        questions = [dict(row) for row in c.fetchall()]
        for q in questions:
            q['answered'] = bool(q['answered'])
        conn.close()
        return jsonify({"success": True, "questions": questions})
        
    conn.close()
@app.route('/api/questions/answer', methods=['POST'])
def answer_question():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if not role:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    data = request.json
    q_id = data.get('id') if data else None
    answer = data.get('answer', '') if data else ''
    if not q_id:
        return jsonify({"success": False, "message": "Question ID required"}), 400
        
    conn = get_db()
    c = conn.cursor()
    c.execute("UPDATE questions SET answer = ? WHERE id = ?", (answer, q_id))
    updated = c.rowcount > 0
    conn.commit()
    
    if updated:
        c.execute("SELECT * FROM questions ORDER BY created_at DESC")
        questions = [dict(row) for row in c.fetchall()]
        for q in questions:
            q['answered'] = bool(q['answered'])
        conn.close()
        return jsonify({"success": True, "questions": questions})
        
    conn.close()
    return jsonify({"success": False, "message": "Question not found"}), 404

@app.route('/api/questions', methods=['DELETE'])
def delete_question():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if role != 'superadmin':
        return jsonify({"success": False, "message": "Forbidden. Only superadmin access level can delete questions."}), 403
        
    data = request.json
    q_id = data.get('id') if data else None
    if not q_id:
        return jsonify({"success": False, "message": "Question ID required"}), 400
        
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM questions WHERE id = ?", (q_id,))
    deleted = c.rowcount > 0
    conn.commit()
    
    if deleted:
        c.execute("SELECT * FROM questions ORDER BY created_at DESC")
        questions = [dict(row) for row in c.fetchall()]
        for q in questions:
            q['answered'] = bool(q['answered'])
        conn.close()
        return jsonify({"success": True, "questions": questions})
        
    conn.close()
    return jsonify({"success": False, "message": "Question not found"}), 404

@app.route('/api/prayer_times')
def prayer_times():
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    if prayer_times_cache['date'] == today and prayer_times_cache['data']:
        return jsonify({"success": True, "data": prayer_times_cache['data']})
        
    try:
        url = "https://api.aladhan.com/v1/timingsByCity?city=Milan&country=Italy&method=2"
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            data = json.loads(response.read().decode('utf-8'))
            if data and data.get('code') == 200:
                prayer_times_cache['date'] = today
                prayer_times_cache['data'] = data['data']['timings']
                return jsonify({"success": True, "data": prayer_times_cache['data']})
    except Exception as e:
        print("Error fetching prayer times:", e)
        
    return jsonify({"success": False, "message": "Could not fetch prayer times"}), 500

@app.route('/api/custom_barcodes', methods=['GET'])
def get_custom_barcodes():
    barcodes = {}
    try:
        if os.path.exists('HalalScanner.xlsx'):
            wb = openpyxl.load_workbook('HalalScanner.xlsx', data_only=True)
            sheet = wb.active
            for row in sheet.iter_rows(min_row=2, values_only=True):
                if row[0]:
                    barcode = str(row[0]).strip()
                    if '.' in barcode and barcode.endswith('0'): # Handling float representation of long ints like 1.234567890123E+12
                        try:
                            barcode = str(int(float(barcode)))
                        except:
                            pass
                    barcodes[barcode] = {
                        'product_name': str(row[1]).strip() if row[1] else 'Unknown Product',
                        'brands': str(row[2]).strip() if row[2] else 'Unknown Brand',
                        'ingredients_text': str(row[3]).strip() if row[3] else 'Manual Entry',
                        'status': str(row[4]).lower().strip() if row[4] else 'mashbuh',
                        'reasons': []
                    }
        return jsonify({"success": True, "data": barcodes})
    except Exception as e:
        print("Error reading HalalScanner.xlsx:", e)
        return jsonify({"success": False, "message": str(e)})

@app.route('/api/subscribe', methods=['POST'])
def subscribe():
    data = request.json
    if not data or not data.get('name') or not data.get('email'):
        return jsonify({"success": False, "message": "Name and email are required"}), 400
        
    name = data.get('name')
    email = data.get('email')
    year = data.get('year', '')
    
    conn = get_db()
    c = conn.cursor()
    try:
        # Check if already exists
        c.execute("SELECT id FROM subscribers WHERE email = ?", (email,))
        if c.fetchone():
            conn.close()
            return jsonify({"success": True, "message": "Already subscribed!"})
            
        c.execute("INSERT INTO subscribers (name, email, year) VALUES (?, ?, ?)", (name, email, year))
        conn.commit()
    except Exception as e:
        conn.close()
        return jsonify({"success": False, "message": str(e)}), 500
        
    conn.close()
    return jsonify({"success": True})

@app.route('/api/subscribers', methods=['GET'])
def get_subscribers():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if not role:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT * FROM subscribers ORDER BY created_at DESC")
    subscribers = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({"success": True, "subscribers": subscribers})

@app.route('/api/subscribers', methods=['DELETE'])
def delete_subscriber():
    auth_header = request.headers.get('Authorization')
    role = get_user_role(auth_header)
    if not role:
        return jsonify({"success": False, "message": "Unauthorized"}), 401
        
    data = request.json
    sub_id = data.get('id') if data else None
    if not sub_id:
        return jsonify({"success": False, "message": "Subscriber ID required"}), 400
        
    conn = get_db()
    c = conn.cursor()
    c.execute("DELETE FROM subscribers WHERE id = ?", (sub_id,))
    deleted = c.rowcount > 0
    conn.commit()
    conn.close()
    
    if not deleted:
        return jsonify({"success": False, "message": "Subscriber not found"}), 404
        
    return jsonify({"success": True})

@app.route('/api/subscribers/export', methods=['GET'])
def export_subscribers():
    token = request.args.get('token')
    role = get_user_role(f"Bearer {token}" if token else None)
    if not role:
        return "Unauthorized", 401
        
    import io
    import csv
    from flask import Response
    
    conn = get_db()
    c = conn.cursor()
    c.execute("SELECT name, email, year, created_at FROM subscribers ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['Name', 'Email', 'Graduation Year', 'Subscribed At'])
    for r in rows:
        writer.writerow([r['name'], r['email'], r['year'], r['created_at']])
        
    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers['Content-Disposition'] = 'attachment; filename=subscribers.csv'
    return response

if __name__ == '__main__':
    print("Starting server on http://localhost:8080")
    app.run(host='0.0.0.0', port=8080, debug=True)
