'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';

interface Agent {
  id: string;
  name: string;
  avatar: string | null;
}

interface TranscriptEntry {
  id: string;
  speaker: 'user' | 'agent';
  text: string;
  timestamp: Date;
}

type VoiceStatus = 'idle' | 'listening' | 'processing' | 'speaking';

const statusConfig: Record<VoiceStatus, { label: string; color: string; dotColor: string }> = {
  idle: { label: 'Idle', color: 'text-slate-400', dotColor: 'bg-slate-400' },
  listening: { label: 'Listening...', color: 'text-emerald-400', dotColor: 'bg-emerald-500' },
  processing: { label: 'Processing...', color: 'text-yellow-400', dotColor: 'bg-yellow-500' },
  speaking: { label: 'Speaking...', color: 'text-blue-400', dotColor: 'bg-blue-500' },
};

const simulatedConversations: TranscriptEntry[] = [
  { id: '1', speaker: 'user', text: 'Hey Jarvis, what\'s the status of the Voice Integration POC?', timestamp: new Date(Date.now() - 300000) },
  { id: '2', speaker: 'agent', text: 'The Voice Integration POC is currently at 60% progress. It\'s assigned to me and the due date is February 28th. We\'re on track.', timestamp: new Date(Date.now() - 280000) },
  { id: '3', speaker: 'user', text: 'Can you delegate the documentation part to the Writer Agent?', timestamp: new Date(Date.now() - 240000) },
  { id: '4', speaker: 'agent', text: 'Done. I\'ve created a task for the Writer Agent to handle the documentation for the Voice POC. They\'ll start on it tomorrow.', timestamp: new Date(Date.now() - 220000) },
];

export function VoiceView() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [status, setStatus] = useState<VoiceStatus>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>(simulatedConversations);
  const [continuousListening, setContinuousListening] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState('1.0');
  const [voiceType, setVoiceType] = useState('default');
  const [waveformBars, setWaveformBars] = useState<number[]>(Array(32).fill(4));

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

  // Compute waveform bars based on recording state
  const displayBars = isRecording
    ? waveformBars
    : Array(32).fill(4);

  // Animate waveform when recording
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const interval = setInterval(() => {
      setWaveformBars(
        Array(32)
          .fill(0)
          .map(() => Math.random() * 28 + 4)
      );
    }, 100);

    return () => clearInterval(interval);
  }, [isRecording]);

  async function toggleRecording() {
    if (isRecording) {
      setIsRecording(false);
      setStatus('processing');
      // Simulate processing
      setTimeout(() => {
        setStatus('speaking');
        const selectedAgent = agents.find((a) => a.id === selectedAgentId);
        const newEntry: TranscriptEntry = {
          id: Date.now().toString(),
          speaker: 'user',
          text: 'What are the current priorities for the team?',
          timestamp: new Date(),
        };
        setTranscript((prev) => [...prev, newEntry]);

        setTimeout(() => {
          const agentResponse: TranscriptEntry = {
            id: (Date.now() + 1).toString(),
            speaker: 'agent',
            text: `Based on current goals, the high-priority items are: Launch v1.0 API at 75% progress and Voice Integration POC at 60%. The Code Agent and I are working on these respectively.`,
            timestamp: new Date(),
          };
          setTranscript((prev) => [...prev, agentResponse]);
          setStatus(continuousListening ? 'listening' : 'idle');
          if (continuousListening) setIsRecording(true);
        }, 1500);
      }, 1000);
    } else {
      setIsRecording(true);
      setStatus('listening');
    }
  }

  const selectedAgent = agents.find((a) => a.id === selectedAgentId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice</h1>
          <p className="text-sm text-muted-foreground">Talk to your agents with voice commands</p>
        </div>
        <Badge variant="outline" className={`text-xs ${statusConfig[status].color} border-current/30`}>
          <div className={`w-1.5 h-1.5 rounded-full ${statusConfig[status].dotColor} mr-1.5 ${status === 'listening' ? 'animate-pulse' : ''}`} />
          {statusConfig[status].label}
        </Badge>
      </div>

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
                    {isRecording ? 'Speak now...' : 'Click the mic to start'}
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
                          : 'bg-muted-foreground/20'
                      }`}
                      style={{ height: `${height}px` }}
                    />
                  ))}
                </div>

                {/* Mic Button */}
                <button
                  onClick={toggleRecording}
                  className={`relative flex items-center justify-center w-20 h-20 rounded-full transition-all duration-300 ${
                    isRecording
                      ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
                      : 'bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
                  }`}
                >
                  {isRecording && (
                    <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20" />
                  )}
                  {isRecording ? (
                    <Pause className="w-8 h-8 text-white" />
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
                    onClick={() => {
                      if (!isRecording) {
                        setIsRecording(true);
                        setStatus('listening');
                      }
                    }}
                  >
                    <Mic className="w-3 h-3 mr-1" /> Push to Talk
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-border"
                    onClick={() => {
                      setStatus('idle');
                      setIsRecording(false);
                    }}
                  >
                    <MicOff className="w-3 h-3 mr-1" /> Mute
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conversation Log */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Conversation Log</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {transcript.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex gap-2.5 ${entry.speaker === 'user' ? '' : ''}`}
                    >
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
                        </div>
                        <p className="text-xs text-foreground/80 mt-0.5">{entry.text}</p>
                      </div>
                    </div>
                  ))}
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
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] text-muted-foreground">Yes</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">MCP Tools</span>
                <span className="text-[10px] text-muted-foreground">16 available</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Session Duration</span>
                <span className="text-[10px] text-muted-foreground">--:--</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
