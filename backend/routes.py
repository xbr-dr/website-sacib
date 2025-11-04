from flask import Blueprint, render_template, jsonify
import pandas as pd
import os

main_routes = Blueprint('main', __name__)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ACTUAL_CSV = os.path.join(BASE_DIR, 'data/actual.csv')
FORECAST_CSV = os.path.join(BASE_DIR, 'data/forecast.csv')

df_actual = pd.read_csv(ACTUAL_CSV)
df_forecast = pd.read_csv(FORECAST_CSV)

df_actual['Source'] = 'Actual'
df_forecast['Source'] = 'Forecast'
df_combined = pd.concat([df_actual, df_forecast], ignore_index=True)

@main_routes.route('/')
def index():
    return render_template('index.html')

@main_routes.route('/api/data')
def get_data():
    return jsonify(df_combined.to_dict(orient='records'))