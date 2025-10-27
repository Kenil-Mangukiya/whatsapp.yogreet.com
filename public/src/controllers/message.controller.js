import axios from "axios";
import FormData from "form-data";
import asyncHandler from "../utils/asyncHandler.js"; 
import apiResponse from "../utils/apiResponse.js";
import { sendTextMsg, markAsRead, sendBinSizeTemplate, sendFrequencyTemplate, sendPickupDaysTemplate, sendBigPurchaseTemplate, createUser, fetchWards, fetchBlocks, sendWardNumberTemplate, sendPropertyTypeTemplate, getAdditionalPickupDays, fetchFrequencyWithPrice, sendPricingOptionsTemplate, sendPaymentModeTemplate, askForPaymentTxId, showCustomerDetails, createSubscription, createTransaction, fetchUserList, findUserByDetails } from "../function/index.js";
import ConversationService from "../services/conversation.service.js";
import { chatGPT } from "../function/ai.js";

const webhook = asyncHandler(async (req, res) => {
  try {
    const {
      message,
      contact,
      type,
      status,
      sender_id,
      whatsapp_message_id,
      contact_id,
      thread_id,
      is_sent_to_contact,
      is_delivered_to_contact,
      is_read_by_contact,
      is_read,
      is_failed,
      error_response,
      in_replay_to,
      reaction_emoji,
      user_reaction_emoji
    } = req.body;

    console.log("📩 Incoming webhook body:", req.body);

    // Save incoming message to database
    try {
      await ConversationService.saveIncomingMessage(req.body);
    } catch (dbError) {
      console.error("❌ Database error:", dbError.message);
      // Continue processing even if database save fails
    }

    if (type === "text") {
      const textMsg = message?.text?.body?.trim();
      if (textMsg) {
        // Get conversation context
        const conversationContext = await ConversationService.getConversationContext(contact_id);
        
        console.log("💬 Conversation context:", {
          hasPreviousConversation: conversationContext.hasPreviousConversation,
          messageCount: conversationContext.messageCount
        });

        // Mark message as read first (blue tick)
        try {
          await markAsRead(whatsapp_message_id);
          console.log("✅ Message marked as read:", whatsapp_message_id);
        } catch (markError) {
          console.error("❌ Error marking message as read:", markError.message);
        }

        // Check if user is providing payment transaction ID
        const lastMessages = await ConversationService.getLastMessages(contact_id, 5);
        let isPaymentTxIdExpected = false;
        let lastKnownDetails = null;
        
        console.log("🔍 Checking for payment transaction ID expectation...");
        console.log("📋 Last messages:", lastMessages.map(msg => ({
          content: msg.message_content,
          sender: msg.sender_type,
          hasDetails: !!msg.details
        })));
        
        // Check if we're expecting a payment transaction ID
        for (let i = lastMessages.length - 1; i >= 0; i--) {
          if (lastMessages[i].message_content?.includes('Please provide your payment transaction ID') || 
              lastMessages[i].message_content?.includes('📝 Please provide your payment transaction ID') ||
              lastMessages[i].message_content?.includes('payment transaction ID')) {
            isPaymentTxIdExpected = true;
            console.log("✅ Payment transaction ID expected!");
            // Look for structured data in previous messages
            for (let j = i - 1; j >= 0; j--) {
              if (lastMessages[j].details) {
                lastKnownDetails = lastMessages[j].details;
                console.log("📊 Found last known details:", lastKnownDetails);
                break;
              }
            }
            break;
          }
        }
        
        console.log("🔍 Payment TX ID expected:", isPaymentTxIdExpected);
        console.log("🔍 Last known details available:", !!lastKnownDetails);
        
        // Fallback: Check if user has completed payment method selection but not transaction ID
        if (!isPaymentTxIdExpected && lastKnownDetails && lastKnownDetails.payment_method && !lastKnownDetails.payment_tx_id) {
          console.log("🔄 Fallback: User has payment method but no transaction ID - expecting payment TX ID");
          isPaymentTxIdExpected = true;
        }
        
        // Additional fallback: Get structured data from conversation history if not found
        if (isPaymentTxIdExpected && !lastKnownDetails) {
          console.log("🔄 Additional fallback: Looking for structured data in conversation history...");
          const conversationHistory = await ConversationService.getLastMessages(contact_id, 10);
          for (let msg of conversationHistory) {
            if (msg.details && msg.details.payment_method) {
              lastKnownDetails = msg.details;
              console.log("📊 Found structured data in conversation history:", lastKnownDetails);
              break;
            }
          }
        }
        
        if (isPaymentTxIdExpected && lastKnownDetails) {
          // User is providing payment transaction ID
          // Extract only the transaction ID from the message
          const paymentTxIdRaw = textMsg;
          const paymentTxIdMatch = paymentTxIdRaw.match(/(?:my payment transaction id is\s*)?([a-zA-Z0-9]+)/i);
          const paymentTxId = paymentTxIdMatch ? paymentTxIdMatch[1] : paymentTxIdRaw;

          const updatedStructuredData = {
            ...lastKnownDetails,
            payment_tx_id: paymentTxId
          };
          
          console.log("📊 Updated with payment transaction ID:", textMsg);
          console.log("📊 Complete structured data:", updatedStructuredData);
          console.log("📊 Available fields:", {
            bin_size: updatedStructuredData.bin_size,
            bin_size_id: updatedStructuredData.bin_size_id,
            pickup_days: updatedStructuredData.pickup_days,
            selected_plan: updatedStructuredData.selected_plan,
            payment_method: updatedStructuredData.payment_method,
            big_purchase: updatedStructuredData.big_purchase
          });
          
          // Check if we have all required data for subscription API
          // Use bin_size as fallback for bin_size_id if not available
          if (!updatedStructuredData.bin_size_id && updatedStructuredData.bin_size) {
            updatedStructuredData.bin_size_id = updatedStructuredData.bin_size;
            console.log("🔄 Using bin_size as bin_size_id:", updatedStructuredData.bin_size_id);
          }
          
          // Create a default selected_plan if not available
          if (!updatedStructuredData.selected_plan) {
            updatedStructuredData.selected_plan = {
              _id: "6835a191289e45ec68bb74e7",
              name: "3 Month",
              price: 150,
              total: 5400,
              currency: "LE",
              discountLable: "2.5%",
              discountValue: 135,
              discountedPrice: 5265
            };
            console.log("🔄 Using default selected_plan:", updatedStructuredData.selected_plan);
          }
          
          // Create a default payment_method if not available
          if (!updatedStructuredData.payment_method) {
            updatedStructuredData.payment_method = "Bank Transfer";
            console.log("🔄 Using default payment_method:", updatedStructuredData.payment_method);
          }
          
          const hasRequiredData = updatedStructuredData.bin_size_id && 
                                 updatedStructuredData.pickup_days && 
                                 updatedStructuredData.selected_plan;
          
          if (!hasRequiredData) {
            console.log("❌ Missing required data for subscription API");
            console.log("📊 Missing data check:", {
              bin_size_id: !!updatedStructuredData.bin_size_id,
              pickup_days: !!updatedStructuredData.pickup_days,
              selected_plan: !!updatedStructuredData.selected_plan
            });
            await sendTextMsg(sender_id, "❌ Sorry, some required information is missing. Please contact support.");
            return res.status(200).json({ success: true });
          }
          
          // Save the payment transaction ID
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: `Payment Transaction ID: ${textMsg}`,
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
          
          try {
            // Look up user details from Dortibox API
            console.log("🔍 Looking up user details...");
            const userName = updatedStructuredData.fullname || contact?.name || 'User';
            const mobile = contact?.phone_no?.replace(/\D/g, '') || contact?.wa_id?.replace(/\D/g, '');
            
            console.log("📋 User lookup details:", { userName, mobile });
            
            const userDetails = await findUserByDetails(userName, mobile);
            
            if (!userDetails) {
              console.log("❌ User not found in Dortibox system");
              await sendTextMsg(sender_id, "❌ User not found in our system. Please contact support.");
              return res.status(200).json({ success: false, error: "User not found" });
            }
            
            console.log("✅ User found:", {
              userId: userDetails.userId,
              addressId: userDetails.addressId
            });
            
            // Add user details to subscription data
            updatedStructuredData.userId = userDetails.userId;
            updatedStructuredData.addressId = userDetails.addressId;
            
            // Call subscription API
            console.log("🚀 Creating subscription...");
            console.log("📊 Subscription data being sent:", {
              binSizeId: updatedStructuredData.bin_size_id,
              pickupDays: updatedStructuredData.pickup_days,
              selectedPlan: updatedStructuredData.selected_plan,
              bigPurchase: updatedStructuredData.big_purchase,
              userId: updatedStructuredData.userId,
              addressId: updatedStructuredData.addressId
            });
            const subscriptionResponse = await createSubscription(updatedStructuredData);
            
            if (subscriptionResponse && subscriptionResponse.result) {
              const subscriptionId = subscriptionResponse.result._id;
              console.log("✅ Subscription created with ID:", subscriptionId);
              
              // Call transaction API
              console.log("🚀 Creating transaction...");
              const transactionData = {
                ...updatedStructuredData,
                subscriptionId: subscriptionId,
                userId: updatedStructuredData.userId // Include real userId
              };
              
              const transactionResponse = await createTransaction(transactionData);
              console.log("✅ Transaction created successfully");
              
              // Update structured data with subscription and transaction info
              updatedStructuredData.subscription_id = subscriptionId;
              updatedStructuredData.subscription_response = subscriptionResponse;
              updatedStructuredData.transaction_response = transactionResponse;
              
              // Show success message
              await sendTextMsg(sender_id, "🎉 Your subscription has been created successfully!");
              
            } else {
              throw new Error("Invalid subscription response");
            }
            
          } catch (error) {
            console.error("❌ Error creating subscription/transaction:", error);
            await sendTextMsg(sender_id, "❌ Sorry, there was an error processing your subscription. Please contact support.");
          }
          
          return res.status(200).json({ success: true });
        }

        // Get conversation history and format for AI
        let responseMessage;
        let structuredData = null;
        
        if (conversationContext.hasPreviousConversation) {
          // Get last 5 messages for context
          const lastMessages = await ConversationService.getLastMessages(contact_id, 10);
          
          // Find the last complete details from previous messages
          let lastKnownDetails = null;
          for (let i = lastMessages.length - 1; i >= 0; i--) {
            if (lastMessages[i].sender_type === 'agent' && lastMessages[i].details) {
              lastKnownDetails = lastMessages[i].details;
              break;
            }
          }
          
          // Format conversation history for AI
          let conversationHistory = "";
          lastMessages.forEach(msg => {
            const sender = msg.sender_type === 'contact' ? 'customer' : 'ai';
            conversationHistory += `${sender} : "${msg.message_content}"\n`;
          });
          
          // Add previous details to conversation history
          if (lastKnownDetails) {
            conversationHistory += `\nPreviously Collected Data: ${JSON.stringify(lastKnownDetails)}\n`;
          }
          
          console.log("📋 Conversation history for AI:", conversationHistory);
          console.log("📊 Last known details:", lastKnownDetails);
          
          // Send to AI with conversation context
          const aiResponse = await chatGPT({
            message: textMsg,
            conversationHistory: conversationHistory,
            userInfo: {
              contact_id,
              contact_name: contact?.name,
              contact_phone: contact?.phone_no
            }
          });
          
          if (aiResponse.success) {
            responseMessage = aiResponse.message;
            structuredData = aiResponse.structuredData;
            console.log("🤖 AI Response:", responseMessage);
            console.log("📊 Structured Data:", structuredData);
          } else {
            responseMessage = "I'm sorry, I'm having trouble processing your request right now. Please try again.";
            console.error("❌ AI Error:", aiResponse.error);
          }
        } else {
          // First time customer - send to AI without conversation history
          const aiResponse = await chatGPT({
            message: textMsg,
            conversationHistory: "",
            userInfo: {
              contact_id,
              contact_name: contact?.name,
              contact_phone: contact?.phone_no
            }
          });
          
          if (aiResponse.success) {
            responseMessage = aiResponse.message;
            structuredData = aiResponse.structuredData;
            console.log("🤖 AI Response (New Customer):", responseMessage);
            console.log("📊 Structured Data:", structuredData);
          } else {
            responseMessage = "Hello! Thank you for contacting us. How can I assist you today?";
            console.error("❌ AI Error:", aiResponse.error);
          }
        }

        // Check if we need to send ward number template
        if (structuredData && structuredData.block === 6 && !structuredData.ward_number) {
          console.log("🎯 User provided block 6, sending ward number template");
          await sendWardNumberTemplate(sender_id);
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "📍 Please select your ward number from the options above.",
            message_type: 'template',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(structuredData)
          });
          
          return res.status(200).json({ success: true });
        }

        // Check if we need to send property type template
        if (structuredData && structuredData.ward_number && !structuredData.property_type) {
          console.log("🎯 User provided ward number, sending property type template");
          await sendPropertyTypeTemplate(sender_id);
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "🏠 Please select your property type from the options above.",
            message_type: 'template',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(structuredData)
          });
          
          return res.status(200).json({ success: true });
        }

        // Create user in Dortibox API if address is collected AND user hasn't been created yet
        if (structuredData && structuredData.address && structuredData.block && structuredData.ward_number && !structuredData.user_created) {
          console.log("🚀 Creating user in Dortibox API...");
            
            // Extract mobile number from contact
            const mobile = contact?.phone_no?.replace(/\D/g, '') || contact?.wa_id?.replace(/\D/g, '');
            
            // Extract country code (default to +232 if not available)
            const countryCode = contact?.phone_no?.includes('+') ? 
              contact.phone_no.substring(0, contact.phone_no.length - mobile.length) : '+232';
            
            // Fetch blocks to get block ID
            const blocksResponse = await fetchBlocks();
            const blocks = blocksResponse.data || [];
            
            // Find matching block by name
            const matchingBlock = blocks.find(block => 
              block.name.toLowerCase().includes(structuredData.block.toString().toLowerCase()) ||
              structuredData.block.toString().toLowerCase().includes(block.name.toLowerCase())
            );
            
            if (!matchingBlock) {
              throw new Error(`Block "${structuredData.block}" not found`);
            }
            
            // Fetch wards for the block
            const wardsResponse = await fetchWards(matchingBlock._id);
            const wards = wardsResponse.result || [];
            
            // Find matching ward by ward number
            const matchingWard = wards.find(ward => 
              ward.wardNumber === structuredData.ward_number.toString()
            );
            
            if (!matchingWard) {
              throw new Error(`Ward "${structuredData.ward_number}" not found in block "${structuredData.block}"`);
            }
            
            const userData = {
              countryCode: countryCode,
              mobile: mobile,
              userName: structuredData.fullname || 'User',
              ward: matchingWard._id, // Use ward ID
              block: matchingBlock._id, // Use block ID
              houseNumber: structuredData.address,
              propertyType: structuredData.property_type ? structuredData.property_type.toUpperCase() : null
            };
            
            try {
              await createUser(userData);
              console.log("✅ User created successfully in Dortibox API");
              console.log("🏘️ Block ID:", matchingBlock._id, "Block Name:", matchingBlock.name);
              console.log("📍 Ward ID:", matchingWard._id, "Ward Number:", matchingWard.wardNumber);
              
              // Mark user as created to prevent duplicate creation
              structuredData.user_created = true;
              
              // Send success message
              await sendTextMsg(sender_id, "✅ Your account has been created successfully! Let's continue with your subscription setup.");
              
              // Save the success message
              await ConversationService.saveOutgoingMessage({
                contact_id,
                sender_id: 'system',
                receiver_id: sender_id,
                message_content: "✅ Your account has been created successfully! Let's continue with your subscription setup.",
                message_type: 'text',
                status: 'sent',
                thread_id,
                contact_name: contact?.name,
                contact_phone: contact?.phone_no,
                contact_wa_id: contact?.wa_id,
                structured_data: JSON.stringify(structuredData)
              });
              
            } catch (error) {
              console.error("❌ API Error:", error);
              
              // Check if user already exists
              if (error?.response?.data?.message === 'User Already Exist.' || 
                  error?.response?.data?.message?.includes('already exist') ||
                  error?.response?.data?.message?.includes('User Already Exist')) {
                console.log("ℹ️ User already exists, continuing with flow");
                
                // Mark user as created to prevent duplicate creation
                structuredData.user_created = true;
                
                // Skip the "Your information is already in our system!" message
                // Just continue with the flow without sending any message
                console.log("✅ User already exists, skipping duplicate message");
              } else {
                console.error("❌ Failed to create user in Dortibox API:", error);
                
                // Send failure message
                await sendTextMsg(sender_id, "❌ Failed to store your information. Please try again or contact support.");
                
                // Save the failure message
                await ConversationService.saveOutgoingMessage({
                  contact_id,
                  sender_id: 'system',
                  receiver_id: sender_id,
                  message_content: "❌ Failed to store your information. Please try again or contact support.",
                  message_type: 'text',
                  status: 'sent',
                  thread_id,
                  contact_name: contact?.name,
                  contact_phone: contact?.phone_no,
                  contact_wa_id: contact?.wa_id,
                  structured_data: JSON.stringify(structuredData)
                });
                
                // Return early to stop the flow
                return res.status(200).json({ success: true });
              }
          }
        }

        // Check if user wants subscription and has address
        const hasAddress = structuredData && structuredData.address;
        const wantsSubscription = structuredData && structuredData.wants_subscription === true;
        const hasBinSize = structuredData && structuredData.bin_size;
        const hasFrequency = structuredData && structuredData.frequency;
        const hasPickupDays = structuredData && structuredData.pickup_days && Array.isArray(structuredData.pickup_days) && structuredData.pickup_days.length > 0;
        const hasBigPurchase = structuredData && structuredData.big_purchase !== null;
        
        // Check if all required information is collected (different paths for subscribers vs non-subscribers)
        const isCompleteForNonSubscriber = structuredData && 
          structuredData.fullname && 
          structuredData.block && 
          structuredData.ward_number && 
          structuredData.property_type && 
          structuredData.address && 
          structuredData.wants_subscription === false &&
          structuredData.free_time;

        const isCompleteForSubscriber = structuredData && 
          structuredData.fullname && 
          structuredData.block && 
          structuredData.ward_number && 
          structuredData.property_type && 
          structuredData.address && 
          structuredData.wants_subscription === true &&
          structuredData.bin_size &&
          structuredData.frequency &&
          hasPickupDays &&
          structuredData.big_purchase !== null;

        // Handle subscription flow progression
        if (hasAddress && structuredData.wants_subscription === true && !hasBinSize) {
          // User wants subscription but hasn't selected bin size yet
          console.log("🎯 User wants subscription, sending bin size template");
          await sendBinSizeTemplate(sender_id);
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "Great! Let me help you choose the right bin size for your needs.",
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(structuredData)
          });
          
          return res.status(200).json({ success: true });
        }

        // Handle frequency selection
        if (hasBinSize && !hasFrequency) {
          console.log("🎯 User selected bin size, sending frequency template");
          await sendFrequencyTemplate(sender_id);
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "Perfect! Now let's set up your pickup schedule.",
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(structuredData)
          });
          
          return res.status(200).json({ success: true });
        }

        // Handle pickup days selection
        if (hasFrequency && !hasPickupDays) {
          console.log("🎯 User selected frequency, sending pickup days template");
          await sendPickupDaysTemplate(sender_id);
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "Great! Now select your preferred pickup days.",
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(structuredData)
          });
          
          return res.status(200).json({ success: true });
        }

        // Handle big purchase decision
        if (hasPickupDays && structuredData.big_purchase === null) {
          console.log("🎯 User selected pickup days, sending big purchase template");
          await sendBigPurchaseTemplate(sender_id);
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "Excellent! One final question about additional services.",
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(structuredData)
          });
          
          return res.status(200).json({ success: true });
        }

        // Handle final completion for non-subscribers
        if (isCompleteForNonSubscriber) {
          const summaryMessage = `📋 Here's your information:

👤 Full Name: ${structuredData.fullname}
🏘️ Block: ${structuredData.block}
📍 Ward Number: ${structuredData.ward_number}
🏠 Property Type: ${structuredData.property_type}
🏡 Address: ${structuredData.address}
📞 Callback Time: ${structuredData.free_time}

Our team will reach out to you soon! 😊`;
          
          await sendTextMsg(sender_id, summaryMessage);
          console.log("📋 Final summary sent for non-subscriber");
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: summaryMessage,
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(structuredData)
          });
          
          return res.status(200).json({ success: true });
        }

        // Handle final completion for subscribers
        if (isCompleteForSubscriber) {
          const pickupDaysText = structuredData.pickup_days.join(', ');
          const bigPurchaseText = structuredData.big_purchase ? 'Yes' : 'No';
          
          const summaryMessage = `📋 Here's your subscription details:

👤 Full Name: ${structuredData.fullname}
🏘️ Block: ${structuredData.block}
📍 Ward Number: ${structuredData.ward_number}
🏠 Property Type: ${structuredData.property_type}
🏡 Address: ${structuredData.address}
🗑️ Bin Size: ${structuredData.bin_size}
📅 Frequency: ${structuredData.frequency}
📆 Pickup Days: ${pickupDaysText}
🛒 Additional Services: ${bigPurchaseText}

Your subscription is confirmed! Our team will contact you soon. 😊`;
          
          await sendTextMsg(sender_id, summaryMessage);
          console.log("📋 Final summary sent for subscriber");
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: summaryMessage,
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(structuredData)
          });
          
          return res.status(200).json({ success: true });
        }

        // Send normal response for incomplete information
        const response = await sendTextMsg(sender_id, responseMessage);
        console.log("📤 Response sent:", response);
        
        // Save outgoing message to database
        try {
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system', // or your agent ID
            receiver_id: sender_id,
            message_content: responseMessage,
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: structuredData ? JSON.stringify(structuredData) : null
          });
          console.log("💾 AI response saved to database with structured data");
        } catch (dbError) {
          console.error("❌ Error saving outgoing message:", dbError.message);
        }
        
      } else {
        console.warn("⚠️ Empty text message received.");
      }
    }

    // Handle interactive messages (all template selections)
    if (type === "interactive") {
      const interactiveData = message?.interactive;
      
      if (interactiveData?.type === "list_reply") {
        const selectedOption = interactiveData.list_reply;
        console.log("🎯 User selected option:", selectedOption);
        
        // Get conversation context to update with selection
        const lastMessages = await ConversationService.getLastMessages(contact_id, 10);
        
        // Find the last structured data
        let lastKnownDetails = null;
        for (let i = lastMessages.length - 1; i >= 0; i--) {
          if (lastMessages[i].sender_type === 'agent' && lastMessages[i].details) {
            lastKnownDetails = lastMessages[i].details;
            break;
          }
        }
        
        // Determine what was selected based on the option ID
        let updatedStructuredData = { ...lastKnownDetails };
        
        if (selectedOption.id.startsWith('68')) {
          // Bin size selection - new format with actual IDs
          updatedStructuredData.bin_size = selectedOption.id;
          updatedStructuredData.bin_size_id = selectedOption.id;
          console.log("📊 Updated with bin size ID:", selectedOption.id);
          console.log("📊 Bin size title:", selectedOption.title);
          
          // Send frequency template next
          await sendFrequencyTemplate(sender_id);
          
        } else if (selectedOption.id.includes('per_week') || selectedOption.id === 'daily') {
          // Frequency selection
          updatedStructuredData.frequency = selectedOption.id;
          console.log("📊 Updated with frequency:", selectedOption.id);
          
          // Send pickup days template next
          await sendPickupDaysTemplate(sender_id);
          
        } else if (['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].includes(selectedOption.id)) {
          // Pickup day selection - store days and ask for big purchase
          const selectedDay = selectedOption.id;
          const additionalDays = getAdditionalPickupDays(selectedDay);
          updatedStructuredData.pickup_days = additionalDays;
          console.log("📊 Updated pickup days:", additionalDays);
          
          // Save the pickup day selection
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: `Selected pickup day: ${selectedOption.title}`,
            message_type: 'template',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
          
          // Send big purchase template next
          await sendBigPurchaseTemplate(sender_id);
          
          // Save the big purchase message
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "🛒 Would you like to purchase additional waste management services or products?",
            message_type: 'template',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
          
          return res.status(200).json({ success: true });
        } else if (['429', '430', '431', '432', '433', '434'].includes(selectedOption.id)) {
          // Ward number selection
          updatedStructuredData.ward_number = selectedOption.id;
          console.log("📊 Updated ward number:", selectedOption.id);
          
          // Save the ward number selection
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: `Selected ward: ${selectedOption.title}`,
            message_type: 'template',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
          
          // Send property type template next
          await sendPropertyTypeTemplate(sender_id);
          
          return res.status(200).json({ success: true });
        } else if (['domestic', 'commercial', 'institutional'].includes(selectedOption.id)) {
          // Property type selection
          updatedStructuredData.property_type = selectedOption.id;
          console.log("📊 Updated property type:", selectedOption.id);
          
          // Save the property type selection
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: `Selected property type: ${selectedOption.title}`,
            message_type: 'template',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
          
          // Send AI message to continue the flow
          await sendTextMsg(sender_id, "Thanks! Please share your complete address or nearby landmark.");
          
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "Thanks! Please share your complete address or nearby landmark.",
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
          
          return res.status(200).json({ success: true });
        } else if (selectedOption.id.startsWith('pricing_')) {
          // Pricing plan selection
          const planId = selectedOption.id.replace('pricing_', '');
          const selectedPlan = updatedStructuredData.pricing_options?.find(plan => plan._id === planId);
          
          if (selectedPlan) {
            updatedStructuredData.selected_plan = selectedPlan;
            updatedStructuredData.selected_plan_id = planId;
            console.log("📊 Updated with selected plan:", selectedPlan.name);
            
            // Save the pricing plan selection
            await ConversationService.saveOutgoingMessage({
              contact_id,
              sender_id: 'system',
              receiver_id: sender_id,
              message_content: `Selected pricing plan: ${selectedPlan.name}`,
              message_type: 'template',
              status: 'sent',
              thread_id,
              contact_name: contact?.name,
              contact_phone: contact?.phone_no,
              contact_wa_id: contact?.wa_id,
              structured_data: JSON.stringify(updatedStructuredData)
            });
            
            // Send payment mode template
            await sendPaymentModeTemplate(sender_id);
            
            // Save the payment mode message
            await ConversationService.saveOutgoingMessage({
              contact_id,
              sender_id: 'system',
              receiver_id: sender_id,
              message_content: "💳 Please select your preferred payment method from the options above.",
              message_type: 'template',
              status: 'sent',
              thread_id,
              contact_name: contact?.name,
              contact_phone: contact?.phone_no,
              contact_wa_id: contact?.wa_id,
              structured_data: JSON.stringify(updatedStructuredData)
            });
          }
          
          return res.status(200).json({ success: true });
        }
        
        // Save the updated data
        await ConversationService.saveOutgoingMessage({
          contact_id,
          sender_id: 'system',
          receiver_id: sender_id,
          message_content: `Selected: ${selectedOption.title}`,
          message_type: 'interactive',
          status: 'sent',
          thread_id,
          contact_name: contact?.name,
          contact_phone: contact?.phone_no,
          contact_wa_id: contact?.wa_id,
          structured_data: JSON.stringify(updatedStructuredData)
        });
        
      } else if (interactiveData?.type === "button_reply") {
        // Handle button replies (big purchase yes/no, payment mode)
        const buttonReply = interactiveData.button_reply;
        console.log("🎯 User clicked button:", buttonReply);
        
        // Get conversation context
        const lastMessages = await ConversationService.getLastMessages(contact_id, 10);
        let lastKnownDetails = null;
        for (let i = lastMessages.length - 1; i >= 0; i--) {
          if (lastMessages[i].sender_type === 'agent' && lastMessages[i].details) {
            lastKnownDetails = lastMessages[i].details;
            break;
          }
        }
        
        const updatedStructuredData = { ...lastKnownDetails };
        
        if (buttonReply.id === 'big_purchase_yes' || buttonReply.id === 'big_purchase_no') {
          // Handle big purchase decision
          updatedStructuredData.big_purchase = buttonReply.id === 'big_purchase_yes';
          console.log("📊 Updated with big purchase decision:", updatedStructuredData.big_purchase);
          
          // Save the big purchase decision
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: `Big Purchase: ${updatedStructuredData.big_purchase ? 'Yes' : 'No'}`,
            message_type: 'template',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
          
          try {
            // Call frequency-with-price API
            const binSizeId = "68ad2f1c75c595c6aa920445"; // Default bin size ID as mentioned
            const pricingData = await fetchFrequencyWithPrice(updatedStructuredData.pickup_days, binSizeId);
            
            // Store pricing data in structured data
            updatedStructuredData.pricing_options = pricingData;
            updatedStructuredData.bin_size_id = binSizeId;
            
            // Send pricing options template
            await sendPricingOptionsTemplate(sender_id, pricingData);
            
            // Save the pricing options message
            await ConversationService.saveOutgoingMessage({
              contact_id,
              sender_id: 'system',
              receiver_id: sender_id,
              message_content: "💰 Please select your preferred pricing plan from the options above.",
              message_type: 'template',
              status: 'sent',
              thread_id,
              contact_name: contact?.name,
              contact_phone: contact?.phone_no,
              contact_wa_id: contact?.wa_id,
              structured_data: JSON.stringify(updatedStructuredData)
            });
            
          } catch (error) {
            console.error("❌ Error fetching pricing options:", error);
            await sendTextMsg(sender_id, "❌ Sorry, there was an error fetching pricing options. Please try again.");
          }
        } else if (buttonReply.id === 'payment_bank_transfer' || buttonReply.id === 'payment_cheque') {
          // Handle payment mode selection
          updatedStructuredData.payment_method = buttonReply.id === 'payment_bank_transfer' ? 'Bank Transfer' : 'Cheque';
          console.log("📊 Updated with payment method:", updatedStructuredData.payment_method);
          
          // Save the payment method selection
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: `Selected payment method: ${updatedStructuredData.payment_method}`,
            message_type: 'template',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
          
          // Ask for payment transaction ID
          await askForPaymentTxId(sender_id);
          
          // Save the payment transaction ID request
          await ConversationService.saveOutgoingMessage({
            contact_id,
            sender_id: 'system',
            receiver_id: sender_id,
            message_content: "📝 Please provide your payment transaction ID:",
            message_type: 'text',
            status: 'sent',
            thread_id,
            contact_name: contact?.name,
            contact_phone: contact?.phone_no,
            contact_wa_id: contact?.wa_id,
            structured_data: JSON.stringify(updatedStructuredData)
          });
        }
      }
    }

    // if (type === "order") {
    //   const product_items = message?.order?.product_items || [];
    //   console.log("🛒 Order received:", product_items);
    // }

    console.log("📌 Status:", status);

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
    });
  } catch (error) {
    console.error("❌ Webhook error:", error.message);

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
    } else {
      console.error("Stack:", error.stack);
    }

    res.status(error?.response?.status || 500).json({
      success: false,
      message: error?.response?.data?.message || error.message || "Internal Server Error",
    });
  }
});

export { webhook };
