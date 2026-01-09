import EditableText from "@/components/common/editable-text"

interface MetadataPendingItemProps {
    value: string
    onChange: (newValue: string) => void
    onCancel: () => void
    placeholder?: string
    color?: string // For border/text theming if needed
    darkTextColor?: string
    lightTextColor?: string
}

export function MetadataPendingItem({ 
    value, 
    onChange, 
    onCancel, 
    placeholder = "Nouveau...", 
    color,
    darkTextColor,
    lightTextColor
}: MetadataPendingItemProps) {
    return (
        <EditableText
            value={value}
            onChange={onChange}
            onCancel={onCancel}
            mode="button"
            rounded={true}
            placeholder={placeholder}
            fontSize={12}
            fontSizeRatio={0.5}
            fontWeight="500"
            autoWidth
            allowEmpty={true}
            emptyInputAtFocus={true}
            startInEditMode={true}
            mainColor={color}
            darkTextColor={darkTextColor}
            lightTextColor={lightTextColor}
        />
    )
}
