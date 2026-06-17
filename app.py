from flask import Flask, request, jsonify
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime
import os
import json

app = Flask(__name__)
CORS(app)

# ---------- FIREBASE ADMIN INIT (Environment Variable Support) ----------
firebase_creds = os.environ.get('FIREBASE_CREDENTIALS')

if firebase_creds:
    # Production: Render se credentials load karo
    cred_dict = json.loads(firebase_creds)
    cred = credentials.Certificate(cred_dict)
else:
    # Local Development: serviceAccountKey.json se load karo
    cred = credentials.Certificate("serviceAccountKey.json")

firebase_admin.initialize_app(cred)
db = firestore.client()
items_ref = db.collection('items')

# ---------- 1. REPORT ITEM ----------
@app.route('/api/report', methods=['POST'])
def report_item():
    try:
        data = request.json
        data['createdAt'] = datetime.now().isoformat()
        doc_ref = items_ref.add(data)
        return jsonify({"success": True, "id": doc_ref[1].id}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- 2. GET ITEMS ----------
@app.route('/api/items', methods=['GET'])
def get_items():
    try:
        category = request.args.get('category', 'all')
        type_filter = request.args.get('type', 'all')
        sort_order = request.args.get('sort', 'latest')
        
        query = items_ref
        if category != 'all':
            query = query.where('category', '==', category)
        if type_filter != 'all':
            query = query.where('type', '==', type_filter)
        
        order_dir = firestore.Query.DESCENDING if sort_order == 'latest' else firestore.Query.ASCENDING
        query = query.order_by('createdAt', direction=order_dir)
        
        docs = query.stream()
        items = []
        for doc in docs:
            item = doc.to_dict()
            item['id'] = doc.id
            items.append(item)
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- 3. SEARCH ----------
@app.route('/api/search', methods=['GET'])
def search_items():
    try:
        keyword = request.args.get('q', '').strip().lower()
        if not keyword:
            return jsonify([]), 200
        
        docs = items_ref.stream()
        results = []
        for doc in docs:
            item = doc.to_dict()
            name = item.get('itemName', '').lower()
            category = item.get('category', '').lower()
            color = item.get('color', '').lower()
            
            if (keyword in name or keyword in category or keyword in color):
                item['id'] = doc.id
                results.append(item)
        return jsonify(results), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ---------- 4. MATCHING ALGORITHM ----------
@app.route('/api/match', methods=['GET'])
def match_items():
    try:
        lost_docs = items_ref.where('type', '==', 'lost').stream()
        found_docs = items_ref.where('type', '==', 'found').stream()
        
        lost_items = []
        for doc in lost_docs:
            item = doc.to_dict()
            item['id'] = doc.id
            lost_items.append(item)
        
        found_items = []
        for doc in found_docs:
            item = doc.to_dict()
            item['id'] = doc.id
            found_items.append(item)
        
        matches = []
        for lost in lost_items:
            for found in found_items:
                score = 0
                if lost.get('itemName', '').lower() == found.get('itemName', '').lower():
                    score += 40
                if lost.get('category', '').lower() == found.get('category', '').lower():
                    score += 30
                if lost.get('color', '').lower() == found.get('color', '').lower():
                    score += 20
                if lost.get('location', '').lower() == found.get('location', '').lower():
                    score += 10
                
                if score >= 50:
                    matches.append({
                        "lost_item": lost,
                        "found_item": found,
                        "match_score": score,
                        "status": "Matched"
                    })
        
        matches.sort(key=lambda x: x['match_score'], reverse=True)
        return jsonify(matches), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)