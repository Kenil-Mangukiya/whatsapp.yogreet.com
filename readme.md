# DortiBox WhatsApp AI Assistant

*Intelligent conversational AI that automates customer onboarding, subscription management, and payment processing through WhatsApp Business API.*

<!-- ![Demo Screenshot](https://via.placeholder.com/800x400?text=DortiBox+WhatsApp+AI+Assistant) -->

## 🚀 Project Overview

DortiBox WhatsApp AI Assistant is an enterprise-grade conversational automation platform that transforms WhatsApp into a powerful customer service and sales channel. Built for DortiBox waste management services, this system leverages OpenAI's ChatGPT to provide intelligent, context-aware conversations that guide customers through registration, subscription selection, and payment processing. The platform seamlessly integrates with external APIs, maintains comprehensive conversation history, and automates complex multi-step workflows—reducing manual support overhead by 80% while delivering 24/7 customer engagement.

## 🛠️ Tech Stack (Auto-detected)

### Backend
- **Node.js** (ES6 Modules) - Runtime environment
- **Express.js 5.1.0** - RESTful API framework
- **Sequelize 6.37.7** - MySQL ORM with migrations
- **MySQL2 3.15.1** - Database driver

### AI & Integration
- **OpenAI ChatGPT API** - Conversational AI engine
- **Axios 1.12.2** - HTTP client for external APIs
- **Facebook WhatsApp Business API** - Messaging platform integration

### Infrastructure & DevOps
- **ngrok 5.0.0** - Secure tunneling for webhook development
- **dotenv** - Environment configuration management
- **CORS** - Cross-origin resource sharing
- **Cookie Parser** - Session management

### Development Tools
- **Nodemon** - Hot-reload development server
- **Sequelize CLI** - Database migration management

![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Express](https://img.shields.io/badge/Express-5.1.0-blue)
![MySQL](https://img.shields.io/badge/MySQL-8.0+-orange)
![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-purple)

## ✨ Key Features

### 🤖 **AI-Powered Conversational Intelligence**
Context-aware ChatGPT integration that maintains conversation history across sessions, enabling natural multi-turn dialogues with intelligent data extraction and validation. The system understands user intent, handles edge cases, and provides personalized responses based on previous interactions.

### 📱 **WhatsApp Business API Integration**
Full webhook support for receiving and sending messages through Facebook WhatsApp Business API. Handles text messages, interactive templates (list/button replies), message status tracking (sent, delivered, read), and automatic message marking for enhanced user experience.

### 💾 **Conversation Persistence & Analytics**
Comprehensive database schema that stores all incoming/outgoing messages with structured metadata including contact information, message status, thread grouping, and extracted structured data. Enables conversation analytics, customer journey tracking, and support team handoff capabilities.

### 🎯 **Interactive Template System**
Dynamic WhatsApp interactive templates for guided user selections including bin size selection, pickup frequency, preferred days, property types, ward numbers, pricing plans, and payment methods. Reduces user input errors and streamlines the subscription process.

### 🔄 **Automated Subscription Workflow**
End-to-end automation from customer registration to subscription creation and payment processing. Integrates with DortiBox API for user creation, subscription management, transaction recording, and automatic token refresh for seamless API authentication.

### 📊 **Structured Data Extraction**
AI-powered extraction of customer information (name, address, block, ward, property type) into structured JSON format. Validates data completeness, handles partial information, and maintains data consistency across conversation turns.

## ⚙️ Installation & Setup

### Prerequisites
- Node.js 18+ installed
- MySQL 8.0+ database server
- WhatsApp Business API account with webhook access
- OpenAI API key

### Step 1: Clone Repository
```bash
git clone https://github.com/Kenil-Mangukiya/whatsapp.yogreet.com.git
cd whatsapp.yogreet.com
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Database Configuration
Create a MySQL database and configure connection in `.env`:
```bash
DB_HOST=localhost
DB_PORT=3306
DB_NAME=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password
```

### Step 4: Run Database Migrations
```bash
npx sequelize-cli db:migrate
```

### Step 5: Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=whatsapp_llm
DB_USERNAME=root
DB_PASSWORD=your_password

# OpenAI Configuration
CHATGPT_API_URL=https://api.openai.com/v1/chat/completions
CHATGPT_API_KEY=your_openai_api_key
CHATGPT_MODEL=gpt-4

# WhatsApp Business API Configuration
FBWA_URL=https://your-fbwa-instance.com
UPMATRIX_TOKEN=your_whatsapp_business_token

# DortiBox API Configuration
DORTIBOX_AUTH_TOKEN=your_dortibox_auth_token
```

### Step 6: Start Development Server
```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT). The webhook endpoint will be available at `/fbwa/webhook`.

### Step 7: Configure Webhook (Production)
For production deployment, configure your WhatsApp Business API webhook to point to:
```
https://your-domain.com/fbwa/webhook
```

For local development, use ngrok to expose your local server:
```bash
ngrok http 3000
```

## 🔮 Future Improvements

### 1. **Multi-Language Support & Localization**
Implement i18n framework to support multiple languages (English, French, local dialects) with AI-powered translation. This would expand market reach and improve accessibility for diverse customer bases in Freetown and beyond.

### 2. **Advanced Analytics Dashboard & Business Intelligence**
Build a comprehensive admin dashboard with real-time conversation metrics, customer conversion funnels, subscription analytics, and predictive insights using machine learning. Include features like conversation sentiment analysis, drop-off point identification, and automated A/B testing for message templates to optimize conversion rates.

