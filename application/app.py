"""
AgroSense - Plant Disease Detection System
Intelligent Plant Disease Detection System
Version: 2.0
Date: December 2025
"""

import os
import io
import logging
import base64
from datetime import datetime
from pathlib import Path

# Core imports
try:
    import torch
    import numpy as np
    from PIL import Image
    from torchvision import transforms, datasets
except ImportError as e:
    print(f"❌ Error importing ML libraries: {e}")
    print("Please install requirements: pip install -r requirements.txt")
    exit(1)

# Web framework imports
try:
    from flask import Flask, render_template, request, jsonify, session
    # Email imports for improved service
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    from email.mime.base import MIMEBase
    from email import encoders
except ImportError as e:
    print(f"❌ Error importing Flask: {e}")
    print("Please install Flask: pip install Flask")
    exit(1)

# Environment configuration
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️ python-dotenv not installed, using default config")

# ---------------------------------------
# Configuration
# ---------------------------------------

class Config:
    """Application configuration"""
    SECRET_KEY = os.getenv('SECRET_KEY', 'agrosense_secret_key_2025')
    
    # Model configuration
    MODEL_PATH = os.getenv('MODEL_PATH', './best_model/model/data/model.pth')
    MODEL_TYPE = os.getenv('MODEL_TYPE', 'mobilenet_v2')
    DEVICE = os.getenv('DEVICE', 'auto')
    CONFIDENCE_THRESHOLD = float(os.getenv('CONFIDENCE_THRESHOLD', '0.7'))
    
    # Enhanced Email configuration with better error handling
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
    MAIL_USE_SSL = os.getenv('MAIL_USE_SSL', 'False').lower() == 'true'
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER = os.getenv('MAIL_DEFAULT_SENDER', os.getenv('MAIL_USERNAME', ''))
    
    # SSL configuration
    SSL_ENABLED = os.getenv('SSL_ENABLED', 'False').lower() == 'true'  # Disabled by default
    SSL_CERT_PATH = os.getenv('SSL_CERT_PATH', 'cert.pem')
    SSL_KEY_PATH = os.getenv('SSL_KEY_PATH', 'key.pem')
    
    # Upload configuration
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
    ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'bmp', 'tiff', 'webp'}

# ---------------------------------------
# Flask App Initialization
# ---------------------------------------

app = Flask(__name__)
app.config.from_object(Config)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Device configuration
if Config.DEVICE == 'auto':
    device = "cuda" if torch.cuda.is_available() else "cpu"
else:
    device = Config.DEVICE

logger.info(f"Using device: {device}")

# ---------------------------------------
# Enhanced Translations System (English Only)
# ---------------------------------------

TRANSLATIONS = {
    'app_title': 'AgroSense - Intelligent Plant Disease Detection',
    'app_tagline': 'Artificial Intelligence for Agriculture',
    'hero_title': 'Plant Disease Detection',
    'hero_description': 'Analyze your crops with our advanced AI technology. Get instant diagnosis to protect your harvest.',
    'media_selection_title': 'Choose your analysis method',
    'photo_option': 'Photo',
    'media_option_image_desc': 'Upload a leaf image from your device',
    'media_option_video_title': 'Video',
    'media_option_video_desc': 'Analyze a video to detect diseases',
    'media_option_camera_title': 'Live Camera',
    'media_option_camera_desc': 'Use your camera in real time',
    'upload_text': 'Drag and drop your image here',
    'upload_click': 'or click to select a file',
    'upload_button': 'Choose File',
    'analyze_button': 'Analyze',
    'start_camera': 'Start Camera',
    'capture_image': 'Capture Image',
    'stop_camera': 'Stop Camera',
    'loading_text': 'Analyzing... Please wait',
    'result_title': 'Analysis Results',
    'email_checkbox': 'Receive results by email',
    'email_placeholder': 'Enter your email address',
    'email_help_text': 'We will send a detailed report to this address.',
    'feature_ia_title': 'Advanced AI',
    'feature_ia_desc': 'Deep learning algorithms trained on thousands of images',
    'feature_speed_title': 'Fast Analysis',
    'feature_speed_desc': 'Instant results in seconds',
    'feature_accuracy_title': 'Reliable and Accurate',
    'feature_accuracy_desc': 'High accuracy rate validated by experts',
    'footer': '© 2025 AgroSense - Revolutionizing agriculture with AI',
    'status_mode_image': 'Mode: Image',
    'status_mode_video': 'Mode: Video',
    'status_mode_camera': 'Mode: Live Camera',
    'no_image_provided': 'No image provided',
    'no_file_selected': 'No file selected',
    'file_too_large': 'File too large',
    'unsupported_format': 'Unsupported file format',
    'analysis_success': 'Analysis completed successfully',
    'email_sent_success': 'Report sent by email successfully',
    'email_send_error': 'Error sending email',
    'healthy_plant': 'Healthy Plant',
    'disease_detected': 'Disease Detected',
    'email_report_subject': '🌱 AgroSense Analysis Report',
    'email_report_greeting': 'Hello! Here is your plant analysis report from AgroSense.',
    'diagnosis': 'Diagnosis',
    'confidence_level': 'Confidence Level',
    'recommendations': 'Recommendations',
    'technical_info': 'Technical Information',
    'generated_by': 'Report generated automatically by AgroSense'
}

