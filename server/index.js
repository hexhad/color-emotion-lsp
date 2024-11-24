const WebSocket = require("ws");



// Color word to hex value mapping
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

// Emotion word to emoji mapping
const emojiMap = {
  happy: "😊",
  sad: "😢",
  angry: "😠",
  love: "❤️",
  smile: "😃",
};

// Initialize WebSocket server
const PORT = process.env.PORT || 4000;
const wss = new WebSocket.Server({ port: PORT }, () =>
  console.log(`LSP Server running on ws://localhost:${PORT}`)
);

// Store active documents and their content
const documents = new Map();

// Handle different message types
const messageHandlers = {
  initialize: () => ({
    capabilities: {
      textDocumentSync: 1, // Incremental updates
      // Add completion provider capability
      completionProvider: {
        triggerCharacters: ["."],
      },
    },
  }),

  "textDocument/didChange": ({ textDocument, contentChanges }, ws) => {
    const text = contentChanges[0].text;
    documents.set(textDocument.uri, text);

    // Analyze text and send diagnostics
    const diagnostics = analyzeText(text);

    // Send diagnostics
    sendNotification(ws, "textDocument/publishDiagnostics", {
      uri: textDocument.uri,
      diagnostics,
    });

    // Send text edits for replacements
    const edits = generateTextEdits(text);

    console.log("[RESPONSE] +++++++++++++++++++++++++++++++");
    console.dir(edits, { depth: null });

    if (edits.length > 0) {
      sendNotification(ws, "textDocument/applyEdit", {
        edit: {
          changes: {
            [textDocument.uri]: edits,
          },
        },
      });
    }
  },
};

// Generate text edits for replacements
const generateTextEdits = (text) => {
  const edits = [];
  const colorRegex =
    /\b(red|green|blue|yellow|orange|purple|pink|black|white|gray)\b/gi;
  const emojiWords = /\b(happy|sad|angry|love|smile)\b/gi;

  // Replace colors with hex values
  let match;
  while ((match = colorRegex.exec(text)) !== null) {
    const colorWord = match[0].toLowerCase();
    edits.push({
      range: {
        start: getPosition(text, match.index),
        end: getPosition(text, match.index + match[0].length),
      },
      newText: colorHexMap[colorWord],
    });
  }

  // Replace emotion words with emojis
  while ((match = emojiWords.exec(text)) !== null) {
    const emoWord = match[0].toLowerCase();
    edits.push({
      range: {
        start: getPosition(text, match.index),
        end: getPosition(text, match.index + match[0].length),
      },
      newText: emojiMap[emoWord],
    });
  }

  return edits;
};

// Text analysis function
const analyzeText = (text) => {
  const diagnostics = [];
  const colorRegex =
    /\b(red|green|blue|yellow|orange|purple|pink|black|white|gray)\b/gi;
  const emojiWords = /\b(happy|sad|angry|love|smile)\b/gi;

  // Analyze colors
  let match;
  while ((match = colorRegex.exec(text)) !== null) {
    const colorWord = match[0].toLowerCase();
    diagnostics.push({
      range: {
        start: getPosition(text, match.index),
        end: getPosition(text, match.index + match[0].length),
      },
      severity: 3, // Information
      message: `Color word "${match[0]}" will be replaced with ${colorHexMap[colorWord]}`,
      source: "color-detector",
    });
  }

  // Analyze emoji words
  while ((match = emojiWords.exec(text)) !== null) {
    const emoWord = match[0].toLowerCase();
    diagnostics.push({
      range: {
        start: getPosition(text, match.index),
        end: getPosition(text, match.index + match[0].length),
      },
      severity: 3,
      message: `Emotion word "${match[0]}" will be replaced with ${emojiMap[emoWord]}`,
      source: "emoji-detector",
    });
  }

  return diagnostics;
};

// Helper function to convert index to line/character position
const getPosition = (text, index) => {
  const lines = text.slice(0, index).split("\n");
  return {
    line: lines.length - 1,
    character: lines[lines.length - 1].length,
  };
};

// Send JSON-RPC notification
const sendNotification = (ws, method, params) => {
  ws.send(
    JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
    })
  );
};

// Send JSON-RPC response
const sendResponse = (ws, id, result, error) => {
  ws.send(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      result,
      error,
    })
  );
};

// Handle WebSocket connections
wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (data) => {
    try {
      const message = JSON.parse(data);
      
      console.log("[REQUEST] +++++++++++++++++++++++++++++++");
      console.dir(message, { depth: null });

      const handler = messageHandlers[message.method];

      if (handler) {
        const result = handler(message.params, ws);
        if (message.id) {
          sendResponse(ws, message.id, result);
        }
      } else {
        console.log("Unknown method:", message.method);
        if (message.id) {
          sendResponse(ws, message.id, null, {
            code: -32601,
            message: "Method not found",
          });
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
      if (message?.id) {
        sendResponse(ws, message.id, null, {
          code: -32000,
          message: error.message,
        });
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});