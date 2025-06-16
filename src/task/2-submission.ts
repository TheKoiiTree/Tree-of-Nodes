import { namespaceWrapper } from '@_koii/task-manager/namespace-wrapper';
import { IPManager } from './ip-manager';

interface SubmissionData {
    nodeId: string;
    publicIP: string;
    startTime: number;
    stakeAmount: number;
    proof: string;
}

const ipManager = IPManager.getInstance();

export async function submission(roundNumber: number): Promise<string> {
    /**
     * Submit the task proofs for auditing
     * Must return a string of max 512 bytes to be submitted on chain
     */
    try {
        console.log(`MAKE SUBMISSION FOR ROUND ${roundNumber}`);
        
        // Get public IP
        const publicIP = await ipManager.getPublicIP();
        
        // Get task state
        const taskState = await namespaceWrapper.getTaskState({
            is_submission_required: true,
            is_stake_list_required: true
        });
        
        if (!taskState) {
            throw new Error('Failed to get task state');
        }
        
        // Get node ID and stake amount
        const nodeId = await namespaceWrapper.getMainAccountPubkey() || 'unknown';
        const stakeAmount = taskState.stake_list?.[nodeId] || 0;
        
        // Add node to IP manager
        const startTime = Date.now();
        ipManager.addNode(publicIP, nodeId, startTime, stakeAmount);
        
        // Create submission data
        const submissionData: SubmissionData = {
            nodeId,
            publicIP,
            startTime,
            stakeAmount,
            proof: await namespaceWrapper.storeGet('value') || 'default_proof'
        };
        
        // Check if node is eligible for rewards based on IP limits
        const isEligible = ipManager.isNodeEligible(publicIP, nodeId);
        if (!isEligible) {
            console.log(`Node ${nodeId} is not eligible for rewards due to IP limit`);
            console.log('IPManager debug info:', ipManager.getDebugInfo());
            return JSON.stringify({ error: 'IP_LIMIT_EXCEEDED' });
        }
        
        console.log(`Node ${nodeId} is eligible for rewards`);
        return JSON.stringify(submissionData);
    } catch (error) {
        console.error('Error in submission:', error);
        return JSON.stringify({ error: 'SUBMISSION_FAILED' });
    }
}
