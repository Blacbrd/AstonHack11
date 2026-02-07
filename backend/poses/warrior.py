from poses.calculate_angle import calculate_angle


def process(image, landmarks, mp_pose):
    """
    Warrior II Pose Analysis (Assuming Right Leg Forward for simplicity, 
    but calculations generally work for either if we check specific sides).
    """
    h, w, _ = image.shape
    
    def lm_xy(enum):
        lm = landmarks[enum.value]
        return [lm.x * w, lm.y * h]

    stats = {}

    try:
        # --- Get Coordinates ---
        # Shoulders
        r_shoulder = lm_xy(mp_pose.PoseLandmark.RIGHT_SHOULDER)
        l_shoulder = lm_xy(mp_pose.PoseLandmark.LEFT_SHOULDER)
        
        # Hips
        r_hip = lm_xy(mp_pose.PoseLandmark.RIGHT_HIP)
        l_hip = lm_xy(mp_pose.PoseLandmark.LEFT_HIP)
        
        # Elbows
        r_elbow = lm_xy(mp_pose.PoseLandmark.RIGHT_ELBOW)
        l_elbow = lm_xy(mp_pose.PoseLandmark.LEFT_ELBOW)
        
        # Knees
        r_knee = lm_xy(mp_pose.PoseLandmark.RIGHT_KNEE)
        l_knee = lm_xy(mp_pose.PoseLandmark.LEFT_KNEE)
        
        # Ankles
        r_ankle = lm_xy(mp_pose.PoseLandmark.RIGHT_ANKLE)
        l_ankle = lm_xy(mp_pose.PoseLandmark.LEFT_ANKLE)


        # --- Calculations ---

        # 1. Right Knee Angle (Target ~90 degrees)
        # Points: Right Hip -> Right Knee -> Right Ankle
        right_knee_angle = int(calculate_angle(r_hip, r_knee, r_ankle))
        stats["Right Knee"] = f"{right_knee_angle}°"

        # 2. Arm Alignment (Shoulders)
        # We calculate the angle between the torso and the arm.
        # Points: Hip -> Shoulder -> Elbow
        # Ideally, this should be close to 90 degrees if arms are parallel to ground.
        r_shoulder_angle = int(calculate_angle(r_hip, r_shoulder, r_elbow))
        l_shoulder_angle = int(calculate_angle(l_hip, l_shoulder, l_elbow))
        
        # Average the two for a general "Arms Level" metric
        avg_arm_angle = int((r_shoulder_angle + l_shoulder_angle) / 2)
        stats["Arms Angle"] = f"{avg_arm_angle}°"
        
        # boolean check: Are arms roughly 90 deg? (allowing variance 75-105)
        arms_correct = (80 < r_shoulder_angle < 110) and (80 < l_shoulder_angle < 110)
        stats["Arms Correct"] = str(arms_correct)


        # 3. Body Straight (Vertical Torso)
        # Warrior II requires a vertical spine. We check if the midpoint of shoulders 
        # is directly above the midpoint of hips.
        
        mid_shoulder_x = (r_shoulder[0] + l_shoulder[0]) / 2
        mid_hip_x = (r_hip[0] + l_hip[0]) / 2
        
        # Calculate horizontal deviation
        torso_deviation = abs(mid_shoulder_x - mid_hip_x)
        
        # If deviation is small (< 5% of screen width), body is straight vertically
        is_body_straight = torso_deviation < (w * 0.05)
        stats["Body Straight"] = str(is_body_straight)

    except Exception as e:
        stats["Status"] = "Detecting..."
    
    return stats