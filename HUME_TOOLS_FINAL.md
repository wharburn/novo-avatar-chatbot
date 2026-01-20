# 🔧 Hume AI Custom Tools - Final Configuration

## Tools to Create in Hume AI Dashboard

You need to create **3 CUSTOM TOOLS**:

1. `take_picture`
2. `send_email_summary`
3. `send_email_picture`

---

## 1️⃣ take_picture

### Name:
```
take_picture
```

### Description:
```
Takes a picture using the device camera (phone, tablet, or laptop webcam). Opens the camera interface and captures a photo. Returns the image URL that can be used with send_email_picture tool.
```

### Parameters:
```json
{
  "type": "object",
  "required": [],
  "properties": {}
}
```

### Fallback Content:
```
I'll take a picture for you now. Please allow camera access when prompted.
```

### Version Description:
```
Initial version - captures photos from device camera
```

---

## 2️⃣ send_email_summary

### Name:
```
send_email_summary
```

### Description:
```
Sends a summary of the conversation via email. IMPORTANT: You MUST ask for and confirm BOTH the user's full name AND email address before calling this tool. Ask 'What is your email address?' and 'What is your name?' to collect the required information.
```

### Parameters:
```json
{
  "type": "object",
  "required": ["email", "user_name"],
  "properties": {
    "email": {
      "type": "string",
      "description": "User's confirmed email address in valid format (e.g., john@example.com)"
    },
    "user_name": {
      "type": "string",
      "description": "User's full name. REQUIRED."
    }
  }
}
```

### Fallback Content:
```
I'm sorry, I couldn't send the email summary. Please make sure you've provided your email address and name.
```

### Version Description:
```
Sends conversation summaries via email using Resend
```

---

## 3️⃣ send_email_picture

### Name:
```
send_email_picture
```

### Description:
```
Sends a picture via email after the user has taken a photo using the take_picture tool. IMPORTANT: You MUST ask for and confirm BOTH the user's full name AND email address before calling this tool. This tool should only be called AFTER a picture has been taken with the take_picture tool. Ask 'What is your email address?' and 'What is your name?' to collect the required information.
```

### Parameters:
```json
{
  "type": "object",
  "required": ["email", "user_name", "image_url"],
  "properties": {
    "email": {
      "type": "string",
      "description": "User's confirmed email address in valid format (e.g., john@example.com)"
    },
    "user_name": {
      "type": "string",
      "description": "User's full name. REQUIRED."
    },
    "image_url": {
      "type": "string",
      "description": "The URL of the image from the take_picture tool. This is provided by the take_picture tool response."
    },
    "caption": {
      "type": "string",
      "description": "Optional caption or message to include with the picture"
    }
  }
}
```

### Fallback Content:
```
I'm sorry, I couldn't send the picture via email. Please make sure you've taken a picture first and provided your email address.
```

### Version Description:
```
Sends pictures via email using Resend - works with take_picture tool
```

---

## 📋 Setup Steps

1. Go to https://platform.hume.ai/
2. Click **"EVI"** → **"Tools"**
3. Click **"Create Tool"** for each tool above
4. Copy-paste the values from this document
5. Click **"Save"** for each tool
6. Go to **"EVI"** → **"Configs"**
7. Select your config: `8fed717d-d05e-4268-b421-70c2fe785169`
8. Click **"Edit"**
9. Add all 3 tools to your config
10. Click **"Save"**

---

## ✅ After Setup

NoVo will be able to:
- 📸 Take pictures using device camera
- 📧 Email conversation summaries
- 🖼️ Email captured pictures

---

**All 3 tools ready to copy-paste!** 🚀

