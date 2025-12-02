import os
import random
import string
import logging
import bcrypt
from datetime import datetime, timedelta
from functools import wraps
from flask import (
    Flask, render_template, redirect, url_for, request,
    flash, session, jsonify
)
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import DataRequired, Email, ValidationError
from flask_mail import Mail, Message
from dotenv import load_dotenv
from werkzeug.utils import secure_filename  # Import secure_filename
from pymongo import MongoClient
from bson.objectid import ObjectId
from flask_cors import CORS  # Import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from dateutil.rrule import rrule, DAILY
import re

# ✅ Load environment variables
if os.path.exists('.env'):
    load_dotenv()

# ✅ Initialize Flask App
app = Flask(__name__)
# Configure CORS to allow only specific origins (override via env)
allowed_origins = os.getenv('CORS_ORIGINS', '*')
CORS(app, resources={r"/*": {"origins": allowed_origins}})

# Add CORS headers to all responses (respect configured origins)
@app.after_request
def after_request(response):
    if allowed_origins != '*':
        response.headers['Access-Control-Allow-Origin'] = allowed_origins
    else:
        response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,PUT,POST,DELETE,OPTIONS'
    # Strengthen no-cache for authenticated routes and auth pages to avoid stale user content
    try:
        endpoint = (request.endpoint or '').lower()
        is_authenticated = 'user_email' in session
        # Never cache dynamic authenticated pages
        if is_authenticated:
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
        # Also prevent caching login/register pages to keep flashes and forms fresh
        if endpoint in ('login', 'register', 'verify_otp'):
            response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
    except Exception:
        pass
    return response

@app.route('/verify-otp', methods=['GET', 'POST'])
def verify_otp():
    """Verify emailed OTP and complete login (uses login.html inline OTP)."""
    pending_email = session.get('pending_email')
    if not pending_email:
        flash('Session expired. Please log in again.', 'warning')
        return redirect(url_for('login'))

    form = LoginForm()

    if request.method == 'POST':
        code = request.form.get('code', '').strip()
        if not code:
            flash('Please enter the code sent to your email.', 'danger')
            return render_template('login.html', form=form, otp_step=True, email=pending_email)

        record = login_otps_collection.find_one({'email': pending_email})
        if not record:
            flash('OTP not found. Please request a new code.', 'danger')
            return render_template('login.html', form=form, otp_step=True, email=pending_email)

        if datetime.utcnow() > record.get('expires_at', datetime.utcnow()):
            flash('Code expired. A new code is required.', 'danger')
            return render_template('login.html', form=form, otp_step=True, email=pending_email)

        if code != record.get('code'):
            # Increment attempt count (optional lockout logic)
            login_otps_collection.update_one({'email': pending_email}, {'$inc': {'attempts': 1}})
            flash('Invalid code. Please try again.', 'danger')
            return render_template('login.html', form=form, otp_step=True, email=pending_email)

        # Success → promote pending to logged-in session
        remember_me = bool(session.get('remember_me'))
        try:
            session.clear()
        except Exception:
            pass
        session['user_email'] = pending_email
        session.permanent = remember_me
        # Cleanup OTP
        login_otps_collection.delete_one({'email': pending_email})

        # Optional: show a success flash
        notification_count = get_notification_count(pending_email)
        if notification_count > 0:
            flash(f"Login successful! You have {notification_count} new notifications.", 'success')
        else:
            flash('Login successful!', 'success')

        return redirect(url_for('user_dash'))

    return render_template('login.html', form=form, otp_step=True, email=pending_email)

