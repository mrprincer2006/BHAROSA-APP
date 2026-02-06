import twilio from 'twilio';

export async function sendOtpSms(phone, otp) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!accountSid || !authToken || !messagingServiceSid) {
    console.log('[SMS] Twilio not configured, logging OTP instead');
    console.log(`[SMS] OTP for ${phone}: ${otp}`);
    return { sent: false, fallback: 'logged' };
  }

  const client = twilio(accountSid, authToken);
  
  try {
    const message = await client.messages.create({
      body: `Your BHAROSA OTP is: ${otp}. Valid for 5 minutes.`,
      messagingServiceSid,
      to: phone
    });
    console.log('[Twilio] SMS sent:', message.sid);
    return { sent: true, sid: message.sid };
  } catch (error) {
    console.error('[Twilio] SMS failed:', error);
    return { sent: false, error: error.message };
  }
}

export async function sendFast2Sms(phone, otp) {
  const apiKey = process.env.FAST2SMS_API_KEY;
  const senderId = process.env.FAST2SMS_SENDER_ID;

  if (!apiKey) {
    console.log('[Fast2SMS] API key not configured');
    return { sent: false };
  }

  try {
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'v3',
        sender_id: senderId || 'FSTSMS',
        message: `Your BHAROSA OTP is: ${otp}. Valid for 5 minutes.`,
        language: 'english',
        numbers: phone,
        flash: 0
      })
    });

    const result = await response.json();
    console.log('[Fast2SMS] Response:', result);
    
    if (result.return === true) {
      return { sent: true, messageId: result.message[0].id };
    } else {
      return { sent: false, error: result.message };
    }
  } catch (error) {
    console.error('[Fast2SMS] Error:', error);
    return { sent: false, error: error.message };
  }
}
