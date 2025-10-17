import Draggable from "react-draggable";
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
}: AppWindowProps) {
  return (
    <Draggable grid={[20, 20]}>
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
              <button onClick={onMinimize} title="Minimize">_</button>
              <button onClick={onMaximize} title="Maximize">{isMaximized ? "🗗" : "🗖"}</button>
              <button onClick={onClose} title="Close">×</button>
            </div>
          </div>
          {!isMinimized && (
            <div className="app-window-content">{children}</div>
          )}
        </div>
      </ResizableBox>
    </Draggable>
  );
}

export default AppWindow;