@app.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Resend login OTP to the pending email."""
    pending_email = session.get('pending_email')
    if not pending_email:
        return jsonify({'success': False, 'message': 'Session expired. Please log in again.'}), 400

    otp_code = f"{random.randint(100000, 999999)}"
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    login_otps_collection.update_one(
        {'email': pending_email},
        {'$set': {'email': pending_email, 'code': otp_code, 'expires_at': expires_at, 'attempts': 0}},
        upsert=True
    )

    try:
        msg = Message(
            subject='Your PlanFusion Login Code',
            recipients=[pending_email],
            body=f'Your one-time login code is: {otp_code}\nThis code expires in 10 minutes.'
        )
        mail.send(msg)
    except Exception as mail_err:
        app.logger.error(f'Failed to resend OTP to {pending_email}: {str(mail_err)}')
        return jsonify({'success': False, 'message': 'Failed to send code. Try again later.'}), 500

    return jsonify({'success': True, 'message': 'A new code has been sent to your email.'})

# ✅ Configuration
app.config.update(
    SECRET_KEY=os.getenv('SECRET_KEY', 'default_secret_key'),
    MAIL_SERVER=os.getenv('MAIL_SERVER', 'smtp.gmail.com'),
    MAIL_PORT=int(os.getenv('MAIL_PORT', 587)),
    MAIL_USE_TLS=os.getenv('MAIL_USE_TLS', 'True') == 'True',
    MAIL_USE_SSL=os.getenv('MAIL_USE_SSL', 'False') == 'True',
    MAIL_USERNAME=os.getenv('MAIL_USERNAME', 'planfusion123@gmail.com'),
    MAIL_PASSWORD=os.getenv('MAIL_PASSWORD', 'lvyr tleq ssxi spyw'),
    MAIL_DEFAULT_SENDER=os.getenv('MAIL_DEFAULT_SENDER', 'planfusion123@gmail.com'),
    MONGODB_URI=os.getenv('MONGODB_URI', 'mongodb+srv://mani:Pj8UHYA5wB92M9VD@cluster0.5hg0vzc.mongodb.net/planfusiondb?retryWrites=true&w=majority&appName=planfusion'),  # Updated to URI
    UPLOAD_FOLDER=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'uploads'),  # Absolute path for uploads
    UPLOAD_FOLDER_DOCS=os.path.join(os.path.dirname(os.path.abspath(__file__)), 'static', 'documents'),  # Absolute path for documents
    ALLOWED_EXTENSIONS={'png', 'jpg', 'jpeg', 'gif'},  # Allowed image extensions
    ALLOWED_EXTENSIONS_DOCS={'pdf', 'doc', 'docx'},  # Allowed document extensions
    ALLOWED_EXTENSIONS_CERT={'pdf', 'png', 'jpg', 'jpeg'},  # Allowed certificate extensions
    # Security and upload limits
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE=os.getenv('SESSION_COOKIE_SAMESITE', 'Lax'),
    SESSION_COOKIE_SECURE=os.getenv('SESSION_COOKIE_SECURE', 'False') == 'True',
    MAX_CONTENT_LENGTH=int(os.getenv('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)),  # 16 MB
    AVATAR_MAX_BYTES=int(os.getenv('AVATAR_MAX_BYTES', 2 * 1024 * 1024)),       # 2 MB
    DOC_MAX_BYTES=int(os.getenv('DOC_MAX_BYTES', 10 * 1024 * 1024)),           # 10 MB
    CERT_MAX_BYTES=int(os.getenv('CERT_MAX_BYTES', 5 * 1024 * 1024))           # 5 MB
)

# Create upload directories if they don't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['UPLOAD_FOLDER_DOCS'], exist_ok=True)

# ✅ Initialize Extensions
mail = Mail(app)

# Initialize scheduler guarded by env flag to avoid duplicate runs under multiple workers
ENABLE_SCHEDULER = os.getenv('ENABLE_SCHEDULER', 'False') == 'True'
scheduler = None
if ENABLE_SCHEDULER:
    scheduler = BackgroundScheduler()
    scheduler.start()
    app.logger.info("BackgroundScheduler started (ENABLE_SCHEDULER=True)")

def send_task_notification():
    """Send email notifications about pending tasks, skills, goals, and meetings to all users."""
    try:
        # Get all users
        users = list(users_collection.find({}))
        current_time = datetime.now()
        is_morning = current_time.hour < 12
        
        for user in users:
            email = user.get('email')
            if not email:
                continue
                
            # Check user's notification preferences
            preferences = user.get('notification_preferences', {
                'email_notifications': True,
                'daily_task_reminders': True
            })
            
            if not preferences.get('email_notifications') or not preferences.get('daily_task_reminders'):
                continue
                
            # Get user's pending tasks
            tasks = list(dashboard_tasks_collection.find({
                'user_email': email,
                'status': 'pending'
            }))
            
            # Get user's in-progress skills
            skills = list(skills_collection.find({
                'user_email': email,
                'status': 'in_progress'
            }))
            
            # Get user's incomplete goals
            goals = list(goals_collection.find({
                'user_email': email,
                'completed': {'$lt': 100}
            }))
            
            # Get upcoming meetings
            upcoming_meetings = list(contacts_collection.find({
                'user_email': email,
                'next_meeting': {'$gt': datetime.now()}
            }))
            
            # Prepare email content
            subject = f"{'Morning' if is_morning else 'Evening'} Update from PlanFusion"
            body = f"""
            <h2>{'Morning' if is_morning else 'Evening'} Update from PlanFusion</h2>
            
            <h3>📋 Pending Tasks ({len(tasks)})</h3>
            """
            
            if tasks:
                body += "<ul>"
                for task in tasks:
                    body += f"<li>{task.get('name')}"
                    if task.get('due_date'):
                        body += f" (Due: {task.get('due_date')})"
                    if task.get('priority'):
                        body += f" [Priority: {task.get('priority')}]"
                    body += "</li>"
                body += "</ul>"
            else:
                body += "<p>No pending tasks!</p>"
            
            body += f"""
            <h3>🎯 In-Progress Skills ({len(skills)})</h3>
            """
            
            if skills:
                body += "<ul>"
                for skill in skills:
                    completion = skill.get('completed', 0)
                    body += f"<li>{skill.get('name')} - {completion}% complete</li>"
                body += "</ul>"
            else:
                body += "<p>No skills in progress!</p>"
            
            body += f"""
            <h3>🎯 Active Goals ({len(goals)})</h3>
            """
            
            if goals:
                body += "<ul>"
                for goal in goals:
                    completion = goal.get('completed', 0)
                    target = goal.get('target', 0)
                    body += f"<li>{goal.get('description')} - {completion}/{target} completed</li>"
                body += "</ul>"
            else:
                body += "<p>No active goals!</p>"
            
            body += f"""
            <h3>🤝 Upcoming Meetings ({len(upcoming_meetings)})</h3>
            """
            
            if upcoming_meetings:
                body += "<ul>"
                for meeting in upcoming_meetings:
                    next_meeting = meeting.get('next_meeting')
                    if next_meeting:
                        body += f"<li>{meeting.get('name')} - {next_meeting.strftime('%Y-%m-%d %H:%M')}</li>"
                body += "</ul>"
            else:
                body += "<p>No upcoming meetings!</p>"
            
            body += """
            <p>Log in to your dashboard to manage your tasks and goals.</p>
            <p>Best regards,<br>PlanFusion Team</p>
            """
            
            # Send email
            msg = Message(subject, recipients=[email])
            msg.html = body
            mail.send(msg)
            
            app.logger.info(f"Comprehensive notification sent to {email}")
            
    except Exception as e:
        app.logger.error(f"Error sending notifications: {str(e)}")

if ENABLE_SCHEDULER and scheduler:
    # Schedule notifications for 9 AM and 6 PM
    scheduler.add_job(
        send_task_notification,
        'cron',
        hour='9,18',
        minute=0,
        id='task_notifications'
    )

def get_db():
    client = MongoClient(app.config['MONGODB_URI'])  # Use URI
    return client['planfusiondb']


db = get_db()  # Get the database connection

# Define collections
users_collection = db['users']
dashboard_tasks_collection = db['dashboard_tasks']
login_otps_collection = db['login_otps']

# ✅ Logging
logging.basicConfig(filename='app.log', level=logging.INFO,
                    format='%(asctime)s - %(levelname)s - %(message)s')

# ✅ Helpers
def find_one(collection_name, query):
    collection = db[collection_name]
    return collection.find_one(query)


def find_all(collection_name, query={}):
    collection = db[collection_name]
    return list(collection.find(query))


def insert_one(collection_name, data):
    collection = db[collection_name]
    result = collection.insert_one(data)
    return result.inserted_id


def update_one(collection_name, query, update_data):
    collection = db[collection_name]
    result = collection.update_one(query, {'$set': update_data})
    return result.modified_count


def delete_one(collection_name, query):
    collection = db[collection_name]
    result = collection.delete_one(query)
    return result.deleted_count


def login_required(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        if 'user_email' not in session:
            flash("Please log in to access this page.", "warning")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return wrapper


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']


def allowed_file_docs(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS_DOCS']


def allowed_file_cert(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS_CERT']


def random_string(length):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

# --- File validation helpers ---
def get_file_size_bytes(file_storage):
    try:
        current_pos = file_storage.stream.tell()
    except Exception:
        current_pos = 0
    try:
        file_storage.stream.seek(0, os.SEEK_END)
        size = file_storage.stream.tell()
        file_storage.stream.seek(0)
        return size
    except Exception:
        # Fallback to length of read content (may load into memory)
        data = file_storage.read()
        size = len(data)
        file_storage.stream.seek(0)
        return size

def sniff_image_magic(header_bytes):
    # JPEG
    if header_bytes.startswith(b"\xFF\xD8\xFF"):
        return True
    # PNG
    if header_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
        return True
    # GIF
    if header_bytes.startswith(b"GIF87a") or header_bytes.startswith(b"GIF89a"):
        return True
    return False

def sniff_document_magic(header_bytes):
    # PDF
    if header_bytes.startswith(b"%PDF"):
        return True
    # DOCX/ZIP
    if header_bytes.startswith(b"PK\x03\x04"):
        return True
    # DOC (OLE Compound File)
    if header_bytes.startswith(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"):
        return True
    return False

def is_valid_image_file(file_storage):
    try:
        header = file_storage.stream.read(16)
        file_storage.stream.seek(0)
        return sniff_image_magic(header)
    except Exception:
        return False

def is_valid_document_file(file_storage):
    try:
        header = file_storage.stream.read(8)
        file_storage.stream.seek(0)
        return sniff_document_magic(header)
    except Exception:
        return False


app.jinja_env.globals['random_string'] = random_string  # Make it available in templates

# ✅ Forms
def password_validator(form, field):
    password = field.data
    if len(password) < 8:
        raise ValidationError('Password must be at least 8 characters long.')
    if not re.search(r'[A-Z]', password):
        raise ValidationError('Password must contain at least one uppercase letter.')
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        raise ValidationError('Password must contain at least one special character.')

class RegisterForm(FlaskForm):
    name = StringField("Name", validators=[DataRequired()])
    email = StringField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Password", validators=[
        DataRequired(),
        password_validator
    ])
    submit = SubmitField("Sign Up")


class LoginForm(FlaskForm):
    email = StringField("Email", validators=[DataRequired(), Email()])
    password = PasswordField("Password", validators=[DataRequired()])
    submit = SubmitField("Login")


# ✅ Routes
@app.route('/')
def dash():
    return render_template('dash.html', user_name="Guest")


@app.route('/register', methods=['GET', 'POST'])
def register():
    """
    Handles user registration.
    """
    if request.method == 'GET':
        # Clear any stale flashes on refresh/back navigation
        try:
            session.pop('_flashes', None)
        except Exception:
            pass
    form = RegisterForm()
    if form.validate_on_submit():
        name = form.name.data.strip()
        email = form.email.data.strip()
        password = form.password.data.strip()

        user = find_one("users", {"email": email})
        if user:
            flash("This email address is already registered. Please use a different email or try logging in.", "danger")
            return render_template('register.html', form=form)

        try:
            hashed_password = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
            user_data = {"name": name, "email": email, "password": hashed_password}
            insert_one("users", user_data)
            logging.info(f"User registered: {email}")
            
            flash("Registration successful! You can now log in to your account.", "success")
            
            # Clear session data but preserve flash messages
            session_data = dict(session)
            session.clear()
            for key, value in session_data.items():
                if key.startswith('_flashes'):
                    session[key] = value
            
            return redirect(url_for('login', from_registration='true'))
        except Exception as e:
            logging.error(f"Registration error: {e}")
            flash("There was an error during registration. Please try again later.", "danger")
    elif form.errors:
        for field, errors in form.errors.items():
            if field == 'password':
                for error in errors:
                    if 'uppercase' in error.lower():
                        flash("Password must contain at least one uppercase letter.", "danger")
                    elif 'special' in error.lower():
                        flash("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>).", "danger")
                    elif '8 characters' in error.lower():
                        flash("Password must be at least 8 characters long.", "danger")
                    else:
                        flash(f"Password: {error}", "danger")
            elif field == 'email':
                for error in errors:
                    if 'valid email' in error.lower():
                        flash("Please enter a valid email address.", "danger")
                    else:
                        flash(f"Email: {error}", "danger")
            elif field == 'name':
                for error in errors:
                    flash(f"Name: {error}", "danger")
            else:
                for error in errors:
                    flash(f"{field}: {error}", "danger")

    return render_template('register.html', form=form)


def get_notification_count(email):
    """
    Get the total number of notifications for a user.
    """
    try:
        # Get pending tasks
        pending_tasks = list(dashboard_tasks_collection.find({
            'user_email': email,
            'status': 'pending'
        }))
        
        # Get in-progress skills
        in_progress_skills = list(skills_collection.find({
            'user_email': email,
            'status': 'in_progress'
        }))
        
        # Get upcoming meetings
        upcoming_meetings = list(contacts_collection.find({
            'user_email': email,
            'next_meeting': {'$gt': datetime.now()}
        }))
        
        # Get incomplete goals
        incomplete_goals = list(goals_collection.find({
            'user_email': email,
            'completed': {'$lt': 100}
        }))
        
        total_notifications = (
            len(pending_tasks) +
            len(in_progress_skills) +
            len(upcoming_meetings) +
            len(incomplete_goals)
        )
        
        return total_notifications
        
    except Exception as e:
        app.logger.error(f"Error getting notification count: {str(e)}")
        return 0

@app.route('/login', methods=['GET', 'POST'])
def login():
    """
    Handles user login with optimized database operations.
    """
    # If visiting via GET, clear stale flashes; redirect authenticated users
    if request.method == 'GET':
        # Only clear flash messages if not coming from registration
        if not request.args.get('from_registration'):
            try:
                session.pop('_flashes', None)
            except Exception:
                pass
        # Clear any stale pending OTP unless explicitly entering OTP flow
        if session.get('pending_email') and not request.args.get('otp'):
            try:
                session.pop('pending_email', None)
                session.pop('remember_me', None)
            except Exception:
                pass
        # Only redirect if user is already logged in AND not coming from registration
        if 'user_email' in session and not request.args.get('from_registration'):
            return redirect(url_for('user_dash'))

    form = LoginForm()
    # If OTP step is pending, allow verifying code on the same page
    if request.method == 'POST' and session.get('pending_email') and request.form.get('code'):
        email_pending = session.get('pending_email')
        code = request.form.get('code', '').strip()
        record = login_otps_collection.find_one({'email': email_pending})
        if not record:
            flash('OTP not found. Please request a new code.', 'danger')
            return render_template('login.html', form=form, otp_step=True, email=email_pending)
        if datetime.utcnow() > record.get('expires_at', datetime.utcnow()):
            flash('Code expired. Please resend a new code.', 'danger')
            return render_template('login.html', form=form, otp_step=True, email=email_pending)
        if code != record.get('code'):
            login_otps_collection.update_one({'email': email_pending}, {'$inc': {'attempts': 1}})
            flash('Invalid code. Please try again.', 'danger')
            return render_template('login.html', form=form, otp_step=True, email=email_pending)

        # Success → promote session to logged-in
        remember_me = bool(session.get('remember_me'))
        try:
            session.clear()
        except Exception:
            pass
        session['user_email'] = email_pending
        session.permanent = remember_me
        login_otps_collection.delete_one({'email': email_pending})

        notification_count = get_notification_count(email_pending)
        if notification_count > 0:
            flash(f"Login successful! You have {notification_count} new notifications.", 'success')
        else:
            flash('Login successful!', 'success')
        return redirect(url_for('user_dash'))

    if form.validate_on_submit():
        email = form.email.data.strip()
        password = form.password.data.strip()
        remember = request.form.get('remember')

        try:
            # Check if account is locked - using a single query
            attempt = login_attempts_collection.find_one({'email': email})
            if attempt and attempt.get('attempts', 0) >= 3:
                lock_time = attempt.get('lock_time')
                if lock_time and datetime.utcnow() < lock_time:
                    remaining_time = lock_time - datetime.utcnow()
                    minutes = int(remaining_time.total_seconds() / 60)
                    flash(f"Account is locked. Please try again in {minutes} minutes.", "danger")
                    return render_template('login.html', form=form)
                else:
                    # Reset attempts if lock time has expired
                    login_attempts_collection.update_one(
                        {'email': email},
                        {'$set': {'attempts': 0, 'lock_time': None}}
                    )

            # Get user data with a single query
            user = find_one("users", {"email": email})
            if not user:
                logging.warning(f"Login attempt with non-existent email: {email}")
                flash("Invalid email address.", "danger")
                return render_template('login.html', form=form)
                
            if not bcrypt.checkpw(password.encode(), user['password'].encode()):
                logging.warning(f"Failed login attempt for {email} - wrong password")
                # Update failed attempts in a single operation
                login_attempts_collection.update_one(
                    {'email': email},
                    {
                        '$inc': {'attempts': 1},
                        '$set': {
                            'lock_time': datetime.utcnow() + timedelta(hours=1) if attempt and attempt.get('attempts', 0) + 1 >= 3 else None
                        }
                    },
                    upsert=True
                )
                
                remaining_attempts = 3 - (attempt.get('attempts', 0) + 1 if attempt else 1)
                flash(f"Incorrect password. {remaining_attempts} attempts remaining.", "danger")
                return render_template('login.html', form=form)
                
            # Password OK → Move to OTP verification
            try:
                session.clear()
            except Exception:
                pass

            # Generate 6-digit OTP and save with 10-minute expiry
            otp_code = f"{random.randint(100000, 999999)}"
            expires_at = datetime.utcnow() + timedelta(minutes=10)
            login_otps_collection.update_one(
                {'email': email},
                {'$set': {'email': email, 'code': otp_code, 'expires_at': expires_at, 'attempts': 0}},
                upsert=True
            )

            # Store pending email in session until OTP is verified
            session['pending_email'] = email
            session['remember_me'] = bool(remember)

            # Send OTP email
            try:
                msg = Message(
                    subject="Your PlanFusion Login Code",
                    recipients=[email],
                    body=f"Your one-time login code is: {otp_code}\nThis code expires in 10 minutes."
                )
                mail.send(msg)
            except Exception as mail_err:
                logging.error(f"Failed to send OTP email to {email}: {str(mail_err)}")
                flash("Could not send OTP email. Please try again.", "danger")
                return render_template('login.html', form=form)

            # Reset login attempts upon passing password stage
            login_attempts_collection.update_one(
                {'email': email},
                {'$set': {'attempts': 0, 'lock_time': None}}
            )

            flash("We sent a 6-digit code to your email. Enter it to finish login.", "success")
            return redirect(url_for('login', otp='1'))

        except Exception as e:
            logging.error(f"Login error: {str(e)}")
            flash("An error occurred during login. Please try again.", "danger")
            return render_template('login.html', form=form)
            
    elif form.errors:
        for field, errors in form.errors.items():
            for error in errors:
                flash(f"{field}: {error}", "danger")
                
    # Only show OTP step on GET when explicitly requested via otp=1
    if request.method == 'GET' and session.get('pending_email') and request.args.get('otp') == '1':
        return render_template('login.html', form=form, otp_step=True, email=session.get('pending_email'))

    return render_template('login.html', form=form)


@app.route('/forgot_password', methods=['GET', 'POST'])
def forgot_password():
    """
    Handles the forgot password functionality.
    """
    if request.method == 'POST':
        email = request.form['email']
        user = find_one("users", {"email": email})

        if user:
            token = ''.join(random.choices(string.ascii_letters + string.digits, k=20))
            expiry = datetime.now() + timedelta(minutes=30)
            reset_data = {"email": email, "token": token, "expires_at": expiry}
            insert_one("password_resets", reset_data)

            reset_link = url_for('reset_password', token=token, _external=True)
            msg = Message("Password Reset Request", recipients=[email])
            msg.body = f"Click to reset your password:\n{reset_link}\nThis link expires in 30 minutes."
            mail.send(msg)

            logging.info(f"Password reset email sent to {email}")
            flash("Password reset link has been sent to your email.", "success")
        else:
            flash("No account found with that email.", "danger")

    return render_template('forgot_password.html')


class ResetPasswordForm(FlaskForm):
    new_password = PasswordField("New Password", validators=[
        DataRequired(),
        password_validator
    ])
    confirm_password = PasswordField("Confirm Password", validators=[DataRequired()])
    submit = SubmitField("Reset Password")

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    """
    Handles resetting the user's password.
    """
    reset_data = find_one("password_resets", {"token": token})

    if not reset_data:
        flash("Invalid or expired reset link. Please request a new password reset.", "danger")
        return redirect(url_for('login'))

    email = reset_data['email']
    expires_at = reset_data['expires_at']
    if datetime.utcnow() > expires_at:
        flash("This reset link has expired. Please request a new password reset.", "danger")
        return redirect(url_for('forgot_password'))

    form = ResetPasswordForm()
    if form.validate_on_submit():
        new_password = form.new_password.data
        confirm_password = form.confirm_password.data

        if new_password != confirm_password:
            flash("Passwords do not match. Please try again.", "danger")
            return render_template('reset_password.html', form=form, token=token)

        try:
            # Update the password in the database
            hashed_password = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
            result = update_one("users", {"email": email}, {"password": hashed_password})
            
            if result:
                # Delete the reset token
                delete_one("password_resets", {"token": token})
                flash("Your password has been reset successfully. Please login with your new password.", "success")
                return redirect(url_for('login'))
            else:
                flash("Failed to update password. Please try again.", "danger")
        except Exception as e:
            logging.error(f"Error resetting password: {str(e)}")
            flash("There was an error resetting your password. Please try again later.", "danger")
    elif form.errors:
        for field, errors in form.errors.items():
            if field == 'new_password':
                for error in errors:
                    if 'uppercase' in error.lower():
                        flash("Password must contain at least one uppercase letter.", "danger")
                    elif 'special' in error.lower():
                        flash("Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>).", "danger")
                    elif '8 characters' in error.lower():
                        flash("Password must be at least 8 characters long.", "danger")
                    else:
                        flash(f"Password: {error}", "danger")
            elif field == 'confirm_password':
                for error in errors:
                    flash("Please confirm your password.", "danger")

    return render_template('reset_password.html', form=form, token=token)


@app.route('/user_dash')
@login_required
def user_dash():
    """
    Displays the user dashboard.
    """
    email = session['user_email']
    profile = get_user_profile(email)
    app.logger.info(f"Profile in user_dash: {profile}")
    user_name = profile.get('full_name', 'Guest') if profile else "Guest"

    # Get tasks data
    tasks = list(db.dashboard_tasks.find({"user_email": email}))
    completed_tasks = [t for t in tasks if t.get('status') == 'completed']
    pending_tasks = [t for t in tasks if t.get('status') == 'pending']
    overdue_tasks = [t for t in tasks if t.get('status') == 'overdue']
    
    # Get skills data
    skills = list(skills_collection.find({"user_email": email}))
    completed_skills = [s for s in skills if s.get('completed', 0) == 100]
    in_progress_skills = [s for s in skills if s.get('completed', 0) < 100]
    pending_skills = []  # No longer needed as all non-completed skills are in progress
    on_hold_skills = [s for s in skills if s.get('status') == 'on_hold']
    
    # Get network data
    contacts = list(contacts_collection.find({"user_email": email}))
    goals = list(goals_collection.find({"user_email": email}))
    
    # Debug logging
    app.logger.info(f"Found {len(goals)} total goals for user {email}")
    for goal in goals:
        app.logger.info(f"Goal: {goal.get('description')}, Type: {goal.get('type')}, Status: {goal.get('status')}, Target: {goal.get('target')}, Completed: {goal.get('completed')}")
    
    current_month = datetime.now().month
    new_contacts_this_month = len([c for c in contacts if c.get('created_at', datetime.now()).month == current_month])
    meetings_attended = len([c for c in contacts if c.get('last_meeting') and c.get('last_meeting').month == current_month])
    follow_ups = len([c for c in contacts if c.get('next_meeting') and c.get('next_meeting') > datetime.now()])
    
    # Calculate completed goals with detailed logging
    completed_goals = 0
    for goal in goals:
        is_completed = (
            goal.get('status') == 'completed' or 
            (goal.get('completed', 0) >= goal.get('target', 0) and goal.get('target', 0) > 0)
        )
        if is_completed:
            completed_goals += 1
            app.logger.info(f"Counting completed goal: {goal.get('description')} (ID: {goal.get('_id')})")
        else:
            app.logger.info(f"Goal not counted as completed: {goal.get('description')} (ID: {goal.get('_id')})")
            app.logger.info(f"  Status: {goal.get('status')}")
            app.logger.info(f"  Completed: {goal.get('completed')}")
            app.logger.info(f"  Target: {goal.get('target')}")
    
    total_goals = len(goals)
    goal_achievement_percentage = round((completed_goals / total_goals * 100) if total_goals > 0 else 0)
    
    app.logger.info(f"=== Final Goals Calculation ===")
    app.logger.info(f"Completed goals: {completed_goals}")
    app.logger.info(f"Total goals: {total_goals}")
    app.logger.info(f"Achievement percentage: {goal_achievement_percentage}%")
    
    # Get upcoming meetings
    upcoming_meetings = [c for c in contacts if c.get('next_meeting') and c.get('next_meeting') > datetime.now()]
    upcoming_meetings.sort(key=lambda x: x.get('next_meeting', datetime.max))
    
    # Calculate percentages
    total_tasks = len(tasks)
    total_skills = len(skills)
    
    task_completion_percentage = round((len(completed_tasks) / total_tasks * 100) if total_tasks > 0 else 0)
    # Calculate overall skill completion percentage based on the average of 'completed' field
    total_skill_completion = sum(s.get('completed', 0) for s in skills)
    skill_completion_percentage = round((total_skill_completion / total_skills) if total_skills > 0 else 0)
    network_growth_percentage = round((len([c for c in contacts if c.get('created_at', datetime.now()).month == datetime.now().month]) / len(contacts) * 100) if len(contacts) > 0 else 0)

    return render_template('user_dash.html',
        user_name=user_name,
        profile=profile,
        completed_tasks_count=len(completed_tasks),
        pending_tasks_count=len(pending_tasks),
        overdue_tasks_count=len(overdue_tasks),
        task_completion_percentage=task_completion_percentage,
        completed_skills_count=len(completed_skills),
        in_progress_skills_count=len(in_progress_skills),
        skill_completion_percentage=skill_completion_percentage,
        total_contacts_count=len(contacts),
        new_contacts_count=new_contacts_this_month,
        upcoming_meetings_count=len([c for c in contacts if c.get('next_meeting') and c.get('next_meeting') > datetime.now()]),
        network_growth_percentage=network_growth_percentage,
        goals_achieved_count=completed_goals,
        total_goals_count=total_goals,
        goal_achievement_percentage=goal_achievement_percentage
    )


@app.route('/dashboard_data')
@login_required
def dashboard_data():
    """
    Returns JSON data for the dashboard charts.
    """
    try:
        email = session['user_email']
        
        # Get network data with more detailed query
        app.logger.info(f"=== Starting Goals Query ===")
        app.logger.info(f"Querying goals for user: {email}")
        
        # Get all goals for the user
        goals = list(goals_collection.find({"user_email": email}))
        app.logger.info(f"Total goals found: {len(goals)}")
        
        # Group goals by type
        goals_by_type = {}
        for goal in goals:
            goal_type = goal.get('type', 'other')
            if goal_type not in goals_by_type:
                goals_by_type[goal_type] = []
            goals_by_type[goal_type].append(goal)
            app.logger.info(f"Goal found - Description: {goal.get('description')}, Type: {goal_type}, Status: {goal.get('status')}, Target: {goal.get('target')}, Completed: {goal.get('completed')}")
        
        # Calculate completed goals for each type
        completed_goals_by_type = {}
        total_goals_by_type = {}
        achievement_percentage_by_type = {}
        
        for goal_type, type_goals in goals_by_type.items():
            completed_goals = 0
            for goal in type_goals:
                is_completed = (
                    goal.get('status') == 'completed' or 
                    (goal.get('completed', 0) >= goal.get('target', 0) and goal.get('target', 0) > 0)
                )
                if is_completed:
                    completed_goals += 1
                    app.logger.info(f"Counting completed goal: {goal.get('description')} (ID: {goal.get('_id')})")
                else:
                    app.logger.info(f"Goal not counted as completed: {goal.get('description')} (ID: {goal.get('_id')})")
                    app.logger.info(f"  Status: {goal.get('status')}")
                    app.logger.info(f"  Completed: {goal.get('completed')}")
                    app.logger.info(f"  Target: {goal.get('target')}")
            
            total_goals = len(type_goals)
            completed_goals_by_type[goal_type] = completed_goals
            total_goals_by_type[goal_type] = total_goals
            achievement_percentage_by_type[goal_type] = round((completed_goals / total_goals * 100) if total_goals > 0 else 0)
        
        # Calculate total completed goals and achievement percentage
        total_completed_goals = sum(completed_goals_by_type.values())
        total_all_goals = sum(total_goals_by_type.values())
        goal_achievement_percentage = round((total_completed_goals / total_all_goals * 100) if total_all_goals > 0 else 0)
        
        app.logger.info(f"=== Final Goals Calculation ===")
        app.logger.info(f"Total completed goals: {total_completed_goals}")
        app.logger.info(f"Total all goals: {total_all_goals}")
        app.logger.info(f"Goal achievement percentage: {goal_achievement_percentage}%")
        
        # Get tasks data
        tasks = list(db.dashboard_tasks.find({"user_email": email}))
        completed_tasks = [t for t in tasks if t.get('status') == 'completed']
        pending_tasks = [t for t in tasks if t.get('status') == 'pending']
        overdue_tasks = [t for t in tasks if t.get('status') == 'overdue']
        
        # Get skills data
        skills = list(skills_collection.find({"user_email": email}))
        completed_skills = [s for s in skills if s.get('completed', 0) == 100]
        in_progress_skills = [s for s in skills if s.get('completed', 0) < 100]
        pending_skills = []  # No longer needed as all non-completed skills are in progress
        on_hold_skills = [s for s in skills if s.get('status') == 'on_hold']
        
        # Get network data
        contacts = list(contacts_collection.find({"user_email": email}))
        
        # Get upcoming meetings
        upcoming_meetings = [c for c in contacts if c.get('next_meeting') and c.get('next_meeting') > datetime.now()]
        upcoming_meetings.sort(key=lambda x: x.get('next_meeting', datetime.max))
        
        # Calculate percentages
        total_tasks = len(tasks)
        total_skills = len(skills)
        
        task_completion_percentage = round((len(completed_tasks) / total_tasks * 100) if total_tasks > 0 else 0)
        # Calculate overall skill completion percentage based on the average of 'completed' field
        total_skill_completion = sum(s.get('completed', 0) for s in skills)
        skill_completion_percentage = round((total_skill_completion / total_skills) if total_skills > 0 else 0)
        network_growth_percentage = round((len([c for c in contacts if c.get('created_at', datetime.now()).month == datetime.now().month]) / len(contacts) * 100) if len(contacts) > 0 else 0)

        response_data = {
            'task_data': {
                'completed': len(completed_tasks),
                'pending': len(pending_tasks),
                'overdue': len(overdue_tasks),
                'completion_percentage': task_completion_percentage,
                'pending_tasks_list': [
                    {
                        'name': t.get('name', 'Unnamed Task'),
                        'priority': t.get('priority', ''),
                        'due_date': t.get('due_date', '')
                    } for t in pending_tasks
                ]
            },
            'skill_data': {
                'completed': len(completed_skills),
                'in_progress': len(in_progress_skills),
                'pending': 0,  # Set to 0 since all non-completed skills are in progress
                'on_hold': len(on_hold_skills),
                'completion_percentage': skill_completion_percentage,
                'in_progress_skills_list': [{'name': s.get('name', 'Unnamed Skill')} for s in in_progress_skills]
            },
            'network_data': {
                'total_contacts': len(contacts),
                'new_contacts': len([c for c in contacts if c.get('created_at', datetime.now()).month == datetime.now().month]),
                'meetings_attended': len([c for c in contacts if c.get('lastInteraction') and c.get('lastInteraction').month == datetime.now().month]),
                'follow_ups': len([c for c in contacts if c.get('next_meeting') and c.get('next_meeting') > datetime.now()]),
                'growth_percentage': network_growth_percentage,
                'completed_goals': total_completed_goals,
                'total_goals': total_all_goals,
                'goal_achievement_percentage': goal_achievement_percentage,
                'goals': {
                    'by_type': {
                        goal_type: {
                            'completed': completed_goals_by_type.get(goal_type, 0),
                            'total': total_goals_by_type.get(goal_type, 0),
                            'achievement_percentage': achievement_percentage_by_type.get(goal_type, 0),
                            'goals': [{
                                'description': g.get('description', 'Unnamed Goal'),
                                'type': g.get('type', 'other'),
                                'target': int(g.get('target', 0)),
                                'completed': 1 if (
                                    g.get('status') == 'completed' or 
                                    (g.get('completed', 0) >= g.get('target', 0) and g.get('target', 0) > 0)
                                ) else 0,
                                'deadline': g.get('deadline').strftime('%Y-%m-%d') if g.get('deadline') else None
                            } for g in type_goals]
                        } for goal_type, type_goals in goals_by_type.items()
                    }
                },
                'upcoming_meetings': [{
                    'name': m.get('name', 'Unnamed Contact'),
                    'next_meeting': m.get('next_meeting').strftime('%Y-%m-%d %H:%M') if m.get('next_meeting') else None
                } for m in upcoming_meetings]
            }
        }
        
        app.logger.info(f"=== Final Response Data ===")
        app.logger.info(f"Network data in response: {response_data['network_data']}")
        
        return jsonify(response_data)

    except Exception as e:
        app.logger.error(f"Error in dashboard_data: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/notifications/mark_read', methods=['POST'])
@login_required
def mark_notification_read():
    try:
        email = session['user_email']
        notification_id = request.json.get('notification_id')
        
        if notification_id:
            result = db.notifications.update_one(
                {
                    '_id': ObjectId(notification_id),
                    'user_email': email
                },
                {
                    '$set': {'is_read': True}
                }
            )
            
            if result.modified_count > 0:
                return jsonify({'success': True})
            else:
                return jsonify({'success': False, 'error': 'Notification not found'}), 404
                
        return jsonify({'success': False, 'error': 'No notification ID provided'}), 400
        
    except Exception as e:
        app.logger.error(f"Error marking notification as read: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/logout')
@login_required
def logout():
    """
    Logs the user out.
    """
    # Clear entire session to avoid any cross-user state
    try:
        session.clear()
    except Exception:
        session.pop('user_email', None)
        try:
            session.pop('_flashes', None)
        except Exception:
            pass
    flash("You have been logged out.", "success")
    return redirect(url_for('login'))


@app.route('/get_tasks', methods=['GET'])
@login_required
def get_tasks():
    """
    Retrieves all tasks from the todo_list collection.
    """
    tasks = find_all("todo_list", {})
    tasks_list = [{"id": str(task["_id"]), "name": task["name"],
                   "status": task["status"]} for task in tasks]
    return jsonify({"tasks": tasks_list}), 200


@app.route('/update_task_status/<string:task_id>', methods=['PUT'])
@login_required
def update_task_status(task_id):
    """
    Updates the status of a specific task.
    """
    data = request.get_json()
    new_status = data.get("status")
    if new_status not in ["completed", "pending"]:
        return jsonify({"error": "Invalid status"}), 400
    update_one("todo_list", {"_id": ObjectId(task_id)}, {"status": new_status})
    return jsonify({"message": "Task status updated"}), 200


@app.route('/contact', methods=['POST'])
def contact():
    """
    Handles contact form submissions and sends the message to the PlanFusion email.
    """
    name = request.form.get("name")
    email = request.form.get("email")
    message = request.form.get("message")

    if not name or not email or not message:
        flash("All fields are required!", "danger")
        return redirect(url_for("dash"))

    # Send the message to the PlanFusion email
    try:
        planfusion_email = app.config.get('MAIL_DEFAULT_SENDER', 'planfusion123@gmail.com')
        subject = f"Contact Us Message from {name}"
        body = f"""
        <h3>New Contact Us Submission</h3>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Message:</strong><br>{message}</p>
        """
        msg = Message(subject=subject, recipients=[planfusion_email])
        msg.html = body
        mail.send(msg)
        flash("Message sent successfully!", "success")
    except Exception as e:
        app.logger.error(f"Error sending contact us message: {str(e)}")
        flash("There was an error sending your message. Please try again later.", "danger")
    return redirect(url_for("dash"))

# Profile Section
# ----------------------------------------------------------------------


def get_user_profile(email):
    """
    Retrieves a user's profile from the user_profile collection.
    Creates a default profile if none exists.
    """
    profile = find_one("user_profile", {"email": email})
    if not profile:
        # Create default profile
        default_profile = {
            "email": email,
            "full_name": "",
            "job_title": "",
            "address": "",
            "phone": "",
            "bio": "",
            "linkedin_url": "",
            "twitter_url": "",
            "instagram_url": "",
            "facebook_url": "",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        insert_one("user_profile", default_profile)
        return default_profile
    return profile

def create_user_profile(data):
    """
    Creates a new user profile in the user_profile collection.
    """
    data['created_at'] = datetime.utcnow()
    data['updated_at'] = datetime.utcnow()
    return insert_one("user_profile", data)

def update_user_profile(data, email):
    """
    Updates an existing user profile in the user_profile collection.
    Creates a new profile if none exists.
    """
    profile = find_one("user_profile", {"email": email})
    if not profile:
        return create_user_profile(data)

    update_data = {
        "full_name": data.get("full_name", profile.get("full_name", "")),
        "job_title": data.get("job_title", profile.get("job_title", "")),
        "address": data.get("address", profile.get("address", "")),
        "phone": data.get("phone", profile.get("phone", "")),
        "bio": data.get("bio", profile.get("bio", "")),
        "linkedin_url": data.get("linkedin_url", profile.get("linkedin_url", "")),
        "twitter_url": data.get("twitter_url", profile.get("twitter_url", "")),
        "instagram_url": data.get("instagram_url", profile.get("instagram_url", "")),
        "facebook_url": data.get("facebook_url", profile.get("facebook_url", "")),
        "updated_at": datetime.utcnow()
    }
    if data.get("avatar_url") is not None:
        update_data["avatar_url"] = data.get("avatar_url")
    return update_one("user_profile", {"email": email}, update_data)


@app.route('/profile', methods=['GET', 'POST'])
@login_required
def profile():
    try:
        if request.method == 'POST':
            # Support AJAX profile updates expecting JSON
            data = request.form.to_dict()
            data['email'] = session['user_email']
            update_user_profile(data, session['user_email'])
            return jsonify({'success': True})

        user_profile = get_user_profile(session['user_email'])
        return render_template('profile.html', profile=user_profile)
    except Exception as e:
        app.logger.error(f"Error in profile route: {str(e)}")
        if request.method == 'POST':
            return jsonify({'success': False, 'error': str(e)}), 500
        flash('Error loading profile. Please try again.', 'error')
        return redirect(url_for('user_dash'))

@app.route('/profile/update', methods=['POST'])
@login_required
def update_profile():
    try:
        data = request.form.to_dict()
        data['email'] = session['user_email']
        
        # Handle avatar upload
        if 'avatar' in request.files:
            avatar = request.files['avatar']
            if avatar and allowed_file(avatar.filename):
                filename = secure_filename(avatar.filename)
                avatar_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                avatar.save(avatar_path)
                data['avatar_url'] = url_for('static', filename=f'uploads/{filename}')
        
        update_user_profile(data, session['user_email'])
        flash('Profile updated successfully!', 'success')
        return redirect(url_for('profile'))
    except Exception as e:
        flash('Error updating profile. Please try again.', 'error')
        app.logger.error(f"Error in update_profile route: {str(e)}")
        return redirect(url_for('profile'))

@app.route('/upload_avatar', methods=['POST'])
@login_required
def upload_avatar():
    """
    Handles uploading and saving user avatars.
    """
    try:
        email = session['user_email']
        app.logger.info(f"User email from session in upload_avatar: {email}")
        
        if 'avatar' not in request.files:
            app.logger.error("No file part in request")
            return jsonify({"error": "No file part"}), 400
            
        file = request.files['avatar']
        if file.filename == '':
            app.logger.error("No selected file")
            return jsonify({"error": "No selected file"}), 400
            
        # Extension and content checks
        if not file or not allowed_file(file.filename):
            app.logger.error(f"Invalid file type: {file.filename}")
            return jsonify({"error": "Invalid file type"}), 400
        if get_file_size_bytes(file) > app.config['AVATAR_MAX_BYTES']:
            app.logger.error("Avatar exceeds size limit")
            return jsonify({"error": "File too large"}), 413
        if not is_valid_image_file(file):
            app.logger.error("Avatar content failed validation")
            return jsonify({"error": "Invalid image content"}), 400
            
        # Ensure upload directory exists
        upload_dir = app.config['UPLOAD_FOLDER']
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
            app.logger.info(f"Created upload directory: {upload_dir}")
            
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{email}_{int(datetime.now().timestamp())}_{filename}"
        filepath = os.path.join(upload_dir, unique_filename)
        
        # Save file
        file.save(filepath)
        app.logger.info(f"Avatar file successfully saved to: {filepath}")
        
        # Generate URL - ensure it's a valid URL
        avatar_url = url_for('static', filename=f'uploads/{unique_filename}', _external=True)
        app.logger.info(f"Generated avatar_url: {avatar_url}")
        
        # Check if user profile exists
        user_profile = find_one("user_profile", {"email": email})
        if not user_profile:
            app.logger.error(f"No user profile found for email: {email}")
            return jsonify({"error": "User profile not found"}), 404
            
        # Update database
        result = update_one("user_profile", {"email": email}, {"avatar_url": avatar_url})
        if result:
            app.logger.info(f"Successfully updated avatar for user: {email}")
            return jsonify({"success": True, "avatar_url": avatar_url}), 200
        else:
            app.logger.error(f"Failed to update avatar in database for user: {email}")
            return jsonify({"error": "Failed to update avatar in database"}), 500
            
    except Exception as e:
        app.logger.error(f"Error in upload_avatar: {str(e)}")
        return jsonify({"error": f"Server error: {str(e)}"}), 500

contacts_collection = db.contacts
goals_collection = db.goals
skills_collection = db.skills  # Add skills collection
login_attempts_collection = db['login_attempts']

def format_date(date_str):
    return datetime.strptime(date_str, '%Y-%m-%d').strftime('%Y-%m-%d') if date_str else None

# --- Contacts API Endpoints ---
@app.route('/api/contacts', methods=['GET'])
@login_required
def get_contacts():
    email = session['user_email']
    contacts = list(contacts_collection.find({"user_email": email}))
    for contact in contacts:
        contact['_id'] = str(contact['_id'])
        contact['lastInteraction'] = contact.get('lastInteraction', None).strftime('%Y-%m-%d') if contact.get('lastInteraction') else None
    return jsonify(contacts)

@app.route('/api/contacts', methods=['POST'])
@login_required
def add_contact():
    try:
        email = session['user_email']
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'message': 'Name is required'}), 400
            
        # Prepare contact data
        contact_data = {
            'user_email': email,
            'name': data.get('name'),
            'email': data.get('email'),
            'phone': data.get('phone'),
            'category': data.get('category'),
            'notes': data.get('notes'),
            'created_at': datetime.utcnow()
        }
        
        # Handle lastInteraction if provided
        if data.get('lastInteraction'):
            try:
                contact_data['lastInteraction'] = datetime.strptime(data['lastInteraction'], '%Y-%m-%d %H:%M')
            except ValueError:
                return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD HH:MM'}), 400
        
        # Insert the contact
        result = contacts_collection.insert_one(contact_data)
        new_contact = contacts_collection.find_one({"_id": result.inserted_id})
        
        # Format the response
        new_contact['_id'] = str(new_contact['_id'])
        if new_contact.get('lastInteraction'):
            new_contact['lastInteraction'] = new_contact['lastInteraction'].strftime('%Y-%m-%d %H:%M')
        if new_contact.get('created_at'):
            new_contact['created_at'] = new_contact['created_at'].strftime('%Y-%m-%d %H:%M')
            
        return jsonify(new_contact), 201
        
    except Exception as e:
        app.logger.error(f"Error adding contact: {str(e)}")
        return jsonify({'message': 'An error occurred while adding the contact'}), 500

@app.route('/api/contacts/<contact_id>', methods=['DELETE'])
@login_required
def delete_contact(contact_id):
    email = session['user_email']
    result = contacts_collection.delete_one({'_id': ObjectId(contact_id), 'user_email': email})
    if result.deleted_count > 0:
        return jsonify({'message': 'Contact deleted successfully'}), 200
    return jsonify({'message': 'Contact not found'}), 404

# --- Goals API Endpoints ---
@app.route('/api/goals', methods=['GET'])
@login_required
def get_goals():
    email = session['user_email']
    goals = list(goals_collection.find({"user_email": email}))
    for goal in goals:
        goal['_id'] = str(goal['_id'])
        goal['deadline'] = goal.get('deadline', None).strftime('%Y-%m-%d') if goal.get('deadline') else None
    return jsonify(goals)

@app.route('/api/goals', methods=['POST'])
@login_required
def add_goal():
    try:
        email = session['user_email']
        data = request.get_json()
        
        # Validate required fields
        if not data.get('description') or not data.get('type'):
            return jsonify({'message': 'Description and type are required'}), 400

        # Prepare goal data
        goal_data = {
            'user_email': email,
            'description': data.get('description'),
            'type': data.get('type'),
            'target': int(data.get('target', 0)),
            'completed': int(data.get('completed', 0))
        }

        # Handle deadline if provided
        if data.get('deadline'):
            try:
                goal_data['deadline'] = datetime.strptime(data['deadline'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'message': 'Invalid deadline format. Use YYYY-MM-DD'}), 400

        # Insert the goal
        result = goals_collection.insert_one(goal_data)
        new_goal = goals_collection.find_one({"_id": result.inserted_id})
        
        # Format the response
        new_goal['_id'] = str(new_goal['_id'])
        if new_goal.get('deadline'):
            new_goal['deadline'] = new_goal['deadline'].strftime('%Y-%m-%d')
            
        return jsonify(new_goal), 201

    except Exception as e:
        app.logger.error(f"Error adding goal: {str(e)}")
        return jsonify({'message': 'An error occurred while adding the goal'}), 500

@app.route('/api/goals/<goal_id>', methods=['DELETE'])
@login_required
def delete_goal(goal_id):
    email = session['user_email']
    result = goals_collection.delete_one({'_id': ObjectId(goal_id), 'user_email': email})
    if result.deleted_count > 0:
        return jsonify({'message': 'Goal deleted successfully'}), 200
    return jsonify({'message': 'Goal not found'}), 404

@app.route('/api/goals/<goal_id>', methods=['PUT'])
@login_required
def update_goal(goal_id):
    try:
        email = session['user_email']
        data = request.get_json()
        
        # Verify the goal belongs to the user
        goal = goals_collection.find_one({'_id': ObjectId(goal_id), 'user_email': email})
        if not goal:
            return jsonify({'message': 'Goal not found or unauthorized'}), 404
            
        # Prepare update data
        update_data = {}
        
        # Update fields if provided
        if 'description' in data:
            update_data['description'] = data['description']
        if 'type' in data:
            update_data['type'] = data['type']
        if 'target' in data:
            try:
                update_data['target'] = int(data['target'])
            except (ValueError, TypeError):
                return jsonify({'message': 'Invalid target value'}), 400
        if 'completed' in data:
            try:
                update_data['completed'] = int(data['completed'])
            except (ValueError, TypeError):
                return jsonify({'message': 'Invalid completed value'}), 400
        if 'deadline' in data:
            try:
                update_data['deadline'] = datetime.strptime(data['deadline'], '%Y-%m-%d')
            except ValueError:
                return jsonify({'message': 'Invalid deadline format. Use YYYY-MM-DD'}), 400
                
        # Update the goal
        result = goals_collection.update_one(
            {'_id': ObjectId(goal_id), 'user_email': email},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            updated_goal = goals_collection.find_one({'_id': ObjectId(goal_id)})
            if updated_goal:
                updated_goal['_id'] = str(updated_goal['_id'])
                if updated_goal.get('deadline'):
                    updated_goal['deadline'] = updated_goal['deadline'].strftime('%Y-%m-%d')
                return jsonify(updated_goal)
            else:
                return jsonify({'message': 'Error retrieving updated goal'}), 500
        else:
            return jsonify({'message': 'No changes were made to the goal'}), 200
            
    except Exception as e:
        app.logger.error(f"Error updating goal: {str(e)}")
        return jsonify({'message': f'An error occurred while updating the goal: {str(e)}'}), 500

# --- Skill API Endpoints ---
@app.route('/api/skills', methods=['GET'])
@login_required
def get_skills():
    email = session['user_email']
    skills = list(skills_collection.find({"user_email": email}))
    for skill in skills:
        skill['_id'] = str(skill['_id'])
    return jsonify(skills)

@app.route('/api/skills', methods=['POST'])
@login_required
def add_skill():
    try:
        email = session['user_email']
        data = request.get_json()
        # Backend validation for required fields
        required_fields = ['name', 'learningFrom', 'startDate', 'expectedEndDate']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'message': f'Missing required field: {field}'}), 400
        # Validate date format
        try:
            start_dt = datetime.strptime(data['startDate'], '%Y-%m-%d')
            end_dt = datetime.strptime(data['expectedEndDate'], '%Y-%m-%d')
        except Exception:
            return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD.'}), 400
        days = []
        for dt in rrule(DAILY, dtstart=start_dt, until=end_dt):
            days.append({
                'date': dt.strftime('%Y-%m-%d'),
                'note': '',
                'completed': False
            })
        skill_data = {
            'user_email': email,
            'name': data.get('name'),
            'learningFrom': data.get('learningFrom', 'Unknown Source'),
            'startDate': data.get('startDate'),
            'expectedEndDate': data.get('expectedEndDate'),
            'status': data.get('status', 'pending'),
            'completed': 0,
            'days': days,
            'created_at': datetime.utcnow(),
            'priority': data.get('priority', 'medium'),
            'level': data.get('level', 'beginner')  # Add level field with default value
        }
        app.logger.info(f"Adding new skill: {skill_data}")
        result = skills_collection.insert_one(skill_data)
        new_skill = skills_collection.find_one({"_id": result.inserted_id})
        if new_skill:
            new_skill['_id'] = str(new_skill['_id'])
            app.logger.info(f"Successfully added skill: {new_skill}")
            return jsonify(new_skill), 201
        else:
            app.logger.error("Failed to retrieve newly created skill")
            return jsonify({'message': 'Error creating skill'}), 500
    except Exception as e:
        app.logger.error(f"Error adding skill: {str(e)}")
        return jsonify({'message': f'An error occurred while adding the skill: {str(e)}'}), 500

@app.route('/api/skills/<skill_id>', methods=['PUT'])
@login_required
def update_skill(skill_id):
    try:
        email = session['user_email']
        data = request.get_json()
        
        # Verify the skill belongs to the user
        skill = skills_collection.find_one({'_id': ObjectId(skill_id), 'user_email': email})
        if not skill:
            return jsonify({'message': 'Skill not found or unauthorized'}), 404
            
        # Prepare update data
        update_data = {}
        
        # Update fields if provided
        if 'name' in data:
            update_data['name'] = data['name']
        if 'learningFrom' in data:
            update_data['learningFrom'] = data['learningFrom']
        if 'startDate' in data:
            update_data['startDate'] = data['startDate']
        if 'expectedEndDate' in data:
            update_data['expectedEndDate'] = data['expectedEndDate']
        if 'status' in data:
            update_data['status'] = data['status']
        if 'completed' in data:
            # Ensure completed is an integer between 0 and 100
            try:
                completed = int(data['completed'])
                update_data['completed'] = max(0, min(100, completed))
                
                # Update status based on completion
                if completed >= 100:
                    update_data['status'] = 'completed'
                elif completed > 0:
                    update_data['status'] = 'in_progress'
                else:
                    update_data['status'] = data.get('status', 'pending')
            except (ValueError, TypeError):
                app.logger.error(f"Invalid completion value: {data['completed']}")
                return jsonify({'message': 'Invalid completion value'}), 400
        if 'notes' in data:
            update_data['notes'] = data['notes']
        if 'documents' in data:
            update_data['documents'] = data['documents']
        if 'priority' in data:
            update_data['priority'] = data['priority']
        if 'level' in data:
            update_data['level'] = data['level']
        if 'completionCertificate' in data and data['completionCertificate'] is None:
            # Remove the certificate from the documents array if it exists
            skills_collection.update_one(
                {'_id': ObjectId(skill_id), 'user_email': email},
                {'$pull': {'documents': skill.get('completionCertificate')}}
            )
            update_data['completionCertificate'] = None
                
        app.logger.info(f"Updating skill {skill_id} with data: {update_data}")  # Debug log
        
        # Update the skill
        result = skills_collection.update_one(
            {'_id': ObjectId(skill_id), 'user_email': email},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            updated_skill = skills_collection.find_one({'_id': ObjectId(skill_id)})
            if updated_skill:
                updated_skill['_id'] = str(updated_skill['_id'])
                app.logger.info(f"Successfully updated skill: {updated_skill}")  # Debug log
                return jsonify(updated_skill)
            else:
                app.logger.error("Failed to retrieve updated skill")
                return jsonify({'message': 'Error retrieving updated skill'}), 500
        else:
            app.logger.info("No changes were made to the skill")
            return jsonify({'message': 'No changes were made to the skill'}), 200
            
    except Exception as e:
        app.logger.error(f"Error updating skill: {str(e)}")
        return jsonify({'message': f'An error occurred while updating the skill: {str(e)}'}), 500

@app.route('/api/skills/<skill_id>', methods=['DELETE'])
@login_required
def delete_skill(skill_id):
    email = session['user_email']
    result = skills_collection.delete_one({'_id': ObjectId(skill_id), 'user_email': email})
    if result.deleted_count > 0:
        return jsonify({'message': 'Skill deleted successfully'}), 200
    return jsonify({'message': 'Skill not found'}), 404

@app.route('/api/upload_document', methods=['POST'])
@login_required
def upload_document():
    try:
        email = session['user_email']
        app.logger.info(f"Document upload request received from user: {email}")
        
        if 'document' not in request.files:
            app.logger.error("No file part in request")
            return jsonify({'message': 'No file part in the request'}), 400
            
        file = request.files['document']
        if file.filename == '':
            app.logger.error("No selected file")
            return jsonify({'message': 'No file selected for uploading'}), 400
            
        app.logger.info(f"File received: {file.filename}")
        
        if not file or not allowed_file_docs(file.filename):
            app.logger.error(f"Invalid file type: {file.filename}")
            return jsonify({'message': 'Invalid file type. Allowed types: pdf, doc, docx'}), 400
        if get_file_size_bytes(file) > app.config['DOC_MAX_BYTES']:
            app.logger.error("Document exceeds size limit")
            return jsonify({'message': 'File too large'}), 413
        if not is_valid_document_file(file):
            app.logger.error("Document content failed validation")
            return jsonify({'message': 'Invalid document content'}), 400
            
        skill_id = request.form.get('skillId')
        if not skill_id:
            app.logger.error("No skill ID provided")
            return jsonify({'message': 'Skill ID is required'}), 400

        # Verify the skill belongs to the user
        skill = skills_collection.find_one({'_id': ObjectId(skill_id), 'user_email': email})
        if not skill:
            app.logger.error(f"Skill not found or unauthorized: {skill_id}")
            return jsonify({'message': 'Skill not found or unauthorized'}), 404

        try:
            # Ensure the upload directory exists
            upload_dir = app.config['UPLOAD_FOLDER_DOCS']
            if not os.path.exists(upload_dir):
                app.logger.info(f"Creating upload directory: {upload_dir}")
                os.makedirs(upload_dir)
                app.logger.info(f"Created upload directory: {upload_dir}")

            # Create a unique filename to avoid collisions
            filename = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
            
            # Full path for the file using the absolute path from config
            filepath = os.path.join(upload_dir, filename)
            app.logger.info(f"Attempting to save file to: {filepath}")
            
            # Save the file
            file.save(filepath)
            app.logger.info(f"File saved successfully at: {filepath}")
            
            # Create the URL for the file
            document_url = url_for('static', filename=f'documents/{filename}')
            app.logger.info(f"Document URL created: {document_url}")
            
            # Update the database
            result = skills_collection.update_one(
                {'_id': ObjectId(skill_id), 'user_email': email},
                {'$push': {'documents': document_url}}
            )
            
            if result.modified_count > 0:
                app.logger.info(f"Successfully updated skill {skill_id} with new document")
                return jsonify({
                    'message': 'Document uploaded and associated with skill',
                    'url': document_url
                }), 200
            else:
                app.logger.error(f"Failed to update skill {skill_id} with new document")
                os.remove(filepath)  # Clean up the file if DB update fails
                return jsonify({'message': 'Failed to associate document with skill'}), 500
                
        except Exception as e:
            app.logger.error(f"Error in document upload: {str(e)}")
            # Try to clean up the file if it was created
            try:
                if 'filepath' in locals() and os.path.exists(filepath):
                    os.remove(filepath)
            except Exception as cleanup_error:
                app.logger.error(f"Error cleaning up file: {str(cleanup_error)}")
            return jsonify({'message': f'Error uploading document: {str(e)}'}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error in upload_document: {str(e)}")
        return jsonify({'message': f'An unexpected error occurred: {str(e)}'}), 500

@app.route('/api/upload_certificate', methods=['POST'])
@login_required
def upload_certificate():
    try:
        email = session['user_email']
        app.logger.info(f"Certificate upload request received from user: {email}")
        
        if 'certificate' not in request.files:
            app.logger.error("No file part in request")
            return jsonify({'message': 'No file part in the request'}), 400
            
        file = request.files['certificate']
        if file.filename == '':
            app.logger.error("No selected file")
            return jsonify({'message': 'No file selected for uploading'}), 400
            
        app.logger.info(f"File received: {file.filename}")
        
        if not file or not allowed_file_cert(file.filename):
            app.logger.error(f"Invalid file type: {file.filename}")
            return jsonify({'message': 'Invalid file type. Allowed types: pdf, png, jpg, jpeg'}), 400
        if get_file_size_bytes(file) > app.config['CERT_MAX_BYTES']:
            app.logger.error("Certificate exceeds size limit")
            return jsonify({'message': 'File too large'}), 413
        # Accept image or PDF certificates
        header = file.stream.read(16)
        file.stream.seek(0)
        if not (sniff_image_magic(header) or header.startswith(b'%PDF')):
            app.logger.error("Certificate content failed validation")
            return jsonify({'message': 'Invalid certificate content'}), 400
            
        skill_id = request.form.get('skillId')
        if not skill_id:
            app.logger.error("No skill ID provided")
            return jsonify({'message': 'Skill ID is required'}), 400

        # Verify the skill belongs to the user
        skill = skills_collection.find_one({'_id': ObjectId(skill_id), 'user_email': email})
        if not skill:
            app.logger.error(f"Skill not found or unauthorized: {skill_id}")
            return jsonify({'message': 'Skill not found or unauthorized'}), 404

        try:
            # Ensure the upload directory exists
            upload_dir = os.path.join(app.config['UPLOAD_FOLDER_DOCS'], 'certificates')
            if not os.path.exists(upload_dir):
                app.logger.info(f"Creating upload directory: {upload_dir}")
                os.makedirs(upload_dir)
                app.logger.info(f"Created upload directory: {upload_dir}")

            # Create a unique filename to avoid collisions
            filename = secure_filename(f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}")
            
            # Full path for the file using the absolute path from config
            filepath = os.path.join(upload_dir, filename)
            app.logger.info(f"Attempting to save file to: {filepath}")
            
            # Save the file
            file.save(filepath)
            app.logger.info(f"File saved successfully at: {filepath}")
            
            # Create the URL for the file
            certificate_url = url_for('static', filename=f'documents/certificates/{filename}')
            app.logger.info(f"Certificate URL created: {certificate_url}")
            
            # Update the database
            result = skills_collection.update_one(
                {'_id': ObjectId(skill_id), 'user_email': email},
                {'$set': {'completionCertificate': certificate_url}}
            )
            
            if result.modified_count > 0:
                app.logger.info(f"Successfully updated skill {skill_id} with new certificate")
                return jsonify({
                    'message': 'Certificate uploaded and associated with skill',
                    'url': certificate_url
                }), 200
            else:
                app.logger.error(f"Failed to update skill {skill_id} with new certificate")
                os.remove(filepath)  # Clean up the file if DB update fails
                return jsonify({'message': 'Failed to associate certificate with skill'}), 500
                
        except Exception as e:
            app.logger.error(f"Error in certificate upload: {str(e)}")
            # Try to clean up the file if it was created
            try:
                if 'filepath' in locals() and os.path.exists(filepath):
                    os.remove(filepath)
            except Exception as cleanup_error:
                app.logger.error(f"Error cleaning up file: {str(cleanup_error)}")
            return jsonify({'message': f'Error uploading certificate: {str(e)}'}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error in upload_certificate: {str(e)}")
        return jsonify({'message': f'An unexpected error occurred: {str(e)}'}), 500

# --- Dashboard Tasks API Endpoints ---
@app.route('/api/dashboard/tasks', methods=['GET'])
@login_required
def get_dashboard_tasks():
    """
    Retrieves all tasks for the current user from the dashboard_tasks collection.
    """
    email = session['user_email']
    tasks = list(db.dashboard_tasks.find({"user_email": email}))
    for task in tasks:
        task['_id'] = str(task['_id'])
    return jsonify(tasks)

@app.route('/api/dashboard/tasks', methods=['POST'])
@login_required
def add_dashboard_task():
    """
    Adds a new task to the dashboard_tasks collection.
    """
    try:
        email = session['user_email']
        data = request.get_json()
        
        # Validate required fields
        if not data.get('name'):
            return jsonify({'message': 'Task name is required'}), 400

        # Prepare task data
        task_data = {
            'user_email': email,
            'name': data.get('name'),
            'status': 'pending',
            'created_at': datetime.utcnow()
        }
        
        # Add optional fields if provided
        if data.get('priority'):
            task_data['priority'] = data.get('priority')
        if data.get('due_date'):
            task_data['due_date'] = data.get('due_date')
        if data.get('reminder'):
            task_data['reminder'] = data.get('reminder')
        if data.get('label'):
            task_data['label'] = data.get('label')

        # Duplicate detection: only when all of name, priority, due_date, and reminder are present
        if all([
            task_data.get('name'),
            task_data.get('priority'),
            task_data.get('due_date'),
            task_data.get('reminder')
        ]):
            existing = db.dashboard_tasks.find_one({
                'user_email': email,
                'name': task_data['name'],
                'priority': task_data['priority'],
                'due_date': task_data['due_date'],
                'reminder': task_data['reminder']
            })
            if existing:
                return jsonify({'message': 'Task already exists with the same date, reminder, and priority'}), 409

        # Insert the task
        result = db.dashboard_tasks.insert_one(task_data)
        new_task = db.dashboard_tasks.find_one({"_id": result.inserted_id})
        
        # Format the response
        new_task['_id'] = str(new_task['_id'])
            
        return jsonify(new_task), 201

    except Exception as e:
        app.logger.error(f"Error adding dashboard task: {str(e)}")
        return jsonify({'message': 'An error occurred while adding the task'}), 500

@app.route('/api/dashboard/tasks/<task_id>', methods=['PUT'])
@login_required
def update_dashboard_task(task_id):
    """
    Updates a specific task in the dashboard_tasks collection.
    """
    try:
        email = session['user_email']
        data = request.get_json()
        
        # Verify the task belongs to the user
        task = db.dashboard_tasks.find_one({'_id': ObjectId(task_id), 'user_email': email})
        if not task:
            return jsonify({'message': 'Task not found or unauthorized'}), 404
        
        # Prepare update data
        update_data = {}
        
        # Update only provided fields
        if 'name' in data:
            update_data['name'] = data['name']
        if 'status' in data:
            update_data['status'] = data['status']
        if 'priority' in data:
            update_data['priority'] = data['priority']
        if 'due_date' in data:
            update_data['due_date'] = data['due_date']
        if 'reminder' in data:
            update_data['reminder'] = data['reminder']
        if 'label' in data:
            update_data['label'] = data['label']
            
        # Update the task
        result = db.dashboard_tasks.update_one(
            {'_id': ObjectId(task_id), 'user_email': email},
            {'$set': update_data}
        )
        
        if result.modified_count > 0:
            updated_task = db.dashboard_tasks.find_one({'_id': ObjectId(task_id)})
            updated_task['_id'] = str(updated_task['_id'])
            return jsonify(updated_task), 200
        else:
            return jsonify({'message': 'No changes were made to the task'}), 200
            
    except Exception as e:
        app.logger.error(f"Error updating dashboard task: {str(e)}")
        return jsonify({'message': 'An error occurred while updating the task'}), 500

@app.route('/api/dashboard/tasks/<task_id>', methods=['DELETE'])
@login_required
def delete_dashboard_task(task_id):
    """
    Deletes a specific task from the dashboard_tasks collection.
    """
    try:
        email = session['user_email']
        
        # Verify the task belongs to the user
        task = db.dashboard_tasks.find_one({'_id': ObjectId(task_id), 'user_email': email})
        if not task:
            return jsonify({'message': 'Task not found or unauthorized'}), 404
            
        # Delete the task
        result = db.dashboard_tasks.delete_one({'_id': ObjectId(task_id), 'user_email': email})
        
        if result.deleted_count > 0:
            return jsonify({'message': 'Task deleted successfully'}), 200
        else:
            return jsonify({'message': 'Task not found'}), 404
            
    except Exception as e:
        app.logger.error(f"Error deleting dashboard task: {str(e)}")
        return jsonify({'message': 'An error occurred while deleting the task'}), 500

@app.route('/api/user/notification-preferences', methods=['GET'])
@login_required
def get_notification_preferences():
    """Get user's notification preferences."""
    try:
        email = session['user_email']
        user = users_collection.find_one({'email': email})
        
        if not user:
            return jsonify({'message': 'User not found'}), 404
            
        preferences = user.get('notification_preferences', {
            'push_notifications': True,
            'email_notifications': True,
            'daily_task_reminders': True,
            'due_date_reminders': True,
            'completion_notifications': True
        })
        
        return jsonify(preferences)
        
    except Exception as e:
        app.logger.error(f"Error getting notification preferences: {str(e)}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/api/user/notification-preferences', methods=['POST'])
@login_required
def update_notification_preferences():
    """Update user's notification preferences."""
    try:
        email = session['user_email']
        data = request.get_json()
        
        # Validate required fields
        required_fields = [
            'push_notifications',
            'email_notifications',
            'daily_task_reminders',
            'due_date_reminders',
            'completion_notifications'
        ]
        
        for field in required_fields:
            if field not in data:
                return jsonify({'message': f'Missing required field: {field}'}), 400
        
        # Update user's notification preferences
        result = users_collection.update_one(
            {'email': email},
            {'$set': {'notification_preferences': data}}
        )
        
        if result.modified_count == 0:
            return jsonify({'message': 'No changes made'}), 200
            
        return jsonify({'message': 'Notification preferences updated successfully'})
        
    except Exception as e:
        app.logger.error(f"Error updating notification preferences: {str(e)}")
        return jsonify({'message': 'An error occurred'}), 500

@app.route('/test_email/<recipient>')
def test_email(recipient):
    try:
        msg = Message(
            subject="Test Email from PlanFusion",
            sender=app.config['MAIL_DEFAULT_SENDER'],
            recipients=[recipient],
            body="This is a test email from PlanFusion. If you receive this, the email configuration is working correctly!"
        )
        mail.send(msg)
        return jsonify({"message": f"Test email sent successfully to {recipient}!"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/test-notification', methods=['POST'])
@login_required
def send_test_notification():
    """Send a test notification email to the current user with all their data."""
    try:
        email = session['user_email']
        
        # Get user's pending tasks
        tasks = list(dashboard_tasks_collection.find({
            'user_email': email,
            'status': 'pending'
        }))
        
        # Get user's in-progress skills
        skills = list(skills_collection.find({
            'user_email': email,
            'status': 'in_progress'
        }))
        
        # Get user's incomplete goals
        goals = list(goals_collection.find({
            'user_email': email,
            'completed': {'$lt': 100}
        }))
        
        # Get upcoming meetings
        upcoming_meetings = list(contacts_collection.find({
            'user_email': email,
            'next_meeting': {'$gt': datetime.now()}
        }))
        
        # Prepare email content
        subject = "Test Notification from PlanFusion"
        body = f"""
        <h2>Test Notification from PlanFusion</h2>
        <p>This is a test notification to show you how your daily updates will look.</p>
        
        <h3>📋 Pending Tasks ({len(tasks)})</h3>
        """
        
        if tasks:
            body += "<ul>"
            for task in tasks:
                body += f"<li>{task.get('name')}"
                if task.get('due_date'):
                    body += f" (Due: {task.get('due_date')})"
                if task.get('priority'):
                    body += f" [Priority: {task.get('priority')}]"
                body += "</li>"
            body += "</ul>"
        else:
            body += "<p>No pending tasks!</p>"
        
        body += f"""
        <h3>🎯 In-Progress Skills ({len(skills)})</h3>
        """
        
        if skills:
            body += "<ul>"
            for skill in skills:
                completion = skill.get('completed', 0)
                body += f"<li>{skill.get('name')} - {completion}% complete</li>"
            body += "</ul>"
        else:
            body += "<p>No skills in progress!</p>"
        
        body += f"""
        <h3>🎯 Active Goals ({len(goals)})</h3>
        """
        
        if goals:
            body += "<ul>"
            for goal in goals:
                completion = goal.get('completed', 0)
                target = goal.get('target', 0)
                body += f"<li>{goal.get('description')} - {completion}/{target} completed</li>"
            body += "</ul>"
        else:
            body += "<p>No active goals!</p>"
        
        body += f"""
        <h3>🤝 Upcoming Meetings ({len(upcoming_meetings)})</h3>
        """
        
        if upcoming_meetings:
            body += "<ul>"
            for meeting in upcoming_meetings:
                next_meeting = meeting.get('next_meeting')
                if next_meeting:
                    body += f"<li>{meeting.get('name')} - {next_meeting.strftime('%Y-%m-%d %H:%M')}</li>"
            body += "</ul>"
        else:
            body += "<p>No upcoming meetings!</p>"
        
        body += """
        <p>This is how your daily notifications will look. You will receive these updates every morning at 9 AM and evening at 6 PM.</p>
        <p>Best regards,<br>PlanFusion Team</p>
        """
        
        # Send email
        msg = Message(subject, recipients=[email])
        msg.html = body
        mail.send(msg)
        
        app.logger.info(f"Test notification sent to {email}")
        flash("Test notification sent successfully! Check your email.", "success")
        return jsonify({'message': 'Test notification sent successfully!', 'flash': True}), 200
        
    except Exception as e:
        app.logger.error(f"Error sending test notification: {str(e)}")
        flash(f"Error sending test notification: {str(e)}", "error")
        return jsonify({'message': f'Error sending test notification: {str(e)}', 'flash': True}), 500

# ✅ Custom Error Handling
@app.errorhandler(404)
def page_not_found(e):
    """
    Custom handler for 404 Not Found errors.
    """
    return render_template("404.html"), 404

@app.route('/api/skills/<skill_id>/day/<date>', methods=['PUT'])
@login_required
def update_skill_day(skill_id, date):
    try:
        email = session['user_email']
        data = request.get_json()
        note = data.get('note', '')
        completed = data.get('completed', False)
        skill = skills_collection.find_one({'_id': ObjectId(skill_id), 'user_email': email})
        if not skill:
            return jsonify({'message': 'Skill not found or unauthorized'}), 404
        days = skill.get('days', [])
        updated = False
        for day in days:
            if day['date'] == date:
                day['note'] = note
                day['completed'] = completed
                updated = True
                break
        if not updated:
            return jsonify({'message': 'Day not found in skill'}), 404
        # Recalculate completed percentage
        total_days = len(days)
        completed_days = sum(1 for d in days if d.get('completed'))
        percent = int((completed_days / total_days) * 100) if total_days > 0 else 0
        update_data = {'days': days, 'completed': percent}
        # Optionally update status
        if percent >= 100:
            update_data['status'] = 'completed'
        elif percent > 0:
            update_data['status'] = 'in_progress'
        else:
            update_data['status'] = 'pending'
        result = skills_collection.update_one({'_id': ObjectId(skill_id), 'user_email': email}, {'$set': update_data})
        if result.modified_count > 0:
            updated_skill = skills_collection.find_one({'_id': ObjectId(skill_id)})
            updated_skill['_id'] = str(updated_skill['_id'])
            return jsonify(updated_skill)
        else:
            return jsonify({'message': 'No changes were made to the skill'}), 200
    except Exception as e:
        app.logger.error(f"Error updating skill day: {str(e)}")
        return jsonify({'message': f'An error occurred while updating the skill day: {str(e)}'}), 500

def is_account_locked(email):
    """
    Check if an account is locked due to too many failed login attempts.
    """
    attempt = login_attempts_collection.find_one({'email': email})
    if attempt:
        if attempt.get('attempts', 0) >= 3:
            lock_time = attempt.get('lock_time')
            if lock_time and datetime.utcnow() < lock_time:
                remaining_time = lock_time - datetime.utcnow()
                minutes = int(remaining_time.total_seconds() / 60)
                return True, f"Account is locked. Please try again in {minutes} minutes."
            else:
                # Reset attempts if lock time has expired
                login_attempts_collection.update_one(
                    {'email': email},
                    {'$set': {'attempts': 0, 'lock_time': None}}
                )
    return False, None

def record_failed_attempt(email):
    """
    Record a failed login attempt and lock account if necessary.
    """
    attempt = login_attempts_collection.find_one({'email': email})
    if not attempt:
        login_attempts_collection.insert_one({
            'email': email,
            'attempts': 1,
            'lock_time': None
        })
    else:
        new_attempts = attempt.get('attempts', 0) + 1
        if new_attempts >= 3:
            # Lock account for 1 hour
            lock_time = datetime.utcnow() + timedelta(hours=1)
            login_attempts_collection.update_one(
                {'email': email},
                {'$set': {'attempts': new_attempts, 'lock_time': lock_time}}
            )
        else:
            login_attempts_collection.update_one(
                {'email': email},
                {'$set': {'attempts': new_attempts}}
            )

def reset_login_attempts(email):
    """
    Reset login attempts after successful login.
    """
    login_attempts_collection.update_one(
        {'email': email},
        {'$set': {'attempts': 0, 'lock_time': None}}
    )

@app.route('/api/user/settings', methods=['GET'])
@login_required
def get_user_settings():
    try:
        email = session['user_email']  # Changed from session['email']
        user = find_one('users', {'email': email})
        if not user:
            return jsonify({'error': 'User not found'}), 404

        settings = {
            'display': {
                'dark_mode': user.get('dark_mode', False),
                'font_size': user.get('font_size', 'medium')
            },
            'language': {
                'interface_language': user.get('language', 'en'),
                'date_format': user.get('date_format', 'MM/DD/YYYY'),
                'time_format': user.get('time_format', '12h')
            },
            'accessibility': {
                'high_contrast': user.get('high_contrast', False),
                'reduce_motion': user.get('reduce_motion', False),
                'focus_indicators': user.get('focus_indicators', True)
            }
        }
        return jsonify(settings)
    except Exception as e:
        app.logger.error(f"Error in get_user_settings: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/user/settings', methods=['POST'])
@login_required
def update_user_settings():
    try:
        email = session['user_email']  # Changed from session['email']
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        update_data = {}
        
        # Update display settings
        if 'display' in data:
            display = data['display']
            if 'dark_mode' in display:
                update_data['dark_mode'] = display['dark_mode']
            if 'font_size' in display:
                update_data['font_size'] = display['font_size']

        # Update language settings
        if 'language' in data:
            language = data['language']
            if 'interface_language' in language:
                update_data['language'] = language['interface_language']
            if 'date_format' in language:
                update_data['date_format'] = language['date_format']
            if 'time_format' in language:
                update_data['time_format'] = language['time_format']

        # Update accessibility settings
        if 'accessibility' in data:
            accessibility = data['accessibility']
            if 'high_contrast' in accessibility:
                update_data['high_contrast'] = accessibility['high_contrast']
            if 'reduce_motion' in accessibility:
                update_data['reduce_motion'] = accessibility['reduce_motion']
            if 'focus_indicators' in accessibility:
                update_data['focus_indicators'] = accessibility['focus_indicators']

        if update_data:
            result = update_one('users', {'email': email}, update_data)
            if result:
                return jsonify({'message': 'Settings updated successfully'})
            else:
                return jsonify({'error': 'Failed to update settings'}), 500
        else:
            return jsonify({'error': 'No valid settings to update'}), 400

    except Exception as e:
        app.logger.error(f"Error in update_user_settings: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ✅ Run App
if __name__ == '__main__':
    # Allow overriding via env, default to localhost:5000
    host = os.getenv('HOST', '127.0.0.1')
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True') == 'True'

    url = f"http://{host}:{port}/"
    print(url)

    app.run(debug=debug, host=host, port=port)