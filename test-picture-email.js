/**
 * Test script for picture email functionality
 * 
 * Usage: node test-picture-email.js <email> <name> <image_url>
 * Example: node test-picture-email.js wayne@wharburn.com "Wayne" "https://example.com/image.jpg"
 */

const PORT = process.env.PORT || 3000;

async function testPictureEmail(email, userName, imageUrl) {
  console.log('🧪 Testing picture email...');
  console.log('👤 Name:', userName);
  console.log('📧 Email:', email);
  console.log('🖼️  Image URL:', imageUrl);
  console.log('');

  try {
    const response = await fetch(`http://localhost:${PORT}/api/tools/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        toolName: 'send_picture_email',
        parameters: {
          email: email,
          user_name: userName,
          image_url: imageUrl,
          caption: 'Test picture from NoVo!',
        },
      }),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ SUCCESS! Picture email sent!');
      console.log('📬 Message ID:', result.data.messageId);
      console.log('📧 Sent to:', result.data.email);
      console.log('💬 Message:', result.data.message);
      console.log('');
      console.log('🎉 Check your inbox at', email, '!');
    } else {
      console.log('❌ FAILED!');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ FAILED!');
    console.log('Error:', error.message);
  }
}

// Get command line arguments
const email = process.argv[2];
const userName = process.argv[3];
const imageUrl = process.argv[4];

if (!email || !userName || !imageUrl) {
  console.log('❌ Missing arguments!');
  console.log('');
  console.log('Usage: node test-picture-email.js <email> <name> <image_url>');
  console.log('');
  console.log('Example:');
  console.log('  node test-picture-email.js wayne@wharburn.com "Wayne" "https://picsum.photos/800/600"');
  console.log('');
  process.exit(1);
}

testPictureEmail(email, userName, imageUrl);

