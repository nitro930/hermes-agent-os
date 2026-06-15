'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send, Plus, MessageSquare, Bot, User, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  type: string;
  avatar: string | null;
  status: string;
}

interface Conversation {
  id: string;
  title: string;
  agentId: string;
  agent: { name: string; avatar: string | null };
  messages?: Message[];
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export function ChatView() {
  const { selectedConversationId, setSelectedConversationId } = useAppStore();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadAgents = useCallback(async () => {
    try {
      const res = await fetch('/api/agents');
      if (res.ok) {
        const data: Agent[] = await res.json();
        setAgents(data);
        if (data.length > 0 && !selectedAgentId) {
          setSelectedAgentId(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  }, [selectedAgentId]);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/conversations');
      if (res.ok) setConversations(await res.json());
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, []);

  useEffect(() => {
    loadAgents().then(() => setLoading(false));
    loadConversations();
  }, [loadAgents, loadConversations]);

  useEffect(() => {
    if (selectedConversationId) {
      loadMessages(selectedConversationId);
    } else {
      setMessages([]);
    }
  }, [selectedConversationId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage() {
    if (!input.trim() || !selectedAgentId || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          message: userMessage,
          conversationId: selectedConversationId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (!selectedConversationId) {
          setSelectedConversationId(data.conversationId);
          loadConversations();
        }
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          { id: `user-${data.message?.id}`, role: 'user', content: userMessage, createdAt: new Date().toISOString() },
          data.message,
        ]);
      } else {
        toast({ title: 'Failed to send message', variant: 'destructive' });
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
      }
    } catch {
      toast({ title: 'Failed to send message', variant: 'destructive' });
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setIsLoading(false);
    }
  }

  async function deleteConversation(id: string) {
    try {
      const res = await fetch(`/api/conversations/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (selectedConversationId === id) {
          setSelectedConversationId(null);
          setMessages([]);
        }
        loadConversations();
        toast({ title: 'Conversation deleted' });
      }
    } catch {
      toast({ title: 'Failed to delete conversation', variant: 'destructive' });
    }
  }

  function startNewConversation() {
    setSelectedConversationId(null);
    setMessages([]);
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-[calc(100vh-8rem)]">
      {/* Conversation History Sidebar */}
      <Card className="w-64 shrink-0 bg-card border-border flex flex-col">
        <div className="p-3 border-b border-border">
          <Button
            onClick={startNewConversation}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors group ${
                  selectedConversationId === conv.id
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : 'hover:bg-accent text-muted-foreground'
                }`}
                onClick={() => {
                  setSelectedConversationId(conv.id);
                  setSelectedAgentId(conv.agentId);
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs truncate">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground">{conv.agent?.name}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteConversation(conv.id);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </Card>

      {/* Chat Area */}
      <Card className="flex-1 bg-card border-border flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary text-sm">
              {selectedAgent?.avatar || '🤖'}
            </div>
            <div>
              <p className="text-sm font-medium">{selectedAgent?.name || 'Select Agent'}</p>
              <p className="text-[10px] text-muted-foreground capitalize">{selectedAgent?.status || 'unknown'}</p>
            </div>
          </div>
          <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
            <SelectTrigger className="w-40 bg-secondary border-border text-xs">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center gap-2">
                    <span>{agent.avatar || '🤖'}</span>
                    <span>{agent.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Bot className="w-12 h-12 mb-3 text-emerald-500/40" />
                <p className="text-sm">Start a conversation with {selectedAgent?.name || 'an agent'}</p>
                <p className="text-xs mt-1">Type a message below to begin</p>
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role !== 'user' && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[70%] rounded-xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-emerald-200' : 'text-muted-foreground'}`}>
                    {new Date(msg.createdAt).toLocaleTimeString()}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-400 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-secondary rounded-xl px-4 py-3">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot-1" />
                    <div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot-2" />
                    <div className="w-2 h-2 rounded-full bg-emerald-400 typing-dot-3" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="p-3 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder={`Message ${selectedAgent?.name || 'agent'}...`}
              className="bg-secondary border-border flex-1"
              disabled={isLoading || !selectedAgentId}
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !input.trim() || !selectedAgentId}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
