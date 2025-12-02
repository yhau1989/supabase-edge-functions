export interface WhatsAppWebhookBody {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        statuses?: Array<WhatsAppMessageStatus>;
        messages?: Array<WhatsAppMessage>;
      };
      field: string;
    }>;
  }>;
}

export interface WhatsAppMessageStatus {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
}

export interface MessageStatus {
  message_id: string;
  status: string;
  timestamp?: string;
  recipient_id?: string;
}
