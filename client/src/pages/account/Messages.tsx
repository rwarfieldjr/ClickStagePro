import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Clock, 
  User,
  Search,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  messageBody: string;
  createdAt: string;
  readAt?: string;
}

interface Conversation {
  id: string;
  projectId?: string;
  projectName?: string;
  type: 'account_executive' | 'support';
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  messages: Message[];
}

export default function Messages() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");

  // Fetch current user data
  const { data: userResponse, isLoading: userLoading, error: userError } = useQuery<{
    success: boolean;
    user: { id: string; name: string; email: string };
  }>({
    queryKey: ['/api/auth/me'],
    retry: false,
  });

  // Fetch conversations
  const { data: conversationsData, isLoading } = useQuery<{
    success: boolean;
    data: Conversation[];
  }>({
    queryKey: ['/api/conversations'],
    retry: 1
  });

  const conversations = conversationsData?.data || [];

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conversation =>
    conversation.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conversation.lastMessage?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      const response = await apiRequest('POST', `/api/conversations/${conversationId}/messages`, {
        messageBody: message
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
      setNewMessage("");
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send message.",
        variant: "destructive",
      });
    },
  });

  // Create new conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async (data: { type: 'account_executive' | 'support'; projectId?: string; initialMessage?: string }) => {
      const response = await apiRequest('POST', '/api/conversations', {
        type: data.type,
        projectId: data.projectId
      });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.success && data.data?.id) {
        // If there's a custom message, send it as the first message
        if (customMessage.trim()) {
          try {
            await sendMessageMutation.mutateAsync({
              conversationId: data.data.id,
              message: customMessage.trim()
            });
          } catch (error) {
            console.error('Failed to send initial message:', error);
            toast({
              title: "Warning",
              description: "Conversation created but initial message failed to send.",
              variant: "destructive",
            });
          }
        }
        
        queryClient.invalidateQueries({ queryKey: ['/api/conversations'] });
        setIsNewConversationOpen(false);
        setSelectedConversation(data.data.id);
        setCustomMessage("");
        toast({
          title: "Conversation Started",
          description: customMessage.trim() ? "Your conversation has been started and message sent." : "Your conversation has been started successfully.",
        });
      } else {
        throw new Error('Invalid response format');
      }
    },
    onError: (error: any) => {
      console.error('Conversation creation error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start conversation.",
        variant: "destructive",
      });
    },
  });

  const selectedConversationData = conversations.find(c => c.id === selectedConversation);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) return `${diffInDays}d ago`;
    return date.toLocaleDateString();
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || !newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      conversationId: selectedConversation,
      message: newMessage.trim()
    });
  };

  // Handle authentication loading state
  if (userLoading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground">Loading your messages...</p>
        </div>
      </div>
    );
  }

  // Handle authentication error
  if (userError || !userResponse?.success || !userResponse?.user) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Authentication Required</CardTitle>
            <CardDescription>
              You need to be signed in to access your messages.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={() => window.location.href = '/login'} className="w-full" data-testid="button-sign-in">
              Sign In
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              className="w-full"
              data-testid="button-back-home"
            >
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 h-full">
      <div className="flex flex-col h-full max-h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground" data-testid="text-messages-title">
              Messages
            </h1>
            <p className="text-muted-foreground">
              Communicate with your account executives and support team
            </p>
          </div>
          <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-new-conversation">
                <Plus className="w-4 h-4 mr-2" />
                New Conversation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Start New Conversation</DialogTitle>
                <DialogDescription>
                  Choose how you'd like to get in touch with our team.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Initial Message (Optional)</label>
                    <Textarea
                      placeholder="Type your message to start the conversation..."
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      className="min-h-[80px]"
                      data-testid="textarea-custom-message"
                    />
                  </div>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => createConversationMutation.mutate({ 
                      type: 'account_executive',
                      initialMessage: customMessage.trim() || undefined
                    })}
                    disabled={createConversationMutation.isPending}
                    data-testid="button-contact-account-executive"
                  >
                    <User className="w-4 h-4 mr-2" />
                    Contact Account Executive
                  </Button>
                  <Button 
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => createConversationMutation.mutate({ 
                      type: 'support',
                      initialMessage: customMessage.trim() || undefined
                    })}
                    disabled={createConversationMutation.isPending}
                    data-testid="button-contact-support"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Contact Support
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-1 gap-6 min-h-0">
          {/* Conversations List */}
          <Card className="w-80 flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-lg">
                <MessageCircle className="w-5 h-5" />
                <span>Conversations</span>
              </CardTitle>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-conversations"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-muted rounded-md" />
                    </div>
                  ))}
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="p-6 text-center">
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    No Conversations
                  </h3>
                  <p className="text-muted-foreground text-sm mb-4">
                    Start a conversation with our team to get help with your projects.
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`w-full p-4 text-left hover-elevate border-l-4 transition-colors ${
                        selectedConversation === conversation.id
                          ? 'border-l-primary bg-muted/50'
                          : 'border-l-transparent'
                      }`}
                      data-testid={`button-select-conversation-${conversation.id}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-sm">
                            {conversation.projectName || 'General Inquiry'}
                          </h4>
                          <Badge 
                            variant={conversation.type === 'account_executive' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {conversation.type === 'account_executive' ? 'AE' : 'Support'}
                          </Badge>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                      {conversation.lastMessage && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-1">
                          {conversation.lastMessage}
                        </p>
                      )}
                      {conversation.lastMessageAt && (
                        <p className="text-xs text-muted-foreground">
                          {formatTimeAgo(conversation.lastMessageAt)}
                        </p>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Message Area */}
          <Card className="flex-1 flex flex-col">
            {selectedConversationData ? (
              <>
                {/* Conversation Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center space-x-3">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {selectedConversationData.projectName || 'General Inquiry'}
                      </CardTitle>
                      <CardDescription className="flex items-center space-x-2">
                        <Badge 
                          variant={selectedConversationData.type === 'account_executive' ? 'default' : 'secondary'}
                        >
                          {selectedConversationData.type === 'account_executive' ? 'Account Executive' : 'Support Team'}
                        </Badge>
                        <span>•</span>
                        <span>{selectedConversationData.messages.length} messages</span>
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-auto p-4">
                  <div className="space-y-4">
                    {selectedConversationData.messages.map((message) => {
                      const isCurrentUser = userResponse.user.id === message.senderId;
                      return (
                      <div 
                        key={message.id}
                        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                        data-testid={`message-${message.id}`}
                      >
                        <div className={`max-w-[70%] ${
                          isCurrentUser
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        } rounded-lg p-3`}>
                          <div className="flex items-center space-x-2 mb-1">
                            <User className="w-3 h-3" />
                            <span className="text-xs font-medium">
                              {message.senderName}
                            </span>
                            <span className="text-xs opacity-70">
                              {formatDate(message.createdAt)}
                            </span>
                            {isCurrentUser && (
                              <Badge variant="secondary" className="text-xs">You</Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">
                            {message.messageBody}
                          </p>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </CardContent>

                {/* Message Input */}
                <div className="border-t p-4">
                  <div className="flex space-x-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[40px] max-h-[120px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      data-testid="textarea-new-message"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sendMessageMutation.isPending}
                      data-testid="button-send-message"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                </div>
              </>
            ) : (
              <CardContent className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">
                    Select a Conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Choose a conversation from the left to start messaging.
                  </p>
                </div>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}