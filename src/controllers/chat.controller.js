import Chat from "../models/chat_model.js";

/* ---------------- USER SEND MESSAGE ---------------- */
export const sendUserMessage = async (req, res) => {
  try {
    const userId = req.userId;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ message: "Message required" });
    }

    let chat = await Chat.findOne({ userId });

    if (!chat) {
      chat = await Chat.create({
        userId,
        messages: [
          {
            sender: "admin",
            message: "👋 Welcome! Our support team will reply soon.",
            isRead: false,
          },
          {
            sender: "user",
            message,
            isRead: true,
          },
        ],
      });

      return res.status(201).json({
        success: true,
        data: chat.messages,
      });
    }

    chat.messages.push({
      sender: "user",
      message,
      isRead: true,
    });

    await chat.save();

    res.json({
      success: true,
      data: chat.messages,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------------- ADMIN SEND REPLY ---------------- */
export const sendAdminReply = async (req, res) => {
  try {
    const { userId, message } = req.body;

    if (!userId || !message) {
      return res.status(400).json({ message: "userId & message required" });
    }

    const chat = await Chat.findOne({ userId });
    if (!chat) {
      return res.status(404).json({ message: "Chat not found" });
    }

    chat.messages.push({
      sender: "admin",
      message,
      isRead: false,
    });

    await chat.save();

    res.json({
      success: true,
      data: chat.messages,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------------- GET LOGGED-IN USER CHAT ---------------- */
export const getUserChat = async (req, res) => {
  try {
    const userId = req.userId;
    const chat = await Chat.findOne({ userId });

    res.json({
      success: true,
      data: chat ? chat.messages : [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------------- ADMIN GET ALL CHATS ---------------- */
export const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find().populate(
      "userId",
      "name email phone"
    );

    res.json({
      success: true,
      data: chats,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------------- MARK CHAT AS READ ---------------- */
export const markChatAsRead = async (req, res) => {
  try {
    const userId = req.userId;

    const chat = await Chat.findOne({ userId });
    if (!chat) {
      return res.json({ success: true });
    }

    chat.messages.forEach((msg) => {
      if (msg.sender === "admin") {
        msg.isRead = true;
      }
    });

    await chat.save();

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* ---------------- GET UNREAD COUNT ---------------- */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;

    const chat = await Chat.findOne({ userId });
    if (!chat) {
      return res.json({ success: true, count: 0 });
    }

    const count = chat.messages.filter(
      (msg) => msg.sender === "admin" && msg.isRead === false
    ).length;

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
