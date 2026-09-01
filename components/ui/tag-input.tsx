"use client"

import { useState, KeyboardEvent } from "react"
import { X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TagInputProps {
    value: string[]
    onChange: (tags: string[]) => void
    placeholder?: string
    className?: string
}

export function TagInput({ value, onChange, placeholder, className }: TagInputProps) {
    const [inputValue, setInputValue] = useState("")

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault()
            addTag()
        } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
            removeTag(value.length - 1)
        }
    }

    const addTag = () => {
        const trimmed = inputValue.trim().toLowerCase()
        if (trimmed && !value.includes(trimmed)) {
            onChange([...value, trimmed])
            setInputValue("")
        }
    }

    const removeTag = (index: number) => {
        onChange(value.filter((_, i) => i !== index))
    }

    return (
        <div
            className={cn(
                "flex flex-wrap gap-2 rounded-xl border border-border bg-muted/30 p-2 transition-all focus-within:border-foreground/30",
                className,
            )}
        >
            {value.map((tag, index) => (
                <Badge
                    key={index}
                    variant="secondary"
                    className="gap-1.5 border-border bg-muted py-1 pl-2.5 pr-1 text-xs font-medium text-foreground"
                >
                    {tag}
                    <button
                        type="button"
                        onClick={() => removeTag(index)}
                        className="rounded-sm p-0.5 transition-colors hover:bg-foreground/10"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </Badge>
            ))}
            <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={addTag}
                placeholder={value.length === 0 ? placeholder : ""}
                className="min-w-[120px] flex-1 border-0 bg-transparent px-1 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
            />
        </div>
    )
}
