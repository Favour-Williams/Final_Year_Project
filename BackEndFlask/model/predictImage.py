import tensorflow as tf
import cv2
import numpy as np
import time

import matplotlib.pyplot as plt

# from cnnModel import build_model

def predict_image(image_path, model, threshold=0.3):
    image = cv2.imread(image_path)
    if image is None:
        print("Error: Image not found.")
        return
    image = cv2.resize(image, (128, 128)) / 255.0
    image = np.expand_dims(image, axis=0)  # Add batch dimension
    prediction = model.predict(image)[0][0]
    if prediction > threshold:
        print("Fracture Detected")
    else:
        print("No Fracture")


# if __name__ == "__main__":

#     start_time = time.time()

#     # Initialize and load the trained model
#     model = build_model(input_shape=(128, 128, 3))  
#     model.load_weights('bone_fracture_detection_model_v3.h5')

#     end_time = time.time()
#     print(f"Total model initialization time: {end_time - start_time} seconds")


    