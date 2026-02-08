import cv2
import numpy as np
import base64
import json
import traceback

# Try to import mediapipe in a robust way (works across multiple versions/install styles).
_mp_solutions = None
_mp_name = None
try:
    # Preferred: import mediapipe as mp (typical)
    import mediapipe as mp
    _mp_solutions = mp.solutions
    _mp_name = "mediapipe (import mediapipe as mp)"
except Exception:
    try:
        # Alternative packaging: from mediapipe import solutions
        from mediapipe import solutions as _mp_solutions
        _mp_name = "mediapipe.solutions (from mediapipe import solutions)"
    except Exception as e:
        raise ImportError(
            "Could not import mediapipe. Make sure mediapipe is installed and "
            "compatible with your Python version. If you upgraded mediapipe recently, "
            "consider pinning to the previously-working version (e.g. mediapipe==0.10.14). "
            f"Original import error: {e}"
        ) from e

# Now get the pose & drawing modules
_mp_pose_module = getattr(_mp_solutions, "pose", None)
_mp_drawing = getattr(_mp_solutions, "drawing_utils", None)

if _mp_pose_module is None:
    raise ImportError("mediapipe.solutions.pose not found in the mediapipe installation.")

# Import specific pose logic (user's pose calculation modules)
from poses import tree, warrior, sphinx

class PoseAnalysisWorker:
    def __init__(self, min_detection_confidence=0.7, min_tracking_confidence=0.7):
        print(f"Initializing PoseAnalysisWorker using {_mp_name}")
        self.mp_pose = _mp_pose_module
        self.mp_drawing = _mp_drawing

        # Create the Pose object. Wrap in try/except to show clear error if model initialization fails.
        try:
            self.pose = self.mp_pose.Pose(
                min_detection_confidence=min_detection_confidence,
                min_tracking_confidence=min_tracking_confidence
            )
        except Exception as e:
            traceback.print_exc()
            raise RuntimeError("Failed to initialize MediaPipe Pose object. See traceback above.") from e

    def process_frame(self, base64_image: str, mode: str) -> str:
        """
        Decodes base64 -> Processes with MediaPipe -> Draws -> Encodes base64
        Returns a JSON string: {"image": "...", "stats": {...}}
        """
        if not base64_image:
            return None

        # 1. Decode Base64 to OpenCV Image
        try:
            # Accept either full data URL or raw base64
            if ',' in base64_image:
                encoded_data = base64_image.split(',')[1]
            else:
                encoded_data = base64_image

            nparr = np.frombuffer(base64.b64decode(encoded_data), np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if image is None:
                print("Failed to decode image from base64")
                return None
        except Exception:
            print("Exception decoding base64 image:")
            traceback.print_exc()
            return None

        # 2. Convert to RGB for MediaPipe
        try:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        except Exception:
            # If conversion fails, send back original image with empty stats
            print("cv2.cvtColor failed on image:")
            traceback.print_exc()
            return json.dumps({"image": base64_image, "stats": {}})

        # Process
        try:
            results = self.pose.process(image_rgb)
        except Exception:
            print("MediaPipe pose.process raised an exception:")
            traceback.print_exc()
            results = None

        # Initialize empty stats
        pose_stats = {}

        # 3. Draw Skeleton & Route to specific pose logic
        if results and getattr(results, "pose_landmarks", None):
            try:
                if self.mp_drawing and hasattr(self.mp_drawing, "draw_landmarks"):
                    # Some mediapipe versions expect different args; use the common signature
                    try:
                        self.mp_drawing.draw_landmarks(
                            image,
                            results.pose_landmarks,
                            self.mp_pose.POSE_CONNECTIONS
                        )
                    except Exception:
                        # fallback: try drawing without connections if connection constant changed
                        try:
                            self.mp_drawing.draw_landmarks(
                                image,
                                results.pose_landmarks
                            )
                        except Exception:
                            # swallow drawing errors (we can still compute stats)
                            print("Warning: failed to draw landmarks (non-fatal).")
                            traceback.print_exc()
                else:
                    print("Warning: drawing_utils not available in this mediapipe build.")
            except Exception:
                print("Unexpected error while drawing landmarks:")
                traceback.print_exc()

            # Route to pose-specific logic
            try:
                landmarks = results.pose_landmarks.landmark
                if mode == 'tree':
                    pose_stats = tree.process(image, landmarks, self.mp_pose)
                elif mode == 'warrior':
                    pose_stats = warrior.process(image, landmarks, self.mp_pose)
                elif mode == 'sphinx':
                    pose_stats = sphinx.process(image, landmarks, self.mp_pose)
                else:
                    pose_stats = {"Status": "Unknown mode"}
            except Exception:
                print("Pose calculation error:")
                traceback.print_exc()
                pose_stats = {"Status": "Error in pose calculation"}

        # 4. Encode back to Base64 to return to React
        try:
            success, buffer = cv2.imencode('.jpg', image)
            if not success:
                print("cv2.imencode failed")
                return json.dumps({"image": base64_image, "stats": pose_stats})
            img_str = base64.b64encode(buffer).decode('utf-8')
            image_data_url = f"data:image/jpeg;base64,{img_str}"
        except Exception:
            print("Error encoding image back to base64:")
            traceback.print_exc()
            # fallback to returning the original input if encoding fails
            image_data_url = base64_image

        # 5. Return JSON structure
        return json.dumps({
            "image": image_data_url,
            "stats": pose_stats
        })
