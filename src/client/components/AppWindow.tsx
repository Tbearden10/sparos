import React, { useRef } from "react";
import Draggable, { DraggableData } from "react-draggable";
import { ResizableBox } from "react-resizable";
import "react-resizable/css/styles.css";
import "../styles/AppWindow.css";

interface AppWindowProps {
  title: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  minConstraints?: [number, number];
  maxConstraints?: [number, number];
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isMinimized?: boolean;
  isMaximized?: boolean;
  position?: { x: number; y: number };
  onMove?: (x: number, y: number) => void;
}

function AppWindow({
  title,
  children,
  width = 400,
  height = 300,
  minConstraints = [300, 200],
  maxConstraints = [800, 600],
  onClose,
  onMinimize,
  onMaximize,
  isMinimized = false,
  isMaximized = false,
  position = { x: 100, y: 100 },
  onMove,
}: AppWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);

  // Hide the app entirely when minimized
  if (isMinimized) return null;

  return (
    <Draggable
      grid={[20, 20]}
      nodeRef={nodeRef}
      position={position}
      onStop={(_, data: DraggableData) => {
        if (onMove) onMove(data.x, data.y);
      }}
    >
      <div ref={nodeRef}>
        <ResizableBox
          width={isMaximized ? maxConstraints[0] : width}
          height={isMaximized ? maxConstraints[1] : height}
          minConstraints={minConstraints}
          maxConstraints={maxConstraints}
          handle={<span className="resize-handle" />}
        >
          <div className="app-window">
            <div className="app-window-header">
              <span className="app-window-title">{title}</span>
              <div className="app-window-controls">
                <button className="window-btn" onClick={onMinimize} title="Minimize">_</button>
                <button className="window-btn" onClick={onMaximize} title="Maximize">{isMaximized ? "🗗" : "🗖"}</button>
                <button className="window-btn" onClick={onClose} title="Close">×</button>
              </div>
            </div>
            <div className="app-window-content">{children}</div>
          </div>
        </ResizableBox>
      </div>
    </Draggable>
  );
}

export default AppWindow;