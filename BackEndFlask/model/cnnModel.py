import tensorflow as tf
import numpy as np
import cv2
import os
from tensorflow.keras import layers, Model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing.image import ImageDataGenerator

def load_data(data_dir):
    """
    Load images and labels for binary classification from the given directory.
    Assumes data is organized as:
    data_dir/
        fractured/
        non-fractured/
    """
    images = []
    labels = []
    
    for label, folder in enumerate(["non_fractured", "fractured"]):  # 0: non-fractured, 1: fractured
        folder_path = os.path.join(data_dir, folder)
        for img_file in os.listdir(folder_path):
            img_path = os.path.join(folder_path, img_file)
            image = cv2.imread(img_path)
            if image is not None:
                image = cv2.resize(image, (224, 224))  # Resize to match MobileNetV2 input size
                images.append(image / 255.0)  # Normalize
                labels.append(label)

    return np.array(images), np.array(labels)

def build_model(input_shape=(224, 224, 3)):
    """
    Build a fracture detection model using MobileNetV2 as the base model
    Returns both the full model and the feature extraction model
    """
    # Load the MobileNetV2 model without the top classification layer
    base_model = MobileNetV2(input_shape=input_shape, include_top=False, weights='imagenet')
    
    # Freeze the base model layers to use pre-trained weights
    base_model.trainable = False
    
    # Get the input
    inputs = tf.keras.Input(shape=input_shape)
    
    # Pass inputs through base model
    x = base_model(inputs, training=False)
    
    # Add global average pooling to reduce dimensions
    feature_map = x
    x = layers.GlobalAveragePooling2D()(feature_map)
    
    # Add fully-connected layers
    x = layers.Dense(128, activation='relu')(x)
    x = layers.Dropout(0.5)(x)
    
    # Add the prediction layer
    outputs = layers.Dense(1, activation='sigmoid')(x)
    
    # Create the full model
    model = Model(inputs=inputs, outputs=outputs)
    
    # Create a feature extraction model for localization
    feature_model = Model(inputs=model.inputs, outputs=feature_map)
    
    model.compile(
        optimizer='adam',
        loss='binary_crossentropy',
        metrics=['accuracy']
    )
    
    return model, feature_model

def train_cnn(model, train_dataset, epochs, batch_size, callbacks=None):
    images, labels = train_dataset
    
    # Initialize ImageDataGenerator with augmentation parameters
    datagen = ImageDataGenerator(
        rotation_range=15,
        width_shift_range=0.1,
        height_shift_range=0.1,
        shear_range=0.01,
        zoom_range=[0.9, 1.25],
        horizontal_flip=True,
        fill_mode='nearest'
    )
    
    # Fit the data generator to the training images
    datagen.fit(images)
    
    # Use the generator to augment the data during training
    history = model.fit(
        datagen.flow(images, labels, batch_size=batch_size), 
        epochs=epochs,
        steps_per_epoch=len(images) // batch_size,
        callbacks=callbacks 
    )
    
    if epochs >= 5:
        print("Fine-tuning the model...")
        base_model = model.layers[1]  
        for layer in base_model.layers[-20:]:
            layer.trainable = True
        
        model.compile(
            optimizer=tf.keras.optimizers.Adam(learning_rate=1e-5),
            loss='binary_crossentropy',
            metrics=['accuracy']
        )
        
 
        model.fit(
            datagen.flow(images, labels, batch_size=batch_size),
            epochs=3,
            steps_per_epoch=len(images) // batch_size,
            callbacks=callbacks 
        )
    
    return history

def evaluate_cnn(model, test_dataset):
    images, labels = test_dataset
    loss, accuracy = model.evaluate(images, labels)
    print(f"Test Loss: {loss}")
    print(f"Test Accuracy: {accuracy}")


def generate_heatmap(img, feature_model, last_conv_layer_weights):
    """
    Generate a heatmap highlighting the fracture areas using Grad-CAM principles
    """
    # Get feature map from the feature extraction model
    feature_maps = feature_model.predict(img)[0]
    
    # Create weighted sum of feature maps
    heatmap = np.zeros(feature_maps.shape[0:2])
    for i, w in enumerate(last_conv_layer_weights):
        heatmap += w * feature_maps[:, :, i]
    
    # Apply ReLU to focus on features that have a positive influence
    heatmap = np.maximum(heatmap, 0)
    
    # Normalize heatmap
    if np.max(heatmap) > 0:
        heatmap = heatmap / np.max(heatmap)
    
    # Resize heatmap to image size
    heatmap = cv2.resize(heatmap, (img.shape[2], img.shape[1]))
    
    return heatmap

