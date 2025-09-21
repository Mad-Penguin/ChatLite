import express from "express";
import { requireAuth } from "./auth.js";

export default function reactionsRouter(prisma, io){
  const router = express.Router();

  // Toggle reaction on a message
  router.post("/:messageId", requireAuth, async (req, res) => {
    try {
      const { messageId } = req.params;
      const { emoji } = req.body;
      const userId = req.user.sub;

      if (!emoji || typeof emoji !== "string") {
        return res.status(400).json({ error: "emoji required" });
      }

      // Ensure message exists & user belongs to the group
      const msg = await prisma.messages.findUnique({
        where: { id: messageId },
        select: { id: true, groupId: true }
      });
      if (!msg) return res.status(404).json({ error: "Message not found" });

      const membership = await prisma.groupMembers.findUnique({
        where: { groupId_userId: { groupId: msg.groupId, userId } }
      });
      if (!membership) return res.status(403).json({ error: "Not a group member" });

      // Toggle (if exists → remove; else → add)
      const whereKey = { messageId_userId_emoji: { messageId, userId, emoji } };

      const existing = await prisma.reactions.findUnique({ where: whereKey });
      let op = "add";
      if (existing) {
        await prisma.reactions.delete({ where: whereKey });
        op = "remove";
      } else {
        await prisma.reactions.create({ data: { messageId, userId, emoji } });
      }

      // Compute the new count for that emoji on this message
      const count = await prisma.reactions.count({ where: { messageId, emoji } });

      // Emit realtime update to the group room
      io.to(String(msg.groupId)).emit("reaction:update", {
        messageId,
        emoji,
        count,
        userId,
        op // "add" | "remove"
      });

      return res.json({ ok: true, messageId, emoji, count, op });
    } catch (e) {
      console.error("REACTION TOGGLE ERROR:", e);
      return res.status(500).json({ error: "Internal error" });
    }
  });

  return router;
}
