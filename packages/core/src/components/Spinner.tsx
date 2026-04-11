import { Text } from "ink"
import InkSpinner from "ink-spinner"
import type React from "react"

interface SpinnerProps {
  label: string
}

export const Spinner: React.FC<SpinnerProps> = ({ label }) => (
  <Text>
    <Text color="green">
      <InkSpinner type="dots" />
    </Text>{" "}
    {label}
  </Text>
)
