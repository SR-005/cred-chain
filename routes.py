from flask import Blueprint, render_template, request, redirect, url_for, session,flash
import sqlite3

routes = Blueprint('routes', __name__)

@routes.route('/about')
def about():
    return render_template('about.html')

@routes.route('/edit-profile')
def profile():
    return render_template('edit_profile.html')

@routes.route('/login', methods=['GET', 'POST'])
def login():
    return render_template('login.html')

@routes.route('/Fdashboard')
def dashboard():
    return render_template('Fdashboard.html')