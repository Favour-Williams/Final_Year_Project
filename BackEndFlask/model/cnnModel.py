import time
import tensorflow as tf
import numpy as np
import cv2
import os
from tensorflow.keras import layers, models
from sklearn.metrics import classification_report, roc_auc_score
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
                image = cv2.resize(image, (128, 128))  # Resize to match the model input size
                images.append(image / 255.0)  # Normalize
                labels.append(label)

    return np.array(images), np.array(labels)


def build_model(input_shape=(128, 128, 3)):
    model = models.Sequential([
        layers.Conv2D(32, (3, 3), activation='relu', input_shape=input_shape),
        layers.MaxPooling2D((2, 2)),

        layers.Conv2D(64, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),

        layers.Conv2D(128, (3, 3), activation='relu'),
        layers.MaxPooling2D((2, 2)),
        
        layers.Flatten(),
        layers.Dense(128, activation='relu'),
        layers.Dropout(0.5),
        layers.Dense(1, activation='sigmoid')  # Binary classification output
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model


def train_cnn(model, train_dataset, epochs=10, batch_size=32):
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
    model.fit(
        datagen.flow(images, labels, batch_size=batch_size), 
        epochs=epochs,
        steps_per_epoch=len(images) // batch_size
    )

def evaluate_cnn(model, test_dataset):
    images, labels = test_dataset
    loss, accuracy = model.evaluate(images, labels)
    print(f"Test Loss: {loss}")
    print(f"Test Accuracy: {accuracy}")


if __name__ == "__main__":
    start_time = time.time()

    # Load data
    print("Loading training data...")
    train_dataset = load_data('archive/BoneFractureDataset/training')
    test_dataset = load_data('archive/BoneFractureDataset/testing')

    end_time = time.time()
    print(f"Total data loading time: {end_time - start_time} seconds")

    start_time2 = time.time()
    # Initialize model using the build_model function
    cnn_model = build_model()
    end_time2 = time.time()
    print(f"Model initialization time: {end_time2 - start_time2} seconds")

    start_time3 = time.time()
    # Train the CNN model
    print("Training the model...")
    train_cnn(cnn_model, train_dataset, epochs=10)
    end_time3 = time.time()
    print(f"Training time: {end_time3 - start_time3} seconds")

    start_time4 = time.time()
    print("TESTING")
    # Evaluate the CNN model on the test data
    evaluate_cnn(cnn_model, test_dataset)
    end_time4 = time.time()
    print(f"Evaluating: {end_time4 - start_time4} seconds")

    # Save the trained model to a file (e.g., 'bone_fracture_detection_model_v2.keras')
    cnn_model.save('bone_fracture_detection_model_v3.h5')

    print("Model saved successfully.")

    predictions = (cnn_model.predict(test_dataset[0]) > 0.5).astype(int)
    print(classification_report(test_dataset[1], predictions, target_names=["Non-Fractured", "Fractured"]))
    print("AUC-ROC:", roc_auc_score(test_dataset, predictions))