def parse_plant_disease(class_name):
    """
    Parse class name to extract plant name and disease
    Examples:
        'Apple_rust_leaf' -> ('Apple', 'Rust')
        'Tomato_Early_blight_leaf' -> ('Tomato', 'Early Blight')
        'Cherry_leaf' -> ('Cherry', 'Healthy')
    """
    # Remove 'leaf' suffix
    name = class_name.replace('_leaf', '').replace('_Leaf', '')
    
    # Split by underscore
    parts = name.split('_')
    
    if not parts:
        return ('Unknown', 'Unknown')
    
    # First part is usually the plant name
    plant = parts[0].capitalize()
    
    # Rest is the disease
    if len(parts) == 1 or parts[0].lower() in ['healthy', 'sain']:
        disease = 'Healthy'
    else:
        disease = ' '.join(parts[1:]).title()
        # Clean up common patterns
        disease = disease.replace('_', ' ')
    
    return (plant, disease)

# ---------------------------------------
# Model Loading
# ---------------------------------------

class ModelManager:
    """Manage ML model loading and predictions"""
    
    def __init__(self):
        self.model = None
        self.classes = []
        self.transform = None
        self._load_model()
        self._load_classes()
        self._setup_transforms()
    
    def _load_model(self):
        """Load the trained model"""
        try:
            if os.path.exists(Config.MODEL_PATH):
                self.model = torch.load(Config.MODEL_PATH, map_location=device, weights_only=False)
                self.model.eval()
                self.model.to(device)
                logger.info("Model loaded successfully")
            else:
                logger.error(f"Model file not found at {Config.MODEL_PATH}")
        except Exception as e:
            logger.error(f"Error loading model: {e}")
            self.model = None
    
    def _load_classes(self):
        """Load class names from dataset"""
        try:
            dataset_paths = [
                "plantdoc_processed2/train",
                "application/plantdoc_processed2/train",
                "plantdoc_balanced/train"
            ]
            
            for path in dataset_paths:
                if os.path.exists(path):
                    dataset = datasets.ImageFolder(path)
                    self.classes = dataset.classes
                    logger.info(f"Loaded {len(self.classes)} classes from {path}")
                    break
            
            if not self.classes:
                # Fallback class names
                self.classes = [
                    'Apple_leaf', 'Apple_rust_leaf', 'Apple_Scab_Leaf', 'Bell_pepper_leaf',
                    'Bell_pepper_leaf_spot', 'Blueberry_leaf', 'Cherry_leaf', 'Corn_Gray_leaf_spot',
                    'Corn_leaf_blight', 'Corn_rust_leaf', 'grape_leaf', 'grape_leaf_black_rot',
                    'Peach_leaf', 'Potato_leaf_early_blight', 'Potato_leaf_late_blight',
                    'Raspberry_leaf', 'Soyabean_leaf', 'Squash_Powdery_mildew_leaf',
                    'Strawberry_leaf', 'Tomato_Early_blight_leaf', 'Tomato_healthy_leaf',
                    'Tomato_Late_blight_leaf', 'Tomato_leaf_bacterial_spot', 'Tomato_leaf_curl',
                    'Tomato_leaf_late_blight', 'Tomato_leaf_mosaic_virus', 'Tomato_leaf_yellow_virus',
                    'Tomato_mold_leaf'
                ]
                logger.warning("Using fallback class names")
        except Exception as e:
            logger.error(f"Error loading classes: {e}")
            self.classes = []
    
    def _setup_transforms(self):
        """Setup image preprocessing transforms"""
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
        ])
    
    def process_image(self, image_data):
        """Process image for prediction"""
        try:
            # Handle different input types
            if hasattr(image_data, 'read'):
                image = Image.open(image_data).convert("RGB")
            elif isinstance(image_data, bytes):
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
            else:
                image = image_data.convert("RGB")
            
            logger.info(f"Processing image: size={image.size}, mode={image.mode}")
            
            # Apply transforms
            tensor = self.transform(image).unsqueeze(0).to(device)
            return tensor, image
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise
    
    def predict(self, tensor):
        """Make prediction using the loaded model"""
        if self.model is None:
            raise ValueError("Model not loaded")
        
        try:
            with torch.no_grad():
                outputs = self.model(tensor)
                probabilities = torch.nn.functional.softmax(outputs[0], dim=0)
                confidence, pred = torch.max(probabilities, 0)
            
            disease = self.classes[pred.item()]
            confidence_score = confidence.item() * 100
            
            logger.info(f"Prediction: {disease} ({confidence_score:.2f}%)")
            return disease, confidence_score
        except Exception as e:
            logger.error(f"Error making prediction: {e}")
            raise
    
    def is_ready(self):
        """Check if model is ready for predictions"""
        return self.model is not None and len(self.classes) > 0

