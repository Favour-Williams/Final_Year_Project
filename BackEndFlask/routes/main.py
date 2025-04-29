from flask import Blueprint, jsonify
from contextlib import contextmanager
import sqlite3

main_routes = Blueprint('main', __name__)

@contextmanager
def get_db_connection():
    conn = sqlite3.connect('boneDetection.db')
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

@main_routes.route('/', methods=['GET'])
def home():
    return "SQLite connected successfully."