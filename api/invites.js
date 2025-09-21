import express from "express";
import { requireAuth } from "./auth.js";
import crypto from "crypto";

export default function inviteRouter(prisma){
  const router = express.Router();

  router.post("/:groupId", requireAuth, async (req,res)=>{
    const { groupId } = req.params;
    const userId = req.user.sub;

    const ch = await prisma.groups.findUnique({ where:{ id:groupId }});
    if(!ch) return res.status(404).json({error:"group not found"});
    if(ch.creatorId !== userId) return res.status(403).json({error:"Not creator"});

    const token = crypto.randomBytes(12).toString("hex");
    const inv = await prisma.invites.create({ data:{ groupId, token, usageLimit:0, usedCount:0 }});
    res.json({ token:inv.token, url:`${req.protocol}://${req.get("host")}/join.html?token=${inv.token}` });
  });

  router.post("/redeem/:token", requireAuth, async (req,res)=>{
    const { token } = req.params;
    const userId = req.user.sub;

    const inv = await prisma.invites.findUnique({ where:{ token }});
    if(!inv) return res.status(400).json({error:"Invalid invite"});
    if(inv.expiresAt && new Date(inv.expiresAt) < new Date()) return res.status(400).json({error:"Invite expired"});
    if(inv.usageLimit && inv.usageLimit > 0 && inv.usedCount >= inv.usageLimit) return res.status(400).json({error:"Invite used up"});

    const isMember = await prisma.groupMembers.findUnique({
                      where: {
                        groupId_userId: {  
                          groupId: inv.groupId,
                          userId: req.user.sub
                        }
                      }
                    });
    if(isMember) return res.status(409).json({ error: "Already a group member" });

    await prisma.groupMembers.upsert({
      where:{ groupId_userId:{ groupId:inv.groupId, userId } },
      update:{},
      create:{ groupId:inv.groupId, userId, role:"MEMBER" }
    });

    await prisma.invites.update({ where:{ token }, data:{ usedCount:{ increment:1 } }});
    res.json({ ok:true, groupId:inv.groupId });
  });

  return router;
}
