// Import required modules
import express from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import cors from "cors";
import QuillDelta from "quill-delta";

// Create an Express application
const app = express();
app.use(cors()); // Enable CORS

// Create HTTP server using Express
const server = http.createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(server, {
  cors: { origin: "*" }, // Allow all origins
});

// In-memory storage of document and users
let document = new QuillDelta(); // Shared document content
const users = new Map<string, string>(); // Map of socket.id to usernames
const typingUsers = new Set<string>(); // Set of users currently typing
const typingTimeouts = new Map<string, NodeJS.Timeout>(); // Timeout references for each typing user

// Helper function to handle typing notifications
const handleTyping = (socket: Socket, username: string) => {
  // If user is not already in typingUsers, add and notify others
  if (!typingUsers.has(username)) {
    typingUsers.add(username);
    io.emit("typing", username);
  }

  // Clear any previous typing timeout for the user
  if (typingTimeouts.has(username)) {
    clearTimeout(typingTimeouts.get(username)!);
  }

  // Set a new timeout to auto-stop typing after 1 second of inactivity
  const timeout = setTimeout(() => {
    typingUsers.delete(username);
    io.emit("stop-typing", username);
  }, 1000);

  typingTimeouts.set(username, timeout);
};

// Handle new Socket.IO connections
io.on("connection", (socket: Socket) => {
  console.log("New client connected", socket.id);

  // Handle user joining with username
  socket.on("join", (username: string, callback) => {
    const isUsernameTaken = Array.from(users.values()).includes(username);

    if (isUsernameTaken) {
      // Notify user if username is already taken
      if (typeof callback === "function") {
        callback({ success: false, message: "Username is already taken" });
      }
      return;
    }

    // Store user with socket ID
    users.set(socket.id, username);

    // Send current document to the newly joined user
    socket.emit("load-document", document);

    // Notify all clients about the updated user list
    io.emit("user-list", Array.from(users.values()));

    if (typeof callback === "function") {
      callback({ success: true });
    }
  });

  // Handle client requesting the current document
  socket.on("get-document", () => {
    socket.emit("load-document", document);
  });

  // Handle incoming changes to the document from a user
  socket.on("send-changes", (delta: any) => {
    const user = users.get(socket.id) || "Unknown";

    // Broadcast changes to all other users
    socket.broadcast.emit("receive-changes", { delta, user });

    // Apply the change to the shared document
    document = document.compose(new QuillDelta(delta));
  });

  // Handle "typing" notification from a user
  socket.on("typing", (username: string) => {
    handleTyping(socket, username);
  });

  // Handle "stop typing" notification from a user
  socket.on("stop-typing", (username: string) => {
    typingUsers.delete(username);
    io.emit("stop-typing", username);
  });

  // Handle user disconnect
  socket.on("disconnect", () => {
    const username = users.get(socket.id);
    if (username) {
      typingUsers.delete(username);
      io.emit("user-list", Array.from(users.values())); // Update active users list
    }
    users.delete(socket.id); // Remove user from map
    console.log("Client disconnected", socket.id);
  });
});

// Start the server on port 3000
server.listen(3000, () => {
  console.log("Server listening on http://localhost:3000");
});
