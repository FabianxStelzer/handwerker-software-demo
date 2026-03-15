"use client";

import { Component, type ReactNode } from "react";
import { OfflineBanner } from "@/offline/OfflineBanner";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class OfflineBannerSafe extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn("OfflineBanner fehlgeschlagen:", error);
  }

  render() {
    if (this.state.hasError) return null;
    return <OfflineBanner />;
  }
}
