import { namespaceWrapper, app } from "@_koii/task-manager/namespace-wrapper";
import { IPManager } from './ip-manager';

/**
 * 
 * Define all your custom routes here
 * 
 */

const ipManager = IPManager.getInstance();

export async function routes() {
  // Original value route
  app.get("/value", async (_req: any, res: any) => {
    const value = await namespaceWrapper.storeGet("value");
    console.log("value", value);
    res.status(200).json({ value: value });
  });

  // Debug route for IPManager state
  app.get("/debug/ip-manager", async (_req: any, res: any) => {
    try {
      const debugInfo = ipManager.getDebugInfo();
      res.status(200).json({
        success: true,
        data: debugInfo,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error getting IPManager debug info:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to get debug info" 
      });
    }
  });

  // Health check route
  app.get("/health", async (_req: any, res: any) => {
    try {
      const taskState = await namespaceWrapper.getTaskState({});
      const currentRound = await namespaceWrapper.getRound();
      
      res.status(200).json({
        success: true,
        health: "OK",
        currentRound,
        taskActive: taskState?.is_active || false,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Health check failed" 
      });
    }
  });
}
