import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface ChatMessageProps {
  message: {
    role: string
    content: string
    id?: string
    isTyping?: boolean
  }
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isAssistant = message.role === "assistant"

  // Ensure content is a string
  const content = typeof message.content === "string" ? message.content : JSON.stringify(message.content)

  return (
    <div className={cn("flex gap-3 mb-4", isAssistant ? "flex-row" : "flex-row-reverse")}>
      {isAssistant && (
        <Avatar className="w-8 h-8">
          <AvatarImage 
            src="/furuppy.gif" 
            alt="Furuppy"
            className="object-contain"
          />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}

      <Card className={cn("max-w-[80%] p-3", isAssistant ? "bg-primary text-white" : "bg-muted")}>
        <p className="text-sm whitespace-pre-wrap">
          {content}
          {message.isTyping && <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse"></span>}
        </p>
      </Card>
    </div>
  )
}

