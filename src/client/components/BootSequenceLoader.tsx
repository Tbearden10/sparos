import { useEffect, useState } from "react";
import "../styles/BootSequenceLoader.css";

const messages = [
  "Booting SparOS...",
  "Initializing modules...",
  "Prepping orbit...",
  "Ready."
];

export default function BootSequenceLoader({ width = 240 }) {
  const [msgIdx, setMsgIdx] = useState(0);
  useEffect(() => {
    if (msgIdx < messages.length - 1) {
      const id = setTimeout(() => setMsgIdx(msgIdx + 1), 900);
      return () => clearTimeout(id);
    }
  }, [msgIdx]);
  return (
    <div className="bootseq-loader" style={{ width }}>
      <span>{messages[msgIdx]}<span className="bootseq-cursor">|</span></span>
    </div>
  );
}