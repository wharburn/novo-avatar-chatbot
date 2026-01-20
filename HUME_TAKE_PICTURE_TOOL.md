# 📸 Create take_picture Tool in Hume AI

## Step 1: Go to Hume AI Dashboard

1. Open https://platform.hume.ai/
2. Click **"EVI"** in the left sidebar
3. Click **"Tools"**
4. Click **"Create Tool"** button

## Step 2: Fill in the Form

Copy and paste these values EXACTLY:

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

## Step 3: Save the Tool

Click **"Save"** or **"Create Tool"**

## Step 4: Add to Your EVI Config

1. Go to **EVI** → **Configs**
2. Select your config: `8fed717d-d05e-4268-b421-70c2fe785169`
3. Click **"Edit"**
4. Scroll to **"Tools"** section
5. Find `take_picture` in the list
6. **Check the box** to enable it
7. Click **"Save"**

## Step 5: Test

1. Refresh your app at http://localhost:3000
2. Say: **"Take a picture"**
3. Camera should open
4. Click the capture button
5. Photo displays in modal
6. NoVo asks if you want to email it

---

## ✅ What Happens When You Say "Take a Picture"

1. **Hume AI** recognizes the intent
2. **Hume AI** calls `take_picture` tool
3. **Your app** receives the tool call
4. **Your app** opens the camera interface
5. **User** clicks capture button
6. **Your app** captures the photo
7. **Your app** sends tool response with image URL back to Hume AI
8. **Your app** plays camera click sound 🔊
9. **Your app** displays image in modal 🖼️
10. **NoVo** asks: "Would you like me to email this to you?"

---

## 🔧 Other Tools You Should Have

Make sure you also have these custom tools created:

### ✅ `send_picture_email`

See `HUME_PICTURE_SETUP.md` for configuration

### ✅ `send_email_summary`

See `EMAIL_SUMMARY_SETUP.md` for configuration

---

## 🚨 Important Notes

- `take_picture` is **NOT** a built-in Hume AI tool
- You **MUST** create it as a custom tool
- The camera functionality is handled by your app (client-side)
- Hume AI just triggers the tool call
- Your app does the actual camera capture

---

## 📱 Camera Behavior

- **Phones:** Front camera (selfie) by default, can switch to back
- **Tablets:** Front camera by default, can switch to back
- **Laptops:** Webcam
- **Desktops:** Connected webcam

---

**After creating this tool, NoVo will be able to take pictures!** 📸✨
