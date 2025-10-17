import React, { useRef } from "react";
import Draggable, { DraggableData } from "react-draggable";
import "../styles/AppWindow.css";

interface AppWindowProps {
  title: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  onClose?: () => void;
  onMinimize?: () => void;
  isMinimized?: boolean;
  position?: { x: number; y: number };
  onMove?: (x: number, y: number) => void;
}

const TASKBAR_HEIGHT = 44; // px, must match your CSS

function AppWindow({
  title,
  children,
  width = 400,
  height = 300,
  onClose,
  onMinimize,
  isMinimized = false,
  position = { x: 100, y: 100 },
  onMove,
}: AppWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  // Compute bounds so window can't be moved off screen or below taskbar
  const bounds = {
    left: 0,
    top: 0,
    right: window.innerWidth - width,
    bottom: window.innerHeight - TASKBAR_HEIGHT - height,
  };

  if (isMinimized) return null;

  return (
    <Draggable
      nodeRef={nodeRef}
      position={position}
      handle=".app-window-header"
      bounds={bounds}
      onStop={(_, data: DraggableData) => {
        if (onMove) onMove(data.x, data.y);
      }}
    >
      <div ref={nodeRef} style={{ width, height }}>
        <div className="app-window" style={{ width: "100%", height: "100%" }}>
          <div className="app-window-header">
            <span className="app-window-title">{title}</span>
            <div className="app-window-controls">
              <button className="window-btn" onClick={onMinimize} title="Minimize">_</button>
              <button className="window-btn" onClick={onClose} title="Close">×</button>
            </div>
          </div>
          <div className="app-window-content">{children}</div>
        </div>
      </div>
    </Draggable>
  );
}

export default AppWindow;