import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSpotSchema } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get("/api/spots", async (req, res) => {
    try {
      const spots = await storage.getAllSpots();
      res.json(spots);
    } catch (error) {
      console.error("Error fetching spots:", error);
      res.status(500).json({ error: "Failed to fetch spots" });
    }
  });

  app.post("/api/spots", async (req, res) => {
    try {
      const spot = insertSpotSchema.parse(req.body);
      const newSpot = await storage.createSpot(spot);
      res.json(newSpot);
    } catch (error) {
      console.error("Error creating spot:", error);
      res.status(400).json({ error: "Invalid spot data" });
    }
  });

  app.delete("/api/spots/:id", async (req, res) => {
    try {
      await storage.deleteSpot(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting spot:", error);
      res.status(500).json({ error: "Failed to delete spot" });
    }
  });

  return httpServer;
}
