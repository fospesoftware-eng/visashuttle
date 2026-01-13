import { useState, useEffect, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import type { Tenant, Case, Message } from "@shared/schema";

export default function WhiteLabelMessagesPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState<string>("");
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedId = sessionStorage.getItem("wl_customer_id");
    if (!storedId) {
      setLocation(`/w/${slug}/login`);
      return;
    }
    setCustomerId(storedId);

    const params = new URLSearchParams(window.location.search);
    const caseIdParam = params.get("caseId");
    if (caseIdParam) setSelectedCaseId(caseIdParam);
  }, [slug, setLocation]);

  const { data: tenant } = useQuery<Tenant>({
    queryKey: ["/api/w", slug, "tenant"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/tenant`);
      if (!res.ok) throw new Error("Agency not found");
      return res.json();
    }
  });

  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/w", slug, "portal/cases", customerId],
    queryFn: async () => {
      if (!customerId) return [];
      const res = await fetch(`/api/w/${slug}/portal/cases?customerAccountId=${customerId}`);
      if (!res.ok) throw new Error("Failed to load cases");
      return res.json();
    },
    enabled: !!customerId
  });

  useEffect(() => {
    if (cases.length > 0 && !selectedCaseId) {
      setSelectedCaseId(cases[0].id);
    }
  }, [cases, selectedCaseId]);

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/w", slug, "portal/cases", selectedCaseId, "messages"],
    queryFn: async () => {
      const res = await fetch(`/api/w/${slug}/portal/cases/${selectedCaseId}/messages`);
      if (!res.ok) throw new Error("Failed to load messages");
      return res.json();
    },
    enabled: !!selectedCaseId,
    refetchInterval: 10000 // Poll every 10 seconds
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/w/${slug}/portal/cases/${selectedCaseId}/messages`, {
        content,
        customerAccountId: customerId
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ 
        queryKey: ["/api/w", slug, "portal/cases", selectedCaseId, "messages"] 
      });
    }
  });

  const handleSend = () => {
    if (!message.trim()) return;
    sendMutation.mutate(message.trim());
  };

  const selectedCase = cases.find(c => c.id === selectedCaseId);

  if (!tenant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setLocation(`/w/${slug}/portal`)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-semibold">Messages</h1>
          {selectedCase && (
            <p className="text-sm text-muted-foreground">{selectedCase.referenceId}</p>
          )}
        </div>
      </header>

      {cases.length > 1 && (
        <div className="border-b px-4 py-2 flex gap-2 overflow-x-auto">
          {cases.map((c) => (
            <Button
              key={c.id}
              variant={selectedCaseId === c.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCaseId(c.id)}
              style={selectedCaseId === c.id ? { backgroundColor: tenant.primaryColor || undefined } : undefined}
            >
              {c.referenceId}
            </Button>
          ))}
        </div>
      )}

      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="max-w-xl mx-auto space-y-4">
          {messagesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No messages yet</p>
              <p className="text-sm">Start a conversation with your agent</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isCustomer = msg.senderRole === "customer";
              return (
                <div 
                  key={msg.id}
                  className={`flex gap-3 ${isCustomer ? "flex-row-reverse" : ""}`}
                  data-testid={`message-${msg.id}`}
                >
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarFallback 
                      style={!isCustomer ? { backgroundColor: tenant.primaryColor || undefined, color: "white" } : undefined}
                    >
                      {isCustomer ? "You" : "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] ${isCustomer ? "text-right" : ""}`}>
                    <div 
                      className={`rounded-2xl px-4 py-2 inline-block ${
                        isCustomer 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      }`}
                      style={isCustomer ? { backgroundColor: tenant.primaryColor || undefined } : undefined}
                    >
                      <p className="text-sm">{msg.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {msg.createdAt && formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>

      <div className="border-t p-4">
        <div className="max-w-xl mx-auto flex gap-2">
          <Input
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sendMutation.isPending || !selectedCaseId}
            data-testid="input-message"
          />
          <Button 
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sendMutation.isPending || !selectedCaseId}
            style={{ backgroundColor: tenant.primaryColor || undefined }}
            data-testid="button-send"
          >
            {sendMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
