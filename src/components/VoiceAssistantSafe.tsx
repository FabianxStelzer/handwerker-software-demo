"use client";

import { Component, type ReactNode } from "react";
import { VoiceAssistant } from "./layout/voice-assistant";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class VoiceAssistantSafe extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("VoiceAssistant fehlgeschlagen:", error);
  }

  render() {
    if (this.state.hasError) return null;
    return <VoiceAssistant />;
  }
}
