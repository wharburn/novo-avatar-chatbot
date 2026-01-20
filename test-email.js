/**
 * Test script for email summary feature
 * Run with: node test-email.js
 */

const testEmail = async () => {
  // Try port 3000 first, then 3001
  const url = 'http://localhost:3000/api/tools/execute';

  const email = process.argv[2];
  const userName = process.argv[3];

  if (!email || !userName) {
    console.log('❌ ERROR: Please provide both email and name');
    console.log('');
    console.log('Usage: node test-email.js <email> <name>');
    console.log('Example: node test-email.js john@example.com "John Smith"');
    console.log('');
    process.exit(1);
  }

  const payload = {
    toolName: 'send_email_summary',
    parameters: {
      email: email,
      user_name: userName,
    },
  };

  console.log('🧪 Testing email summary...');
  console.log('👤 Name:', payload.parameters.user_name);
  console.log('📧 Email:', payload.parameters.email);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ SUCCESS! Email sent!');
      console.log('📬 Message ID:', result.data?.messageId);
      console.log('📧 Sent to:', result.data?.email);
      console.log('💬 Message:', result.data?.message);
      console.log('');
      console.log('🎉 Check your inbox!');
    } else {
      console.log('❌ FAILED!');
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.log('❌ ERROR!');
    console.error(error.message);
  }
};

testEmail();
