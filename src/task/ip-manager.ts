import axios from 'axios';
import { createHash } from 'crypto';

interface NodeInfo {
    nodeId: string;
    startTime: number;
    stakeAmount: number;
    lastSeen: number;
}

interface IPGroup {
    nodes: Map<string, NodeInfo>;
    lastUpdated: number;
}

export class IPManager {
    private static instance: IPManager;
    private ipGroups: Map<string, IPGroup> = new Map();
    private readonly MAX_NODES_PER_IP = 4;
    private readonly GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
    private readonly IP_SERVICES = [
        'https://api.ipify.org',
        'https://icanhazip.com'
    ];

    private constructor() {}

    /**
     * Get singleton instance of IPManager
     */
    public static getInstance(): IPManager {
        if (!IPManager.instance) {
            IPManager.instance = new IPManager();
        }
        return IPManager.instance;
    }

    /**
     * Fetches the public IP address of the current node
     */
    public async getPublicIP(): Promise<string> {
        for (const service of this.IP_SERVICES) {
            try {
                const response = await axios.get(service, { timeout: 5000 });
                return response.data.trim();
            } catch (error) {
                console.warn(`Failed to fetch IP from ${service}:`, error);
            }
        }
        throw new Error('Failed to determine public IP address');
    }

    /**
     * Hashes an IP address for privacy
     */
    private hashIP(ip: string): string {
        return createHash('sha256').update(ip).digest('hex');
    }

    /**
     * Adds or updates a node in the IP group
     */
    public addNode(ip: string, nodeId: string, startTime: number, stakeAmount: number): void {
        const hashedIP = this.hashIP(ip);
        if (!this.ipGroups.has(hashedIP)) {
            this.ipGroups.set(hashedIP, {
                nodes: new Map(),
                lastUpdated: Date.now()
            });
        }

        const group = this.ipGroups.get(hashedIP)!;
        group.nodes.set(nodeId, {
            nodeId,
            startTime,
            stakeAmount,
            lastSeen: Date.now()
        });
        group.lastUpdated = Date.now();
        
        console.log(`Node ${nodeId} added to IP group. Total nodes for this IP: ${group.nodes.size}`);
    }

    /**
     * Removes a node from its IP group
     */
    public removeNode(ip: string, nodeId: string): void {
        const hashedIP = this.hashIP(ip);
        const group = this.ipGroups.get(hashedIP);
        if (group) {
            group.nodes.delete(nodeId);
            if (group.nodes.size === 0) {
                this.ipGroups.delete(hashedIP);
            }
            console.log(`Node ${nodeId} removed from IP group`);
        }
    }

    /**
     * Gets eligible nodes for an IP address, respecting the node limit
     */
    public getEligibleNodes(ip: string): string[] {
        const hashedIP = this.hashIP(ip);
        const group = this.ipGroups.get(hashedIP);
        if (!group) return [];

        const now = Date.now();
        const activeNodes = Array.from(group.nodes.entries())
            .filter(([_, info]) => now - info.lastSeen <= this.GRACE_PERIOD_MS)
            .sort((a, b) => {
                // Sort by stake amount (descending), then start time (ascending)
                if (b[1].stakeAmount !== a[1].stakeAmount) {
                    return b[1].stakeAmount - a[1].stakeAmount;
                }
                return a[1].startTime - b[1].startTime;
            });

        const eligibleNodes = activeNodes
            .slice(0, this.MAX_NODES_PER_IP)
            .map(([nodeId]) => nodeId);
            
        console.log(`IP has ${activeNodes.length} active nodes, ${eligibleNodes.length} eligible for rewards`);
        return eligibleNodes;
    }

    /**
     * Checks if a node is eligible for rewards
     */
    public isNodeEligible(ip: string, nodeId: string): boolean {
        return this.getEligibleNodes(ip).includes(nodeId);
    }

    /**
     * Gets the number of active nodes for an IP
     */
    public getActiveNodeCount(ip: string): number {
        const hashedIP = this.hashIP(ip);
        const group = this.ipGroups.get(hashedIP);
        if (!group) return 0;

        const now = Date.now();
        return Array.from(group.nodes.values())
            .filter(info => now - info.lastSeen <= this.GRACE_PERIOD_MS)
            .length;
    }

    /**
     * Get debug information about IP groups
     */
    public getDebugInfo(): any {
        const info: any = {};
        for (const [hashedIP, group] of this.ipGroups.entries()) {
            info[hashedIP.substring(0, 8) + '...'] = {
                nodeCount: group.nodes.size,
                lastUpdated: new Date(group.lastUpdated).toISOString(),
                nodes: Array.from(group.nodes.values()).map(node => ({
                    nodeId: node.nodeId.substring(0, 8) + '...',
                    stakeAmount: node.stakeAmount,
                    startTime: new Date(node.startTime).toISOString()
                }))
            };
        }
        return info;
    }
} 