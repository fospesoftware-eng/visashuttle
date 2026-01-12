import { useState } from "react";
import { Send, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CustomerLayout } from "@/components/layouts/customer-layout";

const initialMessages = [
  { id: "1", sender: "agency", senderName: "Agent Sarah", content: "Hello John! Welcome to Visa Shuttle. I'll be helping you with your Schengen visa application.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48) },
  { id: "2", sender: "customer", content: "Thank you! I've uploaded my passport. What else do I need?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 47) },
  { id: "3", sender: "agency", senderName: "Agent Sarah", content: "Great! Your passport looks good. You'll also need to upload:\n\n- Passport-sized photo (35x45mm)\n- Bank statements for the last 3 months\n- Flight reservation\n- Hotel booking\n- Travel insurance\n\nLet me know if you have any questions!", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 46) },
  { id: "4", sender: "customer", content: "I've uploaded my photo. Is it okay?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24) },
  { id: "5", sender: "agency", senderName: "Agent Sarah", content: "Yes, your photo has been approved! It meets all the biometric requirements for Schengen visas. You can now proceed with uploading your bank statement.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 23) },
  { id: "6", sender: "agency", senderName: "Agent Sarah", content: "I noticed your flight itinerary upload was rejected because the document was blurry. Please upload a clearer version when you can.", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2) },
];

export default function CustomerMessagesPage() {
  const [messages, setMessages] = useState(initialMessages);
  const [newMessage, setNewMessage] = useState("");

  const handleSend = () => {
    if (newMessage.trim()) {
      setMessages([...messages, {
        id: Date.now().toString(),
        sender: "customer",
        content: newMessage,
        timestamp: new Date()
      }]);
      setNewMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    return date.toLocaleDateString();
  };

  return (
    <CustomerLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-7rem)] max-w-4xl mx-auto">
        <div className="px-4 py-3 border-b bg-card">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary/10 text-primary">SA</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">Agent Sarah</p>
              <p className="text-xs text-muted-foreground">Your visa consultant</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, index) => {
            const showDate = index === 0 || 
              new Date(messages[index - 1].timestamp).toDateString() !== new Date(msg.timestamp).toDateString();
            
            return (
              <div key={msg.id}>
                {showDate && (
                  <div className="flex justify-center my-4">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {new Date(msg.timestamp).toLocaleDateString([], { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
                <div 
                  className={`flex gap-3 ${msg.sender === "customer" ? "justify-end" : ""}`}
                  data-testid={`message-${msg.id}`}
                >
                  {msg.sender === "agency" && (
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">SA</AvatarFallback>
                    </Avatar>
                  )}
                  <div className={`max-w-[80%] ${msg.sender === "customer" ? "order-first" : ""}`}>
                    <div 
                      className={`p-3 rounded-lg ${
                        msg.sender === "customer" 
                          ? "bg-primary text-primary-foreground rounded-br-sm" 
                          : "bg-card border rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    <p className={`text-xs text-muted-foreground mt-1 ${msg.sender === "customer" ? "text-right" : ""}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t bg-background">
          <div className="flex gap-2 items-end">
            <Button variant="ghost" size="icon" className="flex-shrink-0" data-testid="button-attach">
              <Paperclip className="w-5 h-5" />
            </Button>
            <Textarea
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              className="min-h-[44px] max-h-32 resize-none"
              data-testid="input-message"
            />
            <Button 
              size="icon" 
              onClick={handleSend}
              disabled={!newMessage.trim()}
              data-testid="button-send"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
