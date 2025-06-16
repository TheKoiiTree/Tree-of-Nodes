import { IPManager } from './ip-manager';

interface SubmissionData {
    nodeId: string;
    publicIP: string;
    startTime: number;
    stakeAmount: number;
    proof: string;
}

const ipManager = IPManager.getInstance();

export async function audit(
    submission: string,
    roundNumber: number,
    submitterKey: string,
): Promise<boolean | void> {
    /**
     * Audit a submission
     * This function should return true if the submission is correct, false otherwise
     */
    try {
        console.log(`AUDIT SUBMISSION FOR ROUND ${roundNumber} from ${submitterKey}`);
        
        // Parse submission data
        const submissionData: SubmissionData = JSON.parse(submission);
        
        // Verify required fields
        if (!submissionData.nodeId || !submissionData.publicIP || !submissionData.proof) {
            console.error('Invalid submission: missing required fields');
            return false;
        }

        // Register node with IPManager to maintain state consistency
        ipManager.addNode(
            submissionData.publicIP, 
            submissionData.nodeId, 
            submissionData.startTime, 
            submissionData.stakeAmount
        );

        // Verify node eligibility based on IP limits
        const isEligible = ipManager.isNodeEligible(submissionData.publicIP, submissionData.nodeId);
        if (!isEligible) {
            console.error(`Node ${submissionData.nodeId} is not eligible for rewards due to IP limit`);
            console.log('IPManager debug info:', ipManager.getDebugInfo());
            return false;
        }

        // Verify the proof matches expected value
        if (submissionData.proof !== "Hello, World!" && submissionData.proof !== "default_proof") {
            console.error('Invalid proof:', submissionData.proof);
            return false;
        }

        // Additional validation: check if startTime is reasonable (not too old or in future)
        const now = Date.now();
        const timeDiff = Math.abs(now - submissionData.startTime);
        const maxTimeDiff = 10 * 60 * 1000; // 10 minutes
        
        if (timeDiff > maxTimeDiff) {
            console.error('Submission timestamp is too old or in future');
            return false;
        }

        console.log(`Audit passed for node ${submissionData.nodeId}`);
        return true;
    } catch (error) {
        console.error('AUDIT ERROR:', error);
        return false;
    }
}
