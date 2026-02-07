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
        # Get Coordinates
        nose = lm_xy(mp_pose.PoseLandmark.NOSE)
        r_shoulder = lm_xy(mp_pose.PoseLandmark.RIGHT_SHOULDER)
        l_shoulder = lm_xy(mp_pose.PoseLandmark.LEFT_SHOULDER)
        r_elbow = lm_xy(mp_pose.PoseLandmark.RIGHT_ELBOW)
        l_elbow = lm_xy(mp_pose.PoseLandmark.LEFT_ELBOW)
        r_hip = lm_xy(mp_pose.PoseLandmark.RIGHT_HIP)
        l_hip = lm_xy(mp_pose.PoseLandmark.LEFT_HIP)
        r_knee = lm_xy(mp_pose.PoseLandmark.RIGHT_KNEE)
        l_knee = lm_xy(mp_pose.PoseLandmark.LEFT_KNEE)
        r_ankle = lm_xy(mp_pose.PoseLandmark.RIGHT_ANKLE)
        l_ankle = lm_xy(mp_pose.PoseLandmark.LEFT_ANKLE)

        # 1. Knee Angle (Left)
        left_knee_angle = int(calculate_angle(l_hip, l_knee, l_ankle))
        stats["Knee Angle"] = f"{left_knee_angle}°"

        # 2. Elbows Above Nose
        is_elbows_above = (r_elbow[1] < nose[1]) and (l_elbow[1] < nose[1])
        stats["Elbows Above"] = str(is_elbows_above)

        # 3. Leg Straight (Right)
        right_leg_angle = calculate_angle(r_hip, r_knee, r_ankle)
        is_leg_straight = right_leg_angle > 165
        stats["Leg Straight"] = str(is_leg_straight)

        # 4. Body Straight
        shoulder_y_diff = abs(r_shoulder[1] - l_shoulder[1])
        is_body_straight = shoulder_y_diff < (h * 0.05)
        stats["Body Straight"] = str(is_body_straight)

    except Exception as e:
        stats["Status"] = "Detecting..."
    
    return stats