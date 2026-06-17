from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os
import json

app = Flask(__name__)
CORS(app)

# ---------- FIREBASE INIT ----------
firebase_creds = os.environ.get('FIREBASE_CREDENTIALS')
try:
    if firebase_creds:
        cred = credentials.Certificate(json.loads(firebase_creds.strip().lstrip('\ufeff')))
    else:
        cred = credentials.Certificate("serviceAccountKey.json")
        
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    items_ref = db.collection('items')
    print("Firebase Admin initialized successfully")
except Exception as e:
    print(f"Firebase init error: {e}")
    db = None
    items_ref = None

# ---------- HELPERS ----------
def json_error(msg, status=500):
    return jsonify({"error": msg}), status

# ---------- 1. REPORT ----------
@app.route('/api/report', methods=['POST'])
def report_item():
    if items_ref is None:
        return json_error("Firestore not initialized")
    data = request.json
    if not data:
        return json_error("No data provided", 400)
    data['createdAt'] = datetime.now().isoformat()
    doc_ref = items_ref.add(data)
    return jsonify({"success": True, "id": doc_ref[1].id}), 201

# ---------- 2. GET ALL ITEMS ----------
@app.route('/api/items', methods=['GET'])
def get_items():
    if items_ref is None:
        return json_error("Firestore not initialized")
    docs = items_ref.order_by('createdAt', direction=firestore.Query.DESCENDING).stream()
    items = []
    for doc in docs:
        item = doc.to_dict()
        item['id'] = doc.id
        items.append(item)
    return jsonify(items), 200

# ---------- 3. SEARCH (Only itemName and color) ----------
@app.route('/api/search', methods=['GET'])
def search_items():
    if items_ref is None:
        return json_error("Firestore not initialized")
    keyword = request.args.get('q', '').strip().lower()
    if not keyword:
        return jsonify([]), 200
    docs = items_ref.stream()
    results = []
    for doc in docs:
        item = doc.to_dict()
        name = item.get('itemName', '').lower()
        color = item.get('color', '').lower()
        # Category removed from search
        if (keyword in name or keyword in color):
            item['id'] = doc.id
            results.append(item)
    return jsonify(results), 200

# ---------- 4. MATCHING (Without Category) ----------
@app.route('/api/match', methods=['GET'])
def match_items():
    if items_ref is None:
        return json_error("Firestore not initialized")
    
    lost_items = [{'id': doc.id, **doc.to_dict()} for doc in items_ref.where('type', '==', 'lost').stream()]
    found_items = [{'id': doc.id, **doc.to_dict()} for doc in items_ref.where('type', '==', 'found').stream()]
    
    matches = []
    for lost in lost_items:
        for found in found_items:
            score = 0
            # Item Name match (40 points)
            if lost.get('itemName', '').lower() == found.get('itemName', '').lower():
                score += 40
            # Color match (30 points - increased from 20)
            if lost.get('color', '').lower() == found.get('color', '').lower():
                score += 30
            # Location match (20 points - increased from 10)
            if lost.get('location', '').lower() == found.get('location', '').lower():
                score += 20
            # Category completely removed
            if score >= 50:
                matches.append({
                    "lost_item": lost,
                    "found_item": found,
                    "match_score": score,
                    "status": "Matched"
                })
    matches.sort(key=lambda x: x['match_score'], reverse=True)
    return jsonify(matches), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)