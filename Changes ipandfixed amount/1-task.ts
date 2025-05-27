import fetch from 'node-fetch';
import { namespaceWrapper } from '@_koii/task-manager/namespace-wrapper';

export const task = async (input: any, config: any): Promise<any> => {
  const ipRes = await fetch('https://api.ipify.org/?format=json');
  const ipData = await ipRes.json();
  const ip = ipData.ip;

  await namespaceWrapper.storeSet('ip', ip);

  return {
    success: true,
    message: 'Task completed successfully.',
    ip: ip
  };
};
