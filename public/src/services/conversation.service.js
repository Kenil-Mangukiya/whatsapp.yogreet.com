import { Conversation } from '../db/models/index.js';
import { Op } from 'sequelize';

class ConversationService {
    /**
     * Save incoming message to database
     */
    static async saveIncomingMessage(webhookData) {
        try {
            const {
                contact_id,
                sender_id,
                receiver_id,
                whatsapp_message_id,
                type,
                message,
                status,
                thread_id,
                contact,
                is_sent_to_contact,
                is_delivered_to_contact,
                is_read_by_contact,
                is_read,
                is_failed,
                error_response,
                in_replay_to,
                reaction_emoji,
                user_reaction_emoji
            } = webhookData;

            const conversationData = {
                contact_id,
                sender_id,
                receiver_id: receiver_id,
                whatsapp_message_id,
                message_type: type,
                message_content: message?.text?.body || JSON.stringify(message),
                sender_type: 'contact',
                receiver_type: 'agent',
                status,
                thread_id,
                is_sent_to_contact: is_sent_to_contact || false,
                is_delivered_to_contact: is_delivered_to_contact || false,
                is_read_by_contact: is_read_by_contact || false,
                is_read: is_read || false,
                is_failed: is_failed || false,
                error_response,
                in_reply_to: in_replay_to,
                reaction_emoji,
                user_reaction_emoji,
                contact_name: contact?.name || null,
                contact_phone: contact?.phone_no || null,
                contact_wa_id: contact?.wa_id || null
            };

            const savedMessage = await Conversation.create(conversationData);
            console.log('✅ Message saved to database:', savedMessage.id);
            return savedMessage;
        } catch (error) {
            console.error('❌ Error saving message to database:', error);
            throw error;
        }
    }

    /**
     * Save outgoing message to database
     */
    static async saveOutgoingMessage(messageData) {
        try {
            const {
                contact_id,
                sender_id,
                receiver_id,
                message_content,
                message_type = 'text',
                status = 'sent',
                thread_id,
                contact_name,
                contact_phone,
                contact_wa_id,
                structured_data
            } = messageData;

            const conversationData = {
                contact_id,
                sender_id,
                receiver_id,
                message_type,
                message_content,
                sender_type: 'agent',
                receiver_type: 'contact',
                status,
                thread_id,
                is_sent_to_contact: true,
                is_delivered_to_contact: false,
                is_read_by_contact: false,
                is_read: true,
                is_failed: false,
                contact_name,
                contact_phone,
                contact_wa_id,
                details: structured_data ? JSON.parse(structured_data) : null
            };

            const savedMessage = await Conversation.create(conversationData);
            console.log('✅ Outgoing message saved to database:', savedMessage.id);
            return savedMessage;
        } catch (error) {
            console.error('❌ Error saving outgoing message to database:', error);
            throw error;
        }
    }

    /**
     * Check if customer has previous conversation
     */
    static async hasPreviousConversation(contact_id) {
        try {
            const conversationCount = await Conversation.count({
                where: { contact_id }
            });
            return conversationCount > 0;
        } catch (error) {
            console.error('❌ Error checking previous conversation:', error);
            return false;
        }
    }

    /**
     * Check if user has been created in Dortibox API
     */
    static async hasUserBeenCreated(contact_id) {
        try {
            const userCreatedMessage = await Conversation.findOne({
                where: { 
                    contact_id,
                    message_content: {
                        [Op.like]: '%User created successfully%'
                    }
                }
            });
            return !!userCreatedMessage;
        } catch (error) {
            console.error('❌ Error checking if user was created:', error);
            return false;
        }
    }

    /**
     * Get last 5 messages for a contact
     */
    static async getLastMessages(contact_id, limit = 5) {
        try {
            const messages = await Conversation.findAll({
                where: { contact_id },
                order: [['created_at', 'DESC']],
                limit,
                attributes: [
                    'id',
                    'message_type',
                    'message_content',
                    'sender_type',
                    'receiver_type',
                    'status',
                    'created_at',
                    'details'
                ]
            });
            return messages.reverse(); // Return in chronological order
        } catch (error) {
            console.error('❌ Error fetching last messages:', error);
            return [];
        }
    }

    /**
     * Get conversation context for a contact
     */
    static async getConversationContext(contact_id) {
        try {
            const hasPrevious = await this.hasPreviousConversation(contact_id);
            const lastMessages = await this.getLastMessages(contact_id, 5);
            
            return {
                hasPreviousConversation: hasPrevious,
                lastMessages,
                messageCount: lastMessages.length
            };
        } catch (error) {
            console.error('❌ Error getting conversation context:', error);
            return {
                hasPreviousConversation: false,
                lastMessages: [],
                messageCount: 0
            };
        }
    }

    /**
     * Get conversation summary for a contact
     */
    static async getConversationSummary(contact_id) {
        try {
            const context = await this.getConversationContext(contact_id);
            
            if (!context.hasPreviousConversation) {
                return "This is a new customer. No previous conversation history.";
            }

            const summary = context.lastMessages.map(msg => {
                const sender = msg.sender_type === 'contact' ? 'Customer' : 'Agent';
                const timestamp = new Date(msg.created_at).toLocaleString();
                return `${sender} (${timestamp}): ${msg.message_content}`;
            }).join('\n');

            return `Previous conversation context:\n${summary}`;
        } catch (error) {
            console.error('❌ Error getting conversation summary:', error);
            return "Unable to retrieve conversation history.";
        }
    }
}

export default ConversationService;
