'use client';

import { useEffect, useState, useRef } from 'react';
import { api } from '@/lib/api';
import { connectSocket, getSocket, disconnectSocket } from '@/lib/websocket';
import { Search, MessageSquare, Users, User, Filter, Eye, Trash2, Send, AlertCircle, RefreshCw } from 'lucide-react';

export default function ChatManagementPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'direct' | 'groups'>('all');
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchRooms = async () => {
    setLoading(true);
    try { const res = await api.get('/chat/rooms'); setRooms(Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : []); } catch { setRooms([]); }
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();

    // Connect WebSocket for real-time messages
    const token = localStorage.getItem('admin_token');
    if (token) {
      const socket = connectSocket(token);
      socket.on('connect', () => setWsConnected(true));
      socket.on('disconnect', () => setWsConnected(false));

      // Listen for new messages
      socket.on('NEW_MESSAGE', (data: any) => {
        if (selectedRoom && data.roomId === selectedRoom.id) {
          setMessages(prev => [...prev, data]);
        }
        // Update room's last message
        setRooms(prev => prev.map(r => r.id === data.roomId ? { ...r, lastMessage: data.text || data.content, lastActivity: new Date().toISOString() } : r));
      });

      socket.on('ROOM_CREATED', () => fetchRooms());
    }

    return () => { disconnectSocket(); };
  }, []);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async (roomId: string) => {
    try {
      const res = await api.get(`/chat/rooms/${roomId}/messages`);
      const msgs = Array.isArray(res.data?.data?.data || res.data?.data) ? (res.data?.data?.data || res.data?.data) : [];
      setMessages(msgs);
      setSelectedRoom(roomId);

      // Join room channel via WebSocket
      const socket = getSocket();
      if (socket) {
        socket.emit('JOIN_ROOM', { roomId });
      }
    } catch { setMessages([]); }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedRoom) return;
    setSending(true);
    try {
      const socket = getSocket();
      if (socket?.connected) {
        // Send via WebSocket for real-time
        socket.emit('SEND_MESSAGE', { roomId: selectedRoom.id, text: newMessage.trim() });
        // Optimistic: add to local list
        const user = JSON.parse(localStorage.getItem('admin_user') || '{}');
        setMessages(prev => [...prev, {
          id: 'tmp-' + Date.now(), text: newMessage.trim(), senderName: user.fullName || 'Admin',
          senderRole: 'admin', timestamp: new Date().toISOString(),
        }]);
      } else {
        // Fallback to REST
        await api.post(`/chat/rooms/${selectedRoom.id}/messages`, { text: newMessage.trim() });
        fetchMessages(selectedRoom.id);
      }
      setNewMessage('');
    } catch (err: any) {
      alert('Mesaj gönderilemedi');
    }
    setSending(false);
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Bu sohbet odasını silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/chat/rooms/${roomId}`); fetchRooms(); if (selectedRoom === roomId) { setSelectedRoom(null); setMessages([]); } } catch {}
  };

  const filtered = rooms.filter((r: any) => {
    const matchSearch = !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.participants?.some((p: any) => p.name?.toLowerCase().includes(search.toLowerCase()));
    const matchFilter = filter === 'all' || (filter === 'groups' ? r.isGroup : !r.isGroup);
    return matchSearch && matchFilter;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <MessageSquare size={24} className="text-kaptan-primary" />
          <h2 className="text-2xl font-bold text-kaptan-text">Sohbet Yönetimi</h2>
          {wsConnected && <span className="w-2 h-2 rounded-full bg-kaptan-success animate-pulse" title="Gerçek zamanlı bağlantı aktif" />}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-kaptan-muted">{rooms.length} oda • {rooms.filter((r: any) => r.unreadCount > 0).length} okunmamış</span>
          <button onClick={fetchRooms} className="flex items-center gap-1 text-sm text-kaptan-primary hover:underline"><RefreshCw size={14} /> Yenile</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Room List */}
        <div className="lg:col-span-1">
          <div className="flex gap-2 mb-3">
            {([{ k: 'all', l: 'Tümü', i: MessageSquare }, { k: 'direct', l: 'Birebir', i: User }, { k: 'groups', l: 'Gruplar', i: Users }] as const).map(t => (
              <button key={t.k} onClick={() => setFilter(t.k)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filter === t.k ? 'bg-kaptan-primary text-white' : 'bg-kaptan-card border border-kaptan-border text-kaptan-muted'}`}>
                <t.i size={12} /> {t.l}
              </button>
            ))}
          </div>
          <div className="mb-3 relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-kaptan-muted" />
            <input className="w-full glass-card pl-8 pr-3 py-2 text-sm text-kaptan-text" placeholder="Oda veya katılımcı ara..."
              value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          {loading ? <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 skeleton rounded-lg" />)}</div> : (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {filtered.map((r: any) => (
                <button key={r.id} onClick={() => { setSelectedRoom(r); fetchMessages(r.id); }}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${selectedRoom?.id === r.id ? 'bg-kaptan-primary/10 border border-kaptan-primary/30' : 'hover:bg-kaptan-dark/50 border border-transparent'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {r.isGroup ? <Users size={14} className="text-kaptan-primary" /> : <User size={14} className="text-kaptan-muted" />}
                      <span className="text-sm font-medium text-kaptan-text">{r.name || 'Sohbet'}</span>
                    </div>
                    {r.unreadCount > 0 && <span className="w-5 h-5 rounded-full bg-kaptan-primary text-white text-[10px] flex items-center justify-center">{r.unreadCount}</span>}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-kaptan-muted truncate max-w-[180px]">{r.lastMessage || 'Mesaj yok'}</span>
                    <span className="text-[10px] text-kaptan-muted">{r.lastActivity ? new Date(r.lastActivity).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
                  </div>
                </button>
              ))}
              {filtered.length === 0 && <p className="text-center text-kaptan-muted text-sm py-6">Sohbet odası bulunamadı</p>}
            </div>
          )}
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-2">
          {selectedRoom ? (
            <div className="glass-card flex flex-col h-[65vh]">
              {/* Header */}
              <div className="flex justify-between items-center p-4 border-b border-kaptan-border">
                <div>
                  <h3 className="font-medium text-kaptan-text">{selectedRoom.name || 'Sohbet'}</h3>
                  <p className="text-xs text-kaptan-muted">
                    {selectedRoom.isGroup ? `${selectedRoom.participants?.length || 0} katılımcı` : 'Birebir sohbet'}
                    {wsConnected && <span className="ml-2 text-kaptan-success">• Çevrimiçi</span>}
                  </p>
                </div>
                <button onClick={() => handleDeleteRoom(selectedRoom.id)} className="p-1.5 hover:bg-kaptan-danger/20 rounded text-kaptan-danger"><Trash2 size={14} /></button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-kaptan-muted">
                    <div className="text-center">
                      <MessageSquare size={36} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Henüz mesaj yok</p>
                    </div>
                  </div>
                ) : messages.map((m: any, i: number) => (
                  <div key={m.id || i} className={`flex ${m.senderRole === 'admin' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] rounded-xl px-4 py-2.5 ${m.senderRole === 'admin' ? 'bg-kaptan-primary/20 text-kaptan-text' : 'bg-kaptan-dark text-kaptan-text'}`}>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-medium text-kaptan-muted">{m.senderName || 'Kullanıcı'}</span>
                        <span className="text-[10px] text-kaptan-muted">{new Date(m.timestamp || m.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.text || m.content}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-3 border-t border-kaptan-border">
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-kaptan-dark border border-kaptan-border rounded-lg px-4 py-2.5 text-sm text-kaptan-text placeholder-kaptan-muted"
                    placeholder="Mesajınızı yazın..."
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                  />
                  <button onClick={handleSend} disabled={sending || !newMessage.trim()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-kaptan-primary text-white rounded-lg hover:bg-kaptan-primary/90 disabled:opacity-50 transition-colors">
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card flex items-center justify-center h-[65vh] text-kaptan-muted">
              <div className="text-center">
                <MessageSquare size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Sohbet odası seçin</p>
                <p className="text-xs mt-1">{wsConnected ? 'WebSocket bağlantısı aktif' : 'WebSocket bağlantısı yok'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
