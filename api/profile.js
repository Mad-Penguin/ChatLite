import express from "express";
import { requireAuth } from "./auth.js";

export default function profileRouter(prisma){
  const router = express.Router();

  // get my profile (id, username, displayName, avatarUrl)
  router.get("/me", requireAuth, async (req,res)=>{
    const id = req.user.sub;
    const u = await prisma.users.findUnique({ where:{ id }, select:{ id:true, username:true, avatarUrl:true}});
    res.json(u);
  });

  // update displayName / avatarUrl
  router.patch("/", requireAuth, async (req,res)=>{
    const id = req.user.sub;
    const { displayName, avatarUrl } = req.body;
    const u = await prisma.users.update({ where:{ id }, data:{ displayName, avatarUrl }});
    res.json({ ok:true });
  });

  return router;
}
