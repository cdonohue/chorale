import { SandboxAddon } from '@cloudflare/sandbox/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { useLayoutEffect } from 'react'
// @ts-ignore
import { Dracula } from 'xterm-theme'

import '@xterm/xterm/css/xterm.css'
import './App.css'

const terminal = new Terminal({ cursorBlink: true, theme: Dracula })
const fitAddon = new FitAddon()
const sandboxAddon = new SandboxAddon({
  getWebSocketUrl({ origin }) {
    return `${origin}/ws/terminal`
  },
  onStateChange(state, error) {
    if (error) {
      console.error(error)
    } else {
      console.info(state, error)
    }
  },
})

terminal.loadAddon(fitAddon)
terminal.loadAddon(sandboxAddon)

function App() {
  useLayoutEffect(() => {
    terminal.open(document.getElementById('terminal')!)
    fitAddon.fit()
    sandboxAddon.connect({ sandboxId: "default" })

    const controller = new AbortController()
    window.addEventListener("resize", fitAddon.fit, { signal: controller.signal })

    return () => {
      controller.abort();
      sandboxAddon.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-full" id="terminal"></div>
  )
}

export default App
