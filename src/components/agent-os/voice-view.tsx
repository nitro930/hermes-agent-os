'use client';

import { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Mic,
  MicOff,
  Volume2,
  Settings,
  Pause,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface Agent {
  id: string;
  name: string;
  avatar: string | null;
  systemPrompt?: string;
}

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: Date;
  isAIGenerated?: boolean;
}

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

const statusConfig: Record<VoiceStatus, { label: string; color: string; dotColor: string }> = {
  idle: { label: 'Idle', color: 'text-slate-400', dotColor: 'bg-slate-400' },
  listening: { label: 'Listening...', color: 'text-emerald-400', dotColor: 'bg-emerald-500' },
  processing: { label: 'Processing...', color: 'text-yellow-400', dotColor: 'bg-yellow-500' },
  speaking: { label: 'Speaking...', color: 'text-blue-400', dotColor: 'bg-blue-500' },
  error: { label: 'Error', color: 'text-red-400', dotColor: 'bg-red-500' },
};

export function VoiceView() {
  const { setActiveView } = useAppStore();
  const { toast } = useToast();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [continuousListening, setContinuousListening] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState('1.0');
  const [voiceType, setVoiceType] = useState('default');
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(32).fill(4));
  const [sessionDuration, setSessionDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const sessionStartRef = useRef<Date | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function loadAgents() {
      try {
        const res = await fetch('/api/agents');
        if (res.ok) {
          const data = await res.json();
          setAgents(data);
          const jarvis = data.find((a: Agent) => a.name === 'Jarvis');
          if (jarvis) setSelectedAgentId(jarvis.id);
          else if (data.length > 0) setSelectedAgentId(data[0].id);
        }
      } catch (error) {
        console.error('Failed to load agents:', error);
      }
    }
    loadAgents();
  }, []);

  // Session timer
  useEffect(() => {
    if (status !== 'idle' && !sessionStartRef.current) {
      sessionStartRef.current = new Date();
    }
    if (status !== 'idle') {
      timerRef.current = setInterval(() => {
        if (sessionStartRef.current) {
          setSessionDuration(Math.floor((Date.now() - sessionStartRef.current.getTime()) / 1000));
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  // Compute waveform bars based on recording state
  const displayBars = isRecording ? waveformBars : Array(32).fill(4);

  // Animate waveform when recording
  useEffect(() => {
    if (!isRecording) return;
    const interval = setInterval(() => {
      setWaveformBars(Array(32).fill(0).map(() => Math.random() * 28 + 4));
    }, 100);
    return () => clearInterval(interval);
  }, [isRecording]);

  // Get AI response for voice input
  async function getAIResponse(userText: string) {
    setStatus('processing');
    
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: selectedAgentId,
          message: userText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const responseText = data.message?.content || 'I heard you but couldn\'t process that.';
        
        const agentEntry: TranscriptEntry = {
          id: (Date.now() + 1).toString(),
          speaker: 'agent',
          text: responseText,
          timestamp: new Date(),
          isAIGenerated: true,
        };
        setTranscript((prev) => [...prev, agentEntry]);

        // Speak the response
        setStatus('speaking');
        speakText(responseText);
      } else {
        throw new Error('Chat API failed');
      }
    } catch {
      const selectedAgent = agents.find((a) => a.id === selectedAgentId);
      const fallbackEntry: TranscriptEntry = {
        id: (Date.now() + 1).toString(),
        speaker: 'agent',
        text: `I'm ${selectedAgent?.name || 'the agent'}. I received your message but encountered a processing error. Please try again.`,
        timestamp: new Date(),
      };
      setTranscript((prev) => [...prev, fallbackEntry]);
      speakText(fallbackEntry.text);
    }
  }

  // Text-to-speech
  function speakText(text: string) {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = parseFloat(voiceSpeed);
      
      // Try to set voice type
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        const voiceMap: Record<string, string> = {
          alloy: 'Samantha',
          echo: 'Daniel',
          nova: 'Karen',
          default: '',
        };
        const targetVoice = voiceMap[voiceType];
        if (targetVoice) {
          const match = voices.find(v => v.name.includes(targetVoice));
          if (match) utterance.voice = match;
        }
      }

      utterance.onend = () => {
        if (continuousListening) {
          startListening();
        } else {
          setStatus('idle');
          setIsRecording(false);
        }
      };
      utterance.onerror = () => {
        setStatus('idle');
        setIsRecording(false);
      };
      
      speechSynthesis.speak(utterance);
      return;
    }

    // Fallback: just set status
    setTimeout(() => {
      if (continuousListening) {
        startListening();
      } else {
        setStatus('idle');
        setIsRecording(false);
      }
    }, 2000);
  }

  // Start listening using Web Speech API
  function startListening() {
    const SpeechRecognitionAPI = (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition; webkitSpeechRecognition?: typeof window.SpeechRecognition }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      setErrorMessage('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      setStatus('error');
      toast({ title: 'Speech recognition not supported', variant: 'destructive' });
      return;
    }

    setErrorMessage('');
    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setIsRecording(true);
      setStatus('listening');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript_text = event.results[0][0].transcript;
      
      const userEntry: TranscriptEntry = {
        id: Date.now().toString(),
        speaker: 'user',
        text: transcript_text,
        timestamp: new Date(),
      };
      setTranscript((prev) => [...prev, userEntry]);
      setIsRecording(false);
      
      // Get AI response
      getAIResponse(transcript_text);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setErrorMessage('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error === 'no-speech') {
        setErrorMessage('No speech detected. Please try again.');
      } else {
        setErrorMessage(`Recognition error: ${event.error}`);
      }
      setStatus('idle');
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (status === 'listening') {
        setIsRecording(false);
        if (!continuousListening) {
          setStatus('idle');
        }
      }
    };

    try {
      recognition.start();
    } catch {
      setErrorMessage('Failed to start speech recognition. Please check microphone permissions.');
      setStatus('error');
    }
  }

  async function toggleRecording() {
    if (isRecording) {
      // Stop
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
      setStatus('idle');
      if (speechSynthesis.speaking) {
        speechSynthesis.cancel();
      }
    } else {
      startListening();
    }
  }

  function stopSpeaking() {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setStatus('idle');
    setIsRecording(false);
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);
  const formatDuration = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice</h1>
          <p className="text-sm text-muted-foreground">Talk to your agents with real voice commands</p>
        </div>
        <Badge variant="outline" className={`text-xs ${statusConfig[status].color} border-current/30`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[status].dotColor} mr-1.5 ${status === 'listening' ? 'animate-pulse' : ''}`} />
          {statusConfig[status].label}
        </Badge>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-xs text-red-400">{errorMessage}</p>
            <Button variant="ghost" size="sm" className="ml-auto text-red-400 text-xs h-6" onClick={() => setErrorMessage('')}>
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Voice Interface */}
        <div className="lg:col-span-2 space-y-4">
          {/* Agent Selector */}
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-secondary text-lg">
                    {selectedAgent?.avatar || '🎙️'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">Voice Agent</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedAgent?.name || 'Select an agent'}
                    </p>
                  </div>
                </div>
                <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                  <SelectTrigger className="w-40 bg-secondary border-border">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.avatar || '🤖'} {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Mic Button & Waveform */}
          <Card className="bg-card border-border">
            <CardContent className="p-6">
              <div className="flex flex-col items-center gap-6">
                {/* Status */}
                <div className="text-center">
                  <p className={`text-lg font-semibold ${statusConfig[status].color}`}>
                    {statusConfig[status].label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {isRecording ? 'Speak now...' : status === 'speaking' ? 'Agent is responding...' : status === 'processing' ? 'Thinking...' : 'Click the mic to start'}
                  </p>
                </div>

                {/* Waveform */}
                <div className="flex items-center justify-center gap-[3px] h-16 w-full max-w-md">
                  {displayBars.map((height, i) => (
                    <div
                      key={i}
                      className={`w-1.5 rounded-full transition-all duration-100 ${
                        isRecording
                          ? status === 'speaking'
                            ? 'bg-blue-400'
                            : 'bg-emerald-400'
                          : status === 'processing'
                            ? 'bg-yellow-400/40'
                            : 'bg-muted-foreground/20'
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>

                {/* Mic Button */}
                <button
                  onClick={toggleRecording}
                  disabled={!selectedAgentId}
                  className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 disabled:opacity-50 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                      : status === 'processing'
                      ? 'bg-yellow-500 shadow-lg shadow-yellow-500/30'
                      : status === 'speaking'
                      ? 'bg-blue-500 shadow-lg shadow-blue-500/30'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
                  }`}
                >
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
                  )}
                  {isRecording ? (
                    <Pause className="w-8 h-8 text-white" />
                  ) : status === 'processing' ? (
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                  ) : status === 'speaking' ? (
                    <Volume2 className="w-8 h-8 text-white" />
                  ) : (
                    <Mic className="w-8 h-8 text-white" />
                  )}
                </button>

                {/* Quick Actions */}
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-border"
                    onClick={() => { if (!isRecording) startListening(); }}
                    disabled={!selectedAgentId || isRecording}
                  >
                    <Mic className="w-3 h-3 mr-1" /> Push to Talk
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-border"
                    onClick={stopSpeaking}
                  >
                    <MicOff className="w-3 h-3 mr-1" /> Stop
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-emerald-500/30 text-emerald-400"
                    onClick={() => setActiveView('chat')}
                  >
                    Switch to Chat
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Log */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">Conversation Log</CardTitle>
                {transcript.length > 0 && (
                  <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={() => setTranscript([])}>
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {transcript.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Mic className="w-8 h-8 mb-2 text-emerald-500/40" />
                      <p className="text-xs">Start a voice conversation</p>
                      <p className="text-[10px] mt-1">Your conversation will appear here</p>
                    </div>
                  ) : (
                    transcript.map((entry) => (
                      <div key={entry.id} className="flex gap-2.5">
                        <div className={`mt-0.5 shrink-0 ${entry.speaker === 'user' ? 'text-emerald-400' : 'text-blue-400'}`}>
                          {entry.speaker === 'user' ? (
                            <Mic className="w-3.5 h-3.5" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium">
                              {entry.speaker === 'user' ? 'You' : selectedAgent?.name || 'Agent'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {entry.timestamp.toLocaleTimeString()}
                            </span>
                            {entry.isAIGenerated && (
                              <Badge variant="outline" className="text-[8px] bg-blue-500/10 text-blue-400 border-blue-500/20 h-4">
                                AI
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-foreground/80 mt-0.5">{entry.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-sm font-semibold">Voice Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Continuous Listening</Label>
                <Switch
                  checked={continuousListening}
                  onCheckedChange={setContinuousListening}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Voice Speed</Label>
                <Select value={voiceSpeed} onValueChange={setVoiceSpeed}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="0.5">0.5x (Slow)</SelectItem>
                    <SelectItem value="0.75">0.75x</SelectItem>
                    <SelectItem value="1.0">1.0x (Normal)</SelectItem>
                    <SelectItem value="1.25">1.25x</SelectItem>
                    <SelectItem value="1.5">1.5x (Fast)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Voice Type</Label>
                <Select value={voiceType} onValueChange={setVoiceType}>
                  <SelectTrigger className="bg-secondary border-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="alloy">Alloy</SelectItem>
                    <SelectItem value="echo">Echo</SelectItem>
                    <SelectItem value="nova">Nova</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Voice Status */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">System Status</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Microphone</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${isRecording ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                  <span className="text-[10px] text-muted-foreground">{isRecording ? 'Active' : 'Inactive'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Agent Connected</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${selectedAgentId ? 'bg-emerald-500' : 'bg-slate-500'}`} />
                  <span className="text-[10px] text-muted-foreground">{selectedAgentId ? 'Yes' : 'No'}</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Speech Engine</span>
                <span className="text-[10px] text-emerald-400">Web Speech API</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">TTS Engine</span>
                <span className="text-[10px] text-emerald-400">Browser Native</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Session Duration</span>
                <span className="text-[10px] text-muted-foreground">{formatDuration(sessionDuration)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Messages</span>
                <span className="text-[10px] text-muted-foreground">{transcript.length}</span>
              </div>
            </CardContent>
          </Card>

          {/* Supported Commands */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Voice Commands</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-2">
              {[
                'What are my current tasks?',
                'Status of [agent name]',
                'Create a task: [description]',
                'What are the team goals?',
                'Summarize recent activity',
                'Delegate [task] to [agent]',
              ].map((cmd) => (
                <button
                  key={cmd}
                  className="w-full text-left p-2 rounded-lg bg-secondary/50 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  onClick={() => {
                    if (!isRecording && selectedAgentId) {
                      setTranscript(prev => [...prev, {
                        id: Date.now().toString(),
                        speaker: 'user' as const,
                        text: cmd,
                        timestamp: new Date(),
                      }]);
                      getAIResponse(cmd);
                    }
                  }}
                >
                  &quot;{cmd}&quot;
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
