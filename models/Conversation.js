const mongoose = require("mongoose");

const ConversationSchema = new mongoose.Schema({
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  ],
  lastMessage: {
    text: String,
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    createdAt: Date,
  },
}, { timestamps: true });

module.exports = mongoose.model("Conversation", ConversationSchema);
