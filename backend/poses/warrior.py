import numpy as np
import cv2

def calculate_angle(a, b, c):
    a = np.array(a); b = np.array(b); c = np.array(c)
    ba = a - b; bc = c - b
    cosine_angle = np.dot(ba, bc) / (np.linalg.norm(ba) * np.linalg.norm(bc) + 1e-9)
    angle = np.arccos(np.clip(cosine_angle, -1.0, 1.0))
    return float(np.degrees(angle))

def process(image, landmarks, mp_pose):
    h, w, _ = image.shape
    
    def lm_xy(enum):
        lm = landmarks[enum.value]
        return [lm.x * w, lm.y * h]

    stats = {}

    try:
        right_hip = lm_xy(mp_pose.PoseLandmark.RIGHT_HIP)
        right_shoulder = lm_xy(mp_pose.PoseLandmark.RIGHT_SHOULDER)
        right_elbow = lm_xy(mp_pose.PoseLandmark.RIGHT_ELBOW)

        angle = int(calculate_angle(right_hip, right_shoulder, right_elbow))
        
        stats["Shoulder Angle"] = f"{angle}°"
        stats["Pose"] = "Warrior II"

    except Exception:
        stats["Status"] = "Detecting..."

    return stats