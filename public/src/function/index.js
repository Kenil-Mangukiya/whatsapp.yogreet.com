import axios from "axios"; 
import { Conversation } from "../db/models/index.js";

// Global token storage
let dortiboxToken = process.env.DORTIBOX_AUTH_TOKEN;

// Function to login and get new token
const loginToDortibox = async () => {
  try {
    console.log("🔐 Logging into Dortibox API...");
    
    const options = {
      method: "POST",
      url: "https://dev-api.dortibox.com/admin/login",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      data: {
        email: "chirag@admin.com",
        password: "123456"
      }
    };

    const { data } = await axios.request(options);
    
    if (data.success && data.token) {
      dortiboxToken = data.token;
      console.log("✅ New token obtained successfully");
      console.log("🔑 Token:", dortiboxToken.substring(0, 20) + "...");
      return dortiboxToken;
    } else {
      throw new Error("Login failed - no token received");
    }
  } catch (error) {
    console.log("❌ Login error:", error?.response?.data || error?.message);
    throw error;
  }
};

// Function to make Dortibox API calls with automatic token refresh
const makeDortiboxApiCall = async (apiCall) => {
  try {
    // First attempt with current token
    return await apiCall(dortiboxToken);
  } catch (error) {
    if (error?.response?.status === 401) {
      console.log("🔄 Token expired, refreshing...");
      try {
        // Get new token
        await loginToDortibox();
        // Retry the API call with new token
        return await apiCall(dortiboxToken);
      } catch (refreshError) {
        console.log("❌ Token refresh failed:", refreshError?.message);
        throw refreshError;
      }
    } else {
      throw error;
    }
  }
};