# Initialize model manager
model_manager = ModelManager()

# ---------------------------------------
# Email Service
# ---------------------------------------

class EmailService:
    """Handle email report generation and sending"""
    
    @staticmethod
    def resize_image_for_email(image_data, max_size=(400, 400)):
        """Resize image for email to reduce size"""
        try:
            if hasattr(image_data, 'read'):
                image_data.seek(0)
                image = Image.open(image_data).convert("RGB")
            elif isinstance(image_data, bytes):
                image = Image.open(io.BytesIO(image_data)).convert("RGB")
            else:
                image = image_data.convert("RGB")
            
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            
            img_byte_arr = io.BytesIO()
            image.save(img_byte_arr, format='JPEG', quality=70, optimize=True)
            img_byte_arr = img_byte_arr.getvalue()
            
            return base64.b64encode(img_byte_arr).decode('utf-8')
        except Exception as e:
            logger.error(f"Error resizing image: {e}")
            return None
    
    @staticmethod
    def get_recommendations(disease):
        """Get recommendations based on disease"""
        disease_lower = disease.lower()
        
        if 'healthy' in disease_lower:
            return "Your plant is healthy! Continue your good care practices: maintain regular watering, ensure proper sunlight exposure, and monitor for any changes."
        elif 'rust' in disease_lower:
            return "Rust detected. Apply copper-based fungicide, improve air circulation around the plant, avoid watering on leaves, and remove infected leaves."
        elif 'spot' in disease_lower:
            return "Leaf spots identified. Remove affected leaves immediately, apply preventive fungicide, reduce ambient humidity, and ensure proper spacing for better aeration."
        elif 'blight' in disease_lower:
            return "Blight detected - urgent intervention required! Apply immediate systemic fungicide treatment, isolate the infected plant, improve soil drainage, and monitor other plants closely."
        elif 'scab' in disease_lower:
            return "Scab identified. Apply suitable fungicide, thoroughly clean plant debris, plan preventive treatment for next season, and prune for better air circulation."
        elif 'powdery' in disease_lower or 'mildew' in disease_lower:
            return "Powdery mildew detected. Improve air circulation, avoid overhead watering, apply fungicide treatment, and remove heavily infected leaves."
        elif 'mosaic' in disease_lower or 'virus' in disease_lower:
            return "Viral infection detected. Remove and destroy infected plants, control insect vectors, disinfect tools, and avoid working with plants when wet."
        elif 'bacterial' in disease_lower:
            return "Bacterial infection detected. Apply copper-based bactericide, improve air circulation, avoid overhead irrigation, and remove infected tissue."
        else:
            return "Disease identified. Consult a plant pathology expert for precise diagnosis and treatment plan. Monitor symptom progression and isolate affected plants."
    
    @staticmethod
    def generate_html_report(plant, disease, confidence, timestamp, media_type, user_email, image_base64=None):
        """Generate HTML report for email"""
        # Determine status
        is_healthy = disease.lower() == 'healthy'
        status = 'Healthy Plant' if is_healthy else 'Disease Detected'
        status_color = "#4a7c59" if is_healthy else "#e76f51"
        
        # Get recommendations
        recommendations = EmailService.get_recommendations(disease)
        
        # Image section
        image_section = ""
        if image_base64 and len(image_base64) < 50000:
            image_section = f"""
            <div style='text-align: center; margin: 20px 0;'>
                <img src='data:image/jpeg;base64,{image_base64}' 
                     alt='Analyzed image' 
                     style='max-width: 100%; max-height: 300px; border-radius: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);'>
                <p style='font-size: 0.9rem; color: #666; margin-top: 10px;'>Image analyzed by AgroSense</p>
            </div>"""
        
        html_report = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AgroSense Analysis Report</title>
            <style>
                body {{ font-family: 'Segoe UI', sans-serif; line-height: 1.6; color: #264653; background: #f8f9fa; margin: 0; padding: 20px; }}
                .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 15px; overflow: hidden; box-shadow: 0 10px 30px rgba(45, 80, 22, 0.1); }}
                .header {{ background: linear-gradient(135deg, #2d5016 0%, #4a7c59 100%); color: white; padding: 30px; text-align: center; }}
                .logo {{ font-size: 2rem; margin-bottom: 10px; }}
                .content {{ padding: 30px; }}
                .status {{ background: {status_color}; color: white; padding: 15px; border-radius: 10px; text-align: center; margin-bottom: 20px; font-size: 1.2rem; font-weight: bold; }}
                .plant-card {{ background: linear-gradient(135deg, #e8f5e8 0%, #ffffff 100%); padding: 20px; border-radius: 12px; margin-bottom: 20px; border-left: 4px solid #4a7c59; }}
                .plant-name {{ font-size: 1.8rem; color: #2d5016; font-weight: bold; margin-bottom: 10px; }}
                .disease-name {{ font-size: 1.3rem; color: {status_color}; font-weight: 600; }}
                .result-section {{ background: #f8f9fa; padding: 20px; border-radius: 10px; margin-bottom: 20px; }}
                .result-title {{ color: #2d5016; font-weight: bold; margin-bottom: 10px; }}
                .confidence-bar {{ width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin-top: 10px; }}
                .confidence-fill {{ height: 100%; background: {status_color}; width: {confidence}%; }}
                .recommendations {{ background: linear-gradient(135deg, #e8f5e8 0%, #ffffff 100%); padding: 20px; border-radius: 10px; border-left: 4px solid #f4a261; margin-bottom: 20px; }}
                .meta-info {{ background: #f8f9fa; padding: 15px; border-radius: 10px; font-size: 0.9rem; color: #666; }}
                .footer {{ background: #2d5016; color: white; padding: 20px; text-align: center; font-size: 0.9rem; }}
                .icon {{ display: inline-block; width: 24px; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <div class="logo">🌱 AgroSense</div>
                    <h1>Plant Disease Analysis Report</h1>
                    <p>Artificial Intelligence for Agriculture</p>
                </div>
                
                <div class="content">
                    <div class="status">{status}</div>
                    
                    {image_section}
                    
                    <div class="plant-card">
                        <div class="plant-name">🌿 {plant}</div>
                        <div class="disease-name">📋 Condition: {disease}</div>
                    </div>
                    
                    <div class="result-section">
                        <div class="result-title">📊 Confidence Level</div>
                        <div>{confidence:.2f}%</div>
                        <div class="confidence-bar">
                            <div class="confidence-fill"></div>
                        </div>
                    </div>
                    
                    <div class="recommendations">
                        <div class="result-title">💡 Recommendations</div>
                        <div>{recommendations}</div>
                    </div>
                    
                    <div class="meta-info">
                        <strong>Technical Information:</strong><br>
                        📅 Date: {timestamp}<br>
                        📧 Email: {user_email}<br>
                        📱 Source: {media_type}<br>
                        🤖 Model: {Config.MODEL_TYPE}<br>
                        🖥️ Device: {device}
                    </div>
                </div>
                
                <div class="footer">
                    <p>Report generated automatically by AgroSense</p>
                    <p>© 2025 AgroSense - Revolutionizing agriculture with AI</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html_report
    
    @staticmethod
    def send_report(user_email, plant, disease, confidence, timestamp, media_type, image_data=None):
        """Send analysis report via email"""
        try:
            # Resize and optimize image for email
            image_base64 = None
            if image_data:
                image_base64 = EmailService.resize_image_for_email(image_data)
                if image_base64:
                    logger.info(f"Image optimized for email: {len(image_base64)} characters")
            
            # Generate HTML report
            html_content = EmailService.generate_html_report(
                plant, disease, confidence, timestamp, media_type, user_email, image_base64
            )
            
            # Create email
            msg = MIMEMultipart('alternative')
            msg['From'] = Config.MAIL_DEFAULT_SENDER
            msg['To'] = user_email
            msg['Subject'] = f"🌱 AgroSense - {plant}: {disease}"
            
            # Add HTML content
            html_part = MIMEText(html_content, 'html', 'utf-8')
            msg.attach(html_part)
            
            # Send email
            context = ssl.create_default_context()
            with smtplib.SMTP(Config.MAIL_SERVER, Config.MAIL_PORT) as server:
                if Config.MAIL_USE_TLS:
                    server.starttls(context=context)
                server.login(Config.MAIL_USERNAME, Config.MAIL_PASSWORD)
                server.send_message(msg)
            
            logger.info(f"Report sent successfully to {user_email}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending email to {user_email}: {e}")
            return False

# ---------------------------------------
# Routes
# ---------------------------------------

@app.route("/")
def index():
    """Main page"""
    return render_template("index.html", translations=TRANSLATIONS)

@app.route("/predict", methods=["POST"])
def predict():
    """Handle predictions with optional email report"""
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        logger.info(f"[{timestamp}] New prediction request")
        
        # Validate model is ready
        if not model_manager.is_ready():
            return jsonify({
                "error": "Model not available",
                "status": "error"
            }), 503
        
        # Validate request
        if 'image' not in request.files:
            return jsonify({
                "error": TRANSLATIONS["no_image_provided"],
                "status": "error"
            }), 400
        
        file = request.files['image']
        
        if file.filename == '':
            return jsonify({
                "error": TRANSLATIONS["no_file_selected"],
                "status": "error"
            }), 400
        
        # Get optional parameters
        user_email = request.form.get('user_email', '').strip()
        media_type = request.form.get('media_type', 'image')
        send_email_report = request.form.get('send_email', 'false').lower() == 'true'
        
        # Validate file type
        allowed_types = {'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/bmp', 'image/tiff'}
        if file.content_type not in allowed_types:
            return jsonify({
                "error": f"{TRANSLATIONS['unsupported_format']}: {file.content_type}",
                "status": "error"
            }), 400
        
        # Validate file size
        if file.content_length and file.content_length > Config.MAX_CONTENT_LENGTH:
            return jsonify({
                "error": TRANSLATIONS["file_too_large"],
                "status": "error"
            }), 400
        
        logger.info(f"Processing file: {file.filename}, type: {file.content_type}")
        
        # Process image and make prediction
        tensor, processed_image = model_manager.process_image(file)
        disease_class, confidence_score = model_manager.predict(tensor)
        
        # Parse plant and disease
        plant_name, disease_name = parse_plant_disease(disease_class)
        
        # Prepare response
        response_data = {
            "prediction": disease_class,
            "plant": plant_name,
            "disease": disease_name,
            "confidence": f"{confidence_score:.2f}%",
            "status": "success",
            "timestamp": timestamp,
            "model_info": {
                "device": device,
                "model_type": Config.MODEL_TYPE,
                "num_classes": len(model_manager.classes)
            }
        }
        
        # Send email report if requested
        if send_email_report and user_email:
            # Skip if email config missing
            if not (Config.MAIL_USERNAME and Config.MAIL_PASSWORD and Config.MAIL_SERVER and Config.MAIL_PORT):
                logger.warning("Email service not configured properly, skipping email send")
                response_data["email_sent"] = False
                response_data["email_recipient"] = None
            else:
                file.seek(0)  # Reset file pointer
                
                email_sent = EmailService.send_report(
                    user_email, plant_name, disease_name, confidence_score, 
                    timestamp, media_type.capitalize(), file
                )
                
                response_data["email_sent"] = email_sent
                response_data["email_recipient"] = user_email if email_sent else None
        
        logger.info(f"Successful prediction: {plant_name} - {disease_name} ({confidence_score:.2f}%)")
        return jsonify(response_data)
        
    except ValueError as e:
        logger.error(f"Validation error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 400
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({"error": str(e), "status": "error"}), 500

@app.route("/health")
def health_check():
    """Health check endpoint"""
    model_ready = model_manager.is_ready()
    email_configured = bool(Config.MAIL_USERNAME and Config.MAIL_PASSWORD)
    
    status_info = {
        "status": "healthy" if model_ready else "degraded",
        "model": "loaded" if model_manager.model else "not_loaded",
        "classes": "loaded" if model_manager.classes else "not_loaded",
        "device": device,
        "num_classes": len(model_manager.classes),
        "email_configured": email_configured,
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "version": "2.0"
    }
    
    return jsonify(status_info)

@app.route("/model-info")
def model_info():
    """Get detailed model information"""
    if not model_manager.is_ready():
        return jsonify({"error": "Model not loaded"}), 503
    
    return jsonify({
        "model_type": Config.MODEL_TYPE,
        "device": device,
        "classes": model_manager.classes,
        "num_classes": len(model_manager.classes),
        "input_size": "224x224",
        "supported_formats": list(Config.ALLOWED_EXTENSIONS),
        "confidence_threshold": Config.CONFIDENCE_THRESHOLD,
        "email_service": "enabled" if Config.MAIL_USERNAME and Config.MAIL_PASSWORD else "disabled"
    })

# ---------------------------------------
# Error Handlers
# ---------------------------------------

@app.errorhandler(413)
def file_too_large(error):
    """Handle file too large error"""
    return jsonify({
        "error": TRANSLATIONS["file_too_large"],
        "status": "error",
        "max_size": f"{Config.MAX_CONTENT_LENGTH // (1024*1024)}MB"
    }), 413

@app.errorhandler(500)
def internal_error(error):
    """Handle internal server error"""
    logger.error(f"Internal server error: {error}")
    return jsonify({
        "error": "Internal server error",
        "status": "error"
    }), 500

# ---------------------------------------
# Application Startup
# ---------------------------------------

def create_directories():
    """Create necessary directories"""
    directories = [Config.UPLOAD_FOLDER, 'logs']
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)

def validate_ssl_certificates():
    """Validate SSL certificates"""
    if Config.SSL_ENABLED:
        if os.path.exists(Config.SSL_CERT_PATH) and os.path.exists(Config.SSL_KEY_PATH):
            return (Config.SSL_CERT_PATH, Config.SSL_KEY_PATH)
        else:
            logger.warning("SSL certificates not found, running without HTTPS")
    return None

if __name__ == "__main__":
    # Startup checks
    create_directories()
    
    if not model_manager.is_ready():
        logger.error("CRITICAL: Model or classes failed to load!")
        logger.error("Please check your model path and dataset structure")
    
    if not Config.MAIL_USERNAME or not Config.MAIL_PASSWORD:
        logger.warning("Email service not configured - reports won't be sent")
    
    # SSL configuration
    ssl_context = validate_ssl_certificates()
    if ssl_context:
        logger.info("HTTPS enabled with SSL certificates")
    
    logger.info("Starting AgroSense Plant Disease Detection Server...")
    
    try:
        app.run(
            host="0.0.0.0",
            port=int(os.getenv('FLASK_PORT', 5001)),
            debug=os.getenv('FLASK_DEBUG', 'True').lower() == 'true',
            ssl_context=ssl_context
        )
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        exit(1)
