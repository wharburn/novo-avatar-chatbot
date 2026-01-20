const testEmail = async () => {
  // Try both ports - 3000 and 3001
  const port = process.env.PORT || '3000';
  const url = `http://localhost:${port}/api/tools/execute`;

  const payload = {
    toolName: 'send_email_summary',
    parameters: {
      email: 'wayne@wharburn.com',
      user_name: 'Wayne',
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
      console.log('🎉 Check your inbox at wayne@wharburn.com!');
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
