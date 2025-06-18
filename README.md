# PlanFusion

A comprehensive personal planning and productivity application built with Flask and MongoDB.

## Features

- User Authentication (Registration, Login, Password Reset)
- Profile Management
- Task Management
- Skills Tracking
- Contact Management
- Goal Setting and Tracking
- Document Upload and Management
- Dashboard with Progress Analytics

## Tech Stack

- Backend: Python Flask
- Database: MongoDB
- Frontend: HTML, CSS, JavaScript
- Authentication: bcrypt
- Email: Flask-Mail
- File Upload: Werkzeug

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/planfusion.git
cd planfusion
```

2. Create and activate a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the root directory with the following variables:
```
SECRET_KEY=your_secret_key
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@gmail.com
MAIL_PASSWORD=your_app_password
MONGODB_URI=your_mongodb_uri
```

5. Run the application:
```bash
python app.py
```

## Project Structure

```
planfusion/
├── app.py              # Main application file
├── requirements.txt    # Project dependencies
├── static/            # Static files (CSS, JS, images)
│   ├── css/
│   ├── js/
│   ├── uploads/       # User uploaded files
│   └── documents/     # User documents
├── templates/         # HTML templates
└── .env              # Environment variables
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 