const sendTextMsg = async (from, text) => {
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${process.env.FBWA_URL}/send-message`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, application/xml",
      Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
    },
    data: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: from,
      type: "text",
      text: {
        body: text
      },
    },
  };

  axios(config)
    .then(function (response) {
      //console.log(JSON.stringify(response.data));
    })
    .catch(function (error) {
      console.log(error);
    });
};

const markAsRead = async (msgId) => {
  var config = {
    method: "post",
    maxBodyLength: Infinity,
    url: `${process.env.FBWA_URL}/mark-read`,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, application/xml",
      Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
    },
    data: {
      "messaging_product": "whatsapp",
      "status": "read",
      "message_id": msgId
    }
  };
    

  axios(config)
    .then(function (response) {
      console.log({response});
    })
    .catch(function (error) {
      console.log(error);
    });
}

const sendFlowTemp = async (from, name) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "template",
        template: {
          name: name,
          language: {
            code: "en",
          },
          components: [
            {
              type: "button",
              sub_type: "flow",
              index: "0",
            },
          ],
        },
      },
    };

    const { data } = await axios.request(options);
  } catch (error) {
    console.log({ error: error?.message });
  }
};

const sendTemp = async (from, name) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "template",
        template: {
          name: name,
          language: {
            code: "en_US",
          },
        },
      },
    };

    const { data } = await axios.request(options);

    console.log(data);
  } catch (error) {
    console.log({ error: error });
  }
};

const sendTempImage = async (from, name, image) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "template",
        template: {
          name: name,
          language: {
            code: "en_US",
          },
          components: [
            {
              type: "HEADER",
              parameters: [
                {
                  type: "IMAGE",
                  image: {
                    link: image,
                  },
                },
              ],
            },
          ],
        },
      },
    };

    const { data } = await axios.request(options);

    console.log(data);
  } catch (error) {
    console.log({ error: JSON.stringify(error) });
  }
};

const orderNoGen = async () => {
  const orderData = await Conversation.findOne({ order: [["id", "DESC"]] });
  if (orderData) {
    const last_order = orderData?.message_content;
    const last = parseInt(last_order.match(/\d+/)[0], 10);
    const next = last + 1;
    const paddedNumber = String(next).padStart(7, "0");
    return `ORD${paddedNumber}`;
  }
  return `ORD0000001`;
};

const invoiceNoGen = async () => {
  const invoice = await Conversation.findOne({ order: [["id", "DESC"]] });
  if (invoice) {
    const last_invoice = invoice?.message_content;
    const last = parseInt(last_invoice.match(/\d+/)[0], 10);
    const next = last + 1;
    const paddedNumber = String(next).padStart(7, "0");
    return `INV${paddedNumber}`;
  }
  return `INV0000001`;
};

const sendBinSizeTemplate = async (from) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: "🗑️ Please select your preferred waste bin size"
          },
          action: {
            button: "Select Bin Size",
            sections: [
              {
                title: "Waste Bin Sizes",
                rows: [
                  {
                    id: "68353e33273b70bcd6fe82b7",
                    title: "300 Ltr",
                    description: "300 Liter bin"
                  },
                  {
                    id: "68353e72273b70bcd6fe82bb",
                    title: "1000 Ltr",
                    description: "1000 Liter bin"
                  },
                  {
                    id: "686ccd0b2b9930cde0a06eb2",
                    title: "500 Ltr",
                    description: "500 Liter bin"
                  },
                  {
                    id: "68ad2ec575c595c6aa920425",
                    title: "120 Ltr",
                    description: "120 Liter bin"
                  },
                  {
                    id: "68ad2edc75c595c6aa92042d",
                    title: "25 KG",
                    description: "25 KG bin"
                  },
                  {
                    id: "68ad2ef475c595c6aa920435",
                    title: "50 KG",
                    description: "50 KG bin"
                  },
                  {
                    id: "68ad2f0975c595c6aa92043d",
                    title: "50 Ltr",
                    description: "50 Liter bin"
                  }
                ]
              }
            ]
          }
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Bin size template sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

const sendFrequencyTemplate = async (from) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: "📅 How often would you like waste pickup?"
          },
          action: {
            button: "Select Frequency",
            sections: [
              {
                title: "Pickup Frequency",
                rows: [
                  {
                    id: "1x_per_week",
                    title: "1x per week",
                    description: "Weekly pickup"
                  },
                  {
                    id: "2x_per_week",
                    title: "2x per week",
                    description: "Twice weekly"
                  },
                  {
                    id: "3x_per_week",
                    title: "3x per week",
                    description: "Three times weekly"
                  },
                  {
                    id: "5x_per_week",
                    title: "5x per week",
                    description: "Weekdays only"
                  },
                  {
                    id: "daily",
                    title: "Daily (6x per week)",
                    description: "Every day except Sunday"
                  }
                ]
              }
            ]
          }
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Frequency template sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

const sendPickupDaysTemplate = async (from) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: "📅 Choose your pickup day"
          },
          action: {
            button: "Select Days",
            sections: [
              {
                title: "Pickup Days",
                rows: [
                  {
                    id: "monday",
                    title: "Monday",
                    description: "Weekly pickup on Monday"
                  },
                  {
                    id: "tuesday",
                    title: "Tuesday",
                    description: "Weekly pickup on Tuesday"
                  },
                  {
                    id: "wednesday",
                    title: "Wednesday",
                    description: "Weekly pickup on Wednesday"
                  },
                  {
                    id: "thursday",
                    title: "Thursday",
                    description: "Weekly pickup on Thursday"
                  },
                  {
                    id: "friday",
                    title: "Friday",
                    description: "Weekly pickup on Friday"
                  },
                  {
                    id: "saturday",
                    title: "Saturday",
                    description: "Weekly pickup on Saturday"
                  }
                ]
              }
            ]
          }
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Pickup days template sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

const sendBigPurchaseTemplate = async (from) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: "Big Purchase?"
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: "big_purchase_yes",
                  title: "Yes"
                }
              },
              {
                type: "reply", 
                reply: {
                  id: "big_purchase_no",
                  title: "No"
                }
              }
            ]
          }
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Big Purchase? template sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

const fetchWards = async (blockId) => {
  try {
    const apiCall = async (token) => {
      const options = {
        method: "GET",
        url: `https://dev-api.dortibox.com/block/${blockId}/ward`,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `${token}`
        }
      };

      return await axios.request(options);
    };

    const response = await makeDortiboxApiCall(apiCall);
    console.log("✅ Wards fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

const fetchBlocks = async () => {
  try {
    const apiCall = async (token) => {
      const options = {
        method: "GET",
        url: "https://dev-api.dortibox.com/get/block?isViewOnly=true",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `${token}`
        }
      };

      return await axios.request(options);
    };

    const response = await makeDortiboxApiCall(apiCall);
    console.log("✅ Blocks fetched successfully:", response.data);
    return response.data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

const createUser = async (userData) => {
  try {
    // Generate random 4-digit number
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    const userNumber = `USR${randomNumber}`;
    
    const apiCall = async (token) => {
      const options = {
        method: "POST",
        url: "https://dev-api.dortibox.com/admin/user/create",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `${token}`
        },
        data: {
          countryCode: userData.countryCode || "+232",
          mobile: userData.mobile,
          password: "1234",
          userName: userData.userName,
          ward: userData.ward,
          block: userData.block,
          houseNumber: userData.houseNumber,
          propertyType: userData.propertyType
        }
      };

      return await axios.request(options);
    };

    const response = await makeDortiboxApiCall(apiCall);
    console.log("✅ User created successfully:", response.data);
    console.log("🔢 Generated user number:", userNumber);
    return response.data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

const sendWardNumberTemplate = async (from) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: "📍 Select your ward number:"
          },
          action: {
            button: "Select Ward",
            sections: [
              {
                title: "Ward Numbers",
                rows: [
                  {
                    id: "429",
                    title: "Ward 429"
                  },
                  {
                    id: "430",
                    title: "Ward 430"
                  },
                  {
                    id: "431",
                    title: "Ward 431"
                  },
                  {
                    id: "432",
                    title: "Ward 432"
                  },
                  {
                    id: "433",
                    title: "Ward 433"
                  },
                  {
                    id: "434",
                    title: "Ward 434"
                  }
                ]
              }
            ]
          }
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Ward number template sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

const sendPropertyTypeTemplate = async (from) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: "🏠 Select your property type:"
          },
          action: {
            button: "Select Property",
            sections: [
              {
                title: "Property Types",
                rows: [
                  {
                    id: "domestic",
                    title: "Domestic"
                  },
                  {
                    id: "commercial",
                    title: "Commercial"
                  },
                  {
                    id: "institutional",
                    title: "Institutional"
                  }
                ]
              }
            ]
          }
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Property type template sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

// Function to get additional pickup days
const getAdditionalPickupDays = (selectedDay) => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayMap = {
    'monday': 'Mon',
    'tuesday': 'Tue', 
    'wednesday': 'Wed',
    'thursday': 'Thu',
    'friday': 'Fri',
    'saturday': 'Sat',
    'sunday': 'Sun'
  };
  
  const selectedDayShort = dayMap[selectedDay.toLowerCase()];
  const selectedIndex = days.indexOf(selectedDayShort);
  
  // Get two additional days (one before and one after)
  const additionalDays = [];
  for (let i = 1; i <= 2; i++) {
    const prevIndex = (selectedIndex - i + 7) % 7;
    const nextIndex = (selectedIndex + i) % 7;
    
    if (i === 1) {
      additionalDays.push(days[prevIndex]);
    } else {
      additionalDays.push(days[nextIndex]);
    }
  }
  
  return [selectedDayShort, ...additionalDays];
};

// Function to fetch user list from Dortibox API
const fetchUserList = async () => {
  try {
    console.log("🚀 Calling Dortibox User List API: https://dev-api.dortibox.com/admin/user/list?type=REGULAR");
    console.log("🔑 Using Auth Token:", dortiboxToken ? "Token present" : "Token missing");

    const apiCall = async (token) => {
      const options = {
        method: "GET",
        url: "https://dev-api.dortibox.com/admin/user/list?type=REGULAR",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `${token}`
        }
      };

      return await axios.request(options);
    };

    const response = await makeDortiboxApiCall(apiCall);
    console.log("✅ User list fetched successfully from Dortibox API");
    console.log("📥 Total users found:", response.data.data?.length || 0);
    return response.data;
  } catch (error) {
    console.log("❌ Error fetching user list:");
    console.log("📥 Error response:", error?.response?.data || error?.message);
    console.log("📊 Error status:", error?.response?.status);
    throw error;
  }
};

// Function to find user by mobile from API response
const findUserByDetails = async (userName, mobile) => {
  try {
    console.log("🔍 Looking for user with mobile:", mobile);
    
    const userListResponse = await fetchUserList();
    const users = userListResponse.data || [];
    
    // Find user by matching mobile only
    const foundUser = users.find(user => 
      user.mobile && user.mobile === mobile
    );
    
    if (foundUser) {
      console.log("✅ User found:", {
        _id: foundUser._id,
        userName: foundUser.userName,
        mobile: foundUser.mobile,
        addressId: foundUser.address?.[0] || null
      });
      return {
        userId: foundUser._id,
        addressId: foundUser.address?.[0] || null,
        userData: foundUser
      };
    } else {
      console.log("❌ User not found with mobile:", mobile);
      return null;
    }
  } catch (error) {
    console.log("❌ Error finding user:", error?.message);
    throw error;
  }
};

// Function to call frequency-with-price API
const fetchFrequencyWithPrice = async (pickupDays, binSize) => {
  try {
    const payload = {
      pickupDays: pickupDays,
      binSize: binSize
    };

    console.log("🚀 Calling Dortibox API: https://dev-api.dortibox.com/get/frequency-with-price");
    console.log("📤 Payload being sent to Dortibox API:", JSON.stringify(payload, null, 2));
    console.log("🔑 Using Auth Token:", dortiboxToken ? "Token present" : "Token missing");

    const apiCall = async (token) => {
      const options = {
        method: "POST",
        url: "https://dev-api.dortibox.com/get/frequency-with-price",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `${token}`
        },
        data: payload
      };

      return await axios.request(options);
    };

    const response = await makeDortiboxApiCall(apiCall);
    console.log("✅ Frequency with price fetched successfully from Dortibox API");
    console.log("📥 Response from Dortibox API:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log("❌ Error calling Dortibox API:");
    console.log("📤 Payload that failed:", JSON.stringify({ pickupDays, binSize }, null, 2));
    console.log("🔑 Auth Token used:", dortiboxToken ? "Token present" : "Token missing");
    console.log("📥 Error response:", error?.response?.data || error?.message);
    console.log("📊 Error status:", error?.response?.status);
    console.log("📋 Error headers:", error?.response?.headers);
    throw error;
  }
};

