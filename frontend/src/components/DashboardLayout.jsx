import React from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import ChatBubble from "./ChatBot/ChatBubble";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen bg-dark-bg dark">
      <Sidebar />
      <main className="flex-1 overflow-hidden flex flex-col">
        <Topbar />
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
      
      {/* AI Chat Assistant */}
      <ChatBubble />
    </div>
  );
}
