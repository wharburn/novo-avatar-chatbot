/**
 * Test script for picture email functionality
 * Tests the send_picture_email tool with a sample image
 */

// Test data
const testData = {
  email: process.argv[2] || 'wayne@wharburn.com',
  user_name: process.argv[3] || 'Wayne',
  // Using a sample image URL (you can replace with any public image URL)
  image_url:
    process.argv[4] || 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  caption: 'Test photo from NoVo - Camera functionality test',
};

console.log('🧪 Testing Picture Email Tool...\n');
console.log('Test Data:');
console.log('  Email:', testData.email);
console.log('  Name:', testData.user_name);
console.log('  Image URL:', testData.image_url);
console.log('  Caption:', testData.caption);
console.log('\n📧 Sending test email...\n');

// Call the API endpoint
fetch('http://localhost:3000/api/tools/execute', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    toolName: 'send_picture_email',
    parameters: testData,
  }),
})
  .then((response) => response.json())
  .then((data) => {
    console.log('✅ Response received:\n');
    console.log(JSON.stringify(data, null, 2));

    if (data.success) {
      console.log('\n✅ SUCCESS! Picture email sent!');
      console.log(`📧 Check ${testData.email} for the email`);
    } else {
      console.log('\n❌ FAILED!');
      console.log('Error:', data.error);
    }
  })
  .catch((error) => {
    console.error('\n❌ Error calling API:');
    console.error(error.message);
    console.log('\n💡 Make sure your Next.js dev server is running:');
    console.log('   npm run dev');
  });

console.log('\n📝 Usage:');
console.log('  node test-picture-tools.js [email] [name] [image_url]');
console.log('\nExample:');
console.log(
  '  node test-picture-tools.js wayne@wharburn.com "Wayne Harburn" "https://example.com/photo.jpg"'
);
