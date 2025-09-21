import express from "express";
import { requireAuth } from "./auth.js";

export default function groupRouter(prisma){
  const router = express.Router();

  router.post("/", requireAuth, async (req,res)=>{
    const { name, description } = req.body;

    const userId = req.user.sub;
    const group = await prisma.groups.create({
      data:{
        name, description, creatorId:userId,
        members:{ create:{ userId, role:"OWNER" } }
      }
    });
    res.json(group);
  });

  router.get("/mine", requireAuth, async (req,res)=>{
    const userId = req.user.sub;
    const groups = await prisma.groups.findMany({
      where:{ members:{ some:{ userId } } },
      orderBy:{ createdAt:"desc" }
    });
    res.json(groups);
  });

  router.patch("/:id", requireAuth, async (req,res)=>{
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user.sub;

    const ch = await prisma.groups.findUnique({ where:{ id }});
    if(!ch) return res.status(404).json({error:"Not found"});
    if(ch.creatorId !== userId) return res.status(403).json({error:"Not creator"});

    const updated = await prisma.groups.update({ where:{ id }, data:{ name, description }});
    res.json(updated);
  });

  return router;
}
