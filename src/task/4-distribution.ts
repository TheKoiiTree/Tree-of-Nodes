// Define the percentage by which to slash the stake of submitters who submitted incorrect values
// 0.7 = 70%
import { Submitter, DistributionList } from "@_koii/task-manager";
import { IPManager } from './ip-manager';

const SLASH_PERCENT = 0.7;
const ipManager = IPManager.getInstance();

interface SubmitterWithSubmission extends Submitter {
    submission: string;
}

interface SubmitterWithIP extends SubmitterWithSubmission {
    publicIP: string;
    nodeId: string;
}

export const distribution = async (
  submitters: SubmitterWithSubmission[],
  bounty: number,
  roundNumber: number
): Promise<DistributionList> => {
  /**
   * Generate the reward list for a given round
   * This function should return an object with the public keys of the submitters as keys
   * and the reward amount as values
   */
  console.log(`MAKE DISTRIBUTION LIST FOR ROUND ${roundNumber}`);
  console.log('IPManager debug info at distribution start:', ipManager.getDebugInfo());
  
  const distributionList: DistributionList = {};
  const approvedSubmitters: SubmitterWithIP[] = [];
  const ipGroups: Map<string, SubmitterWithIP[]> = new Map();

  // Process submitters and group by IP
  for (const submitter of submitters) {
    try {
      // Parse submission data to get IP and nodeId
      const submissionData = JSON.parse(submitter.submission);
      const submitterWithIP: SubmitterWithIP = {
        ...submitter,
        publicIP: submissionData.publicIP,
        nodeId: submissionData.nodeId
      };

      if (submitter.votes === 0) {
        distributionList[submitter.publicKey] = 0;
        console.log(`No votes for ${submitter.publicKey}, reward: 0`);
      } else if (submitter.votes < 0) {
        const slashedStake = submitter.stake * SLASH_PERCENT;
        distributionList[submitter.publicKey] = -slashedStake;
        console.log("CANDIDATE STAKE SLASHED", submitter.publicKey, slashedStake);
      } else {
        // Ensure node is registered with IPManager
        ipManager.addNode(
          submissionData.publicIP,
          submissionData.nodeId,
          submissionData.startTime,
          submissionData.stakeAmount
        );
        
        approvedSubmitters.push(submitterWithIP);
        
        // Group by IP
        if (!ipGroups.has(submitterWithIP.publicIP)) {
          ipGroups.set(submitterWithIP.publicIP, []);
        }
        ipGroups.get(submitterWithIP.publicIP)!.push(submitterWithIP);
      }
    } catch (error) {
      console.error('Error processing submitter:', error);
      distributionList[submitter.publicKey] = 0;
    }
  }

  if (approvedSubmitters.length === 0) {
    console.log("NO NODES TO REWARD");
    return distributionList;
  }

  console.log(`Processing ${approvedSubmitters.length} approved submitters across ${ipGroups.size} IP groups`);

  // Calculate total eligible nodes across all IPs
  let totalEligibleNodes = 0;
  const ipEligibilityMap = new Map<string, string[]>();
  
  for (const [ip, nodes] of ipGroups.entries()) {
    const eligibleNodes = ipManager.getEligibleNodes(ip);
    ipEligibilityMap.set(ip, eligibleNodes);
    totalEligibleNodes += eligibleNodes.length;
    console.log(`IP ${ip.substring(0, 10)}... has ${eligibleNodes.length} eligible nodes out of ${nodes.length} total`);
  }

  if (totalEligibleNodes === 0) {
    console.log("NO ELIGIBLE NODES FOR REWARDS");
    for (const submitter of approvedSubmitters) {
      distributionList[submitter.publicKey] = 0;
    }
    return distributionList;
  }

  // Distribute rewards proportionally among eligible nodes
  const rewardPerEligibleNode = Math.floor(bounty / totalEligibleNodes);
  console.log(`Reward per eligible node: ${rewardPerEligibleNode} (total bounty: ${bounty}, eligible nodes: ${totalEligibleNodes})`);

  // Assign rewards based on eligibility
  for (const [ip, nodes] of ipGroups.entries()) {
    const eligibleNodes = ipEligibilityMap.get(ip) || [];
    
    nodes.forEach(node => {
      if (eligibleNodes.includes(node.nodeId)) {
        distributionList[node.publicKey] = rewardPerEligibleNode;
        console.log(`Rewarding ${node.publicKey}: ${rewardPerEligibleNode}`);
      } else {
        distributionList[node.publicKey] = 0;
        console.log(`Node ${node.publicKey} not eligible due to IP limit`);
      }
    });
  }

  console.log('Final distribution list:', Object.keys(distributionList).length, 'entries');
  return distributionList;
}
