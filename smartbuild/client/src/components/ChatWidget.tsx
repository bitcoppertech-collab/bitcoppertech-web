import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MessageSquare,
  X,
  Send,
  Bug,
  Minus,
  Bot,
  User,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type WidgetView = "closed" | "chat" | "bug";

export default function ChatWidget() {
  const [view, setView] = useState<WidgetView>("closed");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [bugDescription, setBugDescription] = useState("");
  const [bugSubmitting, setBugSubmitting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (view === "chat" && inputRef.current) {
      inputRef.current.focus();
    }
  }, [view]);

  async function handleSend() {
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const userMessage: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMessage: ChatMessage = { role: "assistant", content: "" };
    setMessages([...newMessages, assistantMessage]);

    try {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
        credentials: "include",
      });

      if (!response.ok) throw new Error("Error en la respuesta");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Sin stream");

      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));
            if (event.content) {
              fullContent += event.content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: fullContent };
                return updated;
              });
            }
            if (event.done) break;
          } catch {}
        }
      }
    } catch (error) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Lo siento, hubo un error al procesar tu consulta. Por favor intenta nuevamente.",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleBugSubmit() {
    if (bugDescription.trim().length < 5) {
      toast({ title: "Error", description: "La descripción debe tener al menos 5 caracteres", variant: "destructive" });
      return;
    }
    setBugSubmitting(true);
    try {
      await apiRequest("POST", "/api/assistant/bug-report", { description: bugDescription.trim() });
      toast({ title: "Reporte Enviado", description: "Tu reporte de error ha sido guardado exitosamente." });
      setBugDescription("");
      setView("chat");
    } catch {
      toast({ title: "Error", description: "No se pudo guardar el reporte", variant: "destructive" });
    } finally {
      setBugSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (view === "closed") {
    return (
      <button
        onClick={() => setView("chat")}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-[#1a2744] to-[#0f1a2e] text-white shadow-xl shadow-[#1a2744]/30 hover:shadow-[#1a2744]/50 hover:scale-105 transition-all duration-200 flex items-center justify-center border border-[#c77b3f]/30"
        data-testid="button-chat-open"
      >
        <MessageSquare className="w-6 h-6 text-[#c77b3f]" />
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 w-[380px] max-h-[560px] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-black/30 border border-[#c77b3f]/20 bg-[#0d1520]"
      data-testid="widget-chat"
    >
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#1a2744] to-[#152035] border-b border-[#c77b3f]/20">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#c77b3f]/15 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-[#c77b3f]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white leading-none" data-testid="text-chat-title">
              Bitcopper AI Assistant
            </h3>
            <p className="text-[10px] text-[#c77b3f]/70 mt-0.5">Experto en construcción</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded-md hover:bg-white/10",
              view === "bug" ? "bg-red-500/20 text-red-400" : "text-gray-400"
            )}
            onClick={() => setView(view === "bug" ? "chat" : "bug")}
            data-testid="button-chat-bug"
            title="Reportar un Error"
          >
            <Bug className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-gray-400 hover:bg-white/10"
            onClick={() => setView("closed")}
            data-testid="button-chat-minimize"
          >
            <Minus className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-md text-gray-400 hover:bg-white/10 hover:text-red-400"
            onClick={() => {
              setView("closed");
              setMessages([]);
            }}
            data-testid="button-chat-close"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {view === "bug" ? (
        <div className="flex-1 p-4 space-y-3" data-testid="view-bug-report">
          <div className="flex items-center gap-2 text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Reportar un Error</span>
          </div>
          <p className="text-xs text-gray-400">
            Describe el problema que encontraste. Nuestro equipo lo revisará lo antes posible.
          </p>
          <Textarea
            value={bugDescription}
            onChange={(e) => setBugDescription(e.target.value)}
            placeholder="Describe el error con el mayor detalle posible..."
            rows={5}
            className="bg-[#1a2744]/50 border-[#c77b3f]/20 text-white placeholder:text-gray-500 resize-none text-sm"
            data-testid="textarea-bug-description"
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 border-gray-600 text-gray-300 hover:bg-white/5"
              onClick={() => setView("chat")}
              data-testid="button-bug-cancel"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              onClick={handleBugSubmit}
              disabled={bugSubmitting || bugDescription.trim().length < 5}
              data-testid="button-bug-submit"
            >
              {bugSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Bug className="w-3.5 h-3.5 mr-1" />}
              Enviar Reporte
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[300px] max-h-[400px] scrollbar-thin" data-testid="chat-messages">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center py-8 space-y-3">
                <div className="w-12 h-12 rounded-xl bg-[#c77b3f]/10 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-[#c77b3f]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">¡Hola! Soy tu asistente</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[250px]">
                    Consulta precios de Sodimac/Easy, pide ayuda con la plataforma o reporta un error.
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center mt-2">
                  {["¿Precio del cemento?", "¿Cómo exporto PDF?", "Comparar fierro"].map(q => (
                    <button
                      key={q}
                      onClick={() => { setInput(q); }}
                      className="text-[10px] px-2.5 py-1 rounded-full bg-[#1a2744] text-[#c77b3f]/80 hover:bg-[#1a2744]/80 hover:text-[#c77b3f] transition-colors border border-[#c77b3f]/10"
                      data-testid={`button-suggestion-${q.replace(/[^a-zA-Z]/g, '').toLowerCase()}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  msg.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-6 h-6 rounded-md bg-[#c77b3f]/15 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-[#c77b3f]" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                    msg.role === "user"
                      ? "bg-[#c77b3f] text-white rounded-br-sm"
                      : "bg-[#1a2744] text-gray-200 rounded-bl-sm border border-[#c77b3f]/10"
                  )}
                  data-testid={`chat-message-${msg.role}-${i}`}
                >
                  {msg.content || (
                    <div className="flex items-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-[#c77b3f]" />
                      <span className="text-xs text-gray-400">Pensando...</span>
                    </div>
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="w-6 h-6 rounded-md bg-[#1a2744] flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-3 border-t border-[#c77b3f]/10 bg-[#0d1520]">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta..."
                rows={1}
                className="flex-1 bg-[#1a2744]/50 border-[#c77b3f]/15 text-white placeholder:text-gray-500 resize-none text-sm min-h-[36px] max-h-[80px]"
                disabled={isStreaming}
                data-testid="textarea-chat-input"
              />
              <Button
                size="icon"
                className="h-9 w-9 bg-[#c77b3f] hover:bg-[#b06a30] text-white shrink-0"
                onClick={handleSend}
                disabled={!input.trim() || isStreaming}
                data-testid="button-chat-send"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
