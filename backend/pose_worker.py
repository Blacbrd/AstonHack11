import cv2
import numpy as np
import mediapipe as mp
import base64
import json

# Import specific pose logic
from poses import tree, warrior, sphinx

class PoseAnalysisWorker:
    def __init__(self):
        # Initialize MediaPipe once when the worker starts
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            min_detection_confidence=0.7, 
            min_tracking_confidence=0.7
        )
        self.mp_drawing = mp.solutions.drawing_utils

    def process_frame(self, base64_image: str, mode: str) -> str:
        """
        Decodes base64 -> Processes with MediaPipe -> Draws -> Encodes base64
        Returns a JSON string: {"image": "...", "stats": {...}}
        """
        if not base64_image:
            return None

        # 1. Decode Base64 to OpenCV Image
        try:
            encoded_data = base64_image.split(',')[1]
            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        except Exception:
            return None

        # 2. Convert to RGB for MediaPipe
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = self.pose.process(image_rgb)
        
        # Initialize empty stats
        pose_stats = {}

        # 3. Draw Skeleton & Route to specific pose logic
        if results.pose_landmarks:
            # Draw the skeleton (common for all poses)
            self.mp_drawing.draw_landmarks(
                image, 
                results.pose_landmarks, 
                self.mp_pose.POSE_CONNECTIONS
            )

            # Route to the correct calculation file
            if mode == 'tree':
                pose_stats = tree.process(image, results.pose_landmarks.landmark, self.mp_pose)
            elif mode == 'warrior':
                pose_stats = warrior.process(image, results.pose_landmarks.landmark, self.mp_pose)
            elif mode == 'sphinx':
                pose_stats = sphinx.process(image, results.pose_landmarks.landmark, self.mp_pose)

        # 4. Encode back to Base64 to return to React
        _, buffer = cv2.imencode('.jpg', image)
        img_str = base64.b64encode(buffer).decode('utf-8')
        
        # 5. Return JSON structure
        return json.dumps({
            "image": f"data:image/jpeg;base64,{img_str}",
            "stats": pose_stats
        })