import Chat from "../models/chat_model.js";

/* USER SEND MESSAGE */
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
            adminRead: true,
          },
          {
            sender: "user",
            message,
            isRead: true,
            adminRead: false,
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
      adminRead: false,
    });

    await chat.save();

    res.json({
      success: true,
      data: chat.messages,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ADMIN SEND REPLY */
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
      adminRead: true,
    });

    await chat.save();

    res.json({
      success: true,
      data: chat.messages,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* GET USER CHAT */
export const getUserChat = async (req, res) => {
  try {
    const userId = req.userId;
    const chat = await Chat.findOne({ userId });

    res.json({
      success: true,
      data: chat ? chat.messages : [],
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* USER MARK READ */
export const markChatAsRead = async (req, res) => {
  try {
    const userId = req.userId;
    const chat = await Chat.findOne({ userId });
    if (!chat) return res.json({ success: true });

    chat.messages.forEach((m) => {
      if (m.sender === "admin") m.isRead = true;
    });

    await chat.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* USER UNREAD COUNT */
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.userId;
    const chat = await Chat.findOne({ userId });
    if (!chat) return res.json({ success: true, count: 0 });

    const count = chat.messages.filter(
      (m) => m.sender === "admin" && m.isRead === false
    ).length;

    res.json({ success: true, count });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ADMIN GET ALL CHATS + UNREAD */
export const getAllChats = async (req, res) => {
  try {
    const chats = await Chat.find().populate(
      "userId",
      "name email phone"
    );

    const data = chats.map((chat) => {
      const unreadCount = chat.messages.filter(
        (m) => m.sender === "user" && m.adminRead === false
      ).length;

      return {
        ...chat.toObject(),
        unreadCount,
      };
    });

    res.json({
      success: true,
      data,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

/* ADMIN MARK READ */
export const markAdminChatAsRead = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) return res.json({ success: true });

    chat.messages.forEach((m) => {
      if (m.sender === "user") m.adminRead = true;
    });

    await chat.save();
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};
