import * as React from "react"
import { cn } from "@/lib/utils"

const Textarea = React.forwardRef<
    HTMLTextAreaElement,
    React.ComponentProps<"textarea">
>(({ className, ...props }, ref) => {
    return (
        <textarea
            className={cn(
                "flex min-h-[80px] w-full rounded-none border-2 border-black bg-transparent px-3 py-2 text-base placeholder:text-muted-foreground focus-visible:outline-none focus:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:border-black disabled:cursor-not-allowed disabled:opacity-50 md:text-sm resize-none",
                className
            )}
            ref={ref}
            {...props}
        />
    )
})
Textarea.displayName = "Textarea"

export { Textarea }
