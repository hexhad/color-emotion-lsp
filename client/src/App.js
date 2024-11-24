import React, { useState, useEffect, useRef } from "react";
import Editor from "@monaco-editor/react";

const App = () => {
  const [status, setStatus] = useState("disconnected");
  const wsRef = useRef(null);
  const editorRef = useRef(null);
  const documentVersion = useRef(0);

  // Color and emoji mappings (matching server-side)
  const colorHexMap = {
    red: "#FF0000",
    green: "#008000",
    blue: "#0000FF",
    yellow: "#FFFF00",
    orange: "#FFA500",
    purple: "#800080",
    pink: "#FFC0CB",
    black: "#000000",
    white: "#FFFFFF",
    gray: "#808080",
  };

  const emojiMap = {
    happy: "😊",
    sad: "😢",
    angry: "😠",
    love: "❤️",
    smile: "😃",
  };

  // Setup Monaco editor configuration
  const editorOptions = {
    minimap: { enabled: false },
    fontSize: 14,
    lineHeight: 21,
    padding: { top: 10 },
    scrollBeyondLastLine: false,
    automaticLayout: true,
    wordWrap: "on",
  };

  // Function to create decorations for both colors and emojis
  const createDecorations = (monaco, editor, diagnostics) => {
    const model = editor.getModel();
    if (!model) return [];

    return diagnostics
      .map((diagnostic) => {
        const startPos = model.getPositionAt(diagnostic.range.start.character);
        const endPos = model.getPositionAt(diagnostic.range.end.character);
        const word = model.getWordAtPosition(startPos);

        if (!word) return null;

        // If the diagnostic is about a color
        if (diagnostic.message.includes("Color word")) {
          const colorWord = word.word.toLowerCase();
          return {
            range: new monaco.Range(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column
            ),
            options: {
              inlineClassName: `color-${colorWord}`,
              className: `color-${colorWord}-bg`,
              hoverMessage: { value: diagnostic.message },
            },
          };
        }
        // If the diagnostic is about an emoji
        else if (diagnostic.message.includes("Emotion word")) {
          const emoWord = word.word.toLowerCase();
          return {
            range: new monaco.Range(
              startPos.lineNumber,
              startPos.column,
              endPos.lineNumber,
              endPos.column
            ),
            options: {
              inlineClassName: "emoji-word",
              className: "emoji-word-bg",
              hoverMessage: { value: diagnostic.message },
            },
          };
        }
        return null;
      })
      .filter(Boolean);
  };

  const connect = () => {
    wsRef.current = new WebSocket("ws://localhost:4000");

    wsRef.current.onopen = () => {
      setStatus("connected");
      wsRef.current.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            capabilities: {},
          },
        })
      );
    };

    wsRef.current.onclose = () => {
      setStatus("disconnected");
      setTimeout(connect, 3000);
    };

    wsRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);

      console.log(JSON.parse(event.data));

      // Handle diagnostics
      if (
        message.method === "textDocument/publishDiagnostics" &&
        editorRef.current
      ) {
        const monaco = window.monaco;
        const editor = editorRef.current;
        const decorations = createDecorations(
          monaco,
          editor,
          message.params.diagnostics
        );
        editor.deltaDecorations([], decorations);
      }

      // Handle text edits
      if (message.method === "textDocument/applyEdit" && editorRef.current) {
        const editor = editorRef.current;
        const model = editor.getModel();

        if (model && message.params.edit.changes) {
          const edits = message.params.edit.changes["inmemory://document.txt"];
          const operations = edits.map((edit) => ({
            range: {
              startLineNumber: edit.range.start.line + 1,
              startColumn: edit.range.start.character + 1,
              endLineNumber: edit.range.end.line + 1,
              endColumn: edit.range.end.character + 1,
            },
            text: edit.newText,
          }));

          model.pushEditOperations([], operations, () => null);
        }
      }
    };

    wsRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setStatus("error");
    };
  };

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, []);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Add CSS for color and emoji highlighting
    const style = document.createElement("style");
    style.textContent = `
      .color-red-bg { background-color: rgba(255, 0, 0, 1); }
      .color-blue-bg { background-color: rgba(0, 0, 255, 1); }
      .color-green-bg { background-color: rgba(0, 255, 0, 1); }
      .color-yellow-bg { background-color: rgba(255, 255, 0, 1); }
      .color-orange-bg { background-color: rgba(255, 165, 0, 1); }
      .color-purple-bg { background-color: rgba(128, 0, 128, 1); }
      .color-pink-bg { background-color: rgba(255, 192, 203, 1); }
      .color-black-bg { background-color: rgba(0, 0, 0, 1); }
      .color-white-bg { background-color: rgba(255, 255, 255, 1); }
      .color-gray-bg { background-color: rgba(128, 128, 128, 1); }
      .emoji-word-bg { background-color: rgba(255, 223, 186, 0); }
    `;
    document.head.appendChild(style);

    // Register custom completions for both colors and emojis
    monaco.languages.registerCompletionItemProvider("plaintext", {
      provideCompletionItems: (model, position) => {
        const colorSuggestions = Object.keys(colorHexMap).map((color) => ({
          label: color,
          kind: monaco.languages.CompletionItemKind.Color,
          insertText: color,
          detail: `Insert color: ${color} (${colorHexMap[color]})`,
          documentation: `Add the color ${color}`,
        }));

        const emojiSuggestions = Object.keys(emojiMap).map((emotion) => ({
          label: emotion,
          kind: monaco.languages.CompletionItemKind.Text,
          insertText: emotion,
          detail: `Insert emotion: ${emotion} (${emojiMap[emotion]})`,
          documentation: `Add the emotion ${emotion}`,
        }));

        return {
          suggestions: [...colorSuggestions, ...emojiSuggestions],
        };
      },
    });
  };

  const handleEditorChange = (value) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      documentVersion.current++;
      
      const stringified = JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/didChange",
        params: {
          textDocument: {
            uri: "inmemory://document.txt",
            version: documentVersion.current,
          },
          contentChanges: [{ text: value }],
        },
      });

      console.log("[CLIENT:ON SEND] +++++++++++++++++++++++++++++++");
      console.dir(stringified, { depth: null });

      wsRef.current.send(stringified);
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Editor
        defaultLanguage="plaintext"
        defaultValue="Type color words (red, blue, green...) or emotion words (happy, sad, angry...)"
        options={editorOptions}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
      />
    </div>
  );
};

export default App;
