'use client';

import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import { Send, Mic, Sparkles, MapPin, Truck, Package, Banknote, Calendar, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
}

interface ExtractedFields {
  title?: string;
  loadType?: string;
  fromCity?: string;
  toCity?: string;
  fromDistrict?: string;
  toDistrict?: string;
  vehicleType?: string;
  weight?: string;
  price?: string;
  pickupDate?: string;
  deliveryDate?: string;
  contactName?: string;
  contactPhone?: string;
  description?: string;
  [key: string]: string | undefined;
}

export default function AiDialogPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: 'welcome', role: 'assistant', text: 'Merhaba! Ben KAPTAN AI asistanınız. Yük eklemek, arama yapmak veya bilgi almak için doğal dilde yazabilirsiniz.\n\nÖrnek: "İstanbul\'dan Ankara\'ya 24 ton çelik taşıyacak tır arıyorum. Fiyat 15000 TL olsun."', timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedFields | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await api.post('/voice/ai-dialog', { message: text });
      const data = res.data?.data || res.data || {};
      const reply = data.reply || data.message || data.response || 'İsteğiniz işleniyor.';
      const fields = data.fields || data.extracted || data.entities || {};

      setMessages(prev => [...prev, { id: Date.now().toString() + '-ai', role: 'assistant', text: reply, timestamp: Date.now() }]);

      if (fields && Object.keys(fields).length > 0) {
        const mapped: ExtractedFields = {};
        if (fields.title) mapped.title = fields.title;
        if (fields.loadType) mapped.loadType = fields.loadType === 'full' ? 'Tam Yük' : fields.loadType === 'partial' ? 'Kısmi Yük' : fields.loadType;
        if (fields.fromCity || fields.origin) mapped.fromCity = fields.fromCity || fields.origin;
        if (fields.toCity || fields.destination) mapped.toCity = fields.toCity || fields.destination;
        if (fields.fromDistrict) mapped.fromDistrict = fields.fromDistrict;
        if (fields.toDistrict) mapped.toDistrict = fields.toDistrict;
        if (fields.vehicleType) mapped.vehicleType = fields.vehicleType;
        if (fields.weight || fields.tonnage) mapped.weight = fields.weight || fields.tonnage;
        if (fields.price || fields.amount) mapped.price = fields.price || fields.amount;
        if (fields.pickupDate) mapped.pickupDate = fields.pickupDate;
        if (fields.deliveryDate) mapped.deliveryDate = fields.deliveryDate;
        if (fields.contactName) mapped.contactName = fields.contactName;
        if (fields.contactPhone) mapped.contactPhone = fields.contactPhone;
        if (fields.description) mapped.description = fields.description;
        setExtracted(mapped);
      }
    } catch {
      setMessages(prev => [...prev, { id: Date.now().toString() + '-err', role: 'system', text: 'AI servisi şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.', timestamp: Date.now() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleQuickCommand = (cmd: string) => {
    setInput(cmd);
    setTimeout(() => handleSend(), 100);
  };

  const handleCreateLoad = () => {
    if (!extracted) return;
    const params = new URLSearchParams();
    if (extracted.title) params.set('title', extracted.title);
    if (extracted.loadType) params.set('loadType', extracted.loadType);
    if (extracted.fromCity) params.set('fromCity', extracted.fromCity);
    if (extracted.toCity) params.set('toCity', extracted.toCity);
    if (extracted.weight) params.set('weight', extracted.weight);
    if (extracted.price) params.set('price', extracted.price);
    window.open(`/loads?ai=${params.toString()}`, '_self');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto">
      {/* Header */}
      <div className="p-4 border-b border-kaptan-border flex items-center gap-3">
        <div className="w-10 h-10 bg-kaptan-primary/20 rounded-full flex items-center justify-center">
          <Sparkles size={20} className="text-kaptan-primary" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-kaptan-text">AI ile Yük Ekle</h1>
          <p className="text-kaptan-muted text-xs">Doğal dilde yazarak yük oluşturun</p>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${
              msg.role === 'user' ? 'bg-kaptan-primary text-white rounded-br-md' :
              msg.role === 'system' ? 'bg-kaptan-danger/10 text-kaptan-danger border border-kaptan-danger/30' :
              'bg-kaptan-card text-kaptan-text rounded-bl-md border border-kaptan-border'
            }`}>
              <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
              <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/60' : 'text-kaptan-muted'}`}>
                {new Date(msg.timestamp).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {/* Extracted fields card */}
        {extracted && Object.keys(extracted).length > 0 && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-2xl bg-kaptan-success/10 border border-kaptan-success/30">
              <p className="text-kaptan-success font-semibold text-sm mb-3 flex items-center gap-2"><CheckCircle size={16} /> Algılanan Bilgiler</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {extracted.title && <Field icon={Package} label="Başlık" value={extracted.title} />}
                {extracted.loadType && <Field icon={Truck} label="Yük Tipi" value={extracted.loadType} />}
                {extracted.fromCity && <Field icon={MapPin} label="Kalkış" value={`${extracted.fromCity}${extracted.fromDistrict ? ' / ' + extracted.fromDistrict : ''}`} />}
                {extracted.toCity && <Field icon={MapPin} label="Varış" value={`${extracted.toCity}${extracted.toDistrict ? ' / ' + extracted.toDistrict : ''}`} />}
                {extracted.vehicleType && <Field icon={Truck} label="Araç" value={extracted.vehicleType} />}
                {extracted.weight && <Field icon={Package} label="Ağırlık" value={`${extracted.weight} ton`} />}
                {extracted.price && <Field icon={Banknote} label="Fiyat" value={`${extracted.price} ₺`} />}
                {extracted.pickupDate && <Field icon={Calendar} label="Yükleme" value={extracted.pickupDate} />}
              </div>
              <button onClick={handleCreateLoad} className="mt-4 w-full py-2 bg-kaptan-success text-white rounded-lg font-semibold hover:opacity-90 transition flex items-center justify-center gap-2">
                Bu Bilgilerle Yük Oluştur <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-kaptan-card p-4 rounded-2xl rounded-bl-md border border-kaptan-border">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-kaptan-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-kaptan-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-kaptan-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick commands */}
      <div className="px-4 py-2 flex gap-2 overflow-x-auto border-t border-kaptan-border">
        {['İstanbul\'dan Ankara\'ya tam yük 24 ton', 'İzmir\'den Bursa\'ya parsiyel 10 ton 5000₺', 'Bugün İstanbul içi şehir içi dağıtım', 'Ankara\'dan Konya\'ya evden eve nakliyat'].map((cmd, i) => (
          <button key={i} onClick={() => handleQuickCommand(cmd)} className="whitespace-nowrap px-3 py-1.5 bg-kaptan-card border border-kaptan-border rounded-full text-kaptan-muted text-xs hover:bg-kaptan-primary/10 hover:text-kaptan-primary hover:border-kaptan-primary transition">
            {cmd.length > 40 ? cmd.substring(0, 40) + '...' : cmd}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-kaptan-border">
        <div className="flex gap-2">
          <button className="p-3 glass-card text-kaptan-muted hover:text-kaptan-primary transition" title="Sesli komut (yakında)">
            <Mic size={20} />
          </button>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Yük detaylarını doğal dilde yazın... (örn: İstanbul\'dan Ankara\'ya 25 ton çimento, TIR, 15000 TL)"
            className="flex-1 px-4 py-3 glass-card text-kaptan-text placeholder-kaptan-muted resize-none text-sm"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="p-3 bg-kaptan-primary text-white rounded-xl hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-kaptan-dark/50 rounded-lg">
      <Icon size={14} className="text-kaptan-success" />
      <div>
        <p className="text-kaptan-muted text-xs">{label}</p>
        <p className="text-kaptan-text text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}
