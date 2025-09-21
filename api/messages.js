import express from "express";
import { requireAuth } from "./auth.js";
import { shapeReactions } from "../api/utils/reactions.js";

let ioRef = null;
export function wireSockets(io){
  ioRef = io;
  io.on("connection", (socket)=>{
    socket.on("group:join", (groupId)=> socket.join(groupId));
  });
}

export default function messageRouter(prisma, io){
  const router = express.Router();

  router.get("/:groupId", requireAuth, async (req,res)=>{
    const { groupId } = req.params;
    const { cursor } = req.query;
    const userId = req.user.sub;

    const messages = await prisma.messages.findMany({
      where:{ groupId },
      orderBy:{ createdAt:"desc" },
      take:50,
      ...(cursor ? { cursor:{ id:cursor }, skip:1 } : {}),
      include: {
        user: { select: { username: true , avatarUrl: true } },
        reactions: { select: {emoji: true, userId: true} }
      }
    });

    const items = messages.reverse().map(m => {
      const  {counts, myReactions} = shapeReactions(m.reactions, userId);

      return {
        id: m.id,
        groupId: m.groupId,
        userId: m.userId,
        username: m.user?.username ?? null,
        avatarUrl: m.user?.avatarUrl ?? null,
        content: m.content,
        imageUrl: m.imageUrl,
        createdAt: m.createdAt,
        reactions: counts,       
        myReactions: myReactions          
      };
    });

    res.json({ items, nextCursor: messages[0]?.id });
  });

  router.post("/:groupId", requireAuth, async (req,res)=>{
    try{
      const { groupId } = req.params;
      const userId = req.user.sub;
      const { content } = req.body;
      if(!content?.trim()) return res.status(400).json({error:"Empty content"});

      const mem = await prisma.groupMembers.findUnique({ where:{ groupId_userId:{ groupId, userId } }});
      if(!mem) return res.status(403).json({error:"Not a member"});

      const msg = await prisma.messages.create({
        data: { groupId, userId, content: content || "" },
        include: { user: { select: { username: true , avatarUrl: true } } }
      });
      io.to(groupId).emit("message:new", {
        id: msg.id,
        groupId,
        userId,
        avatarUrl: msg.user.avatarUrl,
        username: msg.user.username,
        content: msg.content,
        createdAt: msg.createdAt
      });
      res.json(msg);
    }catch(e){
      console.log("[Error]", e);
    }
  });

  return router;
}
