import http from "http";
import express from "express";
import morgan from "morgan";
import cors from "cors";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import profileRouter from "../api/profile.js";
import uploadRouter from "../api/upload.js";
import reactionsRouter from "../api/reactions.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET","POST"] } });
const prisma = new PrismaClient();

app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.static("public"));
app.use("/api/profile", profileRouter(prisma));
app.use("/api/upload", uploadRouter());
app.use("/api/reactions", reactionsRouter(prisma, io));

app.get("/healthz", (req,res)=>res.json({ok:true}));

import authRouter from "../api/auth.js";
import groupRouter from "../api/groups.js";
import messageRouter, { wireSockets as wireMessageSockets } from "../api/messages.js";
import inviteRouter from "../api/invites.js";

app.use("/api/auth", authRouter(prisma));
app.use("/api/groups", groupRouter(prisma));
app.use("/api/messages", messageRouter(prisma, io));
app.use("/api/invites", inviteRouter(prisma));

wireMessageSockets(io);

app.get("/", (req,res)=>res.sendFile(process.cwd()+"/public/auth.html"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log(`listening on ${PORT}`));
