from poses.calculate_angle import calculate_angle


def process(image, landmarks, mp_pose):
    """
    Sphinx Pose Analysis:
    1. Elbow Angle (~90 degrees) - Forearms parallel to legs/mat, upper arm vertical.
    2. Back Lifted - Shoulders should be vertically higher than hips.
    """
    h, w, _ = image.shape
    
    def lm_xy(enum):
        lm = landmarks[enum.value]
        return [lm.x * w, lm.y * h]

    stats = {}

    try:
        # --- Get Coordinates ---
        # We generally check the average of both sides or just the visible side
        # For Sphinx, we usually see both or one side clearly.
        
        r_shoulder = lm_xy(mp_pose.PoseLandmark.RIGHT_SHOULDER)
        l_shoulder = lm_xy(mp_pose.PoseLandmark.LEFT_SHOULDER)
        
        r_elbow = lm_xy(mp_pose.PoseLandmark.RIGHT_ELBOW)
        l_elbow = lm_xy(mp_pose.PoseLandmark.LEFT_ELBOW)
        
        r_wrist = lm_xy(mp_pose.PoseLandmark.RIGHT_WRIST)
        l_wrist = lm_xy(mp_pose.PoseLandmark.LEFT_WRIST)
        
        r_hip = lm_xy(mp_pose.PoseLandmark.RIGHT_HIP)
        l_hip = lm_xy(mp_pose.PoseLandmark.LEFT_HIP)

        # --- Calculations ---

        # 1. Elbow Angle (Target ~90 degrees)
        # Points: Shoulder -> Elbow -> Wrist
        r_elbow_ang = calculate_angle(r_shoulder, r_elbow, r_wrist)
        l_elbow_ang = calculate_angle(l_shoulder, l_elbow, l_wrist)
        
        # Average the two
        avg_elbow_angle = int((r_elbow_ang + l_elbow_ang) / 2)
        stats["Elbow Angle"] = f"{avg_elbow_angle}°"
        
        # Check if good (allow range 75-115)
        is_elbow_good = 75 < avg_elbow_angle < 115
        stats["Arms Position"] = "Good" if is_elbow_good else "Adjust"

        # 2. Back Lifted (Chest Up)
        # We compare the Y-height of Shoulders vs Hips.
        # In Sphinx, shoulders must be HIGHER (smaller Y) than hips.
        
        avg_shoulder_y = (r_shoulder[1] + l_shoulder[1]) / 2
        avg_hip_y = (r_hip[1] + l_hip[1]) / 2
        
        # Calculate vertical distance
        lift_distance = avg_hip_y - avg_shoulder_y
        
        # Threshold: Shoulders should be at least 10% of screen height above hips
        is_back_lifted = lift_distance > (h * 0.1)
        
        stats["Back Lifted"] = str(is_back_lifted)

    except Exception as e:
        stats["Status"] = "Detecting..."
    
    return stats