'use client'

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2 } from "lucide-react"

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
}

interface ChatInterfaceProps {
    jobId: string
}

export function ChatInterface({ jobId }: ChatInterfaceProps) {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'I have analyzed the job description against your resume. Ask me anything about your fit, potential interview questions, or how to improve your application.'
        }
    ])
    const [input, setInput] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    const handleSend = async () => {
        if (!input.trim() || isLoading) return

        const userMsg: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        }

        setMessages(prev => [...prev, userMsg])
        setInput("")
        setIsLoading(true)

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    job_id: jobId,
                    message: userMsg.content,
                    // user_id is optional, logic on server handles org_id lookup
                })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to send message')
            }

            const assistantMsg: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.message
            }
            setMessages(prev => [...prev, assistantMsg])

        } catch (error) {
            console.error('Chat error:', error)
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I'm sorry, I encountered an error. Please try again."
            }])
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col border border-black/20 h-[400px]">
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className={`${msg.role === 'user' ? 'text-right' : ''}`}>
                            <div className="text-xs opacity-40 mb-1 uppercase tracking-wider">
                                {msg.role === 'user' ? 'YOU' : 'COACH'}
                            </div>
                            <div
                                className={`inline-block max-w-[90%] text-sm p-3 whitespace-pre-wrap ${msg.role === 'user'
                                    ? 'bg-black text-white'
                                    : 'border border-black/20'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="border border-black/20 p-3 flex items-center gap-2 text-sm opacity-60">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            <div className="border-t border-black/20 p-3 flex gap-2">
                <input
                    type="text"
                    placeholder="Ask about your resume..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    disabled={isLoading}
                    className="flex-1 px-3 py-2 border border-black/30 bg-transparent text-sm font-mono focus:outline-none focus:border-black disabled:opacity-50"
                />
                <button
                    onClick={handleSend}
                    disabled={isLoading}
                    className="px-4 py-2 bg-black text-white text-sm hover:bg-black/80 transition-colors disabled:opacity-50"
                >
                    SEND
                </button>
            </div>
        </div>
    )
}
