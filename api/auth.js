import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import express from "express";

export default function authRouter(prisma){
  const router = express.Router();

  router.post("/register", async (req,res)=>{
    try{
      const { username, password } = req.body;
      if(!username || !password) return res.status(400).json({error:"Missing fields"});
      
      const exists = await prisma.users.findUnique({
        where: { username },
        select: { id: true }
      });
      if(exists) return res.status(400).json({error:"Username taken"});

      const passwordHash = await bcrypt.hash(password, 10);
      const user = await prisma.users.create({ data:{ username, passwordHash }});
      res.json({ id:user.id, username:user.username });
    } catch (e) {
      return res.status(500).json({ error: "Internal error" });
    }
  });

  router.post("/login", async (req,res)=>{
    const { username, password } = req.body;
    const user = await prisma.users.findUnique({ where:{ username }});
    if(!user) return res.status(401).json({error:"Invalid credentials"});

    const ok = await bcrypt.compare(password, user.passwordHash);
    if(!ok) return res.status(401).json({error:"Invalid credentials"});

    const token = jwt.sign({ sub:user.id, username }, process.env.JWT_SECRET, { expiresIn:"12h" });
    res.json({ token, user:{ id:user.id, username:user.username }});
  });

  return router;
}

export function requireAuth(req,res,next){
  const hdr = req.headers.authorization || "";
  const token = hdr.startsWith("Bearer ") ? hdr.slice(7) : null;
  if(!token) return res.status(401).json({error:"Missing token"});
  try{
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  }catch{
    res.status(401).json({error:"Invalid token"});
  }
}
