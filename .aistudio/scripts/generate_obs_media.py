#!/usr/bin/env python3
import os
import math
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = "/.aistudio/assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

def get_font(size):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", size)
    except Exception:
        try:
            return ImageFont.truetype("/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf", size)
        except Exception:
            return ImageFont.load_default()

def get_font_regular(size):
    try:
        return ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", size)
    except Exception:
        return get_font(size)

# 1. Camera Backdrop (1280x720) - Modern Studio Stage
def create_camera_backdrop():
    w, h = 1280, 720
    im = Image.new("RGBA", (w, h), (15, 23, 42, 255))
    draw = ImageDraw.Draw(im)

    # Gradient background
    for y in range(h):
        r = int(15 + (y / h) * 15)
        g = int(23 + (y / h) * 25)
        b = int(42 + (y / h) * 55)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # Studio lighting spotlights
    for i in range(5):
        cx = 160 + i * 240
        for radius in range(180, 0, -10):
            alpha = int(25 * (1 - radius / 180))
            draw.ellipse([cx - radius, 60 - radius, cx + radius, 60 + radius], fill=(59, 130, 246, alpha))

    # Grid pattern on bottom stage
    for x in range(0, w, 60):
        draw.line([(x, 480), (int(w/2 + (x - w/2) * 1.6), h)], fill=(30, 58, 138, 120), width=1)
    for y in range(480, h, 30):
        draw.line([(0, y), (w, y)], fill=(30, 58, 138, 90), width=1)

    # Frame accents
    draw.rounded_rectangle([40, 40, w - 40, h - 40], radius=16, outline=(59, 130, 246, 180), width=3)

    # Header badge
    draw.rounded_rectangle([60, 60, 320, 105], radius=8, fill=(30, 41, 59, 230), outline=(96, 165, 250, 255), width=2)
    font_badge = get_font(18)
    font_sub = get_font_regular(14)
    draw.text((80, 72), "● LIVE STUDIO FEED", fill=(239, 68, 68, 255), font=font_badge)

    font_title = get_font(36)
    draw.text((w/2 - 220, 280), "MAIN CAMERA FEED", fill=(248, 250, 252, 255), font=font_title)
    draw.text((w/2 - 160, 340), "1080p60 • Studio A Production", fill=(148, 163, 184, 255), font=font_sub)

    out_path = os.path.join(ASSETS_DIR, "camera_backdrop.png")
    im.save(out_path, "PNG")
    print(f"Created: {out_path}")

# 2. Testimony Interview Split Backdrop (1280x720)
def create_testimony_backdrop():
    w, h = 1280, 720
    im = Image.new("RGBA", (w, h), (18, 16, 38, 255))
    draw = ImageDraw.Draw(im)

    # Elegant deep purple-slate gradient
    for y in range(h):
        r = int(24 + (y / h) * 20)
        g = int(16 + (y / h) * 15)
        b = int(48 + (y / h) * 40)
        draw.line([(0, y), (w, y)], fill=(r, g, b, 255))

    # Interview Frame on left
    draw.rounded_rectangle([80, 80, 720, 620], radius=16, fill=(15, 23, 42, 220), outline=(168, 85, 247, 220), width=3)
    # Right panel for notes / quote
    draw.rounded_rectangle([760, 80, 1200, 620], radius=16, fill=(15, 23, 42, 180), outline=(139, 92, 246, 120), width=2)

    font_hdr = get_font(26)
    font_quote = get_font_regular(18)
    draw.text((110, 110), "TESTIMONY & INTERVIEW", fill=(216, 180, 254, 255), font=font_hdr)
    draw.text((790, 120), "KEY TAKEAWAYS", fill=(192, 132, 252, 255), font=get_font(20))
    
    notes = [
        "• Shared faith journey & renewal",
        "• Grace in community life",
        "• Weekly fellowship moments",
        "• Q&A session to follow"
    ]
    for idx, note in enumerate(notes):
        draw.text((790, 180 + idx * 50), note, fill=(226, 232, 240, 255), font=font_quote)

    out_path = os.path.join(ASSETS_DIR, "testimony_backdrop.png")
    im.save(out_path, "PNG")
    print(f"Created: {out_path}")

