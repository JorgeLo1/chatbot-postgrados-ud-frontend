import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader, RefreshCw, Book, ChevronRight, X } from 'lucide-react';

const API_BASE = import.meta.env.PROD ? '' : import.meta.env.VITE_RASA_API || '/api';

export default function ChatbotFrontend() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');
  const [showSidebar, setShowSidebar] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newId);
    checkApiStatus();
  }, []);

  useEffect(() => scrollToBottom(), [messages]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/`, { method: 'GET' });
      setApiStatus(response.ok ? 'online' : 'error');
    } catch {
      setApiStatus('offline');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { text: input, sender: 'user', timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: sessionId, message: input })
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data?.length) {
        const botMsgs = data.map(msg => ({
          text: msg.text || msg.custom?.text || 'Sin respuesta',
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
          buttons: msg.buttons || [],
          image: msg.image || null
        }));
        setMessages(prev => [...prev, ...botMsgs]);
        setApiStatus('online');
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        text: `❌ Error de conexión: ${err.message}\n\nIntenta de nuevo más tarde.`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      }]);
      setApiStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const resetChat = () => {
    setSessionId(`user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
    setMessages([{
      text: '¡Conversación reiniciada! 🔄\n\n¿En qué puedo ayudarte?',
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const getStatusColor = () => ({
    online: 'bg-green-500',
    offline: 'bg-red-500',
    error: 'bg-yellow-500',
    checking: 'bg-gray-400'
  }[apiStatus]);

  const getStatusText = () => ({
    online: 'Conectado',
    offline: 'Desconectado',
    error: 'Error',
    checking: 'Verificando...'
  }[apiStatus]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100 overflow-hidden">
      {/* HEADER */}
      <header className="flex-none bg-white shadow-md border-b px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-lg">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-gray-800">Chatbot Postgrados UD</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
              <span className="text-xs text-gray-600">{getStatusText()}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetChat}
            className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline">Reiniciar</span>
          </button>
          <button
            onClick={() => setShowSidebar(true)}
            className="lg:hidden flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden p-3 sm:p-4 gap-4">
        {/* CHAT PANEL */}
        <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 flex items-center justify-center rounded-full ${
                  msg.sender === 'user' ? 'bg-blue-600' : 'bg-gradient-to-br from-indigo-600 to-purple-700'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
                </div>
                <div className={`flex flex-col max-w-[85%] sm:max-w-[70%] ${msg.sender === 'user' ? 'items-end' : ''}`}>
                  <div className={`rounded-xl px-3 py-2 ${
                    msg.sender === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-none'
                      : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                  }`}>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</p>
                    {msg.image && <img src={msg.image} alt="Respuesta" className="mt-2 rounded-lg max-w-full" />}
                    {msg.buttons?.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {msg.buttons.map((b, j) => (
                          <button
                            key={j}
                            onClick={() => setInput(b.payload)}
                            className="w-full px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs"
                          >
                            {b.title}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 mt-1 px-2">{msg.timestamp}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-full flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-xl px-3 py-2">
                  <div className="flex gap-1.5">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={sendMessage} className="p-3 bg-white border-t flex gap-2">
            <input
              id="message-input"
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu mensaje..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={loading || apiStatus === 'offline'}
            />
            <button
              type="submit"
              disabled={loading || !input.trim() || apiStatus === 'offline'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 flex items-center justify-center"
            >
              {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </form>
        </div>

        {/* SIDEBAR (Drawer en móviles) */}
        <aside
          className={`fixed lg:static top-0 right-0 h-full lg:h-auto w-4/5 sm:w-2/5 lg:w-80 bg-white shadow-xl rounded-l-xl p-4 space-y-3 overflow-y-auto z-50 transform transition-transform duration-300 ${
            showSidebar ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Cerrar en móvil */}
          <button
            onClick={() => setShowSidebar(false)}
            className="lg:hidden absolute top-3 right-3 bg-gray-100 p-1 rounded-full"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Estado del sistema */}
          <div className="bg-white rounded-xl shadow-md p-4 border">
            <h3 className="text-sm font-bold text-gray-800 mb-2 flex items-center gap-2">
              <Book className="w-4 h-4 text-blue-600" /> Estado del Sistema
            </h3>
            <div className="text-xs space-y-2">
              <div>
                <label className="font-medium text-gray-600">Estado API:</label>
                <div className={`mt-1 px-2 py-1 rounded font-semibold ${
                  apiStatus === 'online' ? 'bg-green-100 text-green-700' :
                  apiStatus === 'offline' ? 'bg-red-100 text-red-700' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {getStatusText()}
                </div>
              </div>
              <button
                onClick={checkApiStatus}
                className="w-full mt-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" /> Verificar conexión
              </button>
            </div>
          </div>

          {/* Comandos rápidos */}
          <div className="bg-white rounded-xl shadow-md p-4 border">
            <h3 className="text-sm font-bold mb-2">Comandos Rápidos</h3>
            <div className="space-y-1.5">
              {['hola', 'ver programas', 'requisitos', 'fechas', 'contactar asesor'].map((cmd, i) => (
                <button
                  key={i}
                  onClick={() => setInput(cmd)}
                  className="w-full text-left px-2 py-1.5 bg-gray-50 hover:bg-blue-50 rounded-lg text-xs"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-4 text-white shadow-md">
            <h3 className="text-sm font-bold mb-3">Estadísticas</h3>
            <div className="text-xs space-y-1">
              <div className="flex justify-between"><span>Total:</span><span>{messages.length}</span></div>
              <div className="flex justify-between"><span>Usuario:</span><span>{messages.filter(m=>m.sender==='user').length}</span></div>
              <div className="flex justify-between"><span>Bot:</span><span>{messages.filter(m=>m.sender==='bot').length}</span></div>
            </div>
          </div>
        </aside>
      </main>

      {/* FOOTER */}
      <footer className="text-center text-xs py-2 bg-white/60">
        <p>🎓 Universidad Distrital • Rasa 3.6 • {import.meta.env.MODE === 'production' ? '🚀 Producción' : '🔧 Desarrollo'}</p>
      </footer>

      {/* Overlay móvil */}
      {showSidebar && (
        <div
          onClick={() => setShowSidebar(false)}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}
    </div>
  );
}
