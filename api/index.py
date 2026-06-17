import sys
import os
from pathlib import Path

# Parent folder ko path mein add karein
sys.path.append(str(Path(__file__).parent.parent))

from app import app as flask_app

# Vercel ko 'app' variable chahiye
app = flask_app