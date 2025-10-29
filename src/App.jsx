import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader, RefreshCw, Book, ExternalLink, ChevronRight } from 'lucide-react';

const RASA_API = import.meta.env.VITE_RASA_API || '/api';

export default function ChatbotFrontend() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [apiStatus, setApiStatus] = useState('checking');
  const [showSidebar, setShowSidebar] = useState(true);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const checkApiStatus = async () => {
    try {
      const response = await fetch(`${RASA_API}/`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });
      
      if (response.ok) {
        setApiStatus('online');
      } else {
        setApiStatus('error');
      }
    } catch (error) {
      console.error('Error checking API:', error);
      setApiStatus('offline');
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = {
      text: input,
      sender: 'user',
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`${RASA_API}/webhooks/rest/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: sessionId,
          message: messageToSend
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const botMessages = data.map(msg => ({
          text: msg.text || msg.custom?.text || 'Sin respuesta',
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString(),
          buttons: msg.buttons || [],
          image: msg.image || null
        }));
        
        setMessages(prev => [...prev, ...botMessages]);
      } else {
        setMessages(prev => [...prev, {
          text: 'No recibí respuesta del servidor. ¿Puedes intentar de nuevo?',
          sender: 'bot',
          timestamp: new Date().toLocaleTimeString()
        }]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: `❌ Error de conexión: ${error.message}\n\nVerifica que el servidor Rasa esté corriendo en ${RASA_API}`,
        sender: 'bot',
        timestamp: new Date().toLocaleTimeString()
      }]);
      setApiStatus('offline');
    } finally {
      setLoading(false);
    }
  };

  const handleButtonClick = (payload) => {
    setInput(payload);
    setTimeout(() => {
      document.getElementById('message-input')?.focus();
    }, 100);
  };

  const resetChat = () => {
    const newId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(newId);
    setMessages([{
      text: '¡Conversación reiniciada! 🔄\n\n¿En qué puedo ayudarte?',
      sender: 'bot',
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const getStatusColor = () => {
    switch (apiStatus) {
      case 'online': return 'bg-green-500';
      case 'offline': return 'bg-red-500';
      case 'error': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusText = () => {
    switch (apiStatus) {
      case 'online': return 'Conectado';
      case 'offline': return 'Desconectado';
      case 'error': return 'Error';
      default: return 'Verificando...';
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col">
      {/* Header - Altura fija */}
      <div className="flex-none bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-2 rounded-lg">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">
                  Chatbot Postgrados UD
                </h1>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${getStatusColor()} animate-pulse`} />
                  <span className="text-xs text-gray-600">{getStatusText()}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={resetChat}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm"
                title="Reiniciar conversación"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">Reiniciar</span>
              </button>
              
              <button
                onClick={() => setShowSidebar(!showSidebar)}
                className="lg:hidden flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
              >
                <ChevronRight className={`w-4 h-4 transition-transform ${showSidebar ? 'rotate-180' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal - Ocupa el espacio restante */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto h-full px-4 py-4 flex gap-4">
          {/* Panel de Chat - Flex grow */}
          <div className="flex-1 flex flex-col bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Área de Mensajes - Crece y tiene scroll interno */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50 to-white">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  {/* Avatar */}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600' 
                      : 'bg-gradient-to-br from-indigo-600 to-purple-700'
                  }`}>
                    {msg.sender === 'user' ? (
                      <User className="w-4 h-4 text-white" />
                    ) : (
                      <Bot className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`flex flex-col max-w-[70%] ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className={`rounded-xl px-3 py-2 ${
                      msg.sender === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-none'
                        : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {msg.text}
                      </p>
                      
                      {msg.image && (
                        <img 
                          src={msg.image} 
                          alt="Response" 
                          className="mt-2 rounded-lg max-w-full"
                        />
                      )}
                      
                      {msg.buttons && msg.buttons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {msg.buttons.map((btn, btnIdx) => (
                            <button
                              key={btnIdx}
                              onClick={() => handleButtonClick(btn.payload)}
                              className="w-full px-2 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs transition-colors text-left"
                            >
                              {btn.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 mt-1 px-2">
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              ))}
              
              {loading && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-xl rounded-tl-none px-3 py-2 shadow-sm">
                    <div className="flex gap-1.5">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area - Altura fija */}
            <div className="flex-none p-3 bg-white border-t">
              <div className="flex gap-2">
                <input
                  id="message-input"
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escribe tu mensaje..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  disabled={loading || apiStatus === 'offline'}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim() || apiStatus === 'offline'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Panel Lateral - Ancho fijo con scroll interno */}
          <div className={`${showSidebar ? 'block' : 'hidden'} lg:block w-full lg:w-80 flex-none overflow-y-auto space-y-3`}>
            {/* API Info */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Book className="w-4 h-4 text-blue-600" />
                API Info
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-gray-600 font-medium">Estado:</label>
                  <div className={`mt-1 px-2 py-1.5 rounded font-semibold ${
                    apiStatus === 'online' ? 'bg-green-100 text-green-700' :
                    apiStatus === 'offline' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {getStatusText()}
                  </div>
                </div>

                <button
                  onClick={checkApiStatus}
                  className="w-full mt-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center justify-center gap-2 text-xs"
                >
                  <RefreshCw className="w-3 h-3" />
                  Verificar
                </button>

                <a
                  href={`${RASA_API}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full mt-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-xs block text-center"
                >
                  <ExternalLink className="w-3 h-3" />
                  Swagger UI
                </a>
              </div>
            </div>

            {/* Quick Commands */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <h3 className="text-sm font-bold text-gray-800 mb-3">
                Comandos Rápidos
              </h3>
              <div className="space-y-1.5">
                {[
                  'hola',
                  'ver programas',
                  'avalúos',
                  'cuánto cuesta',
                  'requisitos',
                  'fechas de inscripción',
                  'contactar asesor'
                ].map((cmd, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(cmd)}
                    className="w-full text-left px-2 py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-blue-700 rounded-lg transition-colors text-xs"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl shadow-lg p-4 text-white">
              <h3 className="text-sm font-bold mb-3">Estadísticas</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="opacity-90">Total:</span>
                  <span className="font-bold">{messages.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-90">Usuario:</span>
                  <span className="font-bold">
                    {messages.filter(m => m.sender === 'user').length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-90">Bot:</span>
                  <span className="font-bold">
                    {messages.filter(m => m.sender === 'bot').length}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer - Altura fija */}
      <div className="flex-none py-2 text-center text-xs text-gray-600 bg-white/50">
        <p>🎓 Universidad Distrital • Rasa 3.6</p>
      </div>
    </div>
  );
}