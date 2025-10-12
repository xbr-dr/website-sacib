from flask import Flask
from routes import main_routes
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, "../frontend/templates"),
    static_folder=os.path.join(BASE_DIR, "../frontend/static")
)

app.register_blueprint(main_routes)

if __name__ == "__main__":
    app.run(debug=True)
