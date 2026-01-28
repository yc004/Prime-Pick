
import cv2
import numpy as np
from photo_selector.pipeline.models import SharpnessResult
from photo_selector.config import default_config

def compute_sharpness(img: np.ndarray) -> SharpnessResult:
    """
    使用基于网格的拉普拉斯方差方法计算清晰度。
    通过关注最清晰的区域（前 K 个块）而不是全局平均值，该方法对散景/浅景深具有鲁棒性。
    
    输入图像应为 BGR（将转换为灰度）或灰度图。
    """
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
        
    # 如果图像过大则进行缩放，以提高速度并降低高 ISO 噪点敏感度
    # 保持纵横比对于方差计算并非严格必要，但为了简单起见，我们保持纵横比。如果调整为固定宽度，阈值会更稳定。
    target_width = 1024
    h, w = gray.shape
    if w > target_width:
        scale = target_width / w
        new_h = int(h * scale)
        gray = cv2.resize(gray, (target_width, new_h), interpolation=cv2.INTER_AREA)
        
    h, w = gray.shape
    
    # 网格参数
    rows = 4
    cols = 4
    
    # 计算块尺寸
    # 我们使用简单的滑动窗口或固定网格。固定网格更快。
    step_h = h // rows
    step_w = w // cols
    
    block_scores = []
    
    for r in range(rows):
        for c in range(cols):
            # 提取感兴趣区域 (ROI)
            y_start = r * step_h
            y_end = (r + 1) * step_h
            x_start = c * step_w
            x_end = (c + 1) * step_w
            
            roi = gray[y_start:y_end, x_start:x_end]
            
            # 跳过空或非常小的 ROI（边缘情况）
            if roi.size == 0:
                continue
                
            # 计算该块的拉普拉斯方差
            # 需要使用 cv2.CV_64F 以避免上溢/下溢
            laplacian = cv2.Laplacian(roi, cv2.CV_64F)
            score = laplacian.var()
            block_scores.append(score)
            
    if not block_scores:
        return SharpnessResult(score=0.0, is_blurry=True)
        
    # 按降序对分数进行排序
    block_scores.sort(reverse=True)
    
    # 策略：取前 K 个块
    # 例如，如果有 16 个块，可能取前 4 个（图像的 25%）
    # 这假设图像中至少有 25% 的区域应该聚焦清晰
    # 对于人像摄影，这通常是正确的（脸/眼睛）。
    top_k = 4
    valid_scores = block_scores[:top_k]
    
    # 最终得分是前 K 个块的平均值
    # 这可以防止单个噪点块歪曲结果（如使用最大值时），同时忽略模糊的背景（如使用平均值时）。
    final_score = float(np.mean(valid_scores))
    
    # 配置中的阈值可能需要调整，因为块方差可能高于全局方差。
    # 但是，由于我们将宽度调整为 1024，方差值与全分辨率相比会下降。
    # 我们假设用户会在配置中调整阈值。
    is_blurry = bool(final_score < default_config.SHARPNESS_THRESHOLD)
    
    return SharpnessResult(score=final_score, is_blurry=is_blurry)
