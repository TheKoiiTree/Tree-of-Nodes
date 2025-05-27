import { namespaceWrapper } from '@_koii/task-manager/namespace-wrapper';

export const submission = async (round: number): Promise<string> => {
  try {
    const ip = await namespaceWrapper.storeGet('ip');
    return `IP:${ip || 'unknown'}`;
  } catch (err) {
    console.error('Submission error:', err);
    return '';
  }
};
