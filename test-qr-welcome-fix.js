// Test script to verify QR code welcome message fix
// This simulates the message processing logic

function testQRWelcomeMessageFix() {
  console.log("🧪 Testing QR Welcome Message Fix\n");
  
  // Test cases
  const testCases = [
    "Hiii D0415-0001",
    "Hello DO123-4567", 
    "heyy DO999-8888",
    "hii - DO415-0001",
    "hello DO123456",
    "hey - DO999888",
    "hiii DO415-0001",
    "Hello World DO415-0001", // Should NOT be treated as welcome
    "My name is John DO415-0001" // Should NOT be treated as welcome
  ];
  
  testCases.forEach((originalMessage, index) => {
    console.log(`Test ${index + 1}: "${originalMessage}"`);
    
    let textMsg = originalMessage.trim();
    
    // Check if this is a welcome message with QR code BEFORE filtering
    const isWelcomeMessage = textMsg && (
      /^(hii+|hello+|hey+|hi+)\s*[A-Z]{2}\d{3}-\d{4}/i.test(textMsg) ||
      /^(hii+|hello+|hey+|hi+)\s*[A-Z]{2}\d{6}/i.test(textMsg) ||
      /^(hii+|hello+|hey+|hi+)\s*-\s*[A-Z]{2}\d{3}-\d{4}/i.test(textMsg) ||
      /^(hii+|hello+|hey+|hi+)\s*-\s*[A-Z]{2}\d{6}/i.test(textMsg)
    );
    
    // Filter out QR code data
    if (textMsg) {
      textMsg = textMsg.replace(/\s*-\s*DO\d{3}-\d{4}/g, '').trim();
      textMsg = textMsg.replace(/\s*-\s*[A-Z]{2}\d{3}-\d{4}/g, '').trim();
      textMsg = textMsg.replace(/\s*-\s*[A-Z]{2}\d{6}/g, '').trim();
      textMsg = textMsg.replace(/\s+[A-Z]{2}\d{3}-\d{4}/g, '').trim();
      textMsg = textMsg.replace(/\s+[A-Z]{2}\d{6}/g, '').trim();
    }
    
    console.log(`  ✅ Is Welcome Message: ${isWelcomeMessage}`);
    console.log(`  🧹 Cleaned Message: "${textMsg}"`);
    
    if (isWelcomeMessage) {
      console.log(`  🎯 Expected AI Response: Welcome message (ignoring QR code)`);
    } else {
      console.log(`  🎯 Expected AI Response: Process normally`);
    }
    
    console.log("");
  });
  
  console.log("✅ Test completed! The fix should now properly handle welcome messages with QR codes.");
}

// Run the test
testQRWelcomeMessageFix();
