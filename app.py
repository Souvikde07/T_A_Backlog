from flask import Flask, render_template, request, jsonify
import requests
import os

app = Flask(__name__)

# Add your credentials
BACKLOG_SPACE = "souvikslog.backlog.com"  # e.g. "mycompany"
API_KEY = "MpJOnCQ2UpXf0g7VOJwjPR2Zl2M8yfiawm4VwjoxWKLFTNB4gKZzFFnJl9288Ohi"

BASE_URL = f"https://{BACKLOG_SPACE}.backlog.jp/api/v2"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/search", methods=["GET"])
def search():
    keyword = request.args.get("keyword", "")
    url = f"{BASE_URL}/projects"
    params = {
        "apiKey": API_KEY
    }
    try:
        response = requests.get(url, params=params)
        data = response.json()

        # Filter by keyword
        results = []
        for project in data:
            if keyword.lower() in project["name"].lower():
                results.append({
                    "id": project["id"],
                    "project_name": project["name"],
                    "type": project.get("projectKey", "N/A"),
                    "content_summary": project.get("text", "No Summary"),
                    "createdUser_name": project.get("createdUser", {}).get("name", "N/A"),
                    "created": project.get("created", "N/A")
                })
        return jsonify(results)
    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)
