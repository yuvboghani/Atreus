'use client'

import { useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"

interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
}

export function ChatInterface() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            role: 'assistant',
            content: 'I have analyzed the job description against your resume. You have strong React experience but are missing Kubernetes. Would you like suggestions for bridging this gap?'
        }
    ])
    const [input, setInput] = useState("")

    const handleSend = () => {
        if (!input.trim()) return

        const newMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input
        }
        setMessages(prev => [...prev, newMessage])
        setInput("")

        // Simulate AI response
        setTimeout(() => {
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: "I recommend highlighting your Docker experience more prominently, as it's related to Kubernetes. Also, consider adding a small Minikube project to your portfolio."
            }])
        }, 800)
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
                                className={`inline-block max-w-[90%] text-sm p-3 ${msg.role === 'user'
                                        ? 'bg-black text-white'
                                        : 'border border-black/20'
                                    }`}
                            >
                                {msg.content}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div className="border-t border-black/20 p-3 flex gap-2">
                <input
                    type="text"
                    placeholder="Ask about your resume..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    className="flex-1 px-3 py-2 border border-black/30 bg-transparent text-sm font-mono focus:outline-none focus:border-black"
                />
                <button
                    onClick={handleSend}
                    className="px-4 py-2 bg-black text-white text-sm hover:bg-black/80 transition-colors"
                >
                    SEND
                </button>
            </div>
        </div>
    )
}