// Function to send pricing options template
const sendPricingOptionsTemplate = async (from, pricingData) => {
  try {
    const rows = pricingData.map((option, index) => ({
      id: `pricing_${option._id}`,
      title: option.name,
      description: `${option.currency} ${option.discountedPrice}${option.discountLable ? ` (${option.discountLable} off)` : ''}`
    }));

    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "interactive",
        interactive: {
          type: "list",
          body: {
            text: "💰 Please select your preferred pricing plan:"
          },
          action: {
            button: "Select Plan",
            sections: [
              {
                title: "Pricing Plans",
                rows: rows
              }
            ]
          }
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Pricing options template sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

// Function to send payment mode template
const sendPaymentModeTemplate = async (from) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "interactive",
        interactive: {
          type: "button",
          body: {
            text: "💳 Please select your preferred payment method:"
          },
          action: {
            buttons: [
              {
                type: "reply",
                reply: {
                  id: "payment_bank_transfer",
                  title: "Bank Transfer"
                }
              },
              {
                type: "reply",
                reply: {
                  id: "payment_cheque",
                  title: "Cheque"
                }
              }
            ]
          }
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Payment mode template sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

// Function to ask for payment transaction ID
const askForPaymentTxId = async (from) => {
  try {
    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "text",
        text: {
          body: "📝 Please provide your payment transaction ID:"
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Payment transaction ID request sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

// Function to create subscription
const createSubscription = async (subscriptionData) => {
  try {
    // Extract frequencyId from pricing data if available
    const frequencyId = subscriptionData.selected_plan?._id || subscriptionData.selectedPlan?._id || subscriptionData.frequencyId;
    
    const payload = {
      addressId: subscriptionData.addressId, // Dynamic address ID from user lookup
      binSize: subscriptionData.bin_size_id || subscriptionData.binSizeId,
      frequencyId: frequencyId, // Dynamic frequency ID from pricing API
      isBinPurchase: subscriptionData.big_purchase || false, // Dynamic value from Big Purchase? template
      pickupSchedule: subscriptionData.pickup_days || subscriptionData.pickupDays,
      price: subscriptionData.selected_plan?.discountedPrice || subscriptionData.selectedPlan?.discountedPrice || 5265,
      referralCode: "",
      userId: subscriptionData.userId // Dynamic user ID from user lookup
    };

    console.log("🚀 Calling Dortibox Subscription API: https://dev-api.dortibox.com/subscription");
    console.log("📤 Subscription payload:", JSON.stringify(payload, null, 2));
    console.log("🛒 Big Purchase decision:", subscriptionData.big_purchase ? "Yes" : "No");
    console.log("🔑 Using Auth Token:", dortiboxToken ? "Token present" : "Token missing");

    const apiCall = async (token) => {
      const options = {
        method: "POST",
        url: "https://dev-api.dortibox.com/subscription",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `${token}`
        },
        data: payload
      };

      return await axios.request(options);
    };

    const response = await makeDortiboxApiCall(apiCall);
    console.log("✅ Subscription created successfully");
    console.log("📥 Subscription response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log("❌ Error creating subscription:");
    console.log("📤 Payload that failed:", JSON.stringify(subscriptionData, null, 2));
    console.log("📥 Error response:", error?.response?.data || error?.message);
    console.log("📊 Error status:", error?.response?.status);
    throw error;
  }
};

// Function to create transaction
const createTransaction = async (transactionData) => {
  try {
    const payload = {
      paymentMode: (transactionData.payment_method === 'Bank Transfer' || transactionData.paymentMethod === 'Bank Transfer') ? 'BANK_TRANSFER' : 'CHEQUE',
      paymentTxId: transactionData.payment_tx_id || transactionData.paymentTxId,
      subscriptionId: transactionData.subscriptionId,
      userId: transactionData.userId // Dynamic user ID from user lookup
    };

    console.log("🚀 Calling Dortibox Transaction API: https://dev-api.dortibox.com/create/transaction");
    console.log("📤 Transaction payload:", JSON.stringify(payload, null, 2));
    console.log("🔑 Using Auth Token:", dortiboxToken ? "Token present" : "Token missing");

    const apiCall = async (token) => {
      const options = {
        method: "POST",
        url: "https://dev-api.dortibox.com/create/transaction",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `${token}`
        },
        data: payload
      };

      return await axios.request(options);
    };

    const response = await makeDortiboxApiCall(apiCall);
    console.log("✅ Transaction created successfully");
    console.log("📥 Transaction response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log("❌ Error creating transaction:");
    console.log("📤 Payload that failed:", JSON.stringify(transactionData, null, 2));
    console.log("📥 Error response:", error?.response?.data || error?.message);
    console.log("📊 Error status:", error?.response?.status);
    throw error;
  }
};

// Function to show customer all stored details
const showCustomerDetails = async (from, customerData) => {
  try {
    const detailsText = `
📋 *Your Order Summary*

👤 *Customer Details:*
• Name: ${customerData.fullname || customerData.userName || 'N/A'}
• Mobile: ${customerData.mobile || 'N/A'}
• Property Type: ${customerData.property_type || customerData.propertyType || 'N/A'}
• Ward: ${customerData.ward_number || customerData.ward || 'N/A'}
• Block: ${customerData.block || 'N/A'}
• House Number: ${customerData.address || customerData.houseNumber || 'N/A'}

🗑️ *Service Details:*
• Bin Size: ${customerData.bin_size || customerData.binSize || 'N/A'}
• Pickup Days: ${customerData.pickup_days ? customerData.pickup_days.join(', ') : 'N/A'}
• Frequency: ${customerData.frequency || 'N/A'}

💰 *Pricing:*
• Plan: ${customerData.selected_plan?.name || customerData.selectedPlan || 'N/A'}
• Price: ${customerData.selected_plan?.discountedPrice || customerData.price || 'N/A'}
• Currency: ${customerData.selected_plan?.currency || customerData.currency || 'N/A'}

💳 *Payment:*
• Method: ${customerData.payment_method || customerData.paymentMethod || 'N/A'}
• Transaction ID: ${customerData.payment_tx_id || customerData.paymentTxId || 'N/A'}

Thank you for choosing our waste management service! 🎉
    `;

    const options = {
      method: "POST",
      url: `${process.env.FBWA_URL}/send-message`,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, application/xml",
        Authorization: `Bearer ${process.env.UPMATRIX_TOKEN}`,
      },
      data: {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: from,
        type: "text",
        text: {
          body: detailsText
        }
      }
    };

    const { data } = await axios.request(options);
    console.log("✅ Customer details sent:", data);
    return data;
  } catch (error) {
    console.log({ error: error?.response?.data || error?.message });
    throw error;
  }
};

export { sendTextMsg, markAsRead, sendFlowTemp, sendTemp, sendTempImage, orderNoGen, invoiceNoGen, sendBinSizeTemplate, sendFrequencyTemplate, sendPickupDaysTemplate, sendBigPurchaseTemplate, createUser, fetchWards, fetchBlocks, sendWardNumberTemplate, sendPropertyTypeTemplate, getAdditionalPickupDays, fetchFrequencyWithPrice, sendPricingOptionsTemplate, sendPaymentModeTemplate, askForPaymentTxId, showCustomerDetails, createSubscription, createTransaction, fetchUserList, findUserByDetails, loginToDortibox, makeDortiboxApiCall };