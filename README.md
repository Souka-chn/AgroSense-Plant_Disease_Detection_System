# 🌱 AgroSense - Plant Disease Detection System

AgroSense est une application web intelligente de détection des maladies des plantes utilisant l'intelligence artificielle et le deep learning.

## 🎯 Fonctionnalités

- **Détection automatique des maladies** : Analyse en temps réel des feuilles de plantes
- **Support multi-sources** : Upload d'images, capture vidéo, ou caméra en direct
- **Rapport par email** : Envoi automatique de rapports détaillés par email
- **Interface intuitive** : Interface web moderne et responsive
- **IA avancée** : Modèle MobileNetV2 entraîné sur des milliers d'images
- **Multi-classes** : Détection de plus de 27 maladies différentes

## 📚 Scripts du projet

Les notebooks utilisés dans le projet :
- `data_preparation_+clahe.ipynb` : Préparation des données avec augmentation et application de CLAHE
- `Experiment1(with_clahe).ipynb` : Expérimentation du modèle avec le dataset CLAHE
- `experiment2(with_segmenetation).ipynb` : Expérimentation avec segmentation (SAM3) et comparaison des performances

## 📦 Datasets Kaggle

Trois jeux de données sont publiés sur Kaggle et peuvent être téléchargés via KaggleHub :

1) Dataset équilibré (balanced)

```python
import kagglehub

# Download latest version
path = kagglehub.dataset_download("ouialsirgiane/cv-balanced")

print("Path to dataset files:", path)
```

2) Dataset avec CLAHE

```python
import kagglehub

# Download latest version
path = kagglehub.dataset_download("ouialsirgiane/cv-clahe")

print("Path to dataset files:", path)
```

3) Dataset avec SAM3 (segmentation)

```python
import kagglehub

# Download latest version
path = kagglehub.dataset_download("ouialsirgiane/cv-dataset-sam3")

print("Path to dataset files:", path)
```

## 🚀 Installation

### Prérequis

- Python 3.8+
- pip
- Caméra (optionnel, pour la détection en direct)

### Étapes d'installation

1. **Cloner le repository**
```bash
git clone https://github.com/Soukaynachn/Project_CV.git
cd application
```

2. **Créer un environnement virtuel**
```bash
python3 -m venv venv
source venv/bin/activate  # Sur Windows: venv\Scripts\activate
```

3. **Installer les dépendances**
```bash
pip install -r requirements.txt
```

4. **Configuration**

Créer un fichier `.env` à la racine du dossier :
```env
# Modèle
MODEL_PATH=./best_model/model/data/model.pth
MODEL_TYPE=mobilenet_v2
DEVICE=auto
CONFIDENCE_THRESHOLD=0.7

# Email (optionnel)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=votre-email@gmail.com
MAIL_PASSWORD=votre-app-password
MAIL_DEFAULT_SENDER=AgroSense <votre-email@gmail.com>

# Flask
SECRET_KEY=votre-clé-secrète-unique
FLASK_PORT=5001
FLASK_DEBUG=False

# SSL (optionnel)
SSL_ENABLED=False
```

5. **Préparer le modèle**

Assurez-vous que votre modèle entraîné est placé dans :
```
application/best_model/model/data/model.pth
```

## 🎮 Utilisation

### Démarrage rapide

```bash
python app.py
```

L'application sera accessible sur : `http://localhost:5001`

### Avec HTTPS (optionnel)

Pour activer HTTPS, générez des certificats SSL :
```bash
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365
```

Puis dans `.env` :
```env
SSL_ENABLED=True
SSL_CERT_PATH=cert.pem
SSL_KEY_PATH=key.pem
```

## 📊 API Endpoints

### POST `/predict`
Analyser une image de plante

**Paramètres** :
- `image` (file, requis) : Image de la feuille
- `user_email` (string, optionnel) : Email pour recevoir le rapport
- `send_email` (boolean, optionnel) : Envoyer le rapport par email
- `media_type` (string, optionnel) : Type de média (image/video/camera)

**Réponse** :
```json
{
  "prediction": "Apple_rust_leaf",
  "plant": "Apple",
  "disease": "Rust",
  "confidence": "95.23%",
  "status": "success",
  "timestamp": "2025-12-04 10:30:00",
  "email_sent": true
}
```

### GET `/health`
Vérifier l'état de l'application

### GET `/model-info`
Obtenir les informations du modèle

## 🌿 Maladies Détectées

L'application peut détecter les maladies suivantes :

- **Pomme** : Rust, Scab, Healthy
- **Poivron** : Leaf Spot, Healthy
- **Maïs** : Gray Leaf Spot, Blight, Rust
- **Raisin** : Black Rot, Healthy
- **Tomate** : Early Blight, Late Blight, Leaf Curl, Mosaic Virus, Bacterial Spot
- **Pomme de terre** : Early Blight, Late Blight
- **Et plus de 27 classes au total...**

## 🏗️ Architecture

```
application/
├── app.py                  # Application Flask principale
├── config.py              # Configuration
├── requirements.txt       # Dépendances Python
├── README.md             # Documentation
├── .env                  # Variables d'environnement (à créer)
├── best_model/           # Modèle entraîné
│   └── model/
│       └── data/
│           └── model.pth
├── templates/            # Templates HTML
│   └── index.html
├── static/              # Fichiers statiques
│   └── capture.js
├── uploads/             # Images uploadées
└── logs/                # Logs de l'application
```

## 🔧 Technologies Utilisées

- **Backend** : Flask, Python 3.8+
- **Machine Learning** : PyTorch, torchvision
- **Deep Learning** : MobileNetV2
- **Frontend** : HTML5, CSS3, JavaScript
- **Email** : SMTP (Gmail)
- **Image Processing** : PIL, OpenCV

## 📧 Configuration Email (Gmail)

Pour utiliser Gmail pour l'envoi de rapports :

1. Activer l'authentification à 2 facteurs sur votre compte Google
2. Générer un "App Password" : https://myaccount.google.com/apppasswords
3. Utiliser ce mot de passe dans `MAIL_PASSWORD`

## 🛡️ Sécurité

- ✅ Validation des types de fichiers
- ✅ Limite de taille des uploads (50MB)
- ✅ Support HTTPS/SSL
- ✅ Protection CSRF
- ✅ Sanitization des entrées utilisateur

## 📝 Logs

Les logs sont enregistrés dans `logs/` avec le format :
```
2025-12-04 10:30:00 - app - INFO - Successful prediction: Apple - Rust (95.23%)
```

## 🐛 Dépannage

### Erreur "Model not loaded"
- Vérifiez que le fichier `model.pth` existe dans `best_model/model/data/`
- Vérifiez les permissions du fichier

### Erreur "Classes not loaded"
- Assurez-vous que le dossier `plantdoc_processed2/train` existe
- Ou placez-le dans le même répertoire que l'application

### Email ne s'envoie pas
- Vérifiez vos identifiants Gmail
- Utilisez un "App Password" au lieu de votre mot de passe principal
- Vérifiez que le port 587 n'est pas bloqué

## 🚀 Déploiement

### Docker (recommandé)

```bash
docker build -t agrosense .
docker run -p 5001:5001 agrosense
```

### Production

Pour un déploiement en production, utilisez Gunicorn :

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5001 app:app
```

---

**Version** : 2.1  
**Date** : Décembre 2025  
**Status** : ✅ Production Ready
