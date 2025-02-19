import time
import tensorflow as tf
import numpy as np
import cv2
import os
from tensorflow.keras import layers, models
from sklearn.metrics import classification_report, roc_auc_score, precision_recall_curve, confusion_matrix
from tensorflow.keras.preprocessing.image import ImageDataGenerator
import matplotlib.pyplot as plt
from sklearn.model_selection import train_test_split

import cv2
import numpy as np
from skimage.feature import local_binary_pattern
from skimage.measure import regionprops

def extract_texture_features(image):
    """
    Extract texture features using Local Binary Patterns (LBP).
    """
    # Convert image to grayscale for LBP calculation
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Calculate LBP for the entire image
    lbp = local_binary_pattern(gray_image, P=8, R=1, method='uniform')
    
    # Compute the LBP histogram and normalize it
    lbp_hist, _ = np.histogram(lbp.ravel(), bins=np.arange(0, 11), range=(0, 10))
    lbp_hist = lbp_hist / lbp_hist.sum()  # Normalize the histogram

    return lbp_hist


def extract_shape_features(image):
    """
    Extract shape features (e.g., aspect ratio, circularity) from the image.
    """
    # Convert to grayscale and threshold
    gray_image = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, binary_image = cv2.threshold(gray_image, 127, 255, cv2.THRESH_BINARY)

    # Find contours
    contours, _ = cv2.findContours(binary_image, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    shape_features = []
    for contour in contours:
        # Get the bounding box of the contour
        x, y, w, h = cv2.boundingRect(contour)
        
        # Aspect ratio: width / height
        aspect_ratio = float(w) / h
        
        # Circularity: (4 * pi * area) / (perimeter^2)
        area = cv2.contourArea(contour)
        perimeter = cv2.arcLength(contour, True)
        circularity = (4 * np.pi * area) / (perimeter ** 2) if perimeter != 0 else 0

        shape_features.append([aspect_ratio, circularity])

    # Return the first shape feature (if multiple contours, can select the largest one or combine features)
    return np.mean(shape_features, axis=0) if shape_features else [0, 0]


# Update the load_data function to include texture and shape features
def load_data_with_features(data_dir):
    """
    Load images, labels, and extract texture and shape features for binary classification.
    """
    images = []
    labels = []
    texture_features = []
    shape_features = []

    for label, folder in enumerate(["non_fractured", "fractured"]):
        folder_path = os.path.join(data_dir, folder)
        for img_file in os.listdir(folder_path):
            img_path = os.path.join(folder_path, img_file)
            image = cv2.imread(img_path)
            if image is not None:
                image = cv2.resize(image, (128, 128))  # Resize image
                images.append(image / 255.0)  # Normalize image
                
                # Extract texture and shape features
                texture_feat = extract_texture_features(image)
                shape_feat = extract_shape_features(image)
                
                texture_features.append(texture_feat)
                shape_features.append(shape_feat)
                
                labels.append(label)

    return np.array(images), np.array(labels), np.array(texture_features), np.array(shape_features)


# Update the model to accept texture and shape features
def build_model_with_additional_features(input_shape=(128, 128, 3), additional_input_shape=(2,)):
    """
    Build a CNN model for fracture detection with additional shape and texture features.
    """
    # Image input
    image_input = layers.Input(shape=input_shape, name='image_input')
    x = layers.Conv2D(32, (3, 3), activation='relu')(image_input)
    x = layers.MaxPooling2D((2, 2))(x)

    x = layers.Conv2D(64, (3, 3), activation='relu')(x)
    x = layers.MaxPooling2D((2, 2))(x)

    x = layers.Conv2D(128, (3, 3), activation='relu')(x)
    x = layers.MaxPooling2D((2, 2))(x)

    x = layers.Flatten()(x)
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.5)(x)

    # Shape and texture input
    additional_input = layers.Input(shape=additional_input_shape, name='additional_input')
    y = layers.Dense(32, activation='relu')(additional_input)

    # Concatenate both inputs
    combined = layers.concatenate([x, y])

    # Output layer
    output = layers.Dense(1, activation='sigmoid')(combined)

    model = models.Model(inputs=[image_input, additional_input], outputs=output)

    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model


# Update the training process to handle additional features
def train_model_with_additional_features(base_data_dir, epochs=10):
    train_dir = os.path.join(base_data_dir, "BoneFractureDataset", "training")
    test_dir = os.path.join(base_data_dir, "BoneFractureDataset", "testing")

    if not os.path.exists(train_dir) or not os.path.exists(test_dir):
        raise Exception(f"Dataset directories not found: {train_dir} or {test_dir}")

    print(f"Training data from: {train_dir}")
    print(f"Testing data from: {test_dir}")

    train_images, train_labels, train_texture_feats, train_shape_feats = load_data_with_features(train_dir)
    test_images, test_labels, test_texture_feats, test_shape_feats = load_data_with_features(test_dir)

    train_images, val_images, train_labels, val_labels, train_texture_feats, val_texture_feats, train_shape_feats, val_shape_feats = train_test_split(
        train_images, train_labels, train_texture_feats, train_shape_feats, test_size=0.2, random_state=42
    )

    print(f"Training images shape: {train_images.shape}, Training labels shape: {train_labels.shape}")
    print(f"Validation images shape: {val_images.shape}, Validation labels shape: {val_labels.shape}")

    model = build_model_with_additional_features()

    datagen = ImageDataGenerator(rotation_range=15, horizontal_flip=True, fill_mode='nearest')
    datagen.fit(train_images)

    model.fit(
        [datagen.flow(train_images, batch_size=32), [train_texture_feats, train_shape_feats]],
        validation_data=([val_images, [val_texture_feats, val_shape_feats]], val_labels),
        epochs=epochs,
        steps_per_epoch=len(train_images) // 32
    )

    model_save_path = f'models/fracture_model_with_features_{int(time.time())}.h5'
    model.save(model_save_path)

    return model_save_path