# 3. Transparent Scripture Lower-Third (1080x140)
def create_scripture_lowerthird():
    w, h = 1080, 140
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(im)

    # Frosted dark translucent container
    draw.rounded_rectangle([0, 10, w, h - 10], radius=12, fill=(15, 23, 42, 235), outline=(56, 189, 248, 200), width=2)
    # Gold reference banner tag
    draw.rounded_rectangle([16, 22, 200, 64], radius=6, fill=(217, 119, 6, 255))
    font_ref = get_font(18)
    draw.text((32, 32), "JOHN 3:16", fill=(255, 255, 255, 255), font=font_ref)

    font_verse = get_font_regular(22)
    draw.text((220, 28), "For God so loved the world that he gave his one and only Son...", fill=(255, 255, 255, 255), font=font_verse)
    draw.text((220, 72), "That whoever believes in him shall not perish but have eternal life.", fill=(186, 230, 253, 255), font=font_verse)

    out_path = os.path.join(ASSETS_DIR, "scripture_lowerthird.png")
    im.save(out_path, "PNG")
    print(f"Created: {out_path}")

# 4. Standby / Intermission Slate (1280x720)
def create_standby_slate():
    w, h = 1280, 720
    im = Image.new("RGBA", (w, h), (10, 15, 30, 255))
    draw = ImageDraw.Draw(im)

    # Radial ring visual
    cx, cy = w // 2, h // 2 - 30
    for r in range(240, 40, -20):
        alpha = int(40 + (1 - r/240) * 80)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(14, 165, 233, alpha), width=2)

    font_title = get_font(44)
    font_sub = get_font_regular(22)
    title_text = "STREAM STARTING SOON"
    sub_text = "Service begins shortly • Please adjust your audio levels"

    draw.text((cx - 280, cy - 30), title_text, fill=(240, 249, 255, 255), font=font_title)
    draw.text((cx - 260, cy + 40), sub_text, fill=(125, 211, 252, 255), font=font_sub)

    # Bottom status bar
    draw.rounded_rectangle([100, 620, w - 100, 680], radius=8, fill=(15, 23, 42, 240), outline=(56, 189, 248, 120), width=1)
    draw.text((130, 640), "● BROADCAST STANDBY", fill=(34, 197, 94, 255), font=get_font(16))
    draw.text((w - 380, 640), "Audio Test Tone Active: 48kHz Stereo", fill=(148, 163, 184, 255), font=get_font_regular(15))

    out_path = os.path.join(ASSETS_DIR, "standby_slate.png")
    im.save(out_path, "PNG")
    print(f"Created: {out_path}")

# 5. Animated Looping Radar / On-Air GIF (400x400, 16 frames)
def create_animated_radar_gif():
    w, h = 400, 400
    frames = []
    num_frames = 16
    cx, cy = w // 2, h // 2

    for f in range(num_frames):
        im = Image.new("RGBA", (w, h), (15, 23, 42, 255))
        draw = ImageDraw.Draw(im)

        # Concentric circles
        for radius in (50, 100, 150):
            draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], outline=(30, 58, 138, 200), width=2)

        # Rotating beam
        angle = (f / num_frames) * (2 * math.pi)
        bx = cx + int(150 * math.cos(angle))
        by = cy + int(150 * math.sin(angle))
        draw.line([(cx, cy), (bx, by)], fill=(56, 189, 248, 255), width=3)

        # Pulsing center dot
        pulse = 12 + int(6 * math.sin(angle * 2))
        draw.ellipse([cx - pulse, cy - pulse, cx + pulse, cy + pulse], fill=(239, 68, 68, 255))

        # Text banner
        font = get_font(18)
        draw.rounded_rectangle([70, 330, 330, 375], radius=6, fill=(30, 41, 59, 230), outline=(239, 68, 68, 255), width=2)
        draw.text((110, 342), "LIVE ON AIR MONITOR", fill=(255, 255, 255, 255), font=font)

        frames.append(im)

    out_path = os.path.join(ASSETS_DIR, "animated_radar.gif")
    frames[0].save(out_path, save_all=True, append_images=frames[1:], duration=80, loop=0)
    print(f"Created: {out_path}")

create_camera_backdrop()
create_testimony_backdrop()
create_scripture_lowerthird()
create_standby_slate()
create_animated_radar_gif()
print("All static & GIF assets generated successfully!")
