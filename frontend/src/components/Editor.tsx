import React, { useEffect, useRef, useState } from "react";
import Quill from "quill";
import "quill/dist/quill.snow.css";
import { io, Socket } from "socket.io-client";
import toast from "react-hot-toast";

// Define toolbar options for the Quill editor
const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, false] }],
  ["bold", "italic", "underline"],
  [{ list: "ordered" }, { list: "bullet" }],
  ["link", "image"],
  ["clean"],
];

// Server URL loaded from environment variables
const SERVER_URL = import.meta.env.VITE_SERVER_URL;

// Interface for receiving delta changes from the server
interface ChangePayload {
  delta: any;
  user: string;
}

const CollaborativeEditor: React.FC = () => {
  // State to manage socket connection
  const [socket, setSocket] = useState<Socket | null>(null);

  // Username states
  const [username, setUsername] = useState<string>("");
  const [inputName, setInputName] = useState<string>("");

  // List of active users and join state
  const [userList, setUserList] = useState<string[]>([]);
  const [joined, setJoined] = useState<boolean>(false);

  // Track last editor and typing users
  const [lastEditor, setLastEditor] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [typingTimeout, setTypingTimeout] = useState<any>(null);

  // Refs for editor instance and container
  const editorRef = useRef<Quill | null>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);

  // Handle login button click
  const handleLogin = () => {
    if (!inputName.trim()) return;
    setUsername(inputName.trim());
  };

  // Initialize socket connection after username is set
  useEffect(() => {
    if (!username) return;

    const s = io(SERVER_URL);

    // Listen for updated list of connected users
    s.on("user-list", (users: string[]) => {
      setUserList(users);
    });

    // Add user to typing list when typing event received
    s.on("typing", (user: string) => {
      setTypingUsers((prev) => [...prev, user]);
    });

    // Remove user from typing list when stop-typing event received
    s.on("stop-typing", (user: string) => {
      setTypingUsers((prev) => prev.filter((u) => u !== user));
    });

    // Handle join event and duplicate username error
    s.on("connect", () => {
      s.emit("join", username, (response: { success: boolean; message?: string }) => {
        if (!response.success) {
          toast.error("Username already exists");
          setUsername("");
          s.disconnect();
        } else {
          setJoined(true);
        }
      });
    });

    setSocket(s);

    // Cleanup socket connection on unmount
    return () => {
      s.disconnect();
    };
  }, [username]);

  // Initialize the Quill editor once socket is connected and user has joined
  useEffect(() => {
    if (!joined || !editorContainerRef.current || editorRef.current || !socket) return;

    // Create Quill editor instance
    const editor = new Quill(editorContainerRef.current, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS },
    });

    editor.disable(); // Disable editor until document is loaded
    editorRef.current = editor;

    // Request current document from server
    socket.emit("get-document");

    // Load initial document content from server
    socket.once("load-document", (doc) => {
      editor.setContents(doc);
      editor.enable();
    });

    // Handle incoming changes from other users
    socket.on("receive-changes", ({ delta, user }: ChangePayload) => {
      editor.updateContents(delta);
      setLastEditor(user);
    });

    // Emit changes when the user makes edits
    const handleChange = (delta: any, _old: any, source: string) => {
      if (source !== "user") return;
      socket.emit("send-changes", delta);
      socket.emit("stop-typing", username);
    };

    editor.on("text-change", handleChange);

    // Fallback: force-enable editor after 2s if needed
    const fallback = setTimeout(() => {
      if (!editor.isEnabled()) editor.enable();
    }, 2000);

    // Cleanup on component unmount
    return () => {
      clearTimeout(fallback);
      editor.off("text-change", handleChange);
      socket.off("receive-changes");
      socket.off("load-document");
    };
  }, [joined, socket]);

  // Handle typing event and stop-typing debounce
  const handleTyping = () => {
    if (!socket || !username) return;

    if (typingTimeout) clearTimeout(typingTimeout);

    socket.emit("typing", username);

    const timeout = setTimeout(() => {
      socket.emit("stop-typing", username);
    }, 1000);

    setTypingTimeout(timeout);
  };

  // Login screen UI
  if (!username || !joined) {
    return (
      <div className="h-screen flex flex-col justify-center items-center bg-gray-100 px-4">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
          <h2 className="text-2xl font-semibold mb-4 text-center">Join the Collaborative Editor</h2>
          <input
            type="text"
            placeholder="Enter your name"
            value={inputName}
            onChange={(e) => setInputName(e.target.value)}
            className="p-2 text-lg border border-gray-300 rounded w-full mb-4"
          />
          <button
            onClick={handleLogin}
            className="px-4 py-2 bg-blue-600 text-white rounded w-full hover:bg-blue-700"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  // Main editor UI
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-2">Collaborative Rich Text Editor</h2>

      {/* Display logged-in username */}
      <div className="flex gap-2 items-center mb-2 flex-wrap">
        <div className="text-lg font-bold">Logged in as:</div>
        <div className="text-lg font-semibold text-red-500">{username}</div>
      </div>

      {/* Display list of active users */}
      <div className="flex gap-2 items-center mb-4 flex-wrap">
        <div className="text-lg font-bold">Active Users:</div>
        {userList.map((u, i) => (
          <span key={i} className="text-blue-500 inline-block text-lg font-semibold">
            {u},
          </span>
        ))}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="mt-2 italic text-gray-700 bg-gray-100 p-2 rounded inline-block">
          {typingUsers.join(", ")} {typingUsers.length > 1 ? "are" : "is"} typing...
        </div>
      )}

      {/* Quill editor container */}
      <div
        ref={editorContainerRef}
        className="min-h-[60vh] bg-white mt-4 border-2 border-black p-4 rounded-lg"
        onInput={handleTyping}
      />

      {/* Display last user who edited */}
      {lastEditor && (
        <div className="mt-2 italic text-gray-700 bg-gray-100 p-2 rounded inline-block">
          Last edited by <strong>{lastEditor}</strong>
        </div>
      )}
    </div>
  );
};

export default CollaborativeEditor;
