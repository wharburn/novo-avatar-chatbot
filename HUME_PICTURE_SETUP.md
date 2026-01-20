# Hume AI Picture Tools - Setup Guide

## 🎯 Quick Setup

You need to create **2 CUSTOM tools** in Hume AI:

1. **`take_picture`** - Custom tool (opens camera and captures photo)
2. **`send_picture_email`** - Custom tool (emails the captured photo)

---

## Step 1: Create `take_picture` Tool (Custom)

⚠️ **IMPORTANT: `take_picture` is NOT a built-in Hume AI tool. You MUST create it as a custom tool!**

### How to Create:

1. Go to https://platform.hume.ai/ → **EVI** → **Tools**
2. Click **"Create Tool"**
3. Copy and paste the values below:

### **Name:**

```
take_picture
```

### **Description:**

```
Takes a picture using the device camera (phone, tablet, or laptop webcam). Opens the camera interface and captures a photo. Returns the image URL that can be used with send_picture_email tool.
```

### **Parameters:**

```json
{
  "type": "object",
  "required": [],
  "properties": {}
}
```

### **Fallback Content:**

```
I'll take a picture for you now. Please allow camera access when prompted.
```

### **Version Description:**

```
Initial version - captures photos from device camera
```

4. Click **"Save"**

**Done!** ✅

**Camera Behavior:**

- 📱 **Phones/Tablets:** Uses front camera (selfie camera), can switch to back
- 💻 **Laptops/Desktops:** Uses webcam
- 🔒 **Permissions:** Browser will ask for camera permission on first use

---

## Step 2: Create `send_picture_email` Tool (Custom)

This is a **CUSTOM tool** - you need to create it.

1. Go to https://platform.hume.ai/ → **EVI** → **Tools**
2. Click **"Create Tool"**
3. Copy and paste the values below into each field:

### **Name:**

```
send_picture_email
```

### **Description:**

```
Sends a picture via email after the user has taken a photo using the take_picture tool. IMPORTANT: You MUST ask for and confirm BOTH the user's full name AND email address before calling this tool. This tool should only be called AFTER a picture has been taken with the take_picture tool. Ask 'What is your email address?' and 'What is your name?' to collect the required information.
```

### **Parameters:**

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

### **Fallback Content:**

```
I'm sorry, I couldn't send the picture via email. Please make sure you've taken a picture first and provided your email address.
```

### **Version Description:**

```
Sends pictures via email using Resend - works with take_picture tool
```

4. Click **"Save"**

**Done!** ✅

---

## Step 3: Add Both Tools to Your EVI Config

1. Go to **EVI** → **Configs**
2. Select your config
3. Click **"Edit"**
4. In **"Tools"** section, make sure both are enabled:
   - ✅ `take_picture` (built-in)
   - ✅ `send_picture_email` (custom)
5. Click **"Save"**

**Done!** ✅

---

## 🧪 Test It!

Say to NoVo:

- "Take a picture"
- "Can you take a photo and email it to me?"
- "Take a picture and send it to john@example.com"

NoVo will:

1. ✅ Take the picture using the camera
2. ✅ Play a camera click sound
3. ✅ Ask for your email address
4. ✅ Ask for your name
5. ✅ Send the picture via email
6. ✅ Confirm: "Picture sent!"

---

## 📋 Summary

| Tool                 | Type     | Action                           |
| -------------------- | -------- | -------------------------------- |
| `take_picture`       | Built-in | Just enable it in your config    |
| `send_picture_email` | Custom   | Create it using the values above |

**That's it! NoVo can now take pictures and email them!** 📸